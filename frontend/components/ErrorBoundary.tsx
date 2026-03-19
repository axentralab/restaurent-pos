'use client';
import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <span className="text-5xl mb-4">⚠️</span>
          <h2 className="text-white font-bold text-lg mb-2">Something went wrong</h2>
          <p className="text-zinc-500 text-sm mb-6 max-w-sm">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-amber-500 text-black rounded-xl text-sm font-bold hover:bg-amber-400 transition-all"
          >Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
