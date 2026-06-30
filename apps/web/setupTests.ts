import '@testing-library/jest-dom'
import { server } from './src/mocks/server'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

// Polyfill ResizeObserver for HeroUI components in jsdom
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() { /* Mock ResizeObserver observe hook */ }
    unobserve() { /* Mock ResizeObserver unobserve hook */ }
    disconnect() { /* Mock ResizeObserver disconnect hook */ }
  }
}

// Mock window.matchMedia for useMediaQuery hook
if (typeof globalThis.window !== 'undefined') {
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeAll(() => server.listen())

afterEach(() => server.resetHandlers())

afterAll(() => server.close())
import 'fake-indexeddb/auto';

import React from 'react';
vi.mock('@/components/bridge/Dropdown', () => ({
  Dropdown: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-dropdown' }, children),
  DropdownTrigger: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-dropdown-trigger' }, children),
  DropdownMenu: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-dropdown-menu' }, children),
  DropdownItem: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-dropdown-item' }, children),
  DropdownSection: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-dropdown-section' }, children),
}));

vi.mock('@/components/bridge/Select', () => ({
  Select: Object.assign(({ children }: any) => React.createElement('div', { 'data-testid': 'mock-select' }, children), {
    Trigger: ({ children }: any) => React.createElement('div', null, children),
    Value: ({ children }: any) => React.createElement('div', null, children),
    Indicator: ({ children }: any) => React.createElement('div', null, children),
    Popover: ({ children }: any) => React.createElement('div', null, children),
  })
}));

vi.mock('@heroui/react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TimeField: Object.assign(
      ({ children, isInvalid, isRequired, isDisabled, isReadOnly, errorMessage, hourCycle, ...props }: any) => 
        React.createElement('div', { 'data-testid': 'mock-time-field' }, 
          React.createElement('input', { type: 'time', 'data-testid': 'mock-time-input', ...props }),
          children
        ),
      {
        Group: ({ children }: any) => React.createElement('div', null, children),
        Input: ({ children }: any) => React.createElement('div', null, typeof children === 'function' ? children({}) : children),
        Segment: ({ children }: any) => React.createElement('span', null, children)
      }
    ),
    ListBox: Object.assign(({ children }: any) => React.createElement('div', null, children), {
      Item: ({ children }: any) => React.createElement('div', null, children)
    })
  };
});

vi.mock('@/components/bridge/Tabs', () => ({
  Tabs: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-tabs' }, children),
  Tab: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-tab' }, children),
}));

vi.mock('@/components/bridge/Modal', () => ({
  Modal: ({ state, children }: any) => state?.isOpen ? React.createElement('div', { 'data-testid': 'mock-modal' }, children) : null,
  ModalContent: ({ children }: any) => React.createElement('div', null, children),
  ModalHeader: ({ children }: any) => React.createElement('div', null, children),
  ModalBody: ({ children }: any) => React.createElement('div', null, children),
  ModalFooter: ({ children }: any) => React.createElement('div', null, children),
}));


