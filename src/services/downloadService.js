import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DownloadService {
  constructor(downloadDir = path.join(__dirname, '../../downloads')) {
    this.downloadDir = downloadDir;
    this.ensureDownloadDirExists();
  }

  ensureDownloadDirExists() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async downloadClip(clipUrl, clipId) {
    const filePath = path.join(this.downloadDir, `${clipId}.mp4`);

    try {
      logger.info(`Downloading clip ${clipId}...`);

      // Use yt-dlp to download the clip
      const command = `yt-dlp -f best -o "${filePath}" "${clipUrl}"`;

      await execAsync(command, { timeout: 60000 });

      if (fs.existsSync(filePath)) {
        logger.info(`Successfully downloaded clip ${clipId}`);
        return filePath;
      } else {
        throw new Error('File was not created');
      }
    } catch (error) {
      logger.error(`Error downloading clip ${clipId}:`, error.message);
      throw error;
    }
  }

  async downloadClips(clips) {
    const downloadedPaths = [];

    for (const clip of clips) {
      try {
        const filePath = await this.downloadClip(clip.url, clip.id);
        downloadedPaths.push({
          path: filePath,
          clip: clip
        });
      } catch (error) {
        logger.warn(`Skipping clip ${clip.id} due to download error`);
      }
    }

    logger.info(`Downloaded ${downloadedPaths.length} out of ${clips.length} clips`);
    return downloadedPaths;
  }

  cleanupDownloads() {
    try {
      const files = fs.readdirSync(this.downloadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.downloadDir, file));
      }
      logger.info('Cleaned up download directory');
    } catch (error) {
      logger.error('Failed to cleanup downloads:', error.message);
    }
  }
}

export default DownloadService;
