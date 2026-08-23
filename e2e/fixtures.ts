import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../build');

type StorageConfig = {
  apiEndpointUrl: string;
  apiToken: string;
};

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  seedStorage: (config: StorageConfig) => Promise<void>;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // This extension declares no background service worker (manifest.json has no
    // `background` key), so context.serviceWorkers() never fires. Read the ID from
    // chrome://extensions instead.
    const page = await context.newPage();
    await page.goto('chrome://extensions/');
    const extensionId = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      const itemList = manager!.shadowRoot!.querySelector('extensions-item-list');
      const item = itemList!.shadowRoot!.querySelector('extensions-item');
      return item!.id;
    });
    await page.close();
    await use(extensionId);
  },
  seedStorage: async ({ context, extensionId }, use) => {
    // chrome.storage is available on any extension-origin page, so the options
    // page is used here purely as a place to run the chrome.storage.sync.set call.
    await use(async (config) => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/option.html`);
      await page.evaluate((cfg) => new Promise<void>((resolve) => chrome.storage.sync.set(cfg, resolve)), config);
      await page.close();
    });
  },
});

export const expect = test.expect;
