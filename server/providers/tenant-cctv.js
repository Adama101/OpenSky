/** Tenant VMS registry stub — replace with customer RTSP/ONVIF config. */
export function tenantCctvProxy() {
  const install = (middlewares) => {
    middlewares.use('/api/tenant-cctv', (req, res) => {
      const path = (req.url || '').split('?')[0];
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (path === '/sources' || path === '/sources/') {
        res.statusCode = 200;
        res.end(JSON.stringify({ sources: [] }));
        return;
      }
      if (path === '/health' || path === '/health/') {
        res.statusCode = 200;
        res.end(JSON.stringify({ cameras: [] }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not_found' }));
    });
  };
  return { name: 'tenant-cctv-proxy', configureServer: install, configurePreviewServer: install };
}
