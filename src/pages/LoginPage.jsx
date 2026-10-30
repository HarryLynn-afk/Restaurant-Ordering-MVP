import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle';
import { useAdminLanguage } from '../utils/i18n';

const LoginPage = () => {
  const { t } = useAdminLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const { claims } = await user.getIdTokenResult();
      if (claims.staff !== true) {
        await signOut(auth);
        setError(t('admin.login.notAuthorized'));
        return;
      }
      navigate('/dashboard');
    } catch {
      setError(t('admin.login.invalidError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm w-full max-w-sm p-8">
        <div className="flex justify-end mb-4">
          <LanguageToggle scope="admin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">{t('admin.login.title')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('admin.login.subtitle')}</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="staff-email" className="text-sm font-medium text-foreground">{t('admin.login.email')}</label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('admin.login.emailPlaceholder')}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="staff-password" className="text-sm font-medium text-foreground">{t('admin.login.password')}</label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('admin.login.passwordPlaceholder')}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t('admin.login.signingIn') : t('admin.login.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
