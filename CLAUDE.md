# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Twitch to YouTube automation tool that fetches popular Twitch clips and uploads them as individual YouTube Shorts. The application uses ES modules (type: "module" in package.json).

## Key Commands

### Development
```bash
npm install              # Install dependencies
npm start -- --once      # Run once without scheduling (test mode)
npm start                # Run with cron scheduler
npm run dev              # Run with auto-reload on file changes
```

### YouTube Authentication Setup
```bash
npm start -- --auth                    # Get OAuth URL
npm start -- --save-token <code>       # Save OAuth token after authorization
```

### Prerequisites
- Node.js v18+
- FFmpeg installed and in PATH (`ffmpeg -version` to verify)
- yt-dlp installed (`yt-dlp --version` to verify) - required for downloading Twitch clips

## Architecture

### Main Application Flow (src/index.js)

The application has three execution modes controlled by command-line arguments:
1. `--once`: Single execution without scheduling
2. `--auth` / `--save-token`: YouTube OAuth setup
3. Default: Starts cron scheduler

**Core workflow in processClips():**
1. Fetch clips from Twitch (with optional language filtering)
2. Download clips using yt-dlp
3. Convert each clip to vertical format (1080x1920) for YouTube Shorts
4. Upload each clip individually to YouTube with 5-second delays between uploads
5. Cleanup temporary files

### Service Architecture

**TwitchService** (`src/services/twitchService.js`):
- Handles Twitch API authentication using client credentials flow
- Fetches top clips with language filtering capability
- When `LANGUAGE` is set, fetches 3x the requested count, filters by broadcaster language, then returns top N
- Includes `getChannelLanguages()` to batch-fetch broadcaster languages for filtering

**DownloadService** (`src/services/downloadService.js`):
- Uses `yt-dlp` command-line tool to download Twitch clips
- Downloads directly from clip URLs (not using thumbnail URL manipulation)
- Returns array of {path, clip} objects

**ShortsService** (`src/services/shortsService.js`):
- Converts horizontal clips to vertical format (1080x1920) with black bars
- Trims clips longer than 60 seconds to meet YouTube Shorts requirements
- Uses FFmpeg with preset='fast' and crf=23 for encoding

**YouTubeService** (`src/services/youtubeService.js`):
- Handles OAuth 2.0 authentication flow
- Requires `config/client_secret.json` (from Google Cloud Console)
- Generates `config/token.json` after first authentication
- Uploads videos with progress tracking

### Environment Configuration

Key environment variables:
- `LANGUAGE=en` - Filters clips to English-speaking channels only
- `CLIPS_PERIOD` - Options: day, week, month, all
- `GAME_NAME` - Specific game/category (e.g., "Just Chatting", "League of Legends")
- `CLIPS_COUNT` - Number of clips to process per run

### Important Implementation Details

1. **Clip Download**: Uses yt-dlp instead of direct HTTP requests because Twitch's clip URLs require special handling
2. **Language Filtering**: Fetches broadcaster channel info separately to filter by `broadcaster_language` field
3. **Shorts Format**: Converts all clips to 9:16 aspect ratio (1080x1920) to ensure YouTube recognizes them as Shorts
4. **Rate Limiting**: 5-second delay between uploads to avoid YouTube API rate limiting
5. **Title Format**: Appends "#Shorts" to all titles for YouTube Shorts algorithm
6. **Description Format**: Includes streamer info, clip URL, and relevant hashtags

### Logging

Uses Winston logger (`src/utils/logger.js`):
- Console output with colors and timestamps
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

### Temporary Files

- `downloads/` - Downloaded clips (cleaned after upload)
- `output/` - Converted vertical videos (cleaned after upload)
- Both directories are auto-created if missing

## API Quotas

YouTube API has 10,000 units/day quota. Each video upload costs ~1,600 units. Monitor usage at:
https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

## Common Issues

1. **yt-dlp missing**: Install with `sudo apt install yt-dlp` (Linux) or `brew install yt-dlp` (macOS)
2. **FFmpeg not found**: Verify installation with `ffmpeg -version`
3. **No clips found with language filter**: Language filtering may exclude many clips; try without `LANGUAGE` env var
4. **OAuth token expired**: Re-run authentication flow with `--auth` and `--save-token`
