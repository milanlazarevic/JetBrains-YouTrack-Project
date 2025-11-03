# 🔄 GitHub → YouTrack Issue Synchronizer



## How to run
1. Clone the repository: `git clone https://github.com/milanlazarevic/JetBrains-YouTrack-Project.git`
2. Add `env file` to the root of project folder and setup `.env` variables (explained bellow).
3. Open it in terminal `cd JetBrains-YouTrack-Project/`
4. Install packages `npm install`
5. Start ngrok tunnel (for webhook testing) `npx ngrok http 3000`
6. Copy the public URL from the ngrok output and paste it into your .env file as WEBHOOK_URL.
7. Run server in other terminal `node src/server.js`. If everything is correct you should see:
   <img width="882" height="99" alt="image" src="https://github.com/user-attachments/assets/6a85aced-25e4-48c4-8f64-de937c0b0274" />
   <img width="879" height="537" alt="image" src="https://github.com/user-attachments/assets/dfcb43af-065e-46d7-97f0-d3331a2373f9" />
8. This means your Github issues are imported correctly and you can check YouTrack account. You should see your project and issues. Example:
   <img width="1458" height="780" alt="image" src="https://github.com/user-attachments/assets/dce522da-52e7-4718-a96f-6840af7f4a82" />
   <img width="971" height="577" alt="image" src="https://github.com/user-attachments/assets/76290415-0060-461c-ad48-44b11ad146ec" />





## Setup `.env` file
```bash
WEBHOOK_URL=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_TOKEN=...
GITHUB_OWNER=your_github_username
GITHUB_REPO=github_repo_name_to_extract_issues_from
YOUTRACK_URL=...
YOUTRACK_TOKEN=...
```
1. 🛠️ How to Create a Webhook url
- First setup ngrok. Go to ngrok website and create account and copy token from here: `https://dashboard.ngrok.com/get-started/your-authtoken`
- Then run this command in command line to auth your ngrok: `ngrok config add-authtoken YOUR_TOKEN`
- Now run `npx ngrok config check` to check everything is done correctly
- Run ngrok `npx ngrok http 3000` and copy the public url part. It will look something like this:
  `Forwarding https://lucrative-public-url-seamus.ngrok-free.dev -> http://localhost:3000` Copy the public url to the webhook url and add sufix `/issue-updated`
- Final example looks like this: `https://luc-public-url-seamus.ngrok-free.dev/issue-updated`
2. 🛠️ How to Create a GitHub Webhook secret
- Just enter random secret you want to use for hashing (e.g klsdfjksdjhskdhfjhsdfjkl)
- `NOTE:` When you create webhook you will send this secret and webhook will use it when hashing requests to the server. So any updated inside .env file
  while there is already created webhook with other secret will result in invalid signature. That means you need to watch for logs inside your github repository settings > webhooks > your webhook. It might be the reason of some weird bugs.
3. 🛠️ How to Create a GitHub Personal Access Token
- Go to GitHub.com > Settings > Developer Settings.
- Click “Personal access tokens” → Tokens (classic)
- Click “Generate new token”
- Select the expiration date and scopes (e.g., repo, workflow, user, gist) (I selected one year expiration and checked almost everything)
- Click Generate token.
4. 🛠️ How to Create a YouTrack url
- Go to: `https://www.jetbrains.com/youtrack/` and write instance name and your email and click `Get started for free`.
- Or if you already have youtrack project management instance just copy url and add /api sufix
- Your YOUTRACK_URL should look like this: `https://internshipproject.youtrack.cloud/api`
5. 🛠️ How to Create a YouTrack permanent token
- Go to your YouTrack management instance on `https://internshipproject.youtrack.cloud`
- Profile icon in lower left corner > Click profile > Account Security > New token
- Copy the token to the env file and you are ready

## What app will do

- Start a local Express.js server
- Connect to GitHub and YouTrack
- Import issues from GitHub into YouTrack (if the project doesn’t already exist)
- Register a GitHub webhook pointing to your ngrok public URL
- Synchronize every change on Github issue to YouTrack issues
