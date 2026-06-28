import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

test('renders torrent search login shell', async () => {
  render(<App />);
  expect(await screen.findByText(/torrent search/i)).toBeInTheDocument();
});
