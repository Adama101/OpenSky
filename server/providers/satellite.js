/** Satellite tasking status stub for OS Atlas Phase 0. */
export function satelliteTaskingProxy() {
  const install = (middlewares) => {
    middlewares.use('/api/satellite', (req, res) => {
      const path = (req.url || '').split('?')[0];
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (path === '/status' || path === '/status/') {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ready: false,
            message: 'Satellite tasking pending tenant provider configuration',
            layers: [],
          }),
        );
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not_found' }));
    });
  };
  return {
    name: 'satellite-tasking-proxy',
    configureServer: install,
    configurePreviewServer: install,
  };
}
