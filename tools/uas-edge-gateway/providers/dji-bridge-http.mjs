import http from 'node:http';

/**
 * Local HTTP ingest for a future Android DJI SDK companion app.
 * POST /sample JSON { lat, lon, altM, headingDeg, groundSpeedMps, mode }
 */
export function startDjiBridgeHttp({ port = 8098, onSample } = {}) {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/sample') {
      let body = '';
      req.on('data', (c) => {
        body += c;
      });
      req.on('end', () => {
        try {
          const sample = JSON.parse(body || '{}');
          onSample({
            t: new Date().toISOString(),
            lat: sample.lat,
            lon: sample.lon,
            altM: sample.altM,
            headingDeg: sample.headingDeg,
            groundSpeedMps: sample.groundSpeedMps,
            mode: sample.mode || 'dji-bridge',
          });
          res.statusCode = 204;
          res.end();
        } catch {
          res.statusCode = 400;
          res.end();
        }
      });
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  server.listen(port, '127.0.0.1');
  return () => server.close();
}
