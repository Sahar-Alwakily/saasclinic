import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onValue, ref, update, push, set } from 'firebase/database';
import { auth, database } from '../APIFirebase/firebase';

const AuthContext = createContext(null);
export const SUPPORT_TOKEN_KEY = 'nora_support_token';

export function readSupportToken() {
  try {
    const stored = sessionStorage.getItem(SUPPORT_TOKEN_KEY);
    const match = window.location.pathname.match(/^\/impersonate\/([^/]+)/);
    return match?.[1] || stored || null;
  } catch {
    return null;
  }
}

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userMeta, setUserMeta] = useState(null);
  const [supportSession, setSupportSession] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubMeta = null;
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubMeta) {
        unsubMeta();
        unsubMeta = null;
      }
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(true);
        unsubMeta = onValue(
          ref(database, `meta/users/${firebaseUser.uid}`),
          (snap) => {
            setUserMeta(snap.val());
            setLoading(false);
          },
          () => {
            setUserMeta(null);
            setLoading(false);
          },
        );
      } else {
        setUser(null);
        setUserMeta(null);
        setLoading(false);
      }
    });
    return () => {
      unsubAuth();
      if (unsubMeta) unsubMeta();
    };
  }, []);

  const [supportToken, setSupportToken] = useState(() => readSupportToken());
  useEffect(() => {
    const sync = () => setSupportToken(readSupportToken());
    window.addEventListener('nora-support-token', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('nora-support-token', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!supportToken) {
      setSupportSession(null);
      return undefined;
    }
    return onValue(
      ref(database, `platform/supportSessions/${supportToken}`),
      (snap) => setSupportSession(snap.val() ? { token: supportToken, ...snap.val() } : null),
      () => setSupportSession(null),
    );
  }, [user, supportToken]);

  const effectiveMeta = useMemo(() => {
    const session = supportSession;
    const valid = session
      && user
      && session.adminUid === user.uid
      && session.status !== 'ended'
      && (!session.expiresAt || session.expiresAt > Date.now())
      && session.clinicId;
    if (valid) {
      return {
        clinicId: session.clinicId,
        role: 'support',
        supportToken: session.token,
        impersonatorEmail: session.adminEmail || user.email,
        supportExpiresAt: session.expiresAt,
      };
    }
    return userMeta;
  }, [supportSession, user, userMeta]);

  const logout = async () => {
    const token = readSupportToken();
    if (token && user) {
      try {
        await update(ref(database, `platform/supportSessions/${token}`), { status: 'ended', endedAt: Date.now() });
        await set(push(ref(database, 'platform/auditLog')), {
          type: 'impersonate_end',
          title: 'إنهاء جلسة دعم',
          clinicId: supportSession?.clinicId || null,
          clinicName: supportSession?.clinicName || null,
          by: user.email,
          at: Date.now(),
        });
      } catch { /* ignore */ }
      try { sessionStorage.removeItem(SUPPORT_TOKEN_KEY); } catch { /* ignore */ }
    }
    return signOut(auth);
  };

  const endSupport = async () => {
    const token = readSupportToken();
    if (token) {
      try {
        await update(ref(database, `platform/supportSessions/${token}`), { status: 'ended', endedAt: Date.now() });
        await set(push(ref(database, 'platform/auditLog')), {
          type: 'impersonate_end',
          title: 'إنهاء جلسة دعم',
          clinicId: supportSession?.clinicId || null,
          clinicName: supportSession?.clinicName || null,
          by: user?.email || supportSession?.adminEmail,
          at: Date.now(),
        });
      } catch { /* ignore */ }
      try { sessionStorage.removeItem(SUPPORT_TOKEN_KEY); } catch { /* ignore */ }
    }
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      userMeta: effectiveMeta,
      rawUserMeta: userMeta,
      supportSession,
      loading: loading || Boolean(supportToken && supportSession === undefined),
      logout,
      endSupport,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export { AuthProvider };
