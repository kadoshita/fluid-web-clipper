import { test as base, chromium, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BUILD_PATH = path.resolve(__dirname, '../build');

type StorageConfig = {
  apiEndpointUrl: string;
  apiToken: string;
};

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  seedStorage: (config: StorageConfig) => Promise<void>;
  openPopupForActiveTab: (url: string) => Promise<{ activePage: Page; popup: Page }>;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    // App.tsx scrapes the active tab via chrome.scripting.executeScript, which needs
    // activeTab. activeTab is only granted by a genuine user gesture (e.g. a real
    // toolbar-icon click) -- something Playwright cannot simulate for an MV3 popup.
    // To exercise that scraping feature in tests, this loads a throwaway copy of the
    // build with a broad host_permissions grant added, so the script injection works
    // without relying on activeTab. The real build/ artifact is left untouched.
    const extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'fluid-web-clipper-e2e-'));
    fs.cpSync(BUILD_PATH, extensionPath, { recursive: true });
    const manifestPath = path.join(extensionPath, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.host_permissions = ['<all_urls>'];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
    fs.rmSync(extensionPath, { recursive: true, force: true });
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
  openPopupForActiveTab: async ({ context, extensionId }, use) => {
    await use(async (url) => {
      const activePage = await context.newPage();
      await activePage.goto(url);
      await activePage.bringToFront();

      // Opening the popup as context.newPage() makes it a real tab, which Chrome
      // immediately marks "active" -- unlike a genuine MV3 popup surface, which
      // isn't a tab at all and doesn't steal tab focus. Left alone, the app's
      // chrome.tabs.query({active:true}) would resolve to the popup's own blank tab
      // instead of activePage. Create the popup tab first, then explicitly restore
      // activePage as the active tab before navigating the popup to the app, so the
      // app's query sees the intended target when it runs on mount.
      const popup = await context.newPage();

      const helper = await context.newPage();
      await helper.goto(`chrome-extension://${extensionId}/option.html`);
      const activeTabId = await helper.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        if (!tabs[0]?.id) throw new Error(`no tab found for url: ${targetUrl}`);
        return tabs[0].id;
      }, url);
      await helper.evaluate(async (tabId) => {
        await chrome.tabs.update(tabId, { active: true });
      }, activeTabId);
      await helper.close();

      await popup.goto(`chrome-extension://${extensionId}/index.html`);
      return { activePage, popup };
    });
  },
});

export const expect = test.expect;
