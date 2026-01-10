import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class YouTubeService {
  constructor() {
    this.youtube = null;
    this.oauth2Client = null;
  }

  async authenticate() {
    try {
      const credentialsPath = path.join(__dirname, '../../config/client_secret.json');
      const tokenPath = path.join(__dirname, '../../config/token.json');

      if (!fs.existsSync(credentialsPath)) {
        throw new Error(
          'client_secret.json not found. Please download it from Google Cloud Console and place it in the config folder.'
        );
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        this.oauth2Client.setCredentials(token);
        logger.info('Using existing YouTube authentication token');
      } else {
        logger.warn('No token found. Please run the authentication flow first.');
        throw new Error('YouTube authentication required. Run setup first.');
      }

      this.youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });

      logger.info('Successfully authenticated with YouTube API');
    } catch (error) {
      logger.error('Failed to authenticate with YouTube:', error.message);
      throw error;
    }
  }

  async getAuthUrl() {
    const credentialsPath = path.join(__dirname, '../../config/client_secret.json');

    if (!fs.existsSync(credentialsPath)) {
      throw new Error('client_secret.json not found');
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.upload']
    });

    return authUrl;
  }

  async saveToken(code) {
    const tokenPath = path.join(__dirname, '../../config/token.json');

    const { tokens } = await this.oauth2Client.getToken(code);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    logger.info('Token saved successfully');
  }

  async uploadVideo(videoPath, title, description, tags = [], categoryId = '20', privacyStatus = 'public') {
    try {
      if (!this.youtube) {
        await this.authenticate();
      }

      logger.info(`Uploading video to YouTube: ${title}`);

      const fileSize = fs.statSync(videoPath).size;

      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title,
            description: description,
            tags: tags,
            categoryId: categoryId
          },
          status: {
            privacyStatus: privacyStatus
          }
        },
        media: {
          body: fs.createReadStream(videoPath)
        }
      }, {
        onUploadProgress: (evt) => {
          const progress = (evt.bytesRead / fileSize) * 100;
          logger.info(`Upload progress: ${Math.round(progress)}%`);
        }
      });

      const videoId = response.data.id;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      logger.info(`Successfully uploaded video: ${videoUrl}`);

      return {
        id: videoId,
        url: videoUrl,
        title: response.data.snippet.title
      };
    } catch (error) {
      logger.error('Failed to upload video to YouTube:', error.message);
      if (error.response && error.response.data) {
        logger.error('YouTube API Error Details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async updateVideo(videoId, title, description, tags = []) {
    try {
      if (!this.youtube) {
        await this.authenticate();
      }

      logger.info(`Updating video ${videoId} on YouTube`);

      const response = await this.youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            title: title,
            description: description,
            tags: tags,
            categoryId: '20'
          }
        }
      });

      logger.info('Successfully updated video');
      return response.data;
    } catch (error) {
      logger.error('Failed to update video:', error.message);
      throw error;
    }
  }
}

export default YouTubeService;
