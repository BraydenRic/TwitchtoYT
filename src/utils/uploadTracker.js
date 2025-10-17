import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRACKER_FILE = path.join(__dirname, '../../config/uploaded_clips.json');

class UploadTracker {
  constructor() {
    this.ensureTrackerFile();
  }

  ensureTrackerFile() {
    if (!fs.existsSync(TRACKER_FILE)) {
      fs.writeFileSync(TRACKER_FILE, JSON.stringify({ clips: [] }, null, 2));
    }
  }

  getUploadedClips() {
    const data = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf-8'));
    return new Set(data.clips);
  }

  markAsUploaded(clipId) {
    const data = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf-8'));
    if (!data.clips.includes(clipId)) {
      data.clips.push(clipId);
      fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2));
    }
  }

  isUploaded(clipId) {
    const uploaded = this.getUploadedClips();
    return uploaded.has(clipId);
  }
}

export default UploadTracker;
