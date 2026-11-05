import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 p-6 text-center select-none">
          <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-100 mb-2">Something went wrong</h2>
          <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred in the prayer journal.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reload Journal
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
