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

import fs from 'fs';
import path from 'path';
import brandClassBase from './BrandClassBase';

// jsdom cannot tell the two inks apart: jest maps every `*.svg` import to a
// single stub, so `getLogo('light')` and `getLogo('dark')` compare equal under
// test. The choice is therefore covered at the call site (SidebarBrand.test.tsx)
// and on the artwork files below, not as an identity assertion here.
describe('BrandClassBase theme inks', () => {
  it('defaults to the light ink so existing call sites are unaffected', () => {
    expect(brandClassBase.getLogo()).toEqual(brandClassBase.getLogo('light'));
    expect(brandClassBase.getMonogram()).toEqual(
      brandClassBase.getMonogram('light')
    );
    expect(brandClassBase.getSidebarLogo()).toEqual(
      brandClassBase.getLogo('light')
    );
    expect(brandClassBase.getSidebarMonogram()).toEqual(
      brandClassBase.getMonogram('light')
    );
  });

  it('resolves an asset pair for both themes', () => {
    (['light', 'dark'] as const).forEach((theme) => {
      expect(brandClassBase.getLogo(theme).src).toBeTruthy();
      expect(brandClassBase.getLogo(theme).svg).toBeTruthy();
      expect(brandClassBase.getMonogram(theme).src).toBeTruthy();
      expect(brandClassBase.getMonogram(theme).svg).toBeTruthy();
    });
  });
});

describe('brand artwork files', () => {
  const read = (file: string) =>
    fs.readFileSync(path.join(__dirname, '../../assets/svg', file), 'utf8');
  const pathData = (svg: string) =>
    [...svg.matchAll(/d="([^"]+)"/g)].map((match) => match[1]);
  const fills = (svg: string) =>
    [
      ...new Set(
        [...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((match) =>
          match[1].toLowerCase()
        )
      ),
    ].sort();

  const lightInk = '#1d1d4a';
  const lightAccent = '#496ce0';
  const darkInk = '#ffffff';
  const darkAccent = '#84caff';

  it.each([
    ['logo.svg', 'logo-dark.svg', 27],
    ['logo-monogram.svg', 'logo-monogram-dark.svg', 16],
  ])(
    '%s and %s share geometry and differ only in ink',
    (light, dark, pathCount) => {
      const lightSvg = read(light);
      const darkSvg = read(dark);

      expect(pathData(lightSvg)).toHaveLength(pathCount);
      expect(pathData(darkSvg)).toHaveLength(pathCount);
      // Same shapes in the same order — a dark variant must never redraw the mark.
      expect(pathData(darkSvg)).toEqual(pathData(lightSvg));
    }
  );

  it('paints a legible ink per surface: navy on light, light on dark', () => {
    const lightFills = [lightInk, lightAccent].sort();
    const darkFills = [darkInk, darkAccent].sort();

    expect(fills(read('logo.svg'))).toEqual(lightFills);
    expect(fills(read('logo-monogram.svg'))).toEqual(lightFills);
    expect(fills(read('logo-dark.svg'))).toEqual(darkFills);
    expect(fills(read('logo-monogram-dark.svg'))).toEqual(darkFills);
  });

  it('leaves no navy in the dark variants', () => {
    [read('logo-dark.svg'), read('logo-monogram-dark.svg')].forEach((svg) => {
      const lower = svg.toLowerCase();

      expect(lower).not.toContain(lightInk);
      expect(lower).not.toContain(lightAccent);
    });
  });
});
