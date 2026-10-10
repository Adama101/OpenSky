import { firmsProxy } from './firms.js';
import { terrainHeightsProxy } from './terrain.js';
import { regionalBriefProxy } from './regional/briefing.js';
import { geocodeProxy } from './regional/place.js';
import { weatherEffectsProxy } from './regional/weather-effects.js';
import { localReceiversProxy } from './local-receivers.js';
import { aisLiveProxy } from './vessels/ais-live.js';
import { openAiRealtimeProxy } from './openai.js';
import { googlePlacesContextProxy } from './places.js';
import { weatherProxy } from './weather.js';
import { firePerimetersProxy } from './firePerimeters.js';
import { cycloneProxy } from './cyclones.js';
import { windProxy } from './wind.js';
import { tenantCctvProxy } from './tenant-cctv.js';
import { satelliteTaskingProxy } from './satellite.js';
import { missionApiProxy } from './mission.js';
import { uasApiProxy } from './uas.js';
import { uasMockPlugin } from './uas-mock.js';

/** Phase 0 provider stack — no public OSINT proxies. */
export function osAtlasProviderPlugins() {
  return [
    firmsProxy(),
    terrainHeightsProxy(),
    regionalBriefProxy(),
    geocodeProxy(),
    weatherEffectsProxy(),
    localReceiversProxy(),
    aisLiveProxy(),
    openAiRealtimeProxy(),
    googlePlacesContextProxy(),
    windProxy(),
    weatherProxy(),
    cycloneProxy(),
    firePerimetersProxy(),
    tenantCctvProxy(),
    satelliteTaskingProxy(),
    missionApiProxy(),
    uasApiProxy(),
    uasMockPlugin(),
  ];
}
