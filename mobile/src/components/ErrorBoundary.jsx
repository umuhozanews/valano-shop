import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DataBridge Mobile UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-6 bg-bg text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-600 mb-3">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-[17px] font-bold text-ink mb-1">Page Rendering Error</h2>
          <p className="text-[12.5px] text-muted mb-4 max-w-[320px]">
            An unexpected error occurred while loading this page: {this.state.error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-white shadow-xs"
          >
            <RefreshCw size={15} /> Refresh DataBridge
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
