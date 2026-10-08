import { Component, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
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
