import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center min-h-[200px]">
          <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
          <p className="text-sm text-muted-foreground">
            {this.props.fallbackMessage || "Something went wrong loading this section."}
          </p>
          {message && (
            <pre className="text-left w-full max-w-md text-[11px] text-muted-foreground/80 bg-muted/50 rounded-lg p-3 overflow-auto max-h-24">
              {message}
            </pre>
          )}
          {isDev && this.state.error.stack && (
            <pre className="text-left w-full max-w-md text-[10px] text-muted-foreground/60 bg-muted/30 rounded p-2 overflow-auto max-h-32">
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
