import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoService {
  constructor(outputDir = path.join(__dirname, '../../output')) {
    this.outputDir = outputDir;
    this.ensureOutputDirExists();
  }

  ensureOutputDirExists() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async combineClips(clipPaths, outputFileName = null) {
    if (clipPaths.length === 0) {
      throw new Error('No clips to combine');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = outputFileName || `combined_${timestamp}.mp4`;
    const outputPath = path.join(this.outputDir, outputFile);

    logger.info(`Combining ${clipPaths.length} clips into ${outputFile}...`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      clipPaths.forEach(clipPath => {
        command.input(clipPath);
      });

      command
        .on('start', (commandLine) => {
          logger.info('FFmpeg process started');
          logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.info(`Processing: ${Math.round(progress.percent)}% done`);
          }
        })
        .on('end', () => {
          logger.info(`Successfully combined clips into ${outputFile}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error('Error combining clips:', error.message);
          reject(error);
        })
        .mergeToFile(outputPath, this.outputDir);
    });
  }

  async addIntroOutro(videoPath, introPath = null, outroPath = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `final_${timestamp}.mp4`;
    const outputPath = path.join(this.outputDir, outputFile);

    logger.info('Adding intro/outro to video...');

    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      if (introPath && fs.existsSync(introPath)) {
        command.input(introPath);
      }

      command.input(videoPath);

      if (outroPath && fs.existsSync(outroPath)) {
        command.input(outroPath);
      }

      command
        .on('end', () => {
          logger.info('Successfully added intro/outro');
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error('Error adding intro/outro:', error.message);
          reject(error);
        })
        .mergeToFile(outputPath, this.outputDir);
    });
  }

  async createTitleCard(text, duration = 3) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `title_${timestamp}.mp4`;
    const outputPath = path.join(this.outputDir, outputFile);

    logger.info('Creating title card...');

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`color=c=black:s=1920x1080:d=${duration}`)
        .inputFormat('lavfi')
        .videoFilter([
          {
            filter: 'drawtext',
            options: {
              text: text.replace(/'/g, "\\'"),
              fontsize: 60,
              fontcolor: 'white',
              x: '(w-text_w)/2',
              y: '(h-text_h)/2'
            }
          }
        ])
        .on('end', () => {
          logger.info('Successfully created title card');
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error('Error creating title card:', error.message);
          reject(error);
        })
        .save(outputPath);
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
}

export default VideoService;
