import { Component } from "react";

// Catches render/runtime errors anywhere in the tree below it and shows a
// recovery screen instead of an unrecoverable white blank page.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // A failed dynamic import usually means the user is running an old cached
    // build after a new deploy. Reload once to pull the fresh assets.
    const msg = error?.message || "";
    const isChunkError = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk/i.test(msg);
    if (isChunkError && !sessionStorage.getItem("inzira_reloaded_for_chunk")) {
      sessionStorage.setItem("inzira_reloaded_for_chunk", "1");
      window.location.reload();
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.href = "/app/login";
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-background flex-col gap-4 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
          <p className="text-text-secondary text-[11px] max-w-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-border text-text-primary rounded-btn text-[11px] font-medium"
            >
              Reload
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-primary text-white rounded-btn text-[11px] font-medium"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
