import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** RTSP (e.g. DJI link) → local HLS for OS Atlas brokered ingest. */
export function startFfmpegHlsBridge({
  rtspUrl,
  port = 8099,
  outputDir,
} = {}) {
  if (!rtspUrl) return { hlsUrl: null, stop: () => {} };
  const dir =
    outputDir || fs.mkdtempSync(path.join(os.tmpdir(), 'os-atlas-hls-'));
  const playlist = path.join(dir, 'index.m3u8');
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-rtsp_transport',
    'tcp',
    '-i',
    rtspUrl,
    '-c:v',
    'copy',
    '-f',
    'hls',
    '-hls_time',
    '2',
    '-hls_list_size',
    '6',
    '-hls_flags',
    'delete_segments+append_list',
    playlist,
  ];
  const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
  const hlsUrl = `http://127.0.0.1:${port}/index.m3u8`;
  const server = http.createServer((req, res) => {
    const file = path.join(dir, req.url.replace(/^\//, '') || 'index.m3u8');
    if (!file.startsWith(dir)) {
      res.statusCode = 403;
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      if (file.endsWith('.m3u8'))
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      else if (file.endsWith('.ts'))
        res.setHeader('Content-Type', 'video/mp2t');
      res.end(data);
    });
  });
  server.listen(port, '127.0.0.1');
  return {
    hlsUrl,
    stop() {
      server.close();
      proc.kill('SIGTERM');
    },
  };
}
