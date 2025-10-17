import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ShortsService {
  constructor(outputDir = path.join(__dirname, '../../output')) {
    this.outputDir = outputDir;
    this.ensureOutputDirExists();
  }

  ensureOutputDirExists() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async convertToVertical(inputPath, clipId) {
    const outputPath = path.join(this.outputDir, `${clipId}_vertical.mp4`);

    logger.info(`Converting clip ${clipId} to vertical format...`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
          '-c:a', 'copy',
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23'
        ])
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug(`Converting: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          logger.info(`Successfully converted clip ${clipId} to vertical format`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error(`Error converting clip ${clipId}:`, error.message);
          reject(error);
        })
        .save(outputPath);
    });
  }

  async processClipForShorts(inputPath, clipId) {
    try {
      // Check if clip is already under 60 seconds and get dimensions
      const metadata = await this.getVideoInfo(inputPath);
      const duration = metadata.format.duration;

      if (duration > 60) {
        logger.warn(`Clip ${clipId} is ${duration}s long, trimming to 60s`);
        const trimmedPath = await this.trimTo60Seconds(inputPath, clipId);
        return await this.convertToVertical(trimmedPath, clipId);
      }

      return await this.convertToVertical(inputPath, clipId);
    } catch (error) {
      logger.error(`Failed to process clip ${clipId} for Shorts:`, error.message);
      throw error;
    }
  }

  async trimTo60Seconds(inputPath, clipId) {
    const trimmedPath = path.join(this.outputDir, `${clipId}_trimmed.mp4`);

    logger.info(`Trimming clip ${clipId} to 60 seconds...`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(0)
        .setDuration(60)
        .outputOptions([
          '-c:v', 'copy',
          '-c:a', 'copy'
        ])
        .on('end', () => {
          logger.info(`Successfully trimmed clip ${clipId}`);
          resolve(trimmedPath);
        })
        .on('error', (error) => {
          logger.error(`Error trimming clip ${clipId}:`, error.message);
          reject(error);
        })
        .save(trimmedPath);
    });
  }

  getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (error, metadata) => {
        if (error) {
          reject(error);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  cleanupOutput() {
    try {
      const files = fs.readdirSync(this.outputDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.outputDir, file));
      }
      logger.info('Cleaned up output directory');
    } catch (error) {
      logger.error('Failed to cleanup output:', error.message);
    }
  }
}

export default ShortsService;
