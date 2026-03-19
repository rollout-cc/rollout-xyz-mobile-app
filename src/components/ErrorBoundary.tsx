import React from "react";
import { Button } from "@/components/ui/button";
import RolloutFlag from "@/assets/rollout-flag.svg";

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error?.message, error, info.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const message = this.state.error.message;
      const isDev = import.meta.env.DEV;
      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
          <img
            src={RolloutFlag}
            alt="Rollout flag"
            className="h-16 w-16 animate-pulse"
          />
          <p className="text-lg font-semibold text-foreground">
            F*ck, something went wrong
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            a ROLLOUT team member just got an email because of this and will be fixing soon
          </p>
          {isDev && message && (
            <pre className="mt-2 w-full max-w-md overflow-auto rounded-lg bg-muted/50 p-3 text-left text-[11px] text-muted-foreground/80 max-h-24">
              {message}
            </pre>
          )}
          {isDev && this.state.error.stack && (
            <pre className="w-full max-w-md overflow-auto rounded bg-muted/30 p-2 text-left text-[10px] text-muted-foreground/60 max-h-32">
              {this.state.error.stack}
            </pre>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
