'use client';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, // Revert back to persistent cache
  persistentMultipleTabManager, // Use multi-tab manager
  type Firestore,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  DocumentData,
} from 'firebase/firestore';
import { DependencyList, useMemo } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
      // Use persistent cache with multi-tab management
      firestore = initializeFirestore(app, {
          localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
          }),
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
 * It now returns null if any dependency is null or undefined, preventing invalid queries.
 */
export function useMemoFirebase<T>(factory: () => T | null, deps: DependencyList): T | null {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => {
        // If any dependency is null or undefined, don't execute the factory.
        if (deps.some(dep => dep === null || dep === undefined)) {
            return null;
        }
        return factory();
    }, deps);
}

/**
 * Initiates an addDoc operation for a collection reference.
 * It does not block the UI but will throw a global, catchable error on permission failure.
 * Returns the DocumentReference on success.
 */
export async function addDocumentNonBlocking(colRef: CollectionReference, data: DocumentData): Promise<DocumentReference> {
  try {
    const docRef = await addDoc(colRef, data);
    return docRef;
  } catch (serverError: any) {
    const permissionError = new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    // Re-throw the original error to allow local promise rejection handling if needed
    throw serverError;
  }
}

/**
 * Initiates a setDoc operation. It does not block the UI thread.
 * On permission error, it emits a global error event.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: DocumentData, options?: SetOptions): void {
  setDoc(docRef, data, options || {}).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: options && 'merge' in options ? 'update' : 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Initiates an updateDoc operation. It does not block the UI thread.
 * On permission error, it emits a global error event.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: DocumentData): void {
  updateDoc(docRef, data).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Initiates a deleteDoc operation. It does not block the UI thread.
 * On permission error, it emits a global error event.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference): void {
  deleteDoc(docRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export { useUser, useAuth, useFirestore, useFirebaseApp, FirebaseProvider } from './provider';
export { FirebaseClientProvider } from './client-provider';
