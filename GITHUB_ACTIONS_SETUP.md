# GitHub Actions Setup Guide

This guide will help you set up automatic daily uploads using GitHub Actions (completely free!).

## Prerequisites

1. Push this repository to GitHub (if you haven't already)
2. Have your YouTube and Twitch API credentials ready

## Step 1: Set Up GitHub Secrets

GitHub Secrets store sensitive credentials securely. Go to your repository on GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets (click "New repository secret" for each):

#### 1. `TWITCH_CLIENT_ID`
- Value: Your Twitch Client ID from https://dev.twitch.tv/console/apps

#### 2. `TWITCH_CLIENT_SECRET`
- Value: Your Twitch Client Secret

#### 3. `YOUTUBE_CLIENT_SECRET`
- Value: The **entire contents** of your `config/client_secret.json` file
- Copy the whole JSON file content, including the curly braces

#### 4. `YOUTUBE_TOKEN`
- Value: The **entire contents** of your `config/token.json` file
- If you don't have this file yet:
  1. Run `npm start -- --auth` locally
  2. Follow the authentication flow
  3. Run `npm start -- --save-token <code>`
  4. Copy the contents of the generated `config/token.json`

## Step 2: Set Up GitHub Variables (Optional Settings)

These are non-sensitive configuration options:

**Settings → Secrets and variables → Actions → Variables tab → New repository variable**

| Variable Name | Default Value | Description |
|--------------|---------------|-------------|
| `CLIPS_COUNT` | `10` | Number of clips to process |
| `CLIPS_PERIOD` | `day` | Options: day, week, month, all |
| `GAME_NAME` | `Just Chatting` | Game/category to fetch clips from |
| `LANGUAGE` | `en` | Language filter (e.g., en, es, fr) |
| `VIDEO_TAGS` | `twitch,clips,shorts,gaming,highlights` | YouTube video tags |
| `VIDEO_CATEGORY_ID` | `20` | YouTube category (20 = Gaming) |
| `VIDEO_PRIVACY` | `public` | Options: public, unlisted, private |

## Step 3: Adjust the Schedule (Optional)

The workflow runs daily at 9:00 AM UTC by default. To change this:

1. Edit `.github/workflows/upload-clips.yml`
2. Find the line: `- cron: '0 9 * * *'`
3. Change to your preferred time using cron syntax:
   - `0 0 * * *` = Midnight UTC
   - `0 12 * * *` = Noon UTC
   - `0 18 * * *` = 6:00 PM UTC
   - `0 */6 * * *` = Every 6 hours

**Tip:** Convert UTC to your timezone! If you're EST (UTC-5), 9:00 AM UTC = 4:00 AM EST

## Step 4: Push to GitHub

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push
```

## Step 5: Test the Workflow

Don't wait for the scheduled time! Test it now:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Upload Twitch Clips to YouTube** workflow
4. Click **Run workflow** button (right side)
5. Click the green **Run workflow** button

You'll see the workflow start running. Click on it to see live logs!

## Monitoring

### View Logs
- Go to **Actions** tab on GitHub
- Click on any workflow run
- Click on the **upload-clips** job
- Expand steps to see detailed logs

### Download Logs
- Logs are automatically saved as artifacts for 7 days
- Scroll to bottom of workflow run page
- Download `logs-{run-number}` artifact

## Troubleshooting

### "YouTube token expired" error
Your OAuth token expires periodically. To refresh:
1. Run authentication flow locally (`npm start -- --auth`)
2. Get new token with `npm start -- --save-token <code>`
3. Update the `YOUTUBE_TOKEN` secret on GitHub with new `config/token.json` content

### "No clips found" error
- Try removing or changing the `LANGUAGE` variable
- Change `GAME_NAME` to a more popular category
- Increase `CLIPS_PERIOD` to "week" or "month"

### Workflow not running on schedule
- GitHub Actions can be delayed up to 15 minutes during high load
- Ensure the repository is public or you have Actions minutes available
- Check the Actions tab for any error messages

## Important Notes

1. **YouTube API Quota**: You have 10,000 units/day. Each upload costs ~1,600 units, so you can upload ~6 videos per day safely.

2. **Keep Secrets Updated**: If you regenerate any API credentials locally, remember to update the corresponding GitHub Secret.

3. **Public Repositories**: GitHub Actions is completely free for public repos with 2,000 minutes/month (way more than you need).

4. **Private Repositories**: You get 2,000 free minutes/month. Each run uses about 2-5 minutes, so ~400-1000 runs per month.

## Success!

Once set up, your workflow will:
- ✅ Run automatically every day at the scheduled time
- ✅ Fetch top Twitch clips
- ✅ Convert them to Shorts format
- ✅ Upload to YouTube
- ✅ Track which clips were already uploaded (using Git to persist the tracker)
- ✅ Save logs for debugging

No PC needed - GitHub does all the work! 🎉
