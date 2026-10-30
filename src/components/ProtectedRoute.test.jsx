import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from './ProtectedRoute';

vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn() }));
vi.mock('../firebase', () => ({ auth: {} }));
vi.mock('../utils/i18n', () => ({ useAdminLanguage: () => ({ t: key => key }) }));

const showRoute = user => {
  vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
    callback(user);
    return () => {};
  });
  return render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
    <Route path="/dashboard" element={<ProtectedRoute><p>Dashboard</p></ProtectedRoute>} />
    <Route path="/login" element={<p>Login</p>} />
  </Routes></MemoryRouter>);
};

describe('ProtectedRoute', () => {
  it('rejects an email account without the staff claim', async () => {
    showRoute({ isAnonymous: false, getIdTokenResult: async () => ({ claims: {} }) });
    expect(await screen.findByText('Login')).toBeInTheDocument();
  });
  it('allows a staff account', async () => {
    showRoute({ isAnonymous: false, getIdTokenResult: async () => ({ claims: { staff: true } }) });
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
  it('rejects when token inspection fails', async () => {
    showRoute({ isAnonymous: false, getIdTokenResult: async () => { throw new Error('offline'); } });
    expect(await screen.findByText('Login')).toBeInTheDocument();
  });
});
