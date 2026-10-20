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
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // جلب بيانات المستخدم الإضافية (العيادة والدور)
        unsubMeta = onValue(ref(database, `meta/users/${firebaseUser.uid}`), (snap) => {
          setUserMeta(snap.val());
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserMeta(null);
        setLoading(false);
        if (unsubMeta) unsubMeta();
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