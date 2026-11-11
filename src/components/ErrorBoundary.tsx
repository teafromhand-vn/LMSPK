import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches a crash while drawing the screen and offers a reload instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LMSPK hit an error while rendering:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <p className="notice-title">Đã xảy ra lỗi khi hiển thị trang.</p>
        <p>Tải lại để thử lại. Câu trả lời và vị trí đọc sẽ được đặt lại.</p>
        <pre className="crash-detail">{this.state.error.message}</pre>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Tải lại
        </button>
      </div>
    );
  }
}
