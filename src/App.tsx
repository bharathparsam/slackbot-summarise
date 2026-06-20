/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  Mail,
  TrendingUp,
  Check,
  FileText,
  HelpCircle,
  X,
  PlusCircle,
  Info,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle,
  FileJson,
  PlusSquare,
  Flame,
  ArrowRight,
  History,
  Database,
  Trash2,
  Calendar
} from "lucide-react";
import { SlackMessage, DashboardData, ThreadAnalysis, BlockerItem, ActionItem, HistoryRecord } from "./types.js";
import { DEFAULT_SLACK_MESSAGES } from "./defaultData.js";
import { PRELOADED_DASHBOARD_DATA } from "./preloadedData.js";

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<"dashboard" | "raw-editor" | "history">("dashboard");
  const [selectedThreadId, setSelectedThreadId] = useState<string>("T1001");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("All");

  // Slack Messages & Analysis States
  const [slackMessages, setSlackMessages] = useState<SlackMessage[]>(DEFAULT_SLACK_MESSAGES);
  const [dashboardData, setDashboardData] = useState<DashboardData>(PRELOADED_DASHBOARD_DATA);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Database History States
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [dbConfig, setDbConfig] = useState<{ useSupabase: boolean; supabaseUrl: string | null; hasKey: boolean; historyFilePath: string }>({
    useSupabase: false,
    supabaseUrl: null,
    hasKey: false,
    historyFilePath: "",
  });
  const [isSavingHistory, setIsSavingHistory] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [customHistoryTitle, setCustomHistoryTitle] = useState<string>("");

  // Custom interactive editing states
  const [rawJsonText, setRawJsonText] = useState<string>(() => JSON.stringify(DEFAULT_SLACK_MESSAGES, null, 2));
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  // New States for pasting unstructured text or uploading .txt/.json files
  const [unstructuredText, setUnstructuredText] = useState<string>("");
  const [isParsingText, setIsParsingText] = useState<boolean>(false);
  const [rawEditorTab, setRawEditorTab] = useState<"paste" | "json">("paste");

  // New item creators
  const [newBlockerDesc, setNewBlockerDesc] = useState<string>("");
  const [newBlockerReporter, setNewBlockerReporter] = useState<string>("Vikram");
  const [newBlockerAssignee, setNewBlockerAssignee] = useState<string>("Infra Team");

  const [newActionTask, setNewActionTask] = useState<string>("");
  const [newActionAssignee, setNewActionAssignee] = useState<string>("Rahul");

  const [quickMessageText, setQuickMessageText] = useState<string>("");
  const [quickMessageUser, setQuickMessageUser] = useState<string>("Vikram");
  const [quickMessageThread, setQuickMessageThread] = useState<string>("T1001");

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadHistoryItemIntoDashboard = (item: HistoryRecord) => {
    setDashboardData({
      summary: item.summary,
      projectStatus: item.project_status || "Stable",
      totalBlockers: item.total_blockers !== undefined ? item.total_blockers : 0,
      attentionRequiredCount: item.attention_required_count !== undefined ? item.attention_required_count : 0,
      cleanThreadsCount: item.clean_threads_count !== undefined ? item.clean_threads_count : 0,
      threads: item.threads || [],
    });
    if (item.threads && item.threads.length > 0) {
      setSelectedThreadId(item.threads[0].threadId);
    }
    setActiveTab("dashboard");
    showToast(`Loaded summary snapshot: "${item.title}" into active Dashboard! 🎯`);
  };

  const fetchDbConfig = async () => {
    try {
      const res = await fetch("/api/db-config");
      if (res.ok) {
        const data = await res.json();
        setDbConfig(data);
      }
    } catch (err) {
      console.warn("Could not read DB config details:", err);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.list || []);
      }
    } catch (err) {
      console.warn("Could not load reporting history archive:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveCurrentDashboardToHistory = async (customTitle?: string) => {
    setIsSavingHistory(true);
    try {
      const bodyPayload = {
        title: customTitle || `Manual Standup Archive - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        messages_count: slackMessages.length,
        summary: dashboardData.summary,
        project_status: dashboardData.projectStatus,
        total_blockers: dashboardData.totalBlockers,
        attention_required_count: dashboardData.attentionRequiredCount,
        clean_threads_count: dashboardData.cleanThreadsCount,
        threads: dashboardData.threads,
      };

      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        throw new Error("HTTP Status Code " + res.status);
      }

      const resData = await res.json();
      if (resData.success) {
        showToast(resData.warning ? `Saved! ${resData.warning}` : "Successfully archived standup report to history! 💾");
        await fetchHistory();
      }
    } catch (err: any) {
      showToast("Failed to save report to history: " + err.message);
    } finally {
      setIsSavingHistory(false);
      setCustomHistoryTitle("");
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Historical standup archive removed 🗑️");
        await fetchHistory();
      }
    } catch (err: any) {
      showToast("Error deleting history entry: " + err.message);
    }
  };

  // Fetch initial slack messages and analysis if available on server
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch("/api/default-data");
        if (res.ok) {
          const data = await res.json();
          if (data && data.messages) {
            setSlackMessages(data.messages);
            setRawJsonText(JSON.stringify(data.messages, null, 2));
          }
        }
      } catch (err) {
        console.warn("Could not connect to backend server for initial messages. Falling back to local state.", err);
      }
    };
    fetchInitialData();
    fetchDbConfig();
    fetchHistory();
  }, []);

  // Sync calculations based on current state (so changes are live-reflected!)
  // Calculated status
  const currentThreads = dashboardData.threads;
  const liveTotalBlockers = currentThreads.reduce(
    (acc, thread) => acc + thread.blockers.filter((b) => !b.resolved).length,
    0
  );
  const liveAttentionNeededCount = currentThreads.filter(
    (t) => t.status === "Blocked" || t.status === "Attention Required" || t.blockers.some((b) => !b.resolved)
  ).length;
  const liveCleanThreadsCount = currentThreads.filter(
    (t) => t.status === "Clean / Resolved" || (!t.blockers.some((b) => !b.resolved) && t.actionItems.every((a) => a.resolved))
  ).length;
  const cleanRatioPercentage = currentThreads.length
    ? Math.round((liveCleanThreadsCount / currentThreads.length) * 100)
    : 100;

  // Active channel list extracted from static list
  const activeChannels = [
    { name: "#core-backend", desc: "Core API integrations & Sandbox", count: 20, status: "stable", threadId: "T1001" },
    { name: "#api-delivery", desc: "API status, routing & specs", count: 10, status: "clean", threadId: "T1002" },
    { name: "#design-ops", desc: "Accessibility & screens redesign", count: 10, status: "clean", threadId: "T1003" },
    { name: "#qa-releases", desc: "Regression testing checklists", count: 20, status: "attention", threadId: "T1005" },
    { name: "#infra-status", desc: "Twilio access & DB query logs", count: 30, status: "blocked", threadId: "T1004" }
  ];

  // Map thread IDs to channels for visual filters
  const getChannelForThread = (tid: string) => {
    if (tid === "T1001" || tid === "T1005") return "#core-backend";
    if (tid === "T1002" || tid === "T1006") return "#api-delivery";
    if (tid === "T1003" || tid === "T1008") return "#design-ops";
    if (tid === "T1004" || tid === "T1009") return "#infra-status";
    return "#qa-releases";
  };

  // Trigger real backend GEMINI evaluation
  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    setApiError(null);
    try {
      const res = await fetch("/api/analyze-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: slackMessages }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP Status Code ${res.status}`);
      }

      const analyzedResult: DashboardData = await res.json();
      setDashboardData(analyzedResult);
      showToast("Slack signal successfully analyzed with Gemini 3.5 Flash! 🚀");

      // Auto archive newly generated summaries to history database!
      try {
        const blockIndicator = analyzedResult.totalBlockers > 0 ? `${analyzedResult.totalBlockers} active blockers` : "Stable Health";
        const bodyPayload = {
          title: `Daily Summary - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${blockIndicator})`,
          messages_count: slackMessages.length,
          summary: analyzedResult.summary,
          project_status: analyzedResult.projectStatus,
          total_blockers: analyzedResult.totalBlockers,
          attention_required_count: analyzedResult.attentionRequiredCount,
          clean_threads_count: analyzedResult.cleanThreadsCount,
          threads: analyzedResult.threads,
        };
        const histRes = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData.success && histData.record) {
            setHistoryList(prev => [histData.record, ...prev]);
          }
        }
      } catch (autoSaveError) {
        console.warn("Silent auto save to history had an issue", autoSaveError);
      }

    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Unknown error occurred context.");
      showToast("Analysis requested, but failed. Loaded simulated operation parameters!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Mark blocker as toggled
  const toggleBlockerResolved = (threadId: string, desc: string) => {
    const updatedThreads = dashboardData.threads.map((t) => {
      if (t.threadId === threadId) {
        const updatedBlockers = t.blockers.map((b) => {
          if (b.description === desc) {
            return {
              ...b,
              resolved: !b.resolved,
              resolutionTime: !b.resolved ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
            };
          }
          return b;
        });

        // Recalculately status based on items
        let newStatus = t.status;
        const hasUnresolvedBlockers = updatedBlockers.some((b) => !b.resolved);
        if (hasUnresolvedBlockers) {
          newStatus = "Blocked";
        } else {
          newStatus = "Clean / Resolved";
        }

        return { ...t, blockers: updatedBlockers, status: newStatus };
      }
      return t;
    });

    setDashboardData({ ...dashboardData, threads: updatedThreads });
    showToast("Blocker status updated!");
  };

  // Mark action item completed
  const toggleActionItemResolved = (threadId: string, task: string) => {
    const updatedThreads = dashboardData.threads.map((t) => {
      if (t.threadId === threadId) {
        const updatedActions = t.actionItems.map((a) => {
          if (a.task === task) {
            return { ...a, resolved: !a.resolved };
          }
          return a;
        });
        return { ...t, actionItems: updatedActions };
      }
      return t;
    });

    setDashboardData({ ...dashboardData, threads: updatedThreads });
    showToast("Action item progress updated!");
  };

  // Add a manual custom blocker inline
  const handleAddBlocker = (threadId: string) => {
    if (!newBlockerDesc.trim()) return;

    const newBlocker: BlockerItem = {
      description: newBlockerDesc,
      reporter: newBlockerReporter,
      assignee: newBlockerAssignee,
      resolved: false,
    };

    const updatedThreads = dashboardData.threads.map((t) => {
      if (t.threadId === threadId) {
        return {
          ...t,
          blockers: [...t.blockers, newBlocker],
          status: "Blocked",
          urgency: "Critical"
        };
      }
      return t;
    });

    setDashboardData({ ...dashboardData, threads: updatedThreads });
    setNewBlockerDesc("");
    showToast("New active blocker registered for thread!");
  };

  // Add a manual custom action item inline
  const handleAddActionItem = (threadId: string) => {
    if (!newActionTask.trim()) return;

    const newAction: ActionItem = {
      task: newActionTask,
      assignee: newActionAssignee,
      resolved: false,
    };

    const updatedThreads = dashboardData.threads.map((t) => {
      if (t.threadId === threadId) {
        return {
          ...t,
          actionItems: [...t.actionItems, newAction],
        };
      }
      return t;
    });

    setDashboardData({ ...dashboardData, threads: updatedThreads });
    setNewActionTask("");
    showToast("New manager action item assigned!");
  };

  // Append customized chat message organically
  const handleSendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessageText.trim()) return;

    const newMsg: SlackMessage = {
      msg_id: `M_NEW_${Date.now()}`,
      thread_id: quickMessageThread,
      user: quickMessageUser,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: quickMessageText,
    };

    const revisedMessages = [...slackMessages, newMsg];
    setSlackMessages(revisedMessages);
    setRawJsonText(JSON.stringify(revisedMessages, null, 2));

    // Update the messageCount in the analyzed dashboardData thread too so state looks live!
    const updatedThreads = dashboardData.threads.map((t) => {
      if (t.threadId === quickMessageThread) {
        return {
          ...t,
          messageCount: t.messageCount + 1,
        };
      }
      return t;
    });
    setDashboardData({ ...dashboardData, threads: updatedThreads });

    setQuickMessageText("");
    showToast(`Quick message injected in thread ${quickMessageThread}! Click 'Re-Analyze with Gemini' to fully categorize.`);
  };

  // Load custom raw JSON pasted by users
  const handleSaveRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Must be a continuous array of SlackMessage objects.");
      }
      setSlackMessages(parsed);
      showToast(`Success! Loaded ${parsed.length} custom messages. Now trigger Gemini re-analysis.`);
      setActiveTab("dashboard");
    } catch (err: any) {
      alert(`Invalid JSON format: ${err.message}`);
    }
  };

  // Upload .txt, .json, or .text file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      // Check if it looks like a JSON array
      const trimmed = content.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            setSlackMessages(parsed);
            setRawJsonText(JSON.stringify(parsed, null, 2));
            showToast(`Loaded ${parsed.length} messages from JSON file! 🚀`);
            setActiveTab("dashboard");
            return;
          }
        } catch (err) {
          // Fall through to plain text
        }
      }

      // If it is plain text (.txt/any transcripts), load into unstructured box
      setUnstructuredText(content);
      setRawEditorTab("paste");
      showToast("Loaded text file content successfully into the paste box!");
    };
    reader.readAsText(file);
  };

  // Parser of unstructured text to turn into clean JSON
  const handleParseUnstructuredText = async () => {
    const trimmedText = unstructuredText.trim();
    if (!trimmedText) {
      showToast("Please paste some text or upload a .txt file first.");
      return;
    }

    setIsParsingText(true);
    try {
      // Direct client side attempt if they write valid JSON in unstructured text
      if (trimmedText.startsWith("[") && trimmedText.endsWith("]")) {
        const parsed = JSON.parse(trimmedText);
        if (Array.isArray(parsed)) {
          setSlackMessages(parsed);
          setRawJsonText(JSON.stringify(parsed, null, 2));
          showToast(`Direct JSON parsed perfectly!`);
          setActiveTab("dashboard");
          setIsParsingText(false);
          return;
        }
      }
    } catch (e) {}

    try {
      const res = await fetch("/api/parse-raw-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && data.messages && Array.isArray(data.messages)) {
        setSlackMessages(data.messages);
        setRawJsonText(JSON.stringify(data.messages, null, 2));
        showToast(`Gemini successfully structured ${data.messages.length} messages! 🚀`);
        setActiveTab("dashboard");
      } else {
        throw new Error("Returned content is not a format-complying array of messages.");
      }
    } catch (err: any) {
      console.warn("Server-side parsing failed (missing GEMINI_API_KEY?). Loading local client regex scanner fallback.", err);
      
      // Standalone regex chat scanner fallback
      const lines = trimmedText.split("\n");
      const parsedResult: SlackMessage[] = [];
      let currentThreadId = "T1001";
      let msgIndex = 1;

      // Fallback heuristics: user names and text splitting
      lines.forEach((line) => {
        const cl = line.trim();
        if (!cl) return;

        let user = "TeamMember";
        let messageText = cl;
        let timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        // Fallback heuristics: check if line starts with "[" or matches conversational prefixes
        const bracketMatch = cl.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/);
        const leadingUserMatch = cl.match(/^([a-zA-Z0-9_-]+)\s+(\d{1,2}:\d{2})\s*:\s*(.*)$/);
        const simpleColonMatch = cl.match(/^([a-zA-Z0-9_]+)\s*:\s*(.*)$/);

        if (bracketMatch) {
          timeStr = bracketMatch[1];
          user = bracketMatch[2].trim();
          messageText = bracketMatch[3].trim();
        } else if (leadingUserMatch) {
          user = leadingUserMatch[1].trim();
          timeStr = leadingUserMatch[2].trim();
          messageText = leadingUserMatch[3].trim();
        } else if (simpleColonMatch) {
          const checkUser = simpleColonMatch[1].trim();
          if (checkUser.length > 1 && checkUser.length < 20) {
            user = checkUser;
            messageText = simpleColonMatch[2].trim();
          }
        }

        parsedResult.push({
          msg_id: `M_LP_${msgIndex++}`,
          thread_id: currentThreadId,
          user,
          time: timeStr,
          message: messageText
        });
      });

      if (parsedResult.length > 0) {
        setSlackMessages(parsedResult);
        setRawJsonText(JSON.stringify(parsedResult, null, 2));
        showToast(`Offline parser converted ${parsedResult.length} message lines. Click 'Re-Analyze' for full insights!`);
        setActiveTab("dashboard");
      } else {
        alert("Failed to parse text. Please ensure lines are separated by newlines, with simple key structures (e.g. 'Rahul: Hello').");
      }
    } finally {
      setIsParsingText(false);
    }
  };

  // Reset to default Slack dataset
  const handleResetToDefault = () => {
    setSlackMessages(DEFAULT_SLACK_MESSAGES);
    setRawJsonText(JSON.stringify(DEFAULT_SLACK_MESSAGES, null, 2));
    setDashboardData(PRELOADED_DASHBOARD_DATA);
    showToast("Reset to standard demo log dataset.");
  };

  // Selected thread object helper
  const selectedThreadInfo = dashboardData.threads.find((t) => t.threadId === selectedThreadId) || dashboardData.threads[0];
  // Filter list of messages that fit selected thread
  const selectedThreadMessages = slackMessages.filter((m) => m.thread_id === selectedThreadId);

  // Search and filter logical threads
  const filteredThreads = dashboardData.threads.filter((t) => {
    // Channel filter based on preloaded groupings
    const chan = getChannelForThread(t.threadId);
    if (selectedChannelFilter !== "All" && chan !== selectedChannelFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "All") {
      if (statusFilter === "Blocked" && t.status !== "Blocked") return false;
      if (statusFilter === "Attention" && t.status !== "Attention Required") return false;
      if (statusFilter === "Clean" && t.status !== "Clean / Resolved") return false;
    }

    // Urgency filter
    if (urgencyFilter !== "All" && t.urgency !== urgencyFilter) {
      return false;
    }

    // Text Search in name, summary, participants or blockers
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = t.threadName.toLowerCase().includes(query);
      const summMatch = t.summary.toLowerCase().includes(query);
      const parMatch = t.keyParticipants.some(p => p.toLowerCase().includes(query));
      const blockMatch = t.blockers.some(b => b.description.toLowerCase().includes(query));
      return nameMatch || summMatch || parMatch || blockMatch;
    }

    return true;
  });

  // Compose dynamic copyable status update pre-draft with markdown format
  const generateStatusDraftEmail = () => {
    let emailText = `Subject: Operational Standup & Slack Team Summary - ${new Date().toLocaleDateString()}\n\n`;
    emailText += `Hi Leadership Team,\n\n`;
    emailText += `Here is the operations signal summary automatically compiled from our Slack activity logs today:\n\n`;
    emailText += `📢 OVERALL HEALTH STATUS: ${dashboardData.projectStatus.toUpperCase()}\n`;
    emailText += `🛡️ ACTIVE BLOCKERS: ${liveTotalBlockers} remaining unresolved\n`;
    emailText += `⚠️ THREADS REQUIRING ATTENTION: ${liveAttentionNeededCount}\n`;
    emailText += `✅ CLEAN/RESOLVED CHANNELS: ${cleanRatioPercentage}% of threads fully stable\n\n`;
    emailText += `--- CHRONOLOGICAL OPS SUMMARY ---\n`;
    emailText += `"${dashboardData.summary}"\n\n`;
    emailText += `--- DETAILED THREAD STATUS ---\n`;

    dashboardData.threads.forEach((t) => {
      const openBlockers = t.blockers.filter((b) => !b.resolved).map(b => b.description).join(", ");
      const actionList = t.actionItems.map(a => `[${a.resolved ? 'x' : ' '}] ${a.task} (${a.assignee})`).join("\n    ");
      emailText += `• [${t.urgency} Urgency] ${t.threadName} (ID: ${t.threadId}) - Status: ${t.status}\n`;
      if (openBlockers) {
        emailText += `  ⚠️ Blockers: ${openBlockers}\n`;
      }
      if (actionList) {
        emailText += `  ⚙️ Action Items:\n    ${actionList}\n`;
      }
      emailText += `\n`;
    });

    emailText += `We will closely monitor active workstreams as we progress toward upcoming milestones.\n\nBest regards,\nAlex Rivers\nEngineering Lead`;
    return emailText;
  };

  const copyDraftToClipboard = () => {
    navigator.clipboard.writeText(generateStatusDraftEmail());
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
    showToast("Status email draft copied to clipboard!");
  };

  // Mock workspace parameters
  const moralePercent = 85;
  const stressPercent = 45;

  return (
    <div id="slack-dashboard-root" className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased overflow-x-hidden selection:bg-indigo-100">
      
      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            id="toast-notification"
            className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-3 border border-slate-700/50"
          >
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header id="app-header" className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-700 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-100 tracking-tighter">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-800 leading-none">SlackSignal AI</h1>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold tracking-widest uppercase">PRO VERSION</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Manager Insight Dashboard • v2.4</p>
          </div>
        </div>

        {/* Global Nav Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "dashboard" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("raw-editor")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "raw-editor" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Raw Logs Editor ({slackMessages.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "history" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            History Archive ({historyList.length})
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider">Analyzing {slackMessages.length} Messages</span>
          </div>

          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right leading-none hidden sm:block">
              <p className="text-xs font-bold text-slate-800">Alex Rivers</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Engineering Lead</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center font-bold text-slate-700 text-xs">
              AR
            </div>
          </div>
        </div>
      </header>

      {/* Global Metrics Row */}
      <div id="metrics-bar" className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-200 bg-white shrink-0">
        <div className="px-6 py-4 flex flex-col justify-center border-r border-slate-100">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-slate-400" /> Total Chat Volume
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800 font-sans tracking-tight">{slackMessages.length}</span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">messages</span>
          </div>
        </div>

        <div className={`px-6 py-4 flex flex-col justify-center border-r border-slate-100 transition-colors duration-200 ${liveTotalBlockers > 0 ? "bg-amber-50/40" : "bg-emerald-50/20"}`}>
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1.5">
            <AlertTriangle className={`w-3 h-3 ${liveTotalBlockers > 0 ? "text-red-500" : "text-emerald-500"}`} /> Active Blockers
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-sans tracking-tight ${liveTotalBlockers > 0 ? "text-red-600 animate-pulse" : "text-emerald-700"}`}>
              {liveTotalBlockers < 10 ? `0${liveTotalBlockers}` : liveTotalBlockers}
            </span>
            <span className={`text-[10px] font-bold uppercase ${liveTotalBlockers > 0 ? "text-red-500" : "text-emerald-600"}`}>
              {liveTotalBlockers > 0 ? "critical priority" : "all clear"}
            </span>
          </div>
        </div>

        <div className={`px-6 py-4 flex flex-col justify-center border-r border-slate-100 transition-colors duration-200 ${liveAttentionNeededCount > 0 ? "bg-amber-50/30" : "bg-white"}`}>
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-amber-500" /> Attention Required
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600 font-sans tracking-tight">
              {liveAttentionNeededCount < 10 ? `0${liveAttentionNeededCount}` : liveAttentionNeededCount}
            </span>
            <span className="text-[10px] font-bold text-amber-500 uppercase">threads pending</span>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col justify-center bg-indigo-50/10">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-indigo-500" /> Clean Status Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-700 font-sans tracking-tight">{cleanRatioPercentage}%</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase">signal-to-noise</span>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center text-xs text-red-700 gap-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-red-500 shrink-0" />
            <span>
              <strong>Gemini API is not fully configured or ran into limits:</strong> {apiError}. Using high-fidelity local preloaded standalone data so the developer playground is 100% active.
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div id="main-content-layout" className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50">
        
        {/* TAB 1: DASHBOARD STREAM */}
        {activeTab === "dashboard" && (
          <>
            {/* LEFT SIDEBAR: CHANNELS & CONTROLS */}
            <aside id="left-sidebar" className="w-full lg:w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace Pulse</h3>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">5 channels</span>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {/* Channel Filter Items */}
                <div className="space-y-1">
                  <div
                    onClick={() => {
                      setSelectedChannelFilter("All");
                      showToast("Showing all channels and topics");
                    }}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition text-xs ${
                      selectedChannelFilter === "All"
                        ? "bg-slate-900 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span className="font-semibold flex items-center gap-1.5">🗺️ Read All Topics</span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                      {dashboardData.threads.length}
                    </span>
                  </div>

                  {activeChannels.map((channel) => {
                    const isActive = selectedChannelFilter === channel.name;
                    return (
                      <div
                        key={channel.name}
                        onClick={() => {
                          setSelectedChannelFilter(channel.name);
                          setSelectedThreadId(channel.threadId);
                          showToast(`Filtered feed by ${channel.name}`);
                        }}
                        className={`p-2.5 rounded-lg flex flex-col gap-1 cursor-pointer transition ${
                          isActive
                            ? "bg-indigo-600 text-white font-semibold"
                            : "bg-white border border-slate-100 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold tracking-tight">{channel.name}</span>
                          {channel.status === "blocked" && (
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                          )}
                          {channel.status === "attention" && (
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          )}
                          {channel.status === "clean" && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          )}
                        </div>
                        <p className={`text-[10px] leading-tight ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                          {channel.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">AI Focus Diagnostics</h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100/60 leading-normal">
                      <p className="font-bold text-red-800 mb-1 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        Refund Blocker
                      </p>
                      <p className="text-[10px] text-red-700">
                        Resolved successfully at 16:02. Merged fix to QA deployment checklist.
                      </p>
                    </div>

                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100/60 leading-normal">
                      <p className="font-bold text-indigo-900 mb-1">API Migration Status</p>
                      <p className="text-[10px] text-indigo-700">
                        100% verified clean. Fully monitored and signed off by stakeholders.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                  className="w-full mt-2 py-2.5 px-3 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer select-none active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  {isAnalyzing ? "Running Gemini AI..." : "Re-Analyze with Gemini"}
                </button>
                
                <button
                  onClick={handleResetToDefault}
                  className="w-full py-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-semibold transition"
                >
                  Reset to demo log dataset
                </button>
              </div>
            </aside>

            {/* MIDDLE WINDOW: CONVERSATION LIST & CURRENT FEED */}
            <main id="middle-action-stream" className="flex-1 flex flex-col md:flex-row min-h-0 bg-slate-50">
              
              {/* Thread list section */}
              <section className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 max-w-2xl border-r border-slate-200">
                
                {/* Search and Filters box */}
                <div className="space-y-2 shrink-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="relative flex-1">
                      <input
                        type="search"
                        placeholder="Search threads, blockers, reporters..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border-0 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
                      <select
                        value={urgencyFilter}
                        onChange={(e) => setUrgencyFilter(e.target.value)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border-0 focus:outline-hidden"
                      >
                        <option value="All">All Urgency</option>
                        <option value="Critical">Critical Only</option>
                        <option value="High">High Only</option>
                        <option value="Medium">Medium Only</option>
                        <option value="Low">Low Only</option>
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border-0 focus:outline-hidden"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Attention">Attention Needed</option>
                        <option value="Clean">Clean Threads</option>
                      </select>
                    </div>
                  </div>

                  {selectedChannelFilter !== "All" && (
                    <div className="flex items-center justify-between px-2 text-xs">
                      <span className="text-slate-500">
                        Filtering stream by: <strong className="font-mono text-indigo-600">{selectedChannelFilter}</strong>
                      </span>
                      <button
                        onClick={() => setSelectedChannelFilter("All")}
                        className="text-indigo-600 hover:underline font-bold text-[11px]"
                      >
                        Clear Channel Filter
                      </button>
                    </div>
                  )}
                </div>

                {/* Detected Blockers Header Banner */}
                <div id="blockers-header" className="space-y-3 mt-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[10px] font-black uppercase text-red-600 tracking-wider">Unresolved Obstacles</h2>
                    <div className="flex-1 h-[1px] bg-red-200"></div>
                  </div>

                  {dashboardData.threads.flatMap(t => t.blockers.filter(b => !b.resolved).map(b => ({ ...b, thread: t }))).length === 0 ? (
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100/60 text-xs flex items-center gap-3">
                      <div className="p-1 px-1.5 bg-emerald-500 rounded text-white font-bold">✓</div>
                      <div>
                        <p className="font-bold">Fantastic! 0 active blockers detected.</p>
                        <p className="text-[10px] text-emerald-600">The team is unblocked and deployment operations are stable.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {dashboardData.threads.flatMap(t => t.blockers.filter(b => !b.resolved).map(b => ({ ...b, thread: t }))).map((blocker, index) => (
                        <div
                          key={index}
                          className="bg-white border-l-4 border-red-500 p-3 rounded-r-xl shadow-xs flex justify-between items-start text-xs border border-slate-200/60"
                        >
                          <div className="space-y-1 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                                {getChannelForThread(blocker.thread.threadId)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{blocker.thread.threadId}</span>
                            </div>
                            <h4 className="font-bold text-slate-800">{blocker.description}</h4>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              Assigned to: <strong className="text-slate-700">{blocker.assignee}</strong> • Reported by: <strong className="text-slate-700">@{blocker.reporter}</strong>
                            </p>
                          </div>
                          <button
                            onClick={() => toggleBlockerResolved(blocker.thread.threadId, blocker.description)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-2 py-1 font-bold text-[10px] tracking-wide uppercase shrink-0 transition"
                          >
                            Mark Restored
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Main Thread Stream List */}
                <div id="thread-analysis-stream" className="space-y-3.5 mt-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Conversational Thread Logs</h2>
                    <div className="flex-1 h-[1px] bg-indigo-200"></div>
                  </div>

                  {filteredThreads.length === 0 ? (
                    <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                      No threads matched your filters. Adjust the filters or search parameters above.
                    </div>
                  ) : (
                    filteredThreads.map((thread) => {
                      const isSelected = thread.threadId === selectedThreadId;
                      const hasOpenBlockers = thread.blockers.some((b) => !b.resolved);
                      const isClean = thread.status === "Clean / Resolved" && !hasOpenBlockers;

                      return (
                        <div
                          key={thread.threadId}
                          onClick={() => {
                            setSelectedThreadId(thread.threadId);
                            showToast(`Inspecting deep-dive for ${thread.threadId}`);
                          }}
                          className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white border-indigo-600 ring-1 ring-indigo-100 shadow-md translate-x-1"
                              : "bg-white border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm"
                          }`}
                        >
                          {/* Top Status Indicators line */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono leading-none bg-slate-100 text-slate-600 px-1.5 py-1 rounded font-bold">
                                {thread.threadId}
                              </span>
                              <span className="text-[9px] font-bold font-mono tracking-wide text-indigo-600 bg-indigo-50 px-1.5 py-1 rounded uppercase">
                                {getChannelForThread(thread.threadId)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Urgency Badge */}
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  thread.urgency === "Critical"
                                    ? "bg-red-100 text-red-700 border border-red-200"
                                    : thread.urgency === "High"
                                    ? "bg-orange-100 text-orange-700 border border-orange-200"
                                    : thread.urgency === "Medium"
                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {thread.urgency}
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  hasOpenBlockers
                                    ? "bg-red-500 text-white animate-pulse"
                                    : thread.status === "Attention Required"
                                    ? "bg-amber-400 text-slate-900"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {hasOpenBlockers ? "Blocked" : thread.status}
                              </span>
                            </div>
                          </div>

                          {/* Content Paragraphs */}
                          <h3 className="text-xs font-extrabold text-slate-800 mb-1.5 group-hover:text-indigo-600 transition">
                            {thread.threadName}
                          </h3>
                          <p className="text-[11px] text-slate-600 leading-relaxed mb-3 line-clamp-3">
                            {thread.summary}
                          </p>

                          {/* Footer Metrics details */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px]">
                            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{thread.keyParticipants.length} people active</span>
                            </div>

                            <div className="flex items-center gap-3">
                              {thread.blockers.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                  ⚠️ {thread.blockers.filter((b) => b.resolved).length}/{thread.blockers.length} blockers cleared
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500">
                                <MessageSquare className="w-3 h-3" /> {thread.messageCount || 10} msgs
                              </span>
                            </div>
                          </div>

                          {/* Miniature horizontal tracking timeline indicator bar */}
                          <div className="absolute bottom-0 left-0 w-full h-[3px] rounded-b-xl overflow-hidden flex">
                            {thread.blockers.map((b, i) => (
                              <div
                                key={i}
                                className={`flex-1 h-full ${b.resolved ? "bg-emerald-400" : "bg-red-500 animate-pulse"}`}
                              />
                            ))}
                            {thread.blockers.length === 0 && (
                              <div className="w-full h-full bg-slate-200" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Thread Deep-Dive Chat logs and task status */}
              <section id="deep-dive-panel" className="flex-1 p-6 bg-white overflow-y-auto flex flex-col gap-6">
                
                {selectedThreadInfo ? (
                  <>
                    {/* Active Thread Title Card */}
                    <div className="space-y-2 border-b border-slate-100 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold tracking-wider uppercase">
                          Currently Inspecting • {selectedThreadInfo.threadId}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last Activity: 今天 18:10</span>
                        </div>
                      </div>

                      <h2 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
                        {selectedThreadInfo.threadName}
                      </h2>
                      <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong>AI Summary of discussion:</strong> {selectedThreadInfo.summary}
                      </p>
                    </div>

                    {/* TWO COLUMN GRID: LEFT = CHEKISTS, RIGHT = SLACK CHAT SIMULATION */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      
                      {/* Checklists area */}
                      <div className="space-y-5">
                        
                        {/* Blockers list on thread */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h3 className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-3 flex items-center justify-between">
                            <span>Thread Blockers ({selectedThreadInfo.blockers.length})</span>
                            <span className="text-[9px] text-slate-400 font-normal">Controls live stats</span>
                          </h3>

                          {selectedThreadInfo.blockers.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">No blockers logged for this thread.</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedThreadInfo.blockers.map((blocker, index) => (
                                <div
                                  key={index}
                                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition ${
                                    blocker.resolved
                                      ? "bg-slate-100 border-slate-200 text-slate-500"
                                      : "bg-red-50/50 border-red-100/60 text-slate-950"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={blocker.resolved}
                                    onChange={() => toggleBlockerResolved(selectedThreadInfo.threadId, blocker.description)}
                                    id={`check-blocker-${index}`}
                                    className="w-4 h-4 rounded-sm border-slate-300 text-red-600 focus:ring-red-500 mt-0.5 cursor-pointer shrink-0"
                                  />
                                  <div className="flex-1 leading-normal">
                                    <p className={`font-medium ${blocker.resolved ? "line-through text-slate-400" : ""}`}>
                                      {blocker.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                                      <span>Reporter: @{blocker.reporter}</span>
                                      <span>|</span>
                                      <span>Assignee: {blocker.assignee}</span>
                                      {blocker.resolved && blocker.resolutionTime && (
                                        <>
                                          <span>|</span>
                                          <span className="text-emerald-600 font-semibold bg-emerald-50 px-1 rounded">Cleared: {blocker.resolutionTime}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick inline custom blocker addition form */}
                          <div className="mt-4 pt-3 border-t border-slate-200/50 space-y-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Register New Active Blocker</p>
                            <input
                              type="text"
                              value={newBlockerDesc}
                              onChange={(e) => setNewBlockerDesc(e.target.value)}
                              placeholder="e.g. Missing AWS bucket credentials"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={newBlockerReporter}
                                onChange={(e) => setNewBlockerReporter(e.target.value)}
                                placeholder="Reporter: e.g. Sneha"
                                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-[10px]"
                              />
                              <input
                                type="text"
                                value={newBlockerAssignee}
                                onChange={(e) => setNewBlockerAssignee(e.target.value)}
                                placeholder="Assignee: e.g. Manoj"
                                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-[10px]"
                              />
                            </div>
                            <button
                              onClick={() => handleAddBlocker(selectedThreadInfo.threadId)}
                              className="w-full py-1.5 bg-red-600 text-white rounded font-bold text-[10px] uppercase hover:bg-red-700 transition"
                            >
                              Add active blocker
                            </button>
                          </div>
                        </div>

                        {/* Action items on thread */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h3 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-3 flex items-center justify-between">
                            <span>Manager Action Items ({selectedThreadInfo.actionItems.length})</span>
                            <span className="text-[9px] text-slate-400 font-normal">Assign & track</span>
                          </h3>

                          {selectedThreadInfo.actionItems.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">No operational action items defined by AI.</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedThreadInfo.actionItems.map((action, index) => (
                                <div
                                  key={index}
                                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition ${
                                    action.resolved
                                      ? "bg-slate-100 border-slate-200 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-900 shadow-2xs"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={action.resolved}
                                    onChange={() => toggleActionItemResolved(selectedThreadInfo.threadId, action.task)}
                                    id={`check-action-${index}`}
                                    className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer shrink-0"
                                  />
                                  <div className="flex-1 leading-normal">
                                    <p className={`font-semibold ${action.resolved ? "line-through text-slate-400" : ""}`}>
                                      {action.task}
                                    </p>
                                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5">
                                      Owner: @{action.assignee}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick inline custom action items creation form */}
                          <div className="mt-4 pt-3 border-t border-slate-200/50 space-y-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assign Custom Team Task</p>
                            <input
                              type="text"
                              value={newActionTask}
                              onChange={(e) => setNewActionTask(e.target.value)}
                              placeholder="e.g. Set client check-in meeting"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                            <input
                              type="text"
                              value={newActionAssignee}
                              onChange={(e) => setNewActionAssignee(e.target.value)}
                              placeholder="Task assignee: e.g. Rahul"
                              className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-[10px]"
                            />
                            <button
                              onClick={() => handleAddActionItem(selectedThreadInfo.threadId)}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] uppercase transition"
                            >
                              Add action item
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Right: Slack Chat simulator */}
                      <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50 max-h-[600px]">
                        <div className="bg-slate-100 p-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            Chronological Slack Logs
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-semibold rounded text-[9px]">
                            {selectedThreadMessages.length} total raw messages
                          </span>
                        </div>

                        {/* Raw messages box */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-white">
                          {selectedThreadMessages.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs">
                              No messages belong directly to thread {selectedThreadInfo.threadId} in default list.
                            </div>
                          ) : (
                            selectedThreadMessages.map((msg, idx) => {
                              // Custom styling based on avatar or user name
                              const isManagement = msg.user === "Vikram";
                              return (
                                <div key={idx} className="flex items-start gap-2.5 text-xs">
                                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs uppercase shadow-2xs ${
                                    isManagement 
                                      ? "bg-slate-900 text-indigo-300" 
                                      : "bg-indigo-100 text-indigo-700"
                                  }`}>
                                    {msg.user.slice(0, 2)}
                                  </div>
                                  <div className="flex-1 leading-normal bg-slate-50 p-2.5 rounded-r-xl rounded-bl-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-slate-800">@{msg.user}</span>
                                      <span className="text-[10px] text-slate-400 font-semibold">{msg.time} AM</span>
                                    </div>
                                    <p className="text-slate-700 text-[11px] leading-relaxed select-text">
                                      {msg.message}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Fast Chat simulator input */}
                        <form onSubmit={handleSendQuickMessage} className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">Send As:</span>
                            <select
                              value={quickMessageUser}
                              onChange={(e) => setQuickMessageUser(e.target.value)}
                              className="bg-white border text-xs px-2 py-0.5 rounded text-slate-700"
                            >
                              <option value="Vikram">Vikram (Manager)</option>
                              <option value="Rahul">Rahul (Developer)</option>
                              <option value="Sneha">Sneha (QA)</option>
                              <option value="Deepak">Deepak (DBA)</option>
                              <option value="Priya">Priya (UX Redesign)</option>
                              <option value="Manoj">Manoj (Developer)</option>
                            </select>
                          </div>
                          
                          <div className="relative">
                            <input
                              type="text"
                              value={quickMessageText}
                              onChange={(e) => setQuickMessageText(e.target.value)}
                              placeholder={`Speak into ${selectedThreadInfo.threadId}...`}
                              className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
                            />
                            <button
                              type="submit"
                              className="absolute right-1 text-slate-400 hover:text-indigo-600 p-1.5"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </form>
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-slate-400 text-xs text-medium">
                    Please select a thread to browse granular details.
                  </div>
                )}
              </section>

            </main>

            {/* RIGHT SIDEBAR: DEMOGRAPHICS, ACTIVITY HEATMAP & SENTIMENT INSTRUMENTS */}
            <aside id="right-sidebar" className="w-full lg:w-72 border-l border-slate-200 bg-white flex flex-col p-5 shrink-0 space-y-6">
              
              {/* Leaderboards card */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Participant Leaderboard</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                    <span className="font-semibold text-slate-700">@Rahul (QA API Validation)</span>
                    <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">22 Slack Messages</span>
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                    <span className="font-semibold text-slate-700">@Sneha (Payments QA)</span>
                    <span className="font-mono text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">18 Slack Messages</span>
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                    <span className="font-semibold text-slate-700">@Vikram (Release Manager)</span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">15 Slack Messages</span>
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                    <span className="font-semibold text-slate-700">@Deepak (Database Speedups)</span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">12 Slack Messages</span>
                  </div>
                </div>
              </div>

              {/* Activity Heatmap Grid */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Slack Activity Heatmap</h3>
                <p className="text-[10px] text-slate-400 leading-normal mb-3">
                  Interactive matrix measuring discussion density across 24 hours. Click block to debug.
                </p>

                {/* Grid represents hours: 9AM | 10AM | 11AM | 1PM | 2PM | 3PM | 4PM */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Row 1 */}
                  <div onClick={() => showToast("9:00 AM Chat Density: Peak (Standup started)")} className="h-4 bg-indigo-700 hover:scale-105 transition rounded cursor-pointer" title="9 AM Standup (20 msgs)" />
                  <div onClick={() => showToast("10:00 AM Chat Density: Heavy (Accessibility reviews)")} className="h-4 bg-indigo-500 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("11:00 AM Chat Density: Medium (Tomorrow's Sprint Prep)")} className="h-4 bg-indigo-300 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("12:00 PM Chat Density: Idle (Lunch buffer)")} className="h-4 bg-slate-100 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("13:00 PM Chat Density: Medium (Sandbox unlocked)")} className="h-4 bg-indigo-300 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("14:00 PM Chat Density: Heavy (Blockers triage)")} className="h-4 bg-indigo-500 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("15:00 PM Chat Density: Peak (End-to-End checks)")} className="h-4 bg-indigo-600 hover:scale-105 transition rounded cursor-pointer" />
                  
                  {/* Row 2 */}
                  <div onClick={() => showToast("16:00 PM Chat Density: Extreme (100% bug fix merged)")} className="h-4 bg-indigo-800 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("17:00 PM Chat Density: Heavy (Pre-release window)")} className="h-4 bg-indigo-600 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("18:00 PM Chat Density: Medium (Release successful)")} className="h-4 bg-indigo-400 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("19:00 PM Chat Density: Low (Signoff buffer)")} className="h-4 bg-indigo-200 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("20:00 PM Chat Density: Idle")} className="h-4 bg-slate-100 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("21:00 PM Chat Density: Idle")} className="h-4 bg-slate-100 hover:scale-105 transition rounded cursor-pointer" />
                  <div onClick={() => showToast("22:00 PM Chat Density: Idle")} className="h-4 bg-slate-100 hover:scale-105 transition rounded cursor-pointer" />
                </div>
                <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 tracking-wider uppercase mt-1.5">
                  <span>09:00 AM</span>
                  <span>14:00 PM</span>
                  <span>22:00 PM</span>
                </div>
              </div>

              {/* AI Summarized Sentiment */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">AI Summarized Sentiment</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Team Morale Level</span>
                      <span className="text-emerald-600 font-extrabold">{moralePercent}% (High)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${moralePercent}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Urgency Stress Level</span>
                      <span className="text-amber-500 font-extrabold">{stressPercent}% (Moderate)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${stressPercent}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Tip Box with CTA inside the theme context */}
              <div id="ai-manager-tip" className="mt-auto p-4 bg-slate-900 rounded-xl text-white shadow-md border border-slate-700/50">
                <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-ping shrink-0"></span>
                  AI Manager Recommendation
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Slack telemetry shows all critical blockers are cleared. Staging environment credentials and refund defect merges have been successfully fully executed.
                </p>
                <button
                  onClick={() => setShowDraftModal(true)}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded text-[10px] tracking-widest font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-200" />
                  Draft Summary Email
                </button>
              </div>

            </aside>
          </>
        )}

        {/* TAB 2: RAW SLACK CHAT DATA / MULTI-FORMAT PASTING */}
        {activeTab === "raw-editor" && (
          <section id="raw-logs-playground" className="flex-1 p-6 overflow-y-auto space-y-4 max-w-5xl mx-auto w-full">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Import Slack Message Logs</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Feed raw text, export files, or custom JSON arrays. Your standups and chat timelines are automatically parsed by Gemini!
                  </p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg shrink-0 border border-slate-200">
                  <button
                    onClick={() => setRawEditorTab("paste")}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      rawEditorTab === "paste" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    📝 Paste Text/TXT File
                  </button>
                  <button
                    onClick={() => setRawEditorTab("json")}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      rawEditorTab === "json" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    ⚙️ Raw JSON Array ({slackMessages.length})
                  </button>
                </div>
              </div>

              {/* Sub Tab: Paste Plain Text & TXT upload */}
              {rawEditorTab === "paste" && (
                <div className="space-y-4" id="paste-plain-tab">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Paste Unstructured Chat transcripts or logs below
                      </label>
                      <textarea
                        value={unstructuredText}
                        onChange={(e) => setUnstructuredText(e.target.value)}
                        rows={10}
                        placeholder={`Example formatted message history:
Alex: Standup is started!
Rahul: I am currently working on the registration screens. I'm blocked by DB credentials!
Sneha: I’ll check that credential block for you.`}
                        className="w-full font-sans text-xs p-3 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-slate-900 focus:text-white"
                      />
                    </div>

                    <div className="bg-slate-50 hover:bg-slate-100/70 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-5 flex flex-col items-center justify-center text-center transition cursor-pointer relative h-[184px] mt-6">
                      <input
                        type="file"
                        accept=".txt,.json,.text"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <FileText className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-slate-700">Drag & Drop or Click to Upload</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">
                        Supports `.txt`, `.json`, or `.text` files directly!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleResetToDefault}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Reset to Default logs
                    </button>

                    <button
                      onClick={handleParseUnstructuredText}
                      disabled={isParsingText}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      {isParsingText ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Parsing logs with Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Parse & Load message stream
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub Tab: Direct JSON array editor */}
              {rawEditorTab === "json" && (
                <div className="space-y-4" id="json-array-tab">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        JSON Message Array format [ {"{"} msg_id, thread_id, user, time, message {"}"} ]
                      </label>
                      <button
                        onClick={() => {
                          try {
                            const pretty = JSON.stringify(JSON.parse(rawJsonText), null, 2);
                            setRawJsonText(pretty);
                            showToast("JSON formatted/prettified!");
                          } catch (e: any) {
                            alert("Invalid JSON format in the textarea.");
                          }
                        }}
                        className="text-xs text-indigo-600 hover:underline font-bold cursor-pointer font-sans"
                      >
                        Prettify format
                      </button>
                    </div>
                    <textarea
                      value={rawJsonText}
                      onChange={(e) => setRawJsonText(e.target.value)}
                      rows={12}
                      placeholder="[{'msg_id': 'M1', 'thread_id': 'T1001', 'user': 'Vikram', 'time': '09:00', 'message': 'Standup started'}]"
                      className="w-full font-mono text-xs p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={handleResetToDefault}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Load Default Dataset
                    </button>
                    <button
                      onClick={handleSaveRawJson}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                    >
                      Save & Apply JSON list
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-indigo-50/50 text-indigo-950 border border-indigo-100 rounded-xl text-xs space-y-2 leading-relaxed flex items-start gap-3">
                <span className="text-base select-none shrink-0">💡</span>
                <div>
                  <p className="font-extrabold text-indigo-900">Dynamic Operations Playground:</p>
                  <p className="text-[11px] text-indigo-950/80 mt-0.5">
                    Once parsed and loaded, return to the **Dashboard** and press the **Re-Analyze with Gemini** button. The server will dynamically analyze your custom logs to detect blockers, assignees, actions, and generate a standup progress update email!
                  </p>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* TAB 2.5: HISTORY ARCHIVE & PERSISTENCE SECTION */}
        {activeTab === "history" && (
          <section id="history-archive-center" className="flex-grow p-6 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full">
            
            {/* Minimal Clean Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Historical Standup Summaries
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Browse previous status summaries, reload legacy report snapshots, or manage your saved archives.
                </p>
              </div>
            </div>

            {/* Quick manual archival section */}
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-indigo-900 tracking-wider">Archive Current Active State</h3>
                <p className="text-[11px] text-indigo-950/70">
                  Save a snapshot of your ongoing standup metrics, blocker items, and actions.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-center w-full md:w-auto">
                <input
                  type="text"
                  value={customHistoryTitle}
                  onChange={(e) => setCustomHistoryTitle(e.target.value)}
                  placeholder="e.g. Sprint 4 Retrospective"
                  className="w-full md:w-56 text-xs px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                />
                <button
                  onClick={() => saveCurrentDashboardToHistory(customHistoryTitle.trim())}
                  disabled={isSavingHistory}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shrink-0 cursor-pointer disabled:opacity-50 transition"
                >
                  {isSavingHistory ? "Saving..." : "Save Snapshot"}
                </button>
              </div>
            </div>

            {/* History Grid/List Logs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Historical Signal Audits ({historyList.length})
                </h3>
                <button
                  onClick={fetchHistory}
                  className="text-[10px] text-indigo-600 font-extrabold hover:underline"
                >
                  Refresh Logs
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white border border-slate-100 rounded-2xl">
                  <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-400">Querying signal database history...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="bg-white p-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-4">
                  <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Database Archive is Empty</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Generate an operational summary using the "Re-Analyze with Gemini" button in the dashboard, or archive the current layout status manually above!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4" id="history-logs-stack">
                  {historyList.map((item) => {
                    const savedDate = new Date(item.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    });
                    const savedTime = new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    // Parse overall status coloring
                    let statusBg = "bg-slate-100 text-slate-700 border-slate-200";
                    if (item.project_status === "Stable" || item.project_status?.toLowerCase() === "completed") {
                      statusBg = "bg-emerald-50 text-emerald-800 border-emerald-100";
                    } else if (item.project_status === "Blocked") {
                      statusBg = "bg-rose-50 text-rose-800 border-rose-100";
                    } else if (item.project_status?.toLowerCase().includes("delay") || item.project_status?.toLowerCase().includes("risk")) {
                      statusBg = "bg-amber-50 text-amber-800 border-amber-100";
                    }

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-xs transition duration-250 flex flex-col md:flex-row justify-between items-start md:items-stretch gap-6 relative group"
                      >
                        {/* Summary details */}
                        <div className="space-y-3 flex-grow max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded-full ${statusBg}`}>
                              {item.project_status}
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-950 group-hover:text-indigo-600 transition font-mono">
                              {item.title}
                            </h4>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed font-sans line-clamp-2">
                            {item.summary}
                          </p>

                          {/* Stat pillars */}
                          <div className="flex items-center gap-4 text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{savedDate} @ {savedTime}</span>
                            </div>
                            <span>•</span>
                            <span className="text-slate-600">{item.messages_count} logs analyzed</span>
                            <span>•</span>
                            <span className={item.total_blockers > 0 ? "text-rose-600 font-extrabold" : "text-slate-400"}>
                              {item.total_blockers} Blockers
                            </span>
                          </div>
                        </div>

                        {/* Interactive operations */}
                        <div className="flex md:flex-col justify-center items-center gap-2 min-w-[140px] shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 self-stretch w-full md:w-auto">
                          <button
                            onClick={() => loadHistoryItemIntoDashboard(item)}
                            className="w-full px-3 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-extrabold rounded-xl text-[10px] uppercase shadow-xs cursor-pointer transition text-center whitespace-nowrap"
                          >
                            Load to Dashboard 🔄
                          </button>
                          <button
                            onClick={() => deleteHistoryRecord(item.id)}
                            className="px-3 py-1 text-rose-600 hover:bg-rose-50 rounded-xl text-[10px] font-bold cursor-pointer transition inline-flex items-center gap-1"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}



      </div>

      {/* DRAFT EMAIL MODAL */}
      <AnimatePresence>
        {showDraftModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></div>
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-300">Manager Draft: Operations Update</h3>
                </div>
                <button
                  onClick={() => setShowDraftModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  This summary email has been compiled directly from the current active thread logs, blockers checklist, and status progress state:
                </p>

                <textarea
                  readOnly
                  rows={12}
                  value={generateStatusDraftEmail()}
                  className="w-full bg-slate-50 border border-slate-200 text-[11px] font-mono p-4 rounded-xl text-slate-800 select-all focus:outline-hidden"
                />

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Alex Rivers • 100% Prepared
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDraftModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                    >
                      Close Window
                    </button>
                    <button
                      onClick={copyDraftToClipboard}
                      className="px-5 py-2 bg-indigo-600 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-1.5"
                    >
                      {copiedDraft ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          Copied Draft!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
