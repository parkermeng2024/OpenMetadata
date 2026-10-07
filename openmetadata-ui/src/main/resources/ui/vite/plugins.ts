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
import { readFileSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const UI_ROOT = path.resolve(__dirname, '..');

/**
 * Vite plugin: capture hashed asset filenames at bundle time and inject
 * <link rel="preload"> tags into index.html so the browser discovers the
 * Inter variable font and the landing-page hero SVG before the JS bundle
 * executes.  `transformIndexHtml: { order: 'post' }` ensures this hook runs
 * after the existing `html-transform` plugin (which adds `${basePath}`
 * prefixes), so we write `${basePath}` directly into the href and let the
 * Java backend replace it at runtime — exactly the same mechanism used for
 * script/link/image tags elsewhere.
 */
export const injectCriticalPreloads = (): Plugin => {
  let fontPath = '';
  let heroPath = '';

  return {
    name: 'inject-critical-preloads',
    generateBundle(_opts, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset') {
          continue;
        }
        if (
          file.fileName?.includes('inter-latin-wght-normal') &&
          file.fileName.endsWith('.woff2')
        ) {
          fontPath = file.fileName;
        }
        if (
          file.fileName?.includes('landing-page-header-bg') &&
          file.fileName.endsWith('.svg')
        ) {
          heroPath = file.fileName;
        }
      }
    },
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        const tags: string[] = [];
        if (fontPath) {
          tags.push(
            `<link rel="preload" as="font" type="font/woff2" crossorigin href="\${basePath}${fontPath}">`
          );
        }
        if (heroPath) {
          tags.push(
            `<link rel="preload" as="image" fetchpriority="high" href="\${basePath}${heroPath}">`
          );
        }

        return tags.length
          ? html.replace('</head>', `  ${tags.join('\n    ')}\n  </head>`)
          : html;
      },
    },
  };
};

const TS_ENUM_IIFE = /\(function\([\w$]+\)\{return [^{}]*\}\)\(\{\}\)/g;

/**
 * Fails the build when a chunk holds nothing but TS enum objects. That means an
 * enum module escaped the `app-enums` group: it imports something, or it does
 * not follow the *.enum.ts / *.interface.ts / types.ts / src/enums convention.
 * Fix the module; do not add an allowlist.
 */
export const noEnumOnlyChunks = (): Plugin => ({
  name: 'no-enum-only-chunks',
  generateBundle(_opts, bundle) {
    const offenders = Object.values(bundle).flatMap((chunk) => {
      if (chunk.type !== 'chunk' || !chunk.code.match(TS_ENUM_IIFE)) {
        return [];
      }
      const rest = chunk.code
        .replace(/\/\/# sourceMappingURL=.*$/m, '')
        .replace(/import(\{[^}]*\}from)?"[^"]+";/g, '')
        .replace(/export\{[^}]*\}(from"[^"]+")?;?/g, '')
        .replace(TS_ENUM_IIFE, '')
        .replace(/(let|var|const)\s|[\w$]+=|[,;\s]/g, '');

      return rest
        ? []
        : [
            `${chunk.fileName} <- ${chunk.moduleIds
              .map((id) => path.relative(UI_ROOT, id))
              .join(', ')}`,
          ];
    });

    if (offenders.length) {
      this.error(
        `Enum-only chunks emitted; make the enum module import-free and name it *.enum.ts / *.interface.ts / types.ts:\n  ${offenders.join(
          '\n  '
        )}`
      );
    }
  },
});

/** `${basePath}`-prefixed brand icons whose URL carries a content hash. */
const ICON_URL_PATTERN =
  /\$\{basePath\}(favicon\.png|favicons\/[\w.-]+\.png)(?!\?v=)/g;

/** sha256 of a `public/` icon, first 8 hex chars; `''` when the file is absent. */
const iconVersion = (iconPath: string): string => {
  try {
    return createHash('sha256')
      .update(readFileSync(path.join(UI_ROOT, 'public', iconPath)))
      .digest('hex')
      .slice(0, 8);
  } catch {
    return '';
  }
};

/**
 * Vite plugin: normalise `index.html` for both the dev server and the packaged
 * build.
 *
 * - Prefixes bundled `assets/` and `images/` URLs with `${basePath}` — the Java
 *   backend substitutes that placeholder at runtime with the deployment's base
 *   path.
 * - Appends a content hash to the brand icon URLs so a replaced icon cannot be
 *   masked by the browser's favicon cache, which survives ordinary reloads.
 * - Publishes that versioned default as `<meta name="brand-favicon">`, because
 *   `AppRoot` re-points every icon link at runtime and would otherwise undo it.
 * - Only the dev server resolves `${basePath}` to `/`: nothing sits in front of
 *   it to do the substitution, so the browser would otherwise request
 *   `${basePath}favicon.png` verbatim and end up with no icon at all.
 */
export const htmlBasePathTransform = (): Plugin => {
  let isDevServer = false;

  return {
    name: 'html-transform',
    configResolved(config) {
      isDevServer = config.command === 'serve';
    },
    transformIndexHtml(html: string) {
      const versionedIcons = html.replaceAll(
        ICON_URL_PATTERN,
        (match, iconPath: string) => {
          const version = iconVersion(iconPath);

          return version ? `${match}?v=${version}` : match;
        }
      );

      // The app re-points every icon link at runtime (AppRoot), so the default it
      // falls back to has to carry the hash too — otherwise it overwrites the
      // versioned hrefs above with a URL the favicon cache answers from disk.
      const faviconVersion = iconVersion('favicon.png');
      const brandFaviconMeta = `<meta name="brand-favicon" content="\${basePath}favicon.png?v=${faviconVersion}" />`;
      const withFaviconDefault = !faviconVersion
        ? versionedIcons
        : versionedIcons.includes('name="brand-favicon"')
        ? versionedIcons.replace(
            /<meta name="brand-favicon"[^>]*>/,
            brandFaviconMeta
          )
        : versionedIcons.replace(
            '</head>',
            `    ${brandFaviconMeta}\n  </head>`
          );

      const withBasePath = withFaviconDefault
        .replaceAll(
          /(<script[^>]*src=["'])(\.\/)?assets\//g,
          '$1${basePath}assets/'
        )
        .replaceAll(
          /(<link[^>]*href=["'])(\.\/)?assets\//g,
          '$1${basePath}assets/'
        )
        .replaceAll(
          /(<img[^>]*src=["'])(\.\/)?assets\//g,
          '$1${basePath}assets/'
        )
        .replaceAll(
          /(<img[^>]*src=["'])(\.\/)?images\//g,
          '$1${basePath}images/'
        );

      return isDevServer
        ? withBasePath.replaceAll('${basePath}', '/')
        : withBasePath;
    },
  };
};
