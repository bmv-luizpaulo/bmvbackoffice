'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Get services once at the module level.
const { firebaseApp, auth, firestore } = initializeFirebase();

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
