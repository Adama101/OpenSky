import { startApplicationChrome } from '../app/startupChrome.js';
import { initKeySetup } from '../keySetup.js';
import { isOsAtlas } from '../product/os-atlas.js';
import { initOsAtlasMissionEntry } from '../osAtlasMissionEntry.js';
import { initOsAtlasAdminConfig } from '../osAtlasAdminConfig.js';
import { initFirstRunExperience } from '../firstRunExperience.js';

export function startStandaloneChrome(options) {
  return startApplicationChrome({
    initializeSettings: isOsAtlas() ? initOsAtlasAdminConfig : initKeySetup,
    initializeWelcome: isOsAtlas()
      ? initOsAtlasMissionEntry
      : initFirstRunExperience,
    ...options,
  });
}
