'use client';
import { FirebaseProvider } from '@/firebase/provider';
import React, { ReactNode } from 'react';

/**
 * Ensures Firebase is initialized once and provides it to children components
 * through FirebaseProvider. This component MUST be a client component.
 */
export const FirebaseClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
};
