/** Протокол window.postMessage между content script и страницей студии. */

export const BRIDGE_SOURCE = 'png-maker-bridge' as const;

export type BridgeJobPayload =
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
  | { source: typeof BRIDGE_SOURCE; type: 'JOB'; job: BridgeJobPayload }
  | { source: typeof BRIDGE_SOURCE; type: 'BRIDGE_READY' };

export type BridgeFromPage =
  | {
      source: typeof BRIDGE_SOURCE;
      type: 'SYNC_EXPORTS';
      exports: { id: string; name: string }[];
    }
  | { source: typeof BRIDGE_SOURCE; type: 'PAGE_READY' }
  | { source: typeof BRIDGE_SOURCE; type: 'JOB_DONE'; id: string };
