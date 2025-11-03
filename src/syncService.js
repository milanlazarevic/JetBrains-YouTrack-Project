import {
  getIssues,
  createWebhook,
  findWebhookByTargetUrl,
  verifySignature,
} from "./client/githubClient.js";
import {
  addGithubIdCustomField,
  createIssue,
  createProject,
  findProjectByName,
  syncIsseToYouTrack,
} from "./client/youTrackClient.js";

const owner = process.env.GITHUB_OWNER;
const targetUrl = process.env.WEBHOOK_URL;
const repo = process.env.GITHUB_REPO;
const secret = process.env.GITHUB_WEBHOOK_SECRET;

async function importGithubToYouTrack() {
  const issues = await getIssues(repo, owner);
  const existing = await findProjectByName(repo);
  let data = null;
  if (!existing) {
    console.log("ℹ️  Project does not exist creating new!");
    data = await createProject(repo);
    console.log("✅ Project created successfully with id: ", data.id);
    await addGithubIdCustomField(data.id);

    issues.map(async (issue) => {
      const result = await createIssue(data.id, issue);
      console.log("✅ Issue imported successfully with title: ", issue.title);
    });
    return existing;
  } else {
    console.log("❌ Project already exists import aborted!");
    return "Project already exists import aborted!";
  }
}

async function handleWebhookCreation() {
  const webhook = await findWebhookByTargetUrl(repo, owner, targetUrl);
  if (webhook) {
    console.log("ℹ️  Webhook already exsiting!");
    return "ℹ️  Webhook already exsiting!";
  } else {
    console.log("ℹ️  Creating new webhook");
    const result = await createWebhook(repo, owner, targetUrl, secret);
    console.log("✅ Webhook created successfully!");
    return result;
  }
}

async function handleIssueUpdate(req) {
  if (!verifySignature(req, secret))
    return res.status(401).send("Invalid signature!");

  const event = req.headers["x-github-event"];
  if (event === "issues") {
    const action = req.body.action;
    const issue = req.body.issue;

    console.log("ℹ️  Issue event triggered with action: ", action);

    const result = await syncIsseToYouTrack(issue, repo);
    console.log("✅ Issue sync done successfully!", result);
  }
}

export { handleWebhookCreation, importGithubToYouTrack, handleIssueUpdate };
