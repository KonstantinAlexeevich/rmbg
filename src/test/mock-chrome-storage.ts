/** Минимальный mock chrome.storage.{session,local} (+ tabs/downloads) для unit-тестов. */

type Store = Record<string, unknown>;

export type MockStorageArea = {
  get: (keys?: string | string[] | Store | null) => Promise<Store>;
  set: (items: Store) => Promise<void>;
  /** Прямой доступ к данным для assertions. */
  snapshot: () => Store;
  clear: () => void;
};

export function createMockStorageArea(initial: Store = {}): MockStorageArea {
  const data: Store = { ...initial };

  return {
    async get(keys) {
      if (keys === undefined || keys === null) return { ...data };
      if (typeof keys === 'string') return { [keys]: data[keys] };
      if (Array.isArray(keys)) {
        const out: Store = {};
        for (const key of keys) out[key] = data[key];
        return out;
      }
      const out: Store = { ...keys };
      for (const key of Object.keys(keys)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) out[key] = data[key];
      }
      return out;
    },
    async set(items) {
      Object.assign(data, items);
    },
    snapshot: () => ({ ...data }),
    clear: () => {
      for (const key of Object.keys(data)) delete data[key];
    },
  };
}

export type MockTab = {
  id?: number;
  windowId?: number;
  url?: string;
  active?: boolean;
};

export type MockChrome = {
  storage: {
    session: MockStorageArea;
    local: MockStorageArea;
  };
  i18n: { getUILanguage: () => string };
  tabs: {
    query: (queryInfo: chrome.tabs.QueryInfo) => Promise<MockTab[]>;
    create: (createProperties: chrome.tabs.CreateProperties) => Promise<MockTab>;
    update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties) => Promise<MockTab>;
    sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
  };
  windows: {
    update: (
      windowId: number,
      updateInfo: chrome.windows.UpdateInfo,
    ) => Promise<chrome.windows.Window>;
  };
  permissions: {
    request: (permissions: chrome.permissions.Permissions) => Promise<boolean>;
  };
  scripting: {
    executeScript: <T>(
      injection: chrome.scripting.ScriptInjection<unknown[], T>,
    ) => Promise<Array<{ result?: T }>>;
  };
  downloads: {
    download: (options: chrome.downloads.DownloadOptions) => Promise<number>;
    onChanged: {
      addListener: (cb: (delta: chrome.downloads.DownloadDelta) => void) => void;
      removeListener: (cb: (delta: chrome.downloads.DownloadDelta) => void) => void;
    };
  };
};

export type MockChromeControls = {
  tabs: MockTab[];
  sendMessageImpl: (tabId: number, message: unknown) => Promise<unknown>;
  downloadListeners: Array<(delta: chrome.downloads.DownloadDelta) => void>;
  nextDownloadId: number;
};

/** Ставит `globalThis.chrome` с session/local storage и i18n. */
export function installMockChrome(options?: {
  uiLanguage?: string;
  session?: Store;
  local?: Store;
  tabs?: MockTab[];
}): MockChrome & { controls: MockChromeControls } {
  const controls: MockChromeControls = {
    tabs: options?.tabs ? [...options.tabs] : [],
    sendMessageImpl: async () => undefined,
    downloadListeners: [],
    nextDownloadId: 1,
  };

  const mock: MockChrome & { controls: MockChromeControls } = {
    controls,
    storage: {
      session: createMockStorageArea(options?.session),
      local: createMockStorageArea(options?.local),
    },
    i18n: {
      getUILanguage: () => options?.uiLanguage ?? 'en-US',
    },
    tabs: {
      async query() {
        return controls.tabs;
      },
      async create(props) {
        const tab: MockTab = {
          id: 100 + controls.tabs.length,
          windowId: 1,
          url: props.url,
          active: props.active,
        };
        controls.tabs.push(tab);
        return tab;
      },
      async update(tabId, updateProperties) {
        const tab = controls.tabs.find((t) => t.id === tabId);
        if (tab === undefined) throw new Error(`no tab ${tabId}`);
        if (updateProperties.active !== undefined) tab.active = updateProperties.active;
        return tab;
      },
      async sendMessage(tabId, message) {
        return controls.sendMessageImpl(tabId, message);
      },
    },
    windows: {
      async update() {
        return { id: 1 } as chrome.windows.Window;
      },
    },
    permissions: {
      async request() {
        return true;
      },
    },
    scripting: {
      async executeScript() {
        return [];
      },
    },
    downloads: {
      async download() {
        return controls.nextDownloadId++;
      },
      onChanged: {
        addListener(cb) {
          controls.downloadListeners.push(cb);
        },
        removeListener(cb) {
          controls.downloadListeners = controls.downloadListeners.filter((x) => x !== cb);
        },
      },
    },
  };
  (globalThis as unknown as { chrome: MockChrome }).chrome = mock;
  return mock;
}
