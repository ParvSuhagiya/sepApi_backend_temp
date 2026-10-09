import { Component, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Compact inline fallback for sections (e.g. maps) instead of the page crash UI. */
  compact?: boolean;
  title?: string;
  message?: string;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/** Last-resort crash UI. Never shows raw error text. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.compact) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-line bg-raised p-4 text-sm text-ink"
        >
          <p className="font-bold">{this.props.title ?? 'This section failed to load'}</p>
          <p className="mt-1 text-muted">
            {this.props.message ?? 'The rest of your results are unaffected.'}
          </p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          The page hit an unexpected problem. Your data was not sent anywhere.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload the app
          </Button>
        </div>
      </div>
    );
  }
}
