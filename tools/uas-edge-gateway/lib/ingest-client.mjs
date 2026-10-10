export function createIngestClient({ base, token }) {
  const root = base.replace(/\/$/, '');
  const headers = {
    'Content-Type': 'application/json',
    'x-os-atlas-uas-ingest': token,
  };
  return {
    async post(path, body) {
      const response = await fetch(`${root}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${path} ${response.status}: ${text}`);
      }
      return response.json();
    },
  };
}
