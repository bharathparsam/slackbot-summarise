import { DashboardData } from "./types.js";

export const PRELOADED_DASHBOARD_DATA: DashboardData = {
  summary: "A spectacular, highly disciplined team effort culminating in the successful evening deployment of the core payment, search, and notification features. The day started with minor configuration blockers and database performance challenges, transitioned through high-priority refund bug hunting and rigorous regression testing, and concluded with native feature sign-offs, finance approvals, and clean production release verification by 18:10.",
  projectStatus: "Competed & Highly Stable",
  totalBlockers: 0,
  attentionRequiredCount: 0,
  cleanThreadsCount: 9,
  threads: [
    {
      threadId: "T1001",
      threadName: "Daily Standup & Configuration Blockers",
      summary: "Team standup thread mapping daily priorities. Rahul reported a blocker on sandbox credentials which was promised by EOD. Sneha highlighted payments workflow defects, leading Manoj to take charge of ticket PAY-234. Deepak achieved query speedups (reduced from 12s to 3s), and Kiran finished the email notification service. Vikram set a 4 PM escalation limit for the configuration credentials.",
      urgency: "High",
      status: "Clean / Resolved",
      keyParticipants: ["Vikram", "Rahul", "Priya", "Arjun", "Sneha", "Deepak", "Kiran", "Neha", "Manoj"],
      messageCount: 20,
      blockers: [
        {
          description: "Missing sandbox credentials preventing QA and API testing.",
          reporter: "Rahul",
          assignee: "Infra Team",
          resolved: true,
          resolutionTime: "13:00"
        },
        {
          description: "PAY-234 duplicate transaction issue still open.",
          reporter: "Sneha",
          assignee: "Manoj",
          resolved: true,
          resolutionTime: "17:07"
        }
      ],
      actionItems: [
        {
          task: "Escalate credential request if not received by 4:00 PM",
          assignee: "Rahul",
          resolved: true
        },
        {
          task: "Take charge of duplicate transaction ticket PAY-234",
          assignee: "Manoj",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1002",
      threadName: "Release Readiness & Compliance Check",
      summary: "Initial status reviews on general release readiness. Priya confirmed active accessibility (a11y) fixes are done, Deepak explored add-on indexes, Sneha logged a 45% regression testing checkpoint, and Arjun and Neha focused on finance compliance sign-offs and requirements logging in Jira.",
      urgency: "Medium",
      status: "Clean / Resolved",
      keyParticipants: ["Vikram", "Rahul", "Priya", "Deepak", "Sneha", "Manoj", "Kiran", "Arjun", "Neha"],
      messageCount: 10,
      blockers: [
        {
          description: "Pending administrative finance sign-off for release gating.",
          reporter: "Arjun",
          assignee: "Finance Operations",
          resolved: true,
          resolutionTime: "16:05"
        }
      ],
      actionItems: [
        {
          task: "Resolve minor search filter logic bug",
          assignee: "Rahul",
          resolved: true
        },
        {
          task: "Log comprehensive dashboard metrics specs in Jira",
          assignee: "Neha",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1003",
      threadName: "Sprint Review Preparation & Approval",
      summary: "Aligning demo deliverables for tomorrow's sprint review. Priya delivered polished preview screens, Deepak reported a 15% system database CPU drop, Arjun circulated a draft release document, and Neha received formal signoff from client stakeholders on reporting metrics.",
      urgency: "Medium",
      status: "Clean / Resolved",
      keyParticipants: ["Vikram", "Priya", "Rahul", "Sneha", "Deepak", "Arjun", "Kiran", "Manoj", "Neha"],
      messageCount: 10,
      blockers: [],
      actionItems: [
        {
          task: "Conduct final validating API checks prior to demo",
          assignee: "Rahul",
          resolved: true
        },
        {
          task: "Draft Sprint Release notes timeline",
          assignee: "Arjun",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1004",
      threadName: "Integrations Sandbox & Integration Verification",
      summary: "Credential access unlocked. Rahul successfully initiated API validation testing. Meanwhile, Sneha discovered an urgent refund logic bug, Manoj launched an immediate investigation, and Kiran confirmed Twilio notification access was fully enabled.",
      urgency: "High",
      status: "Clean / Resolved",
      keyParticipants: ["Rahul", "Vikram", "Sneha", "Manoj", "Deepak", "Kiran", "Arjun", "Priya", "Neha"],
      messageCount: 10,
      blockers: [
        {
          description: "Broken transaction refund workflow defect hindering complete end-to-end sandbox QA.",
          reporter: "Sneha",
          assignee: "Manoj",
          resolved: true,
          resolutionTime: "16:02"
        }
      ],
      actionItems: [
        {
          task: "Configure peak-hour debug logging for DBA trace",
          assignee: "Deepak",
          resolved: true
        },
        {
          task: "Push CSS styling hotfixes to active workspace",
          assignee: "Priya",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1005",
      threadName: "Critical Go/No-Go Blocker Review",
      summary: "A focused evaluation of blocker items. Sneha re-escalated the refund transaction issue as critical, Manoj discovered the root cause, Deepak rolled out performance indexes, and Kiran completed sandbox SMS testing successfully.",
      urgency: "Critical",
      status: "Clean / Resolved",
      keyParticipants: ["Vikram", "Sneha", "Manoj", "Deepak", "Kiran", "Arjun", "Rahul", "Priya", "Neha"],
      messageCount: 10,
      blockers: [
        {
          description: "High priority refund workflow transaction block.",
          reporter: "Sneha",
          assignee: "Manoj",
          resolved: true,
          resolutionTime: "16:02"
        }
      ],
      actionItems: [
        {
          task: "Accelerate stakeholder signoff and requirements draft",
          assignee: "Neha",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1006",
      threadName: "End-To-End (E2E) Integration Validation",
      summary: "Active validation procedures. Rahul kicked off deep E2E testing, Sneha recorded 72% milestone progress on regression runs, Manoj uploaded an engineering hotfix, and Kiran pushed ahead with failure testing bounds on SMS.",
      urgency: "High",
      status: "Clean / Resolved",
      keyParticipants: ["Rahul", "Sneha", "Manoj", "Deepak", "Kiran", "Arjun", "Priya", "Neha", "Vikram"],
      messageCount: 10,
      blockers: [],
      actionItems: [
        {
          task: "Compile rigorous production deployment guide checklist",
          assignee: "Arjun",
          resolved: true
        },
        {
          task: "Perform final verification against accessibility (a11y) targets",
          assignee: "Priya",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1007",
      threadName: "Quality Assurance Sign-Off & Approvals",
      summary: "An incredibly successful checkpoint. Sneha confirmed 100% regression suite completion, Rahul signed off APIs, Manoj merged the refund bug hotfix, Deepak closed the DB task, and Arjun unlocked the final finance sign-off.",
      urgency: "High",
      status: "Clean / Resolved",
      keyParticipants: ["Sneha", "Rahul", "Manoj", "Deepak", "Kiran", "Arjun", "Vikram", "Priya", "Neha"],
      messageCount: 10,
      blockers: [],
      actionItems: [
        {
          task: "Deploy completed SMS alert services to live QA",
          assignee: "Kiran",
          resolved: true
        },
        {
          task: "Obtain VP leadership approval from business stakeholders",
          assignee: "Neha",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1008",
      threadName: "Pre-Release Prep & Monitoring Setup",
      summary: "Deployment orchestrations prior to the 7 PM launch window. Arjun verified the primary code artifact list, Deepak enabled server monitoring tools, and Manoj confirmed the successful closure of all critical Jira defects.",
      urgency: "Medium",
      status: "Clean / Resolved",
      keyParticipants: ["Vikram", "Arjun", "Sneha", "Deepak", "Kiran", "Priya", "Neha", "Manoj", "Rahul"],
      messageCount: 10,
      blockers: [],
      actionItems: [
        {
          task: "Verify production code builds and asset integrity",
          assignee: "Priya",
          resolved: true
        },
        {
          task: "Configure active API health alerts for live monitoring",
          assignee: "Rahul",
          resolved: true
        }
      ]
    },
    {
      threadId: "T1009",
      threadName: "Production Release & Live verification",
      summary: "Successful live deployment at 18:00. Smoke testing passed with zero anomalies, SMS traffic flowed perfectly, Arjun resolved a latent invoice sync failure, and stakeholders were notified of the successful rollout.",
      urgency: "Low",
      status: "Clean / Resolved",
      keyParticipants: ["Rahul", "Sneha", "Deepak", "Kiran", "Arjun", "Priya", "Neha", "Manoj", "Vikram"],
      messageCount: 10,
      blockers: [],
      actionItems: [
        {
          task: "Monitor production metrics for safety buffers (30 mins)",
          assignee: "Manoj",
          resolved: true
        },
        {
          task: "Broadcast system success updates to corporate stakeholders",
          assignee: "Neha",
          resolved: true
        }
      ]
    }
  ]
};
