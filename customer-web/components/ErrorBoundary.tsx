'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return this.props.fallback ?? (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d0d0d] gap-6 px-6">
        <div className="border border-red-500/30 bg-red-500/5 rounded-sm px-8 py-8 max-w-md w-full text-center">
          <p className="font-heading text-[#E4002B] text-xs tracking-[0.4em] mb-2">SYSTEM ERROR</p>
          <h1 className="font-heading text-white text-2xl mb-3">POS CRASHED</h1>
          <p className="font-heading text-white/50 text-xs mb-6 break-words">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="font-heading text-sm tracking-widest px-6 py-3 bg-[#E4002B] text-white rounded-sm hover:bg-red-700 transition-colors"
          >
            RELOAD POS
          </button>
        </div>
      </div>
    );
  }
}
