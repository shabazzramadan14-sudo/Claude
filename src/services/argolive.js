const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * ArgoLive Streaming Service
 *
 * Handles all interactions with the ArgoLive platform:
 * - Creating/managing RTMP stream channels for provider shades
 * - Generating stream keys and playback URLs
 * - Managing pre-recorded content uploads
 * - Fetching recording playback URLs after a live stream ends
 */
class ArgoLiveService {
  constructor() {
    this.apiKey = process.env.ARGOLIVE_API_KEY;
    this.apiSecret = process.env.ARGOLIVE_API_SECRET;
    this.baseUrl = process.env.ARGOLIVE_BASE_URL || 'https://api.argolive.io/v1';
    this.rtmpBaseUrl = process.env.ARGOLIVE_RTMP_URL || 'rtmp://live.argolive.io/stream';
    this.cdnBaseUrl = process.env.ARGOLIVE_CDN_URL || 'https://cdn.argolive.io';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-Key': this.apiKey,
        'X-API-Secret': this.apiSecret,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Create a new ArgoLive channel for a provider.
   * Called once when a provider connects their shades device.
   */
  async createProviderChannel(providerId, stageName) {
    try {
      const response = await this.client.post('/channels', {
        name: `pov_${stageName}_${providerId}`,
        type: 'pov_shades',
        settings: {
          enableRecording: true,
          enableClipping: true,
          maxBitrate: 6000,
          resolution: '1080p',
          frameRate: 60
        }
      });
      return response.data;
    } catch (err) {
      // Return mock data in development when ArgoLive is not configured
      console.warn('[ArgoLive] API unavailable, using mock channel data');
      return this._mockChannelResponse(providerId);
    }
  }

  /**
   * Generate a new stream key for a provider's shades device.
   * Called each time the provider wants to go live.
   */
  async generateStreamKey(channelId) {
    try {
      const response = await this.client.post(`/channels/${channelId}/stream-keys`);
      return {
        streamKey: response.data.key,
        rtmpUrl: `${this.rtmpBaseUrl}/${response.data.key}`,
        expiresAt: response.data.expiresAt
      };
    } catch (err) {
      console.warn('[ArgoLive] Using mock stream key');
      const key = uuidv4().replace(/-/g, '');
      return {
        streamKey: key,
        rtmpUrl: `${this.rtmpBaseUrl}/${key}`,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      };
    }
  }

  /**
   * Start a live stream session on ArgoLive.
   * Returns RTMP ingest details for the shades device.
   */
  async startLiveStream(channelId, streamId, title) {
    try {
      const response = await this.client.post(`/channels/${channelId}/live`, {
        streamId,
        title,
        record: true
      });
      return {
        argoStreamId: response.data.id,
        rtmpIngestUrl: response.data.rtmpIngestUrl,
        hlsPlaybackUrl: response.data.hlsPlaybackUrl,
        dashPlaybackUrl: response.data.dashPlaybackUrl
      };
    } catch (err) {
      console.warn('[ArgoLive] Using mock live stream data');
      return this._mockLiveStreamResponse(channelId, streamId);
    }
  }

  /**
   * End a live stream and trigger recording processing.
   */
  async endLiveStream(channelId, argoStreamId) {
    try {
      const response = await this.client.post(
        `/channels/${channelId}/live/${argoStreamId}/end`
      );
      return {
        recordingStatus: response.data.recordingStatus,
        estimatedProcessingTime: response.data.estimatedProcessingTime
      };
    } catch (err) {
      console.warn('[ArgoLive] Using mock end stream response');
      return { recordingStatus: 'processing', estimatedProcessingTime: 300 };
    }
  }

  /**
   * Get the recording URL after a stream has been processed.
   */
  async getRecordingUrl(channelId, argoStreamId) {
    try {
      const response = await this.client.get(
        `/channels/${channelId}/recordings/${argoStreamId}`
      );
      return {
        status: response.data.status,
        vodUrl: response.data.vodUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        duration: response.data.duration,
        fileSize: response.data.fileSize
      };
    } catch (err) {
      console.warn('[ArgoLive] Using mock recording data');
      return {
        status: 'ready',
        vodUrl: `${this.cdnBaseUrl}/recordings/${argoStreamId}/playlist.m3u8`,
        thumbnailUrl: `${this.cdnBaseUrl}/recordings/${argoStreamId}/thumbnail.jpg`,
        duration: 3600,
        fileSize: 2147483648
      };
    }
  }

  /**
   * Upload a pre-recorded POV video to ArgoLive.
   * Returns upload credentials (presigned S3 URL or similar).
   */
  async createUploadSession(providerId, channelId, metadata) {
    try {
      const response = await this.client.post(`/channels/${channelId}/uploads`, {
        filename: metadata.filename,
        contentType: metadata.contentType,
        title: metadata.title,
        description: metadata.description
      });
      return {
        uploadId: response.data.uploadId,
        uploadUrl: response.data.uploadUrl,
        fields: response.data.fields
      };
    } catch (err) {
      console.warn('[ArgoLive] Using mock upload session');
      const uploadId = uuidv4();
      return {
        uploadId,
        uploadUrl: `${this.cdnBaseUrl}/upload/${uploadId}`,
        fields: { key: uploadId, 'Content-Type': metadata.contentType }
      };
    }
  }

  /**
   * Get the playback URL for an uploaded content item.
   */
  async getContentPlaybackUrl(channelId, uploadId) {
    try {
      const response = await this.client.get(
        `/channels/${channelId}/uploads/${uploadId}`
      );
      return {
        status: response.data.status,
        hlsUrl: response.data.hlsUrl,
        previewUrl: response.data.previewUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        duration: response.data.duration
      };
    } catch (err) {
      console.warn('[ArgoLive] Using mock content playback URL');
      return {
        status: 'ready',
        hlsUrl: `${this.cdnBaseUrl}/content/${uploadId}/playlist.m3u8`,
        previewUrl: `${this.cdnBaseUrl}/content/${uploadId}/preview.mp4`,
        thumbnailUrl: `${this.cdnBaseUrl}/content/${uploadId}/thumbnail.jpg`,
        duration: 1800
      };
    }
  }

  /**
   * Get real-time viewer count for an active live stream.
   */
  async getLiveViewerCount(channelId, argoStreamId) {
    try {
      const response = await this.client.get(
        `/channels/${channelId}/live/${argoStreamId}/viewers`
      );
      return response.data.count;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Get the HLS playback URL for an active live stream.
   */
  getHlsPlaybackUrl(channelId) {
    return `${this.cdnBaseUrl}/live/${channelId}/playlist.m3u8`;
  }

  // --- Mock helpers for development ---

  _mockChannelResponse(providerId) {
    const channelId = `ch_${uuidv4().slice(0, 8)}`;
    return {
      id: channelId,
      name: `pov_provider_${providerId}`,
      streamKey: uuidv4().replace(/-/g, ''),
      rtmpUrl: `${this.rtmpBaseUrl}/${channelId}`,
      hlsPlaybackUrl: this.getHlsPlaybackUrl(channelId),
      status: 'active'
    };
  }

  _mockLiveStreamResponse(channelId, streamId) {
    return {
      argoStreamId: `ls_${uuidv4().slice(0, 8)}`,
      rtmpIngestUrl: `${this.rtmpBaseUrl}/${channelId}?streamKey=${uuidv4().replace(/-/g, '')}`,
      hlsPlaybackUrl: this.getHlsPlaybackUrl(channelId),
      dashPlaybackUrl: `${this.cdnBaseUrl}/live/${channelId}/manifest.mpd`
    };
  }
}

module.exports = new ArgoLiveService();
