import { getTitle } from './App';

describe('getTitle', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('scrapes title, url, and OpenGraph meta tags from the page', () => {
    document.title = 'Example Page';

    const addMeta = (property: string, content: string) => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    };
    addMeta('og:description', 'An example description');
    addMeta('og:image', 'https://example.com/image.png');
    addMeta('article:tag', 'tech');
    addMeta('article:tag', 'news');

    const result = getTitle();

    expect(result.title).toBe('Example Page');
    expect(result.url).toBe(document.location.href);
    expect(result.description).toBe('An example description');
    expect(result.image).toBe('https://example.com/image.png');
    expect(result.tag).toBe('tech\nnews');
  });

  it('falls back to empty strings when no meta tags are present', () => {
    document.title = 'No Meta Page';

    const result = getTitle();

    expect(result.title).toBe('No Meta Page');
    expect(result.description).toBe('');
    expect(result.image).toBe('');
    expect(result.tag).toBe('');
  });
});
