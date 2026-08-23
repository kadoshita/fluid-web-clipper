import { test, expect } from './fixtures';

const API_ENDPOINT_URL = 'https://fluid.example.com';
const API_TOKEN = 'test-token';

test.describe('popup', () => {
  test.beforeEach(async ({ seedStorage }) => {
    await seedStorage({ apiEndpointUrl: API_ENDPOINT_URL, apiToken: API_TOKEN });
  });

  test('renders the clip form', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/index.html`);

    await expect(popup.getByPlaceholder('Title')).toBeVisible();
    await expect(popup.getByPlaceholder('URL')).toBeVisible();
    await expect(popup.getByPlaceholder('Category')).toBeVisible();
    await expect(popup.getByPlaceholder('Description')).toBeVisible();
    await expect(popup.getByPlaceholder('Comment')).toBeVisible();
    await expect(popup.getByPlaceholder('tag')).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Submit' })).toBeVisible();
  });

  test('submits the clip form and posts the expected payload', async ({ context, extensionId }) => {
    const popup = await context.newPage();

    let request: { method: string; headers: Record<string, string>; body: unknown } | null = null;
    await popup.route(`${API_ENDPOINT_URL}/api/post`, async (route) => {
      request = {
        method: route.request().method(),
        headers: route.request().headers(),
        body: route.request().postDataJSON(),
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await popup.goto(`chrome-extension://${extensionId}/index.html`);

    await popup.getByPlaceholder('Title').fill('My Title');
    await popup.getByPlaceholder('URL').fill('https://example.com/article');
    await popup.getByPlaceholder('Category').fill('tech');
    await popup.getByPlaceholder('Description').fill('desc here');
    await popup.getByPlaceholder('Comment').fill('a comment');
    await popup.getByPlaceholder('tag').fill('tag1\ntag2');

    await Promise.all([popup.waitForEvent('close'), popup.getByRole('button', { name: 'Submit' }).click()]);

    expect(request).not.toBeNull();
    expect(request!.method).toBe('POST');
    expect(request!.headers['authorization']).toBe(`Bearer ${API_TOKEN}`);
    expect(request!.body).toEqual({
      title: 'My Title',
      url: 'https://example.com/article',
      category: 'tech',
      description: 'desc here',
      comment: 'a comment',
      image: '',
      tag: ['tag1', 'tag2'],
    });
  });
});
