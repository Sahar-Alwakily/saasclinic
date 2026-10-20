import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, database } from '../APIFirebase/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Firebase Auth User
  const [userMeta, setUserMeta] = useState(null); // meta/users/{uid} (role, clinicId)
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

  const logout = () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userMeta, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};