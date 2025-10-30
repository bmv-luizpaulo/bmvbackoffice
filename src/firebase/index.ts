'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { DependencyList, useMemo } from 'react';

// --- Singleton Pattern for Firebase Services ---
// We use a global symbol to store the instances so they persist across hot-reloads in development.
const FIREBASE_SERVICES_SYMBOL = Symbol.for('firebase_services_singleton');

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

function getFirebaseServices(): FirebaseServices {
  const globalWithFirebase = globalThis as typeof globalThis & {
    [FIREBASE_SERVICES_SYMBOL]?: FirebaseServices;
  };

  if (globalWithFirebase[FIREBASE_SERVICES_SYMBOL]) {
    return globalWithFirebase[FIREBASE_SERVICES_SYMBOL];
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  let firestore: Firestore;
  try {
      firestore = initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
  } catch (e) {
      // This can happen if firestore is already initialized.
      firestore = getFirestore(app);
  }

  const services: FirebaseServices = { firebaseApp: app, auth, firestore };
  globalWithFirebase[FIREBASE_SERVICES_SYMBOL] = services;
  
  return services;
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  return getFirebaseServices();
}

/**
 * Custom hook to memoize Firebase queries.
 * This is a wrapper around `React.useMemo` that helps to ensure that
 * query objects are not re-created on every render, which can cause
 * infinite loops in `useCollection` or `useDoc`.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(factory, deps);
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';