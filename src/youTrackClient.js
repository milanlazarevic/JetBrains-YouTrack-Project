import axios from "axios";

const youTrackUrl = process.env.YOUTRACK_URL;

const headers = {
  Authorization: `Bearer ${process.env.YOUTRACK_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function findProjectByName(projectName) {
  const res = await axios.get(
    `${youTrackUrl}/admin/projects?fields=id,name,shortName`,
    {
      headers,
    }
  );
  const existing = res.data.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );

  return existing || null;
}

async function createProject(projectName, shortName = "GH") {
  const body = {
    name: projectName,
    shortName: shortName,
    leader: { login: "admin" },
  };

  const res = await axios.post(`${youTrackUrl}/admin/projects`, body, {
    headers,
  });

  console.log(`✅ Kreiran novi projekat: ${res.data.name}`);
  return res.data;
}

function createIssueBody(projectId, githubIssue) {
  const body = {
    project: { id: projectId },
    summary: githubIssue.title,
    description: githubIssue.body || "No description provided",
    customFields: [
      {
        $type: "StateIssueCustomField",
        name: "State",
        value: {
          name: githubIssue.state === "closed" ? "Fixed" : "Open",
          $type: "StateBundleElement",
        },
      },
      {
        $type: "SingleEnumIssueCustomField",
        name: "Type",
        value: { name: "Task", $type: "EnumBundleElement" },
      },
    ],
  };

  // if (githubIssue.assignee) {
  //   body.customFields.push({
  //     $type: "SingleUserIssueCustomField",
  //     name: "Assignee",
  //     value: { login: githubIssue.assignee.login },
  //   });
  // }

  // if (githubIssue.labels && githubIssue.labels.length > 0) {
  //   body.customFields.push({
  //     $type: "MultiEnumIssueCustomField",
  //     name: "Label",
  //     value: githubIssue.labels.map((label) => ({
  //       name: label.name,
  //       $type: "EnumBundleElement",
  //     })),
  //   });
  // }
  return body;
}

async function createIssue(projectId, issue) {
  const body = createIssueBody(projectId, issue);
  try {
    const res = await axios.post(`${youTrackUrl}/issues`, body, {
      headers,
    });
    console.log(`✅ Kreiran novi issue: ${res.data}`);
    return res.data;
  } catch (error) {
    console.error("❌ Error creating issue:");
    console.error("Status:", error.response?.status);
    console.error("Error data:", JSON.stringify(error.response?.data, null, 2));
    console.error("Request body:", JSON.stringify(body, null, 2));
    throw error;
  }
}

export { findProjectByName, createProject, createIssue };
