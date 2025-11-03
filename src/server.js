import express from "express";
import {
  handleIssueUpdate,
  handleWebhookCreation,
  importGithubToYouTrack,
} from "./syncService.js";

const app = express();
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
const port = 3000;

app.get("/", async (req, res) => {
  const result = await importGithubToYouTrack();
  res.send(result);
});

app.get("/webhook", async (req, res) => {
  const result = await handleWebhookCreation();
  res.send(result);
});

app.post("/issue-updated", async (req, res) => {
  await handleIssueUpdate(req);
  res.sendStatus(200);
});

// Initial call of methods for inserting issues and creating a webhook when the server starts. After
// this initialization each event on issues is being tracked.
(async () => {
  try {
    console.log("ℹ️  Importing issues");
    await handleWebhookCreation();
    await importGithubToYouTrack();
    console.log("✅ Initialization done.");
  } catch (error) {
    console.log("❌ Error while initializing server!", error?.message);
  }
})();

app.listen(port, () => {
  console.log(`✅ Example app listening on port ${port}`);
});
