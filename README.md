# Twitch to YouTube Automation

Automatically fetch the most popular Twitch clips daily and compile them into a single video that gets uploaded to YouTube.

## Features

- Fetch top Twitch clips by game or overall
- Download and combine clips into a single video using FFmpeg
- Automatic upload to YouTube with customizable metadata
- Scheduled execution using cron
- Comprehensive logging
- Configurable video settings

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- FFmpeg (required for video processing)
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Installation

1. Clone the repository:
```bash
cd /path/to/TwitchtoYT
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

## Configuration

### 1. Twitch API Setup

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Copy the Client ID and Client Secret
4. Add them to your `.env` file:
```
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
```

### 2. YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the YouTube Data API v3
4. Create OAuth 2.0 credentials (Desktop application)
5. Download the credentials JSON file
6. Rename it to `client_secret.json` and place it in the `config` folder

### 3. YouTube Authentication

Run the authentication process:
```bash
npm start -- --auth
```

This will output a URL. Visit the URL in your browser, authorize the application, and copy the authorization code.

Save the token:
```bash
npm start -- --save-token YOUR_AUTHORIZATION_CODE
```

### 4. Environment Variables

Edit the `.env` file to configure your settings:

```env
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

CLIPS_COUNT=10
CLIPS_PERIOD=day
GAME_NAME=

CRON_SCHEDULE=0 9 * * *

VIDEO_TITLE=Top Twitch Clips - {date}
VIDEO_DESCRIPTION=Compilation of the best Twitch clips from {date}
VIDEO_TAGS=twitch,clips,gaming,highlights
VIDEO_CATEGORY_ID=20
VIDEO_PRIVACY=public
```

#### Configuration Options:

- `CLIPS_COUNT`: Number of clips to fetch (default: 10)
- `CLIPS_PERIOD`: Time period for clips: `day`, `week`, `month`, `all` (default: day)
- `GAME_NAME`: Optional - Fetch clips for a specific game (e.g., "Fortnite", "League of Legends")
- `CRON_SCHEDULE`: Cron expression for scheduling (default: 9 AM daily)
  - `0 9 * * *` - Every day at 9 AM
  - `0 */6 * * *` - Every 6 hours
  - `0 12 * * 0` - Every Sunday at noon
- `VIDEO_TITLE`: Title template for YouTube video ({date} will be replaced)
- `VIDEO_DESCRIPTION`: Description template ({date} will be replaced)
- `VIDEO_TAGS`: Comma-separated list of tags
- `VIDEO_CATEGORY_ID`: YouTube category ID (20 = Gaming)
- `VIDEO_PRIVACY`: Video privacy status: `public`, `private`, or `unlisted`

## Usage

### Run Once (Test Mode)

Process clips and upload once without scheduling:
```bash
npm start -- --once
```

### Run Scheduler

Start the application with automatic scheduling:
```bash
npm start
```

This will run the process according to your `CRON_SCHEDULE` setting.

### Development Mode

Run with auto-reload on file changes:
```bash
npm run dev
```

## Project Structure

```
TwitchtoYT/
├── config/                 # Configuration files
│   ├── client_secret.json # YouTube OAuth credentials
│   └── token.json         # YouTube auth token (generated)
├── downloads/             # Temporary clip downloads
├── logs/                  # Application logs
│   ├── combined.log      # All logs
│   └── error.log         # Error logs only
├── output/               # Combined video output
├── src/
│   ├── services/
│   │   ├── twitchService.js     # Twitch API integration
│   │   ├── downloadService.js   # Video downloading
│   │   ├── videoService.js      # Video processing with FFmpeg
│   │   └── youtubeService.js    # YouTube upload
│   ├── utils/
│   │   └── logger.js            # Winston logger
│   └── index.js                 # Main application
├── .env                  # Environment variables
├── .env.example         # Environment template
└── package.json         # Dependencies
```

## How It Works

1. The application authenticates with the Twitch API
2. Fetches the top clips based on your configuration
3. Downloads each clip as an MP4 file
4. Combines all clips into a single video using FFmpeg
5. Uploads the combined video to YouTube with metadata
6. Cleans up temporary files
7. Logs all activities

## Scheduling Examples

Common cron schedule patterns:

- `0 9 * * *` - Every day at 9:00 AM
- `0 */12 * * *` - Every 12 hours
- `0 0 * * 0` - Every Sunday at midnight
- `30 8 * * 1-5` - Weekdays at 8:30 AM
- `0 20 * * *` - Every day at 8:00 PM

## Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed and available in your PATH:
```bash
ffmpeg -version
```

### YouTube authentication failed
1. Ensure `client_secret.json` is in the `config` folder
2. Re-run the authentication process
3. Make sure you're using the correct Google account

### No clips found
1. Check if the game name is correct (case-sensitive)
2. Try increasing the time period
3. Remove `GAME_NAME` to fetch clips from all games

### Video upload failed
1. Check your YouTube API quota
2. Verify the video file exists in the `output` folder
3. Check logs for detailed error messages

## Logs

Logs are stored in the `logs` directory:
- `combined.log`: All application logs
- `error.log`: Error logs only

## Cleanup

Downloaded clips and output videos are automatically cleaned up after each successful upload. Manual cleanup:

```bash
rm -rf downloads/* output/* logs/*.log
```

## License

MIT

## Disclaimer

This tool is for educational purposes. Make sure you comply with:
- Twitch Terms of Service
- YouTube Terms of Service
- Copyright laws and fair use policies
- Individual streamer's content policies

Always credit the original content creators in your video descriptions.
