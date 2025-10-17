import axios from 'axios';
import logger from '../utils/logger.js';

class TwitchService {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  async authenticate() {
    try {
      logger.info('Authenticating with Twitch API...');

      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);

      logger.info('Successfully authenticated with Twitch API');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to authenticate with Twitch API:', error.message);
      throw error;
    }
  }

  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  async getGameId(gameName) {
    try {
      await this.ensureValidToken();

      const response = await axios.get('https://api.twitch.tv/helix/games', {
        params: { name: gameName },
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.data.data.length === 0) {
        throw new Error(`Game "${gameName}" not found`);
      }

      return response.data.data[0].id;
    } catch (error) {
      logger.error(`Failed to get game ID for "${gameName}":`, error.message);
      throw error;
    }
  }

  async getTopClips({ gameId = null, period = 'day', count = 10, language = null }) {
    try {
      await this.ensureValidToken();

      if (!gameId) {
        gameId = await this.getDefaultGameId();
      }

      logger.info(`Fetching top ${count} clips for period: ${period} (Game ID: ${gameId})${language ? ` (Language: ${language})` : ''}`);

      // Fetch more clips than needed to account for filtering
      const fetchCount = language ? count * 3 : count;

      const params = {
        first: Math.min(fetchCount, 100), // Twitch API limit is 100
        started_at: this.getStartDate(period),
        ended_at: new Date().toISOString(),
        game_id: gameId
      };

      const response = await axios.get('https://api.twitch.tv/helix/clips', {
        params,
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      let clips = response.data.data;

      // Filter by language if specified
      if (language) {
        const broadcasterIds = [...new Set(clips.map(c => c.broadcaster_id))];
        const channelLanguages = await this.getChannelLanguages(broadcasterIds);

        clips = clips.filter(clip => {
          const channelLang = channelLanguages[clip.broadcaster_id];
          return channelLang === language;
        });

        logger.info(`Filtered to ${clips.length} ${language} clips`);
        clips = clips.slice(0, count);
      }

      logger.info(`Successfully fetched ${clips.length} clips`);

      return clips.map(clip => ({
        id: clip.id,
        url: clip.url,
        embed_url: clip.embed_url,
        broadcaster_id: clip.broadcaster_id,
        broadcaster_name: clip.broadcaster_name,
        creator_name: clip.creator_name,
        video_id: clip.video_id,
        game_id: clip.game_id,
        title: clip.title,
        view_count: clip.view_count,
        created_at: clip.created_at,
        thumbnail_url: clip.thumbnail_url,
        duration: clip.duration,
        vod_offset: clip.vod_offset
      }));
    } catch (error) {
      logger.error('Failed to fetch clips:', error.message);
      throw error;
    }
  }

  async getChannelLanguages(broadcasterIds) {
    try {
      await this.ensureValidToken();

      const languageMap = {};

      // Batch requests in groups of 100 (API limit)
      for (let i = 0; i < broadcasterIds.length; i += 100) {
        const batch = broadcasterIds.slice(i, i + 100);

        const response = await axios.get('https://api.twitch.tv/helix/channels', {
          params: { broadcaster_id: batch },
          headers: {
            'Client-ID': this.clientId,
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        response.data.data.forEach(channel => {
          languageMap[channel.broadcaster_id] = channel.broadcaster_language;
        });
      }

      return languageMap;
    } catch (error) {
      logger.warn('Failed to fetch channel languages:', error.message);
      return {};
    }
  }

  async getDefaultGameId() {
    const popularGames = ['League of Legends', 'Grand Theft Auto V', 'Fortnite', 'Valorant', 'Minecraft'];

    for (const gameName of popularGames) {
      try {
        return await this.getGameId(gameName);
      } catch (error) {
        continue;
      }
    }

    throw new Error('Could not find a default game. Please specify GAME_NAME in .env');
  }

  getStartDate(period) {
    const now = new Date();

    switch (period) {
      case 'day':
        now.setDate(now.getDate() - 1);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        now.setFullYear(now.getFullYear() - 1);
        break;
      default:
        now.setDate(now.getDate() - 1);
    }

    return now.toISOString();
  }

  getClipDownloadUrl(clip) {
    const thumbnailUrl = clip.thumbnail_url;

    // Try the standard method first
    let slicePoint = thumbnailUrl.indexOf('-preview-');
    if (slicePoint !== -1) {
      const baseUrl = thumbnailUrl.slice(0, slicePoint);
      return `${baseUrl}.mp4`;
    }

    // Alternative method for newer clip URLs
    const url = new URL(thumbnailUrl);
    const pathParts = url.pathname.split('/');
    const clipSlug = pathParts[pathParts.length - 2];

    // Build the download URL
    const baseUrl = `https://clips-media-assets2.twitch.tv/${clipSlug}`;
    return `${baseUrl}.mp4`;
  }
}

export default TwitchService;
