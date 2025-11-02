import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Find webhook for the targetedUrl, if there is none returns undefined.
 * Used when we want to check if there is already webhook created and if there is
 * not we skip its creation.
 *
 * @param {string} repo - Repository name.
 * @param {string} owner - Repository owner.
 * @param {string} targetUrl - Url where github will send request after something happened.
 * @returns {object} if the webhook is created returns it if not returns undefined.
 */
async function findWebhookByTargetUrl(repo, owner, targetUrl) {
  try {
    const { data: hooks } = await octokit.rest.repos.listWebhooks({
      owner,
      repo,
    });
    const existingWebhook = hooks.find((hook) => hook.config.url === targetUrl);

    return existingWebhook;
  } catch (error) {
    console.log(
      "❌ Error occured when fetching repo webhooks. ",
      error?.message
    );
    throw error;
  }
}

/**
 * Creates webhook for the targetedUrl.
 *
 * @param {string} repo - Repository name.
 * @param {string} owner - Repository owner.
 * @param {string} targetUrl - Url where github will send request after something happened.
 * @param {string} secret - Secret string that will be used in hashing method.
 * @returns {object} Newly created webhook.
 */
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
    console.log(
      "❌ Error occured when creating repo webhook. ",
      error?.message
    );
    throw error;
  }
}

/**
 * Find all issues for the given repository and owner.
 *
 * @param {string} repo - Repository name.
 * @param {string} owner - Repository owner.
 * @returns {issue[]} List of all issues found for the given attributes.
 */
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

  console.log(`✅ Total issues found: ${repoIssues.length}`);
  return repoIssues;
}

/**
 * Verify if the given request is valid and it is comming from the github webhook
 * instead of some third party
 *
 * @param {object} req - Request that is comming and we're testing its validity
 * @param {string} owner - Repository owner.
 * @returns {bool} Returns true if the signature is valid else returns false
 */
function verifySignature(req, secret) {
  const signature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("hex")}`;
  return signature === req.headers["x-hub-signature-256"];
}

export { getIssues, findWebhookByTargetUrl, createWebhook, verifySignature };
