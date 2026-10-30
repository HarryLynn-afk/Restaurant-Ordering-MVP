import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Navigate } from 'react-router-dom';
import { useAdminLanguage } from '../utils/i18n';

const ProtectedRoute = ({ children }) => {
  const { t } = useAdminLanguage();
  const [allowed, setAllowed] = useState(undefined);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentRevision = ++revision;
      setAllowed(undefined);
      let isStaff = false;
      try {
        if (currentUser && !currentUser.isAnonymous) {
          const { claims } = await currentUser.getIdTokenResult();
          isStaff = claims.staff === true;
        }
      } catch {
        // A missing or unreadable token must not grant dashboard access.
      }
      if (active && currentRevision === revision) setAllowed(isStaff);
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  // Still checking auth state
  if (allowed === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">{t('admin.protectedRoute.loading')}</p>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
