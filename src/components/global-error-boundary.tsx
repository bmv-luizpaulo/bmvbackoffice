'use client';

import React, { Component, ErrorInfo } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, Copy } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorCode: string | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCode: null };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true, errorCode: null };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    const errorCode = `ERR-${Date.now()}`;
    this.setState({ errorCode });

    try {
      const { firestore, auth } = initializeFirebase();
      const userId = auth.currentUser?.uid || 'anonymous';
      
      const errorLog = {
        userId,
        errorCode,
        errorMessage: error.message,
        errorStack: error.stack || 'No stack available',
        componentStack: errorInfo.componentStack || 'No component stack available',
        pageUrl: window.location.href,
        userAgent: window.navigator.userAgent,
        timestamp: serverTimestamp(),
        isResolved: false,
      };

      await addDocumentNonBlocking(collection(firestore, 'errorLogs'), errorLog);
    } catch (logError) {
      console.error("Failed to log error to Firestore:", logError);
    }
  }

  copyToClipboard = () => {
    if (this.state.errorCode) {
      navigator.clipboard.writeText(this.state.errorCode);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Ocorreu um erro inesperado.</h1>
          <p className="text-muted-foreground">
            A nossa equipe já foi notificada. Por favor, tente atualizar a página ou entre em contato com o suporte.
          </p>
          {this.state.errorCode && (
            <div className="mt-4 space-y-2">
              <p className="text-sm">Ao contatar o suporte, por favor, forneça o código de erro abaixo:</p>
              <div className="flex items-center gap-2 rounded-md border bg-muted p-2">
                <span className="font-mono text-sm">{this.state.errorCode}</span>
                <Button variant="ghost" size="icon" onClick={this.copyToClipboard} aria-label="Copiar código do erro">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <Button onClick={() => window.location.reload()} className="mt-4">
            Atualizar Página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
