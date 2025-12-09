const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;
const R2_URL = 'https://pub-568f762f56824ac2bb129e7ddb48fd43.r2.dev/vn.m3u';
const CACHE_FILE = path.join(__dirname, '.m3u_cache');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Enable CORS for all devices
app.use(cors());

// Serve static files
app.use(express.static('public'));

// Fetch M3U file from R2 with cache
async function fetchM3UFromR2() {
  try {
    // Check cache
    if (fs.existsSync(CACHE_FILE)) {
      const stats = fs.statSync(CACHE_FILE);
      const age = Date.now() - stats.mtimeMs;
      if (age < CACHE_TTL) {
        console.log('📦 Using cached M3U file');
        return fs.readFileSync(CACHE_FILE, 'utf8');
      }
    }

    console.log('📡 Fetching M3U from R2...');
    const response = await fetch(R2_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusCode}`);
    }
    const content = await response.text();
    
    // Save to cache
    fs.writeFileSync(CACHE_FILE, content);
    console.log('💾 Cached M3U file');
    return content;
  } catch (error) {
    console.error('❌ Error fetching from R2:', error.message);
    // Fallback to local file if R2 fails
    const localPath = path.join(__dirname, 'vn.m3u');
    if (fs.existsSync(localPath)) {
      console.log('⚠️  Falling back to local vn.m3u');
      return fs.readFileSync(localPath, 'utf8');
    }
    throw error;
  }
}

// Parse M3U file and group by channel
function parseM3U(content) {
  const lines = content.split('\n');
  const channelMap = new Map();
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const info = lines[i];
      const url = lines[i + 1] ? lines[i + 1].trim() : '';
      
      if (url && url.startsWith('http')) {
        // Extract channel name and quality
        const lastCommaIndex = info.lastIndexOf(',');
        const fullName = lastCommaIndex !== -1 
          ? info.substring(lastCommaIndex + 1).trim() 
          : 'Unknown Channel';
        
        // Extract tvg-id which contains channel name and quality
        const idMatch = info.match(/tvg-id="([^"]+)"/);
        const tvgId = idMatch ? idMatch[1] : '';
        
        // Extract tvg-logo
        const logoMatch = info.match(/tvg-logo="([^"]+)"/);
        const tvgLogo = logoMatch ? logoMatch[1] : '';
        
        // Parse channel name and quality from tvg-id or full name
        let channelName = fullName;
        let quality = '360p'; // default
        
        // Try to parse from tvg-id first (e.g., "vtv1@720p")
        if (tvgId.includes('@')) {
          const parts = tvgId.split('@');
          channelName = parts[0];
          quality = parts[1];
        } else {
          // Try to parse from full name (e.g., "vtv1 (720p)")
          const qualityMatch = fullName.match(/\((\d+p)\)/);
          if (qualityMatch) {
            quality = qualityMatch[1];
            channelName = fullName.replace(/\s*\(\d+p\)/i, '').trim();
          }
        }
        
        const channelId = channelName.replace(/\s+/g, '-').toLowerCase();
        
        // Group streams by channel
        if (!channelMap.has(channelId)) {
          channelMap.set(channelId, {
            id: channelId,
            name: channelName,
            logo: tvgLogo,
            qualities: {}
          });
        }
        
        channelMap.get(channelId).qualities[quality] = url;
      }
    }
  }
  
  // Convert map to array and sort qualities
  return Array.from(channelMap.values()).map(channel => {
    // Sort qualities: 720p > 480p > 360p
    const sortedQualities = {};
    ['720p', '480p', '360p'].forEach(q => {
      if (channel.qualities[q]) {
        sortedQualities[q] = channel.qualities[q];
      }
    });
    
    // If no standard qualities found, use whatever is available
    if (Object.keys(sortedQualities).length === 0) {
      Object.assign(sortedQualities, channel.qualities);
    }
    
    return {
      id: channel.id,
      name: channel.name,
      logo: channel.logo,
      qualities: sortedQualities
    };
  });
}

// API endpoint to get channel list
app.get('/api/channels', async (req, res) => {
  try {
    const content = await fetchM3UFromR2();
    const channels = parseM3U(content);
    res.json({ success: true, channels: channels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get M3U file
app.get('/api/playlist.m3u', async (req, res) => {
  try {
    const content = await fetchM3UFromR2();
    res.setHeader('Content-Type', 'application/x-mpegURL');
    res.send(content);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ TV Stream Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📺 Truy cập để xem TV từ mọi thiết bị`);
});
