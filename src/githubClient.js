import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function findWebhookByTargetUrl(repo, owner, targetUrl) {
  try {
    const { data: hooks } = await octokit.rest.repos.listWebhooks({
      owner,
      repo,
    });
    const existingWebhook = hooks.find((hook) => hook.config.url === targetUrl);

    return existingWebhook;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function createWebhook(repo, owner, targetUrl, secret) {
  try {
    const result = await octokit.rest.repos.createWebhook({
      owner,
      repo,
      name: "web",
      active: true,
      events: ["issues"],
      config: {
        url: targetUrl,
        content_type: "json",
        insecure_ssl: "0",
        secret,
      },
    });
    return result.data;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
}

async function getIssues(repo, owner) {
  const repoIssues = await octokit.paginate(
    octokit.rest.issues.listForRepo,
    {
      owner,
      repo,
      state: "all",
      per_page: 100,
    },
    (response) => response.data.filter((issue) => !issue.pull_request)
  );

  console.log(`Ukupno pronađeno: ${repoIssues.length} issue-a`);
  return repoIssues;
}

function verifySignature(req, secret) {
  const signature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("hex")}`;
  return signature === req.headers["x-hub-signature-256"];
}

export { getIssues, findWebhookByTargetUrl, createWebhook, verifySignature };
