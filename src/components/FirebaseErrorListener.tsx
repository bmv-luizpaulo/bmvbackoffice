'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // When an error is set, throw it. This will be caught by the nearest
  // Next.js error boundary (e.g., global-error.js).
  if (error) {
    // By re-throwing, we ensure Next.js's error overlay is triggered.
    // The component will unmount, and a new instance will be created on the next render,
    // effectively resetting the state.
    throw error;
  }

  // This component renders nothing.
  return null;
}
