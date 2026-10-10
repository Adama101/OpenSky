# UAS / ATLAS parity checklist

Reference UX: [TEKEVER ATLAS](https://www.tekever.com/atlas/) (public materials only).  
Architecture: [OPENSKY-CORP.md](./OPENSKY-CORP.md) §8–11.

| TEKEVER (public) | OS Atlas capability | Status |
| --- | --- | --- |
| Prepare mission brief | `/api/missions` + mission shell (brief phase) | Implemented |
| Define AOI / objectives on map | Mission `aois`, `objectives` JSON | Implemented |
| Choose aircraft / parameters | `assignedAssetIds`, UAS `registerAsset` | Implemented |
| Approval workflow | `approvalStatus` stub + audit log entries | Stub |
| Follow live video + metadata | `uas-live` layer + video panel + `/api/uas/snapshot` | Implemented |
| Flight path / timeline scrub | Telemetry persistence + review scrubber | Implemented |
| Wind / surface layers | Existing `wind`, AIS (tenant) | Existing |
| Search live / past missions | `GET /api/missions/search?bbox=&phase=` | Implemented |
| Replay as live | `GET /api/missions/:id/telemetry?at=` | Implemented |
| Vessel correlation | `POST /api/missions/:id/evidence` with `aisMmsi` | Implemented |
| DJI-class minimum | Edge gateway → ingest API (no Mobile SDK in browser) | Providers + runbook |
| Brokered HLS video | `/api/uas/media` CCTV-style pull | Implemented |
| Mission persistence | `server/data/missions.json` | Implemented |
| Field preflight | `npm run field:preflight` | Implemented |

Vehicle Adapter SDK (server):

| SDK method | HTTP |
| --- | --- |
| `registerAsset()` | `POST /api/uas/assets` |
| `uploadMission()` | `POST /api/uas/missions/:id/upload` |
| `telemetryStream()` | `POST /api/uas/telemetry` |
| `detectionStream()` | `POST /api/uas/detections` |
| `videoStream()` | Asset `video` field + `GET /api/uas/stream/:assetId` |
| `health()` | `GET /api/uas/health` |
