const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all devices
app.use(cors());

// Serve static files
app.use(express.static('public'));

// Parse M3U file and group by channel
function parseM3U(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
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
app.get('/api/channels', (req, res) => {
  try {
    const channels = parseM3U(path.join(__dirname, 'vn.m3u'));
    res.json({ success: true, channels: channels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get M3U file
app.get('/api/playlist.m3u', (req, res) => {
  try {
    const m3uPath = path.join(__dirname, 'vn.m3u');
    res.setHeader('Content-Type', 'application/x-mpegURL');
    res.sendFile(m3uPath);
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
