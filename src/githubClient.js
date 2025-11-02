import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

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

// TODO create webhook for issues if it doesnt exists and listen for each webhook

export { getIssues };
