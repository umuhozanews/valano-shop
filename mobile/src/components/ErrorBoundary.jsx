import React from "react";
import { AlertTriangle, Home, RefreshCw, Sparkles } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[React ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "";
      const isChunkError =
        errMsg.includes("Failed to fetch dynamically imported module") ||
        errMsg.includes("Importing a module script failed") ||
        this.state.error?.name === "ChunkLoadError";

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-paper p-4">
          <div className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl text-center space-y-4 db-rise">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              isChunkError ? "bg-primary-xlt text-primary border border-primary/20" : "bg-danger-lt text-danger border border-danger/20"
            }`}>
              {isChunkError ? <Sparkles size={28} /> : <AlertTriangle size={28} />}
            </div>

            <div className="space-y-1">
              <h2 className="font-heading text-lg font-extrabold text-ink">
                {isChunkError ? "App Updated!" : "Something went wrong"}
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                {isChunkError
                  ? "A new version of DataBridge Mobile has been deployed! Please reload to fetch the latest features."
                  : "An unexpected error occurred while displaying this page. Don't worry, your business data is safe."}
              </p>
            </div>

            {errMsg && (
              <div className="rounded-xl border border-line bg-paper p-3 text-[11px] font-mono text-muted text-left overflow-x-auto max-h-24">
                {errMsg}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-xs font-extrabold text-white shadow-sm hover:bg-primary-lt transition cursor-pointer"
              >
                <RefreshCw size={15} /> {isChunkError ? "Reload Latest App Version" : "Reload Page"}
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-line bg-paper hover:bg-line/40 text-xs font-bold text-ink transition cursor-pointer"
              >
                <Home size={15} /> Back Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

