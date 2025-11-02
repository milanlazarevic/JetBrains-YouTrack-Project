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

async function createProject(projectName, shortName = "YT") {
  const body = {
    name: projectName,
    shortName: shortName,
    leader: { login: "admin" },
  };
  try {
    const res = await axios.post(`${youTrackUrl}/admin/projects`, body, {
      headers,
    });
    console.log(`✅ Kreiran novi projekat: ${res.data.name}`);
    return res.data;
  } catch (error) {
    console.log(error.data);
    throw error;
  }
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
      {
        $type: "SimpleIssueCustomField",
        name: "GitHubId",
        value: githubIssue.id.toString(),
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

async function addGithubIdCustomField(projectId) {
  try {
    // 1. Kreiraj field (ili ignoriši ako postoji)
    let fieldId;
    try {
      const res = await axios.post(
        `${youTrackUrl}/admin/customFieldSettings/customFields`,
        {
          name: "GitHubId",
          fieldType: {
            id: "string",
          },
        },
        { headers }
      );
      fieldId = res.data.id;
      console.log("✅ Field created:", fieldId);
    } catch (error) {
      if (error.response?.data.error_description?.includes("already exists")) {
        // Field već postoji, dobavi njegov ID
        const existingFields = await axios.get(
          `${youTrackUrl}/admin/customFieldSettings/customFields?fields=id,name`,
          { headers }
        );
        const githubField = existingFields.data.find(
          (f) => f.name === "GitHubId"
        );
        fieldId = githubField.id;
        console.log("✅ Field already exists:", fieldId);
      } else {
        throw error;
      }
    }

    // 2. ATTACH field na projekat (OVO TI FALI!)
    try {
      await axios.post(
        `${youTrackUrl}/admin/projects/${projectId}/customFields`,
        {
          $type: "SimpleProjectCustomField",
          field: {
            id: fieldId,
          },
        },
        { headers }
      );
      console.log("✅ Field attached to project");
    } catch (error) {
      if (
        error.response?.data.error_description?.includes("already attached")
      ) {
        console.log("✅ Field already attached to project");
      } else {
        throw error;
      }
    }

    return fieldId;
  } catch (error) {
    console.error("❌ Error with custom field:");
    console.error("Status:", error.response?.status);
    console.error("Error data:", JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

async function createIssue(projectId, issue, isInitalCreation = true) {
  if (isInitalCreation) await addGithubIdCustomField(projectId);

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

async function updateIssueById(projectId, issue, issueId) {
  const body = createIssueBody(projectId, issue);
  try {
    const res = await axios.post(`${youTrackUrl}/issues/${issueId}`, body, {
      headers,
    });
    console.log(`✅ Issue updated successfully: ${res.data}`);
    return res.data;
  } catch (error) {
    console.error("❌ Error creating issue:");
    console.error("Status:", error.response?.status);
    console.error("Error data:", JSON.stringify(error.response?.data, null, 2));
    console.error("Request body:", JSON.stringify(body, null, 2));
    throw error;
  }
}

async function findYouTrackIssueByGithubId(githubId) {
  const query = `GitHubId: ${githubId}`;
  const res = await axios.get(`${youTrackUrl}/issues`, {
    headers,
    params: {
      query,
      fields:
        "id,idReadable,summary,description,project(name),customFields(name,value(name))",
    },
  });
  console.log("ISSSUE", res.data);

  return res.data.length > 0 ? res.data[0] : null;
}

async function syncIsseToYouTrack(issue, repo) {
  const youTrackIssue = await findYouTrackIssueByGithubId(issue.id);
  const existingProject = await findProjectByName(repo);
  if (!youTrackIssue) {
    // new issue is created on github
    const result = await createIssue(existingProject.id, issue, false);
    console.log("Issue created!", result);
    return result;
  } else {
    // existing issue is updated on github
    const result = updateIssueById(existingProject.id, issue, youTrackIssue.id);
    console.log("Issue updated successfully!", result.data);
    return result;
  }
}

export {
  findProjectByName,
  createProject,
  createIssue,
  findYouTrackIssueByGithubId,
  createIssueBody,
  updateIssueById,
  syncIsseToYouTrack,
};
