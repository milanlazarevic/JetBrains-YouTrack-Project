# 🔄 GitHub → YouTrack Issue Synchronizer


## Setup `.env` file
```bash
WEBHOOK_URL=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...
YOUTRACK_URL=...
YOUTRACK_TOKEN=...
```

## How to run
1. Clone the repository: `git clone https://github.com/milanlazarevic/JetBrains-YouTrack-Project.git`
2. Open it in terminal
3. Install packages `npm install`
4. Start ngrok tunnel (for webhook testing) `npx ngrok http 3000`
5. Copy the public URL from the ngrok output and paste it into your .env file as WEBHOOK_URL.
6. Run server `node src/server.js`

## What app will do

- Start a local Express.js server
- Connect to GitHub and YouTrack
- Import issues from GitHub into YouTrack (if the project doesn’t already exist)
- Register a GitHub webhook pointing to your ngrok public URL
- Synchronize every change on Github issue to YouTrack issues
