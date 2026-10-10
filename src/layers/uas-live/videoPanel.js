import Hls from 'hls.js';

/** Side panel for brokered UAS sensor video (HLS via OS Atlas proxy). */
export function createUasVideoPanel({ documentRef = globalThis.document } = {}) {
  let root = null;
  let videoEl = null;
  let labelEl = null;
  let hls = null;

  const destroyHls = () => {
    hls?.destroy();
    hls = null;
  };

  const ensure = () => {
    if (root?.isConnected) return root;
    root = documentRef.createElement('aside');
    root.className = 'os-atlas-uas-video';
    root.hidden = true;
    root.innerHTML = `
      <header><strong>Sensor video</strong></header>
      <p class="os-atlas-uas-video__label"></p>
      <video class="os-atlas-uas-video__player" playsinline muted controls></video>
      <p class="os-atlas-uas-video__hint">Stream is brokered server-side; stale links are labeled on the globe.</p>`;
    labelEl = root.querySelector('.os-atlas-uas-video__label');
    videoEl = root.querySelector('video');
    documentRef.body?.append(root);
    return root;
  };

  return {
    show({ assetId, label, mediaUrl, feedType, leaseId }) {
      ensure();
      root.hidden = false;
      if (labelEl)
        labelEl.textContent = `${label || assetId} · ${feedType || 'unknown'}`;
      destroyHls();
      if (!videoEl || feedType !== 'hls' || !mediaUrl) {
        videoEl?.removeAttribute('src');
        return;
      }
      const lease =
        leaseId ||
        (globalThis.crypto?.randomUUID
          ? globalThis.crypto.randomUUID()
          : '00000000-0000-4000-8000-000000000001');
      const url = `${mediaUrl}?lease=${encodeURIComponent(lease)}`;
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(videoEl);
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
      }
    },
    hide() {
      if (root) root.hidden = true;
      destroyHls();
      if (videoEl) videoEl.removeAttribute('src');
    },
    destroy() {
      destroyHls();
      root?.remove();
      root = null;
      videoEl = null;
      labelEl = null;
    },
  };
}
