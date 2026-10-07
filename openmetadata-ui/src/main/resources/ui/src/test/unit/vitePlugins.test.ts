/*
 *  Copyright 2026 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { htmlBasePathTransform } from '../../../vite/plugins';

const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

const iconVersion = (iconPath: string) =>
  createHash('sha256')
    .update(fs.readFileSync(path.join(PUBLIC_DIR, iconPath)))
    .digest('hex')
    .slice(0, 8);

const transform = (html: string, command: 'serve' | 'build') => {
  const plugin = htmlBasePathTransform();
  (plugin.configResolved as (config: unknown) => void)({ command });

  return (plugin.transformIndexHtml as (html: string) => string)(html);
};

const INDEX_HTML = [
  '<html><head>',
  '<link rel="shortcut icon" href="${basePath}favicon.png" type="image/png" />',
  '<link rel="apple-touch-icon" sizes="57x57" href="${basePath}favicons/apple-icon-57x57.png" />',
  '<meta name="msapplication-TileImage" content="${basePath}favicons/ms-icon-144x144.png" />',
  '<script nonce="${cspNonce}" type="module" src="assets/index-abc.js"></script>',
  '</head><body></body></html>',
].join('\n');

describe('htmlBasePathTransform', () => {
  describe('dev server', () => {
    it('resolves the ${basePath} placeholder so the icons and bundles are reachable', () => {
      const html = transform(INDEX_HTML, 'serve');

      expect(html).not.toContain('${basePath}');
      expect(html).toContain(
        `href="/favicon.png?v=${iconVersion('favicon.png')}"`
      );
      expect(html).toContain(
        `href="/favicons/apple-icon-57x57.png?v=${iconVersion(
          'favicons/apple-icon-57x57.png'
        )}"`
      );
      expect(html).toContain('<script nonce="${cspNonce}"');
    });
  });

  describe('packaged build', () => {
    it('keeps the placeholder for the backend but still versions the icons', () => {
      const html = transform(INDEX_HTML, 'build');

      expect(html).toContain(
        `href="\${basePath}favicon.png?v=${iconVersion('favicon.png')}"`
      );
      expect(html).toContain('src="${basePath}assets/index-abc.js"');
      // The Java backend owns this one; the plugin must not touch it.
      expect(html).toContain('nonce="${cspNonce}"');
    });

    it('versions an icon inside a meta content attribute too', () => {
      const html = transform(INDEX_HTML, 'build');

      expect(html).toContain(
        `content="\${basePath}favicons/ms-icon-144x144.png?v=${iconVersion(
          'favicons/ms-icon-144x144.png'
        )}"`
      );
    });
  });

  it('is idempotent, so a re-run cannot stack version parameters', () => {
    const once = transform(INDEX_HTML, 'build');
    const twice = transform(once, 'build');

    expect(twice).toEqual(once);
  });

  it('leaves an icon URL alone when the file does not exist', () => {
    const html = transform(
      '<html><head>\n<link rel="icon" href="${basePath}favicons/does-not-exist.png" />\n</head></html>',
      'build'
    );

    expect(html).toContain('href="${basePath}favicons/does-not-exist.png"');
    expect(html).not.toContain('does-not-exist.png?v=');
  });

  describe('brand-favicon default', () => {
    const version = iconVersion('favicon.png');

    it('publishes a versioned default the app can fall back to (build)', () => {
      const html = transform(INDEX_HTML, 'build');

      expect(html).toContain(
        `<meta name="brand-favicon" content="\${basePath}favicon.png?v=${version}" />`
      );
    });

    it('publishes the same default resolved for the dev server', () => {
      const html = transform(INDEX_HTML, 'serve');

      expect(html).toContain(
        `<meta name="brand-favicon" content="/favicon.png?v=${version}" />`
      );
      expect(html).not.toContain('basePath');
    });

    it('does not stack a second meta when the transform runs twice', () => {
      const twice = transform(transform(INDEX_HTML, 'build'), 'build');

      expect(twice.match(/name="brand-favicon"/g)).toHaveLength(1);
    });
  });
});
