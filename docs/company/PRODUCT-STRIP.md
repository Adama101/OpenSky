# OS Atlas product strip checklist

Default product mode: `VITE_PRODUCT=os-atlas` (legacy public OSINT: `VITE_PRODUCT=gev`).

## Removed from default catalog and server routes

| Layer / feature | Layer ID |
| --- | --- |
| Global flights (OpenSky) | `flights` |
| Military flights (adsb.lol) | `military` |
| Military installations | `military-installations` |
| Military awareness | `military-awareness` |
| Public CCTV catalog | `cctv` |
| Radio Browser | `radio` |
| Bikeshare | `bikeshare` |
| Transit | `transit` |
| Simulated traffic | `traffic` |
| Rocket launches | `rocket-launches` |
| Satellite TLE watch | `satellites` |
| OSM ALPR | `alpr-cameras` |
| Recent imagery browse | `recent-imagery` |
| Submarine cables | `telegeography-submarine-cables` |
| Global infra overlays | `local-dams`, `local-datacenters` |
| Nepal demo scene | `bhote-koshi-2026`, `bhote-koshi-locator` |
| Directions joyride | `directions` |
| Consumer first-run missions | replaced by OS Atlas mission entry |
| POWER UP key setup UI | replaced by env/admin configuration |

## Phase 0 retained (tenant-toggled where noted)

| Capability | Layer ID / notes |
| --- | --- |
| Local ADS-B edge | `local-adsb` (local-only) |
| AIS vessels | `ais-live-vessels` — requires `VITE_TENANT_AIS_ENABLED` + `AISSTREAM_API_KEY` |
| Weather / wind / cyclones | `weather-*`, `wind`, `weather-cyclones` |
| Hazards | `earthquakes`, `fire-perimeters`, `local-firms` |
| Morocco site pack | `morocco-site-pack` |
| Tenant CCTV stub | `tenant-cctv` |
| Satellite tasking stub | `satellite-tasking` |
| UAS live (Vehicle Adapter) | `uas-live` — edge ingest via `/api/uas/*` |

## Server

- OS Atlas stack: `server/providers/local-os-atlas.js`
- Auth: `OS_ATLAS_SESSION_TOKEN` + `x-os-atlas-session` header (health and auth routes public)
- Mission API: `GET/POST /api/missions`, search, phase, evidence, telemetry replay
- UAS ingest: `POST /api/uas/assets`, `/telemetry`, `/detections`; browser `GET /api/uas/snapshot`
- Edge reference: `tools/uas-edge-gateway/index.mjs`

## QA scope

Prefer `npm run test:os-atlas` and `npm run test:uas-ingest` for catalog and ingest checks. Legacy GEV QA scripts (`qa-radio`, `qa-transit`, `qa-cctv-v2`, etc.) apply only when `VITE_PRODUCT=gev`.
