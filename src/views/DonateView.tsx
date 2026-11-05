import { Screen } from '../components/Screen';
import { Notice } from '../components/Notice';

export function DonateView() {
  return <Screen path={['donate']} title="Ủng hộ dự án">
    <div className="section-heading"><div><h1>Ủng hộ dự án</h1><p>Cảm ơn bạn đã đồng hành cùng nền tảng học tập mở.</p></div></div>
    <Notice title="Thông tin ủng hộ sẽ được cập nhật."><p>Bạn cũng có thể đóng góp bằng cách chia sẻ dự án, báo lỗi hoặc bổ sung học liệu có quyền phân phối.</p></Notice>
  </Screen>;
}
