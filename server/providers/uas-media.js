import { createHlsPuller } from './cctv/stream.js';
import { watchDownstreamClose } from './cctv/media.js';
import { getAsset } from '../product/uas-store.js';
import { validateEdgeVideoUrl } from '../product/uas-edge-url.js';

const UAS_MEDIA_BASE = '/api/uas/media';

/** Shared HLS pull sessions for brokered UAS sensor video. */
export function createUasHlsPuller() {
  return createHlsPuller();
}

/**
 * Handle GET /api/uas/media/:assetId and segment subpaths (mounted under /api/uas).
 * @param {ReturnType<createUasHlsPuller>} puller
 */
export async function handleUasMediaRequest(req, res, path, puller) {
  const match = /^\/media\/([^/]+)(?:\/(seg_(\d+)\.ts))?$/.exec(path);
  if (!match) {
    res.statusCode = 404;
    res.end();
    return;
  }
  const assetId = decodeURIComponent(match[1]);
  const asset = getAsset(assetId);
  const mediaUrl = asset?.video?.upstreamUrl || '';
  const feedType = asset?.video?.feedType || 'none';
  const url = new URL(req.url || '', 'http://localhost');
  const leaseId = url.searchParams.get('lease');

  if (feedType !== 'hls') {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'asset has no HLS feed' }));
    return;
  }
  const checked = validateEdgeVideoUrl(mediaUrl);
  if (!checked.ok) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: checked.reason }));
    return;
  }
  if (!/^[a-f0-9-]{36}$/i.test(leaseId || '')) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'lease query param required (UUID)' }));
    return;
  }
  if (req.method === 'DELETE') {
    puller.release(assetId, leaseId);
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end();
    return;
  }
  if (!/\.m3u8(?:\?|$)/i.test(checked.url.href)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'upstream must be an HLS playlist URL' }));
    return;
  }
  if (match[2]) {
    const body = puller.getSegment(
      assetId,
      url.searchParams.get('session'),
      Number(match[3]),
      leaseId,
    );
    res.statusCode = body ? 200 : 404;
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body || undefined);
    return;
  }
  const downstream = watchDownstreamClose(res);
  let entry;
  const cancelPending = () => {
    if (entry) puller.release(assetId, leaseId);
  };
  try {
    entry = await puller.ensure(assetId, checked.url.href, leaseId);
    if (downstream.closed) {
      cancelPending();
      return;
    }
    downstream.signal.addEventListener('abort', cancelPending, { once: true });
    if (!(await puller.waitReady(entry, downstream.signal)))
      throw new Error('Stream unavailable');
    const playlist = await puller.buildPlaylist(
      entry,
      assetId,
      leaseId,
      UAS_MEDIA_BASE,
    );
    if (downstream.closed) return;
    if (!playlist) throw new Error('Stream unavailable');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-UAS-Source', 'hls-pull');
    res.setHeader('X-UAS-Session', entry.token);
    res.end(playlist);
  } catch {
    if (!downstream.closed) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'uas_stream_unavailable' }));
    }
    cancelPending();
  }
}
