/** Единый протокол: SW ↔ content script ↔ страница студии. */

export const BRIDGE_SOURCE = 'png-maker-bridge' as const;

export const EXT_JOBS_KEY = 'extJobs';
export const MENU_EXPORTS_KEY = 'menuExports';
export const STUDIO_ORIGIN_KEY = 'studioOrigin';

export const MENU_ADD = 'png-maker-add';
export const MENU_SAVE_PARENT = 'png-maker-save';
export const MENU_SAVE_PREFIX = 'png-maker-save:';

export const MSG_JOBS = 'png-maker:jobs';
export const MSG_PULL_JOBS = 'png-maker:pull-jobs';
export const MSG_STUDIO_READY = 'png-maker:studio-ready';

export type MenuExport = { id: string; name: string };

export type ExtJob =
  | {
      id: string;
      kind: 'add';
      base64: string;
      mime: string;
      name: string;
    }
  | {
      id: string;
      kind: 'save';
      presetId: string;
      base64: string;
      mime: string;
      name: string;
    }
  | {
      id: string;
      kind: 'error';
      message: string;
    };

export type BridgeToPage =
  | { source: typeof BRIDGE_SOURCE; type: 'JOB'; job: ExtJob }
  | { source: typeof BRIDGE_SOURCE; type: 'BRIDGE_READY' };

export type BridgeFromPage =
  | {
      source: typeof BRIDGE_SOURCE;
      type: 'SYNC_EXPORTS';
      exports: MenuExport[];
    }
  | { source: typeof BRIDGE_SOURCE; type: 'PAGE_READY' };

export type SwToCsJobsMessage = {
  type: typeof MSG_JOBS;
  jobs: ExtJob[];
};

export type CsToSwMessage =
  | { type: typeof MSG_STUDIO_READY; origin: string }
  | { type: typeof MSG_PULL_JOBS };
