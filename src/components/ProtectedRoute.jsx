import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Navigate } from 'react-router-dom';
import { useAdminLanguage } from '../utils/i18n';

const ProtectedRoute = ({ children }) => {
  const { t } = useAdminLanguage();
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Still checking auth state
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">{t('admin.protectedRoute.loading')}</p>
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
