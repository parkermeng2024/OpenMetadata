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

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SidebarBrand from './SidebarBrand';

let mockTheme = 'light';
const mockGetSidebarLogo = jest.fn();
const mockGetSidebarMonogram = jest.fn();

jest.mock('../../../../context/UntitledUIThemeProvider/theme-provider', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: jest.fn() }),
}));

jest.mock('../../../../utils/BrandData/BrandClassBase', () => ({
  __esModule: true,
  default: {
    getSidebarLogo: (theme?: string) => mockGetSidebarLogo(theme),
    getSidebarMonogram: (theme?: string) => mockGetSidebarMonogram(theme),
  },
}));

const renderBrand = (variant?: 'panel' | 'rail') =>
  render(
    <MemoryRouter>
      <SidebarBrand variant={variant} />
    </MemoryRouter>
  );

describe('SidebarBrand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTheme = 'light';
    mockGetSidebarLogo.mockImplementation((theme: string) => ({
      src: `${theme}-logo-url`,
      svg: `${theme}-logo`,
    }));
    mockGetSidebarMonogram.mockImplementation((theme: string) => ({
      src: `${theme}-monogram-url`,
      svg: `${theme}-monogram`,
    }));
  });

  it('shows the default wordmark on a light theme', () => {
    const { container } = renderBrand();

    expect(mockGetSidebarLogo).toHaveBeenCalledWith('light');
    expect(container.querySelector('light-logo')).toBeInTheDocument();
  });

  it('shows the dark wordmark on a dark theme', () => {
    mockTheme = 'dark';

    const { container } = renderBrand();

    expect(mockGetSidebarLogo).toHaveBeenCalledWith('dark');
    expect(container.querySelector('dark-logo')).toBeInTheDocument();
  });

  it('shows the theme matched monogram in the collapsed rail', () => {
    mockTheme = 'dark';

    const { container } = renderBrand('rail');

    expect(mockGetSidebarMonogram).toHaveBeenCalledWith('dark');
    expect(container.querySelector('dark-monogram')).toBeInTheDocument();
  });
});
