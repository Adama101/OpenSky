# DJI field test runbook (OS Atlas)

Operator-of-record and local aviation rules apply; OS Atlas is decision-support only.

## Topology

| Role | Host | Notes |
| --- | --- | --- |
| COP | Laptop running `npm run dev` | Browser + OS Atlas API |
| Edge | Same laptop or field tablet | `npm run field:edge` posts telemetry/video |

## Preflight

```bash
cp .env.example .env
# Set OS_ATLAS_SESSION_TOKEN, OS_ATLAS_UAS_INGEST_TOKEN
npm run field:preflight
```

## Mission flow

1. Open OS Atlas, enter session token when prompted.
2. Mission panel → create mission → save AOI polygon (GeoJSON).
3. Copy **UAS_EDGE_MISSION_ID** from the panel.
4. Start live → enable **UAS live** layer.
5. In another terminal:

```bash
export OS_ATLAS_UAS_INGEST_TOKEN=...
export UAS_EDGE_MISSION_ID=<paste mission uuid>
# Simulated bench:
npm run field:edge
# DJI RTSP (when available):
# UAS_EDGE_RTSP_URL=rtsp://... UAS_EDGE_TELEMETRY_MODE=json UAS_EDGE_TELEMETRY_JSON=./telemetry.jsonl npm run field:edge
```

6. Confirm cyan track on globe; open layer row for staleness hints.
7. End mission → Review → scrub replay → **Export evidence JSON**.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 401 on API | Session token in browser storage |
| Ingest 401 | `x-os-atlas-uas-ingest` matches `.env` |
| No track | `GET /api/uas/snapshot`, gateway logs |
| No video | HLS URL ends in `.m3u8`; ffmpeg running; server can reach edge HLS host (`UAS_EDGE_ALLOWED_HOSTS`) |
| Stale track | Link loss >15s; label shows stale |

## Compliance

- Customer remains UAS operator of record.
- Do not embed DJI SDK in the browser; use edge gateway only.
