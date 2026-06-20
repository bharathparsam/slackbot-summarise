import express from "express";
import path from "path";
import dotenv from "dotenv";
import { DEFAULT_SLACK_MESSAGES } from "./src/defaultData";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

let supabaseClient: any = null;
let useSupabase = false;

// Helper to check if string looks like a valid HTTP or HTTPS URL before initializing createClient to avert crashes
const isValidHttpUrl = (str: string) => {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

if (supabaseUrl && isValidHttpUrl(supabaseUrl) && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    useSupabase = true;
    console.log("Supabase Client initialized successfully!");
  } catch (err) {
    console.warn("Supabase initialization fell back to JSON file:", err);
  }
}

// Fallback local JSON DB in case they are running locally / preview,
// or in case the live Supabase table hasn't been created yet.
const HISTORY_FILE = path.join(process.cwd(), "src", "historyDb.json");

function loadLocalHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), "utf8");
    }
    const data = fs.readFileSync(HISTORY_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Local history read failed:", err);
    return [];
  }
}

function saveLocalHistory(list: any[]) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(list, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Local history write failed:", err);
    return false;
  }
}


// Lazily get Google GenAI client to avoid crashing on start if API key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it via Settings > Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// API 1: Fetch Default Raw Data
app.get("/api/default-data", (req, res) => {
  res.json({ messages: DEFAULT_SLACK_MESSAGES });
});

// API 2: Run AI Analysis on Slack Messages list
app.post("/api/analyze-threads", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
      return;
    }

    const ai = getGenAI();

    const formattedMessages = messages
      .slice(0, 150) // Safeguard limit to avoid extreme token usage
      .map(m => `[ID: ${m.msg_id}] [Thread: ${m.thread_id}] @${m.user} (${m.time}): ${m.message}`)
      .join("\n");

    const prompt = `You are a professional operations manager and Lead Product Manager. Analyze the following Slack dataset representing a history of team conversations, standups, blockers, and deployments.
    Your task is to organize this unstructured chatter into structured threads.
    
    Here is the message log:
    ${formattedMessages}
    
    Group the messages by thread ID and extract summaries, key participants, blockers, and action items. Make sure to capture current resolved status of blockers/actions by tracing subsequent message context.
    
    For your output, populate the fields required by the JSON schema exactly. Ensure total accuracy regarding which blockers are resolved (e.g. Rahul's sandbox credential blocker is resolved at 13:00, refund workflow bug is resolved and merged at 16:02).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Slack Operations Investigator. You extract precise timelines, action-items, and track unresolved blockers to keep projects stable.",
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "projectStatus", "totalBlockers", "attentionRequiredCount", "cleanThreadsCount", "threads"],
          properties: {
            summary: {
              type: Type.STRING,
              description: "A professional high-level chronological operations summary of the day's milestones and progress across all threads.",
            },
            projectStatus: {
              type: Type.STRING,
              description: "Overall project health status: Stable, Risk Of Delay, Blocked, or Completed.",
            },
            totalBlockers: {
              type: Type.INTEGER,
              description: "Total count of active/unresolved blockers currently facing the team.",
            },
            attentionRequiredCount: {
              type: Type.INTEGER,
              description: "Total count of threads representing an unresolved issue, pending stakeholder review, or high-priority attention required.",
            },
            cleanThreadsCount: {
              type: Type.INTEGER,
              description: "Total count of threads that are clean, resolved, or successfully completed without issues.",
            },
            threads: {
              type: Type.ARRAY,
              description: "Detailed analysis per thread.",
              items: {
                type: Type.OBJECT,
                required: ["threadId", "threadName", "summary", "urgency", "status", "keyParticipants", "blockers", "actionItems", "messageCount"],
                properties: {
                  threadId: { type: Type.STRING },
                  threadName: {
                    type: Type.STRING,
                    description: "A succinct human-friendly title of the thread, e.g. 'Daily Standup & Sandbox Credentials Blocker'",
                  },
                  summary: {
                    type: Type.STRING,
                    description: "Chronological summary of what transpired, highlight any resolutions.",
                  },
                  urgency: {
                    type: Type.STRING,
                    description: "Urgency category: Critical, High, Medium, or Low.",
                  },
                  status: {
                    type: Type.STRING,
                    description: "Status label: Blocked, Attention Required, Clean / Resolved, or Ongoing.",
                  },
                  keyParticipants: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  blockers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["description", "reporter", "assignee", "resolved"],
                      properties: {
                        description: { type: Type.STRING, description: "What is blocking them?" },
                        reporter: { type: Type.STRING, description: "Name of blocked team member." },
                        assignee: { type: Type.STRING, description: "Who needs to clear the blocker, e.g. Infra team." },
                        resolved: { type: Type.BOOLEAN, description: "Whether this was eventually cleared in the messages." },
                        resolutionTime: { type: Type.STRING, description: "Approximate time or event when resolved. Use empty string if unresolved." },
                      },
                    },
                  },
                  actionItems: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["task", "assignee", "resolved"],
                      properties: {
                        task: { type: Type.STRING, description: "Describe the specific actionable task." },
                        assignee: { type: Type.STRING, description: "Who is responsible for executing it." },
                        resolved: { type: Type.BOOLEAN, description: "Whether it was completed according to logs." },
                      },
                    },
                  },
                  messageCount: { type: Type.INTEGER },
                },
              },
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Analysis API failed:", error);
    res.status(500).json({ error: error.message || "Internal Server Error occurred during thread analysis." });
  }
});

// API 3: Parse Unstructured Raw Chat Text or transcripts using Gemini
app.post("/api/parse-raw-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "Missing or invalid 'text' parameter." });
      return;
    }

    const ai = getGenAI();
    const prompt = `You are a professional chat parser. Convert the following unstructured chat transcript (which could be plain copy-pasted logs, a raw communication transcript from Slack / Teams / Discord, or lines from a text/txt file) into a clean, structured JSON array of individual messages.

If the transcript contains multiple topics, segment them into reasonable thread IDs like:
"T1001" for topic A, "T1002" for topic B, etc.
If it is a single stream/flow of standard standup messages, you can group them under a single thread ID or segment into 2-3 logical threads depending on the focus blocks.

Provide consistent username handles for the "user" field. Ensure times are formatted as standard modern "HH:MM". If no timestamp or user is mentioned in a line, infer or assign them sequentially so that the conversational flow is complete.

Here is the unstructured raw transcript content:
---
${text.slice(0, 15000)}
---

Generate ONLY a valid JSON array matching the required schema. Do not write anything else.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a precise, data-oriented parser specializing in turning messy communication logs into clean structured JSON.",
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["msg_id", "thread_id", "user", "time", "message"],
            properties: {
              msg_id: { type: Type.STRING },
              thread_id: { type: Type.STRING },
              user: { type: Type.STRING },
              time: { type: Type.STRING },
              message: { type: Type.STRING },
            }
          }
        }
      }
    });

    const parsedMessages = JSON.parse(response.text?.trim() || "[]");
    res.json({ messages: parsedMessages });
  } catch (error: any) {
    console.error("Parse raw text API failed:", error);
    res.status(500).json({ error: error.message || "Internal Server Error occurred during parsing." });
  }
});

// API 4: Get Database Configuration & Provider Status
app.get("/api/db-config", (req, res) => {
  let maskedUrl = null;
  if (supabaseUrl && isValidHttpUrl(supabaseUrl)) {
    maskedUrl = supabaseUrl.length > 20
      ? `${supabaseUrl.substring(0, 15)}...${supabaseUrl.substring(supabaseUrl.length - 5)}`
      : supabaseUrl;
  }
  res.json({
    useSupabase,
    supabaseUrl: maskedUrl,
    hasKey: !!supabaseAnonKey,
    historyFilePath: HISTORY_FILE,
  });
});

// API 5: Get History of Summaries
app.get("/api/history", async (req, res) => {
  try {
    if (useSupabase && supabaseClient) {
      const { data, error } = await supabaseClient
        .from("standup_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // If table doesn't exist, fallback silently to local files to avoid crashing the frontend
        if (error.code === "PGRST116" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
          console.warn("Supabase relation 'standup_history' does not exist yet. Using local fallback file database.");
          const localList = loadLocalHistory();
          res.json({ list: localList, fallbackUsed: true, errorMsg: "Table 'standup_history' not found in your Supabase database. Please create it using the SQL editor script in the Guide tab!" });
          return;
        }
        throw error;
      }

      const formattedData = (data || []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        title: row.title,
        messages_count: row.messages_count,
        summary: row.summary,
        project_status: row.project_status,
        total_blockers: row.total_blockers,
        attention_required_count: row.attention_required_count,
        clean_threads_count: row.clean_threads_count,
        threads: typeof row.threads === "string" ? JSON.parse(row.threads) : row.threads,
      }));

      res.json({ list: formattedData, fallbackUsed: false });
    } else {
      const localList = loadLocalHistory();
      res.json({ list: localList, fallbackUsed: true });
    }
  } catch (err: any) {
    console.error("Get history failed (using local JSON file fallback):", err);
    const localList = loadLocalHistory();
    res.json({ list: localList, fallbackUsed: true, errorMsg: err.message });
  }
});

// API 6: Save a Summary to History
app.post("/api/history", async (req, res) => {
  try {
    const { title, messages_count, summary, project_status, total_blockers, attention_required_count, clean_threads_count, threads } = req.body;

    const newId = `hist_${Date.now()}`;
    const newRecord = {
      id: newId,
      created_at: new Date().toISOString(),
      title: title || `Summary - ${new Date().toLocaleString()}`,
      messages_count: messages_count || 0,
      summary: summary || "",
      project_status: project_status || "Stable",
      total_blockers: total_blockers || 0,
      attention_required_count: attention_required_count || 0,
      clean_threads_count: clean_threads_count || 0,
      threads: threads || [],
    };

    if (useSupabase && supabaseClient) {
      const supabaseRow = {
        title: newRecord.title,
        messages_count: newRecord.messages_count,
        summary: newRecord.summary,
        project_status: newRecord.project_status,
        total_blockers: newRecord.total_blockers,
        attention_required_count: newRecord.attention_required_count,
        clean_threads_count: newRecord.clean_threads_count,
        threads: typeof newRecord.threads === "string" ? newRecord.threads : JSON.stringify(newRecord.threads),
      };

      const { data, error } = await supabaseClient
        .from("standup_history")
        .insert([supabaseRow])
        .select();

      if (error) {
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          console.warn("Supabase table 'standup_history' does not exist. Saving to local.json file instead.");
          const localList = loadLocalHistory();
          localList.unshift(newRecord);
          saveLocalHistory(localList);
          res.json({ success: true, record: newRecord, fallbackUsed: true, warning: "Table 'standup_history' not found in Supabase. Created locally inside historyDb.json!" });
          return;
        }
        throw error;
      }

      const savedRow = data ? data[0] : null;
      const responseRecord = savedRow ? {
        id: savedRow.id,
        created_at: savedRow.created_at,
        title: savedRow.title,
        messages_count: savedRow.messages_count,
        summary: savedRow.summary,
        project_status: savedRow.project_status,
        total_blockers: savedRow.total_blockers,
        attention_required_count: savedRow.attention_required_count,
        clean_threads_count: savedRow.clean_threads_count,
        threads: typeof savedRow.threads === "string" ? JSON.parse(savedRow.threads) : savedRow.threads,
      } : newRecord;

      res.json({ success: true, record: responseRecord, fallbackUsed: false });
    } else {
      const localList = loadLocalHistory();
      localList.unshift(newRecord);
      saveLocalHistory(localList);
      res.json({ success: true, record: newRecord, fallbackUsed: true });
    }
  } catch (err: any) {
    console.error("Save history failed:", err);
    try {
      const { title, messages_count, summary, project_status, total_blockers, attention_required_count, clean_threads_count, threads } = req.body;
      const newRecord = {
        id: `hist_${Date.now()}`,
        created_at: new Date().toISOString(),
        title: title || `Summary - ${new Date().toLocaleString()}`,
        messages_count: messages_count || 0,
        summary: summary || "",
        project_status: project_status || "Stable",
        total_blockers: total_blockers || 0,
        attention_required_count: attention_required_count || 0,
        clean_threads_count: clean_threads_count || 0,
        threads: threads || [],
      };
      const localList = loadLocalHistory();
      localList.unshift(newRecord);
      saveLocalHistory(localList);
      res.json({ success: true, record: newRecord, fallbackUsed: true, errorMsg: err.message });
    } catch (saveError: any) {
      res.status(500).json({ error: "Failed to persist summary: " + saveError.message });
    }
  }
});

// API 7: Delete a Summary from History
app.delete("/api/history/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (useSupabase && supabaseClient && !id.startsWith("hist_")) {
      const { error } = await supabaseClient
        .from("standup_history")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          const localList = loadLocalHistory();
          const filtered = localList.filter((item: any) => item.id !== id);
          saveLocalHistory(filtered);
          res.json({ success: true, fallbackUsed: true });
          return;
        }
        throw error;
      }
      res.json({ success: true, fallbackUsed: false });
    } else {
      const localList = loadLocalHistory();
      const filtered = localList.filter((item: any) => item.id !== id);
      saveLocalHistory(filtered);
      res.json({ success: true, fallbackUsed: true });
    }
  } catch (err: any) {
    console.error("Delete history failed:", err);
    const localList = loadLocalHistory();
    const filtered = localList.filter((item: any) => item.id !== req.params.id);
    saveLocalHistory(filtered);
    res.json({ success: true, fallbackUsed: true, errorMsg: err.message });
  }
});


// Configure Vite or Static files depending on mode
const isVercel = process.env.VERCEL === "1" || !!process.env.NOW_BUILDER;

if (!isVercel) {
  const initServer = async () => {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Slack Analyzer server listening at http://0.0.0.0:${PORT}`);
    });
  };

  initServer().catch((e) => {
    console.error("Vite integration setup failed:", e);
  });
}

export default app;
