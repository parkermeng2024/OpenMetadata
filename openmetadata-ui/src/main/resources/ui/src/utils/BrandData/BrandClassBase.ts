/*
 *  Copyright 2023 Collate.
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
import WelcomeScreenSrc from '../../assets/img/welcome-screen.png';
import LogoDarkSrc, {
  ReactComponent as LogoDark,
} from '../../assets/svg/logo-dark.svg';
import MonogramDarkSrc, {
  ReactComponent as MonogramDark,
} from '../../assets/svg/logo-monogram-dark.svg';
import MonogramSrc, {
  ReactComponent as Monogram,
} from '../../assets/svg/logo-monogram.svg';
import LogoSrc, { ReactComponent as Logo } from '../../assets/svg/logo.svg';
import type { Theme } from '../../context/UntitledUIThemeProvider/theme-provider.interface';

/**
 * Brand artwork ships in two inks: the default navy/blue pair for light
 * surfaces, and a light/blue-accent pair for dark ones. Callers rendering on a
 * theme-driven background pass the current theme; the `'light'` default keeps
 * surfaces that are always light (login and auth cards, service icons) on the
 * default ink.
 */
class BrandClassBase {
  public getMonogram(theme: Theme = 'light') {
    return theme === 'dark'
      ? { src: MonogramDarkSrc, svg: MonogramDark }
      : { src: MonogramSrc, svg: Monogram };
  }

  public getLogo(theme: Theme = 'light') {
    return theme === 'dark'
      ? { src: LogoDarkSrc, svg: LogoDark }
      : { src: LogoSrc, svg: Logo };
  }

  /**
   * Brand logo for the expanded app-mode (AI) sidebar header. Defaults
   * to the standard wordmark; a downstream build (e.g. Collate) overrides this
   * to show its sidebar-specific full logo without affecting the NavBar/login
   * brand from `getLogo()`.
   */
  public getSidebarLogo(theme: Theme = 'light') {
    return this.getLogo(theme);
  }

  /**
   * Compact brand mark for the collapsed app-mode (AI) sidebar rail.
   * Defaults to the standard monogram; overridable per build independently of
   * `getMonogram()`.
   */
  public getSidebarMonogram(theme: Theme = 'light') {
    return this.getMonogram(theme);
  }

  public getReleaseLink(version: string) {
    const versionWithV = 'v' + version;

    // TODO(rebrand): switch to the MetaContext product-updates URL — see
    // docs/plans/2026-10-07-openmetadata-to-metacontext-rebrand.md (group 4).
    return `https://open-metadata.org/product-updates#${versionWithV}`;
  }

  public getBlogLink(_version: string) {
    // Since medium doens't follow any fixed structure we will just return the blog link
    // TODO(rebrand): switch to the MetaContext blog URL — see
    // docs/plans/2026-10-07-openmetadata-to-metacontext-rebrand.md (group 4).
    return 'https://blog.open-metadata.org/announcing-openmetadata-1-13-123d66609468';
  }

  public getWelcomeScreenImg() {
    return WelcomeScreenSrc;
  }
}

const brandClassBase = new BrandClassBase();

export default brandClassBase;
export { BrandClassBase };
