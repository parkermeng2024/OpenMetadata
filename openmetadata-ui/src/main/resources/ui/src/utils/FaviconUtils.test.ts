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

import { applyFaviconHref, getFaviconHref } from './FaviconUtils';

const VERSIONED = '/favicon.png?v=27a4297f';
const setHead = (html: string) => {
  document.head.innerHTML = html;
};
const iconHrefs = () =>
  [...document.querySelectorAll('link[rel~="icon"]')].map((link) =>
    link.getAttribute('href')
  );

describe('favicon href resolution', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('uses the versioned brand icon the document declares', () => {
    setHead(`<meta name="brand-favicon" content="${VERSIONED}" />`);

    expect(getFaviconHref()).toBe(VERSIONED);
  });

  it('lets a configured custom favicon win over the brand icon', () => {
    setHead('<meta name="brand-favicon" content="/favicon.png?v=27a4297f" />');

    expect(getFaviconHref('https://cdn.example.com/custom.ico')).toBe(
      'https://cdn.example.com/custom.ico'
    );
  });

  it('falls back to the base-path icon when the document declares none', () => {
    setHead('');

    expect(getFaviconHref()).toBe('/favicon.png');
  });

  it('treats an empty custom path as "not configured"', () => {
    setHead(`<meta name="brand-favicon" content="${VERSIONED}" />`);

    expect(getFaviconHref('')).toBe(VERSIONED);
  });
});

describe('applyFaviconHref', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('points every icon link at the versioned brand icon', () => {
    setHead(
      `<meta name="brand-favicon" content="${VERSIONED}" />` +
        '<link rel="shortcut icon" href="/favicon.png" />' +
        '<link rel="icon" sizes="32x32" href="/favicons/favicon-32x32.png" />'
    );

    applyFaviconHref();

    expect(iconHrefs()).toEqual([VERSIONED, VERSIONED]);
  });

  it('points every icon link at a configured custom favicon', () => {
    setHead('<link rel="shortcut icon" href="/favicon.png" />');

    applyFaviconHref('https://cdn.example.com/custom.ico');

    expect(iconHrefs()).toEqual(['https://cdn.example.com/custom.ico']);
  });

  it('does nothing when the document has no icon link', () => {
    setHead('<meta name="brand-favicon" content="/favicon.png?v=27a4297f" />');

    expect(() => applyFaviconHref()).not.toThrow();
    expect(iconHrefs()).toEqual([]);
  });
});
