import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { it, expect, vi } from 'vitest';
import LoginPage from './LoginPage';

vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: vi.fn(), signOut: vi.fn() }));
vi.mock('../firebase', () => ({ auth: {} }));
vi.mock('../components/LanguageToggle', () => ({ default: () => null }));
vi.mock('../utils/i18n', () => ({ useAdminLanguage: () => ({ t: key => key }) }));

it('shows an authorization error rather than navigating for an ordinary account', async () => {
  vi.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: {
    getIdTokenResult: async () => ({ claims: {} }),
  } });
  render(<MemoryRouter><Routes><Route path="/" element={<LoginPage />} />
    <Route path="/dashboard" element={<p>Dashboard</p>} /></Routes></MemoryRouter>);
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('admin.login.emailPlaceholder'), 'demo@example.com');
  await user.type(screen.getByPlaceholderText('admin.login.passwordPlaceholder'), 'password');
  await user.click(screen.getByRole('button', { name: 'admin.login.signIn' }));
  expect(await screen.findByText('admin.login.notAuthorized')).toBeInTheDocument();
  expect(signOut).toHaveBeenCalledWith({});
  expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
});
