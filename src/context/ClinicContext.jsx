import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useAuth } from './AuthContext';

const ClinicContext = createContext(null);

export const ClinicProvider = ({ children }) => {
  const { userMeta, loading: authLoading } = useAuth();
  const [clinicInfo, setClinicInfo] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  const clinicId = userMeta?.clinicId || null;
  const userRole = userMeta?.role || null;
  const userCategory = userMeta?.category || null;
  useEffect(() => {
    if (authLoading) {
      setLoadingClinic(true);
      return undefined;
    }
    if (!clinicId) {
      setClinicInfo(null);
      setLoadingClinic(false);
      return undefined;
    }

    setLoadingClinic(true);
    const unsub = onValue(
      ref(database, `clinics/${clinicId}/info`),
      (snap) => {
        setClinicInfo(snap.val());
        setLoadingClinic(false);
      },
      () => {
        setClinicInfo(null);
        setLoadingClinic(false);
      },
    );
    return () => unsub();
  }, [clinicId, authLoading]);

  const buildClinicPath = useCallback((subPath = '') => {
    if (!clinicId) return null;
    const clean = String(subPath || '').replace(/^\/|\/$/g, '');
    return clean ? `clinics/${clinicId}/${clean}` : `clinics/${clinicId}`;
  }, [clinicId]);

  // null حتى تُحمَّل العيادة — حتى لا يُستدعى Firebase بمسار "null"
  const clinicPath = clinicId ? buildClinicPath : null;

  return (
    <ClinicContext.Provider
      value={{
        clinicId,
        clinicInfo,
        userRole,
        clinicPath,
        userCategory,
        loadingClinic,
        isAdmin: userRole === 'admin',
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error('useClinic must be used within ClinicProvider');
  return ctx;
};