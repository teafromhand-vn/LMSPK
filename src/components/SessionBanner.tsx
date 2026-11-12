import { Info } from 'lucide-react';

/** Reminds visitors that all study progress lives only in the current tab's memory. */
export function SessionBanner() {
  return (
    <aside className="session-banner" role="note" aria-label="Thông báo về tiến độ học">
      <Info size={20} aria-hidden="true" />
      <div>
        <h2 className="session-banner-title">Tiến độ chỉ tồn tại trong phiên này</h2>
        <p className="session-banner-text">
          Tải lại hoặc đóng tab sẽ xóa câu trả lời, kết quả và vị trí đang học.
        </p>
      </div>
    </aside>
  );
}
