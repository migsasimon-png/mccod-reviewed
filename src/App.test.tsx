import React from 'react';
import { act, render } from '@testing-library/react';
import { App } from './App';
import { store } from './Store';

jest.mock('@dhis2/app-runtime', () => ({
  ...jest.requireActual('@dhis2/app-runtime'),
  useDataEngine: () => ({}),
}));

jest.mock('./Store', () => ({
  store: {
    activeModule: 'home',
    organisationUnits: [{ id: 'TestFacility' }],
    setEngine: jest.fn(),
    openModule: jest.fn(),
    initApp: jest.fn(),
    setActiveLanguage: jest.fn(),
    setICDLang: jest.fn(),
    getActiveLanguage: jest.fn(async () => ({ language: 'English' })),
  },
}));

jest.mock('./components/EventDownload', () => ({ __esModule: true, default: () => null }));

test('offers child, maternal and perinatal reviews on the home screen', async () => {
  const page = render(<App />);
  await act(async () => {});
  expect(page.getByText('Child Death Review')).toBeInTheDocument();
  expect(page.getByText('Maternal Death Review')).toBeInTheDocument();
  expect(page.getByText('Perinatal Death Review')).toBeInTheDocument();
});

test('a framed DHIS2 app launch stays on the review home', async () => {
  const parent = Object.getOwnPropertyDescriptor(window, 'parent');
  Object.defineProperty(window, 'parent', { configurable: true, value: {} });
  try {
    const page = render(<App />);
    await act(async () => {});
    expect(page.getByText('Perinatal Death Review')).toBeInTheDocument();
    expect(store.openModule).not.toHaveBeenCalled();
  } finally {
    if (parent) Object.defineProperty(window, 'parent', parent);
  }
});

test('an explicit legacy iframe edit opens the records workflow', async () => {
  const originalUrl = window.location.href;
  window.history.replaceState(null, '', '/?iframe_edit=true');
  try {
    render(<App />);
    await act(async () => {});
    expect(store.openModule).toHaveBeenCalledWith('records');
  } finally {
    window.history.replaceState(null, '', originalUrl);
  }
});
