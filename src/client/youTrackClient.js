import axios from "axios";

const youTrackUrl = process.env.YOUTRACK_URL;

const headers = {
  Authorization: `Bearer ${process.env.YOUTRACK_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};
/**
 * Find YouTrack project by project name. If it exists it is returned else
 * null is returned. Used when we want if there is already project with the same name.
 * In that case we're skipping creation of project.
 *
 * @param {string} projectName - Project name.
 * @returns {Promise<object>} Project or null
 */
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
/**
 * Created YouTrack new YouTrack project for the given name.
 * Both parameters should be unique if not error will be thrown.
 *
 * @param {string} projectName - Project name.
 * @param {string} shortName - Short name.
 * @returns {Promise<object>} Project
 */
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
    console.log(`✅ New project created: ${projectName}`);
    return res.data;
  } catch (error) {
    console.log(
      "❌ Error occured when creating YouTrack project. ",
      error?.data
    );
    throw error;
  }
}

/**
 * Created YouTrack issue body from the github issue.
 * Project id is used to determine to which YouTrack project
 * issue will be attached.
 *
 * @param {string} projectId - Project id.
 * @param {string} githubIssue - Github issue body to extract data from.
 * @returns {object} YouTrack issue.
 */
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

  // TODO: this part is not yet finished because I needed to map github users to YT users. I should
  // first create yt user from github user and it needed one more request to github to find fullname and email
  // and other request to create YT user. I created the second method but didn't have time to finish it so I removed it
  // and commented this if statement. But it is completely doable.

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

/**
 * When we want to sync Github issues with YouTrack we must add custom field
 * called GithubId that will store issue id from github so we can find issue that is
 * updated later. We create new custom field and attach it to the project.
 *
 * @param {string} projectId - Project id.
 * @returns {Promise<number>} YouTrack issue field id.
 */
async function addGithubIdCustomField(projectId) {
  try {
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
      console.log("✅ Field created with field id:", fieldId);
    } catch (error) {
      if (error.response?.data.error_description?.includes("already exists")) {
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
    console.log("❌ Error with custom field:");
    console.log("❌ Status:", error.response?.status);
    console.log(
      "❌ Error data:",
      JSON.stringify(error.response?.data, null, 2)
    );
    throw error;
  }
}

/**
 * Created YouTrack issue from the github issue.
 * Project id is used to determine to which YouTrack project
 * issue will be attached. Using createIssueBody to generate YT issue body from
 * GitHub issue.
 *
 * @param {string} projectId - Project id.
 * @param {string} issue - Github issue body to extract data from.
 * @returns {Promise<object>} YouTrack issue.
 */
async function createIssue(projectId, issue) {
  const body = createIssueBody(projectId, issue);
  try {
    const res = await axios.post(`${youTrackUrl}/issues`, body, {
      headers,
    });
    console.log(`✅ New issue created with id: ${res.data.id}`);
    return res.data;
  } catch (error) {
    console.log("❌ Error creating issue:");
    console.log("❌ Status:", error.response?.status);
    console.log(
      "❌ Error data:",
      JSON.stringify(error.response?.data, null, 2)
    );
    console.log("❌ Request body:", JSON.stringify(body, null, 2));
    throw error;
  }
}

/**
 * Update YouTrack issue from the github issue.
 * When github webhook sends request this method might be called to update existing issue
 * on YouTrack.
 *
 * @param {string} projectId - Project id.
 * @param {string} issue - Github issue body to extract data from.
 * @param {string} issueId - YouTrack issue id.
 * @returns {Promise<object>} YouTrack issue.
 */
async function updateIssueById(projectId, issue, issueId) {
  const body = createIssueBody(projectId, issue);
  try {
    const res = await axios.post(`${youTrackUrl}/issues/${issueId}`, body, {
      headers,
    });
    return res.data;
  } catch (error) {
    console.log("❌ Error creating issue:");
    console.log("❌ Status:", error.response?.status);
    console.log(
      "❌ Error data:",
      JSON.stringify(error.response?.data, null, 2)
    );
    console.log("❌ Request body:", JSON.stringify(body, null, 2));
    throw error;
  }
}

/**
 * Find if there exists YouTrack issue that is linked with the given github id.
 * If there is not that means new issue is created and if it exists it means
 * old issue is updated.
 *
 * @param {string} githubId - github issue id.
 * @returns {Promise<object>} YouTrack issue or null.
 */
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

  return res.data.length > 0 ? res.data[0] : null;
}

/**
 * Determines which method will be called: Create new issue or update issue. Determinition is made
 * with method findYouTrackIssueByGithubId. If there is not YouTrack issue that means new issue is created and if it exists it means
 * old issue is updated.
 *
 * @param {string} issue - github issue.
 * @param {string} repo - Repository to find project on YouTrack
 * @returns {Promise<object>} YouTrack issue or null.
 */
async function syncIsseToYouTrack(issue, repo) {
  const youTrackIssue = await findYouTrackIssueByGithubId(issue.id);
  const existingProject = await findProjectByName(repo);
  if (!youTrackIssue) {
    // new issue is created on github
    const result = await createIssue(existingProject.id, issue, false);
    return result;
  } else {
    // existing issue is updated on github
    const result = updateIssueById(existingProject.id, issue, youTrackIssue.id);
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
  addGithubIdCustomField,
};
