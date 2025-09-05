const NodeMediaServer = require('node-media-server');

const config = {
  logType: 3,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8080,
    allow_origin: '*',
    mediaroot: './media',
  },
  trans: {
    ffmpeg: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        ac: 'aac',
        vc: 'libx264',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]'
      }
    ]
  }
};

const nms = new NodeMediaServer(config);

// Basic authentication: validate stream keys via query or stream path
// Basic authentication: validate stream keys against backend
nms.on('prePublish', async (id, StreamPath, args) => {
  // StreamPath like /live/<streamKey>
  const key = StreamPath.split('/').pop();
  try {
    const base = process.env.API_BASE || 'http://backend:8000/api';
    const resp = await fetch(`${base}/stream/${encodeURIComponent(key)}/hls`);
    if (!key || !resp.ok) {
      const session = nms.getSession(id);
      session && session.reject();
    }
  } catch {
    const session = nms.getSession(id);
    session && session.reject();
  }
});

nms.run();
