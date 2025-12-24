"use client";

import { Component, ReactNode } from "react";
import { Card } from "./Card";
import { Button } from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <main className="min-h-screen flex items-center justify-center p-4">
          <Card className="text-center max-w-md">
            <div className="text-2xl font-bold mb-4">Something went wrong</div>
            <div className="text-[var(--danger)] mb-4 p-4 bg-[var(--danger)]/10 rounded-lg">
              <p className="text-sm font-mono">{this.state.error.message}</p>
            </div>
            <div className="space-y-2">
              <Button onClick={this.reset} className="w-full">
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.href = "/"}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
