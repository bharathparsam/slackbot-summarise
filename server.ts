import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { DEFAULT_SLACK_MESSAGES } from "./src/defaultData.js";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

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

// Configure Vite or Static files depending on mode
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
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
}

initServer().catch((e) => {
  console.error("Vite integration setup failed:", e);
});
