import { createAssetDirectorySource } from '../director/packs/source.js';
import { createApplicationTools } from '../app/tools.js';
import { startStandaloneChrome } from './startupChrome.js';
import { initMissionShell } from '../mission/missionShell.js';
import { isOsAtlas } from '../product/os-atlas.js';

export function createStandaloneTools(options) {
  return (context) => {
    const tools = createApplicationTools({
      startChrome: startStandaloneChrome,
      sceneDataPacks: {
        sources: {
          assets: createAssetDirectorySource({
            baseUrl: new URL('/scene-assets/', window.location.href).href,
          }),
        },
      },
      ...options,
      ...context,
    });
    if (isOsAtlas()) {
      const missionShell = initMissionShell({ dataManager: context.dataManager });
      context.defer(() => missionShell?.destroy());
    }
    return tools;
  };
}
