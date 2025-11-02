import express from "express";
import {
  getIssues,
  createWebhook,
  findWebhookByTargetUrl,
  verifySignature,
} from "./githubClient.js";
import {
  createIssue,
  createProject,
  findProjectByName,
  syncIsseToYouTrack,
} from "./youTrackClient.js";

const app = express();
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
const port = 3000;

const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const targetUrl = process.env.WEBHOOK_URL;
const secret = process.env.GITHUB_WEBHOOK_SECRET;

app.get("/", async (req, res) => {
  const issues = await getIssues(repo, owner);
  const existing = await findProjectByName(repo);
  let data = null;
  if (!existing) {
    console.log("Project does not exist creating new!");
    data = await createProject(repo);
    console.log("Project created successfully!", data.id);
    issues.map(async (issue) => {
      const result = await createIssue(data.id, issue);
      console.log("Issue imported successfully!", issue.title);
    });
    res.send(existing);
  } else {
    console.error("Project already exists import aborted!");
    res.send("Project already exists import aborted!");
  }
});

app.get("/webhook", async (req, res) => {
  const webhook = await findWebhookByTargetUrl(repo, owner, targetUrl);
  if (webhook) {
    console.log("Webhook already exsiting!");
    res.send("Webhook already exsiting!");
  } else {
    console.log("Creating new webhook");
    const result = await createWebhook(repo, owner, targetUrl, secret);
    console.log(result);
    res.send(result);
  }
});

app.post("/issue-updated", async (req, res) => {
  if (!verifySignature(req, secret))
    return res.status(401).send("Invalid signature!");

  const event = req.headers["x-github-event"];
  if (event === "issues") {
    const action = req.body.action;
    const issue = req.body.issue;

    console.log("Sync called", action);

    const result = await syncIsseToYouTrack(issue, repo);
    // res.send(result);
  }
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
