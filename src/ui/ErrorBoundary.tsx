import React from 'react';

interface State {
  error: Error | null;
}

/** Lưới an toàn: nếu có lỗi bất ngờ (ví dụ dữ liệu lưu cũ không khớp), người chơi thấy lối thoát thay vì trang trắng. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Game error:', error);
  }

  private resetAndReload = () => {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith('24h_life'))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-4 bg-[#0b0817] text-[#e6defd] font-sans">
        <div className="max-w-sm w-full text-center space-y-4 bg-[#18132f] border border-white/10 rounded-3xl p-6">
          <div className="text-5xl" aria-hidden>
            🛠️
          </div>
          <h1 className="text-xl font-extrabold">Có gì đó trục trặc</h1>
          <p className="text-sm text-[#d8c3ad] leading-relaxed">
            Game gặp lỗi bất ngờ. Thử tải lại trang trước. Nếu vẫn lỗi, hãy bắt đầu một tuần mới (dữ liệu đang chơi sẽ bị xóa).
          </p>
          <div className="space-y-2">
            <button onClick={() => window.location.reload()} className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-[#120e24] font-bold text-sm">
              Tải lại trang
            </button>
            <button onClick={this.resetAndReload} className="w-full py-2.5 rounded-full border border-white/20 hover:bg-white/5 text-sm font-semibold">
              Bắt đầu tuần mới
            </button>
          </div>
        </div>
      </div>
    );
  }
}
