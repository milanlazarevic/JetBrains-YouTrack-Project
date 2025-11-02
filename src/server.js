import express from "express";
import { getIssues } from "./githubClient.js";
import {
  createIssue,
  createProject,
  findProjectByName,
} from "./youTrackClient.js";

const app = express();
const port = 3000;

const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

app.get("/", async (req, res) => {
  const issues = await getIssues(repo, owner);
  const existing = await findProjectByName(repo);
  let data = null;
  if (!existing) {
    // ako ne postoji kreiram novi i dodam issue
    console.log("Project does not exist creating new!");
    data = await createProject(repo);
    console.log("Project created successfully!");
    issues.map(async (issue) => {
      const result = await createIssue(existing.id, issue);
      console.log("Issue imported successfully!", issue.title);
    });
    res.send(existing);
    res.send(data);
  } else {
    // ako postoji vidjeti sta uraditi mozda cak i baciti gresku!
    console.error("Project already exists import aborted!");
    res.send("Project already exists import aborted!");
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
