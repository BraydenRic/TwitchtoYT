import dotenv from 'dotenv';
import cron from 'node-cron';
import TwitchService from './services/twitchService.js';
import DownloadService from './services/downloadService.js';
import ShortsService from './services/shortsService.js';
import YouTubeService from './services/youtubeService.js';
import UploadTracker from './utils/uploadTracker.js';
import logger from './utils/logger.js';

dotenv.config();

class TwitchToYouTube {
  constructor() {
    this.twitchService = new TwitchService(
      process.env.TWITCH_CLIENT_ID,
      process.env.TWITCH_CLIENT_SECRET
    );
    this.downloadService = new DownloadService();
    this.shortsService = new ShortsService();
    this.youtubeService = new YouTubeService();
    this.uploadTracker = new UploadTracker();
  }

  async processClips() {
    try {
      logger.info('Starting clip processing...');

      const clipsCount = parseInt(process.env.CLIPS_COUNT) || 10;
      const clipsPeriod = process.env.CLIPS_PERIOD || 'day';
      const gameName = process.env.GAME_NAME;
      const language = process.env.LANGUAGE || null;

      let gameId = null;
      if (gameName) {
        gameId = await this.twitchService.getGameId(gameName);
      }

      const clips = await this.twitchService.getTopClips({
        gameId,
        period: clipsPeriod,
        count: clipsCount,
        language
      });

      if (clips.length === 0) {
        logger.warn('No clips found. Exiting.');
        return;
      }

      logger.info(`Found ${clips.length} clips. Filtering out already uploaded clips...`);

      // Filter out clips that have already been uploaded
      const newClips = clips.filter(clip => !this.uploadTracker.isUploaded(clip.id));
      logger.info(`${newClips.length} new clips to process (${clips.length - newClips.length} already uploaded)`);

      if (newClips.length === 0) {
        logger.info('All clips have already been uploaded. Nothing new to process.');
        return;
      }

      logger.info(`Starting download...`);

      const downloadedClips = await this.downloadService.downloadClips(newClips);

      if (downloadedClips.length === 0) {
        logger.error('Failed to download any clips. Exiting.');
        return;
      }

      logger.info(`Converting ${downloadedClips.length} clips to Shorts format...`);

      const uploadResults = [];
      for (let i = 0; i < downloadedClips.length; i++) {
        const dc = downloadedClips[i];
        const clip = dc.clip;

        try {
          logger.info(`Processing clip ${i + 1}/${downloadedClips.length}: ${clip.title}`);

          // Convert to vertical format for Shorts
          const verticalPath = await this.shortsService.processClipForShorts(dc.path, clip.id);

          logger.info(`Uploading to YouTube...`);

          const title = this.generateShortTitle(clip);
          const description = this.generateShortDescription(clip);
          const tags = (process.env.VIDEO_TAGS || 'twitch,clips,shorts').split(',').map(t => t.trim());
          const categoryId = process.env.VIDEO_CATEGORY_ID || '20';
          const privacyStatus = process.env.VIDEO_PRIVACY || 'public';

          const uploadResult = await this.youtubeService.uploadVideo(
            verticalPath,
            title,
            description,
            tags,
            categoryId,
            privacyStatus
          );

          logger.info(`✓ Uploaded: ${uploadResult.url}`);
          uploadResults.push(uploadResult);

          // Mark clip as uploaded
          this.uploadTracker.markAsUploaded(clip.id);

          // Add delay between uploads to avoid rate limiting
          if (i < downloadedClips.length - 1) {
            logger.info('Waiting 5 seconds before next upload...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (error) {
          logger.error(`Failed to process/upload clip ${clip.id}:`, error.message);
        }
      }

      this.downloadService.cleanupDownloads();
      this.shortsService.cleanupOutput();

      logger.info(`Process completed! Uploaded ${uploadResults.length}/${downloadedClips.length} clips`);

      return uploadResults;
    } catch (error) {
      logger.error('Error in processClips:', error);
      throw error;
    }
  }

  generateShortTitle(clip) {
    // Truncate title to fit YouTube limits (max 100 chars for Shorts)
    const baseTitle = clip.title.substring(0, 80);
    return `${baseTitle} #Shorts`;
  }

  generateShortDescription(clip) {
    return `${clip.title}

⚠️ DISCLAIMER: This is a clip compilation channel. I am NOT affiliated with any streamers featured.
All content belongs to the original creators.

Streamer: ${clip.broadcaster_name}
Clipped by: ${clip.creator_name}

🎮 Watch live: https://twitch.tv/${clip.broadcaster_name}
🔗 Original clip: ${clip.url}

This channel is a fan compilation showcasing highlights from ${process.env.GAME_NAME || 'gaming'} streams.
No copyright infringement intended. All rights belong to respective owners.

#Twitch #${clip.broadcaster_name.replace(/\s+/g, '')} #TwitchClips #Shorts #${process.env.GAME_NAME ? process.env.GAME_NAME.replace(/\s+/g, '') : 'Gaming'}`;
  }

  generateDescription(downloadedClips, date) {
    let description = (process.env.VIDEO_DESCRIPTION || 'Compilation of the best Twitch clips from {date}')
      .replace('{date}', date);

    description += '\n\nClips featured in this video:\n\n';

    downloadedClips.forEach((dc, index) => {
      const clip = dc.clip;
      description += `${index + 1}. "${clip.title}" by ${clip.broadcaster_name} (clipped by ${clip.creator_name})\n`;
      description += `   ${clip.url}\n\n`;
    });

    description += '\nAll clips belong to their respective owners.\n';

    return description;
  }

  startScheduler() {
    const cronSchedule = process.env.CRON_SCHEDULE || '0 9 * * *';

    logger.info(`Starting scheduler with cron: ${cronSchedule}`);

    cron.schedule(cronSchedule, async () => {
      logger.info('Scheduled job triggered');
      try {
        await this.processClips();
      } catch (error) {
        logger.error('Scheduled job failed:', error);
      }
    });

    logger.info('Scheduler started. Press Ctrl+C to stop.');
  }

  async runOnce() {
    logger.info('Running once...');
    await this.processClips();
  }
}

const app = new TwitchToYouTube();

const args = process.argv.slice(2);

if (args.includes('--once')) {
  app.runOnce()
    .then(() => {
      logger.info('Done!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Failed:', error);
      process.exit(1);
    });
} else if (args.includes('--auth')) {
  logger.info('Starting YouTube authentication...');
  const youtubeService = new YouTubeService();
  youtubeService.getAuthUrl()
    .then((url) => {
      logger.info('Please visit this URL to authorize the application:');
      console.log('\n' + url + '\n');
      logger.info('After authorization, run: node src/index.js --save-token <code>');
    })
    .catch((error) => {
      logger.error('Failed to get auth URL:', error);
      process.exit(1);
    });
} else if (args.includes('--save-token')) {
  const codeIndex = args.indexOf('--save-token') + 1;
  const code = args[codeIndex];

  if (!code) {
    logger.error('Please provide the authorization code');
    process.exit(1);
  }

  logger.info('Saving token...');
  const youtubeService = new YouTubeService();

  const credentialsPath = './config/client_secret.json';
  const fs = await import('fs');
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const { google } = await import('googleapis');
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  oauth2Client.getToken(code)
    .then(({ tokens }) => {
      fs.writeFileSync('./config/token.json', JSON.stringify(tokens, null, 2));
      logger.info('Token saved successfully! You can now run the application.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Failed to save token:', error);
      process.exit(1);
    });
} else {
  app.startScheduler();
}
