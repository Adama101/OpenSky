import { createActionTools } from '../../../src/voice/actionSchemas.js';
import { ACTION_DESCRIPTIONS } from './toolDescriptions.js';

/** Voice tools safe for the closed OS Atlas layer catalog. */
const OS_ATLAS_TOOL_NAMES = new Set([
  'fly_to_location',
  'adjust_camera_zoom',
  'zoom_to_globe',
  'set_layer_visibility',
  'show_data_layers_menu',
  'set_panel_open',
  'set_context_mode',
  'control_cockpit',
  'set_visual_style',
  'get_entity_context',
  'get_current_view_state',
  'set_hud',
  'set_cyber_sonar',
  'set_detection',
  'set_map_stack',
  'set_post_processing',
  'control_scene',
  'track_entity',
  'stop_tracking',
  'frame_overhead',
  'annotate_map',
  'clear_annotations',
  'move_camera',
]);

const osAtlasDescriptions = Object.fromEntries(
  Object.entries(ACTION_DESCRIPTIONS).filter(([name]) =>
    OS_ATLAS_TOOL_NAMES.has(name),
  ),
);

export const OS_ATLAS_REALTIME_TOOLS = createActionTools(osAtlasDescriptions);
