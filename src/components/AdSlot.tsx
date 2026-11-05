import { ads, showAdPlaceholders, type AdPlacement } from '../config/ads';

const labels: Record<AdPlacement, string> = {
  'home-top': 'Đầu danh sách môn học',
  'side-left': 'Bên trái trang',
  'side-right': 'Bên phải trang',
};

/** Static sponsor banners; no scripts, tracking, or persistence. */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const ad = ads[placement];
  if (!ad.enabled || (!ad.image && !showAdPlaceholders)) return null;
  const banner = ad.image ? (
    <img src={`${import.meta.env.BASE_URL}${ad.image}`} alt={ad.alt} loading="lazy" />
  ) : null;
  return (
    <aside className={`ad-slot${placement === 'home-top' ? '' : ' ad-slot-vertical'}`} aria-label={`Quảng cáo — ${labels[placement]}`}>
      <span className="ad-label">
        Quảng cáo · Bật tiện ích chặn quảng cáo nếu bạn không muốn xem quảng cáo
      </span>
      {banner ? (
        ad.href ? <a href={ad.href} target="_blank" rel="sponsored noopener noreferrer">{banner}</a> : banner
      ) : (
        <div className="ad-placeholder">
          <span>Vị trí quảng cáo</span>
          <small>{labels[placement]} · Banner {placement === 'home-top' ? 'ngang' : 'dọc'}</small>
        </div>
      )}
    </aside>
  );
}
