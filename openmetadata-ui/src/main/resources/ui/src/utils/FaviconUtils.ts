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

import { isEmpty } from 'lodash';
import { getBasePath } from './HistoryUtils';

/**
 * Href every `<link rel~="icon">` should point at: the admin's custom favicon
 * when one is configured, otherwise the brand icon the document declares.
 *
 * The declared href carries a content hash (`vite/plugins.ts`) so replacing the
 * artwork changes the URL — browsers keep favicons in a cache that outlives
 * ordinary reloads and would otherwise serve the previous icon indefinitely.
 */
export const getFaviconHref = (customFaviconUrlPath?: string): string => {
  if (!isEmpty(customFaviconUrlPath)) {
    return customFaviconUrlPath as string;
  }

  return (
    document
      .querySelector('meta[name="brand-favicon"]')
      ?.getAttribute('content') ?? `${getBasePath()}/favicon.png`
  );
};

export const applyFaviconHref = (customFaviconUrlPath?: string): void => {
  const links = document.querySelectorAll('link[rel~="icon"]');

  if (isEmpty(links)) {
    return;
  }

  const href = getFaviconHref(customFaviconUrlPath);

  links.forEach((link) => link.setAttribute('href', href));
};
