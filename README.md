# Enyalië · Không gian học tập mở

Nền tảng học tập công khai, mã nguồn mở, được tùy chỉnh **trên repository [Enyalië](https://github.com/adidoppalapudi/enyalie)**. Giữ React, TypeScript, Vite, hash router, thẻ ghi nhớ và quiz engine gốc. Lịch sử Git và giấy phép MIT gốc được giữ lại.

**Môn học → Chương → Thẻ ghi nhớ / Tài liệu / Bài kiểm tra.** Giao diện tiếng Việt, có tìm kiếm, lọc học kỳ, giao diện sáng/tối và bố cục di động. Trang chủ `/` mở ngay danh sách môn học. Nhãn **Kỳ n** lấy từ cột `semester` trong bảng tính.

## Kiến trúc công khai

```text
Public GitHub repository → Vite build → static frontend (Pages / Vercel)
                                           ↓ anonymous GET
                              Public Google Spreadsheet (Sheets API v4)
                                           ↓
                           existing flashcard / quiz / document readers
```

- **Google Spreadsheet là nguồn dữ liệu học tập duy nhất lúc chạy**: môn, chương, danh mục tài nguyên, câu hỏi, đáp án và giải thích.
- Tài liệu mở liên kết bên thứ ba (ví dụ Google Drive) trong tab mới. Điền URL đầy đủ vào cột `file` của tab Documents. Hình minh họa vẫn có thể nằm ở `public/documents/`; đường dẫn tài liệu cục bộ cũ cũng được hỗ trợ.
- Không backend, proxy, OAuth, tài khoản người học, phân quyền ứng dụng, service account hoặc cơ sở dữ liệu khác.
- Chỉ gọi `GET spreadsheets.values.batchGet`. Không có chức năng ghi Sheets hay chỉnh sửa nội dung trong ứng dụng.
- Mã nguồn, câu hỏi và **đáp án đều công khai**. Không mã hóa/che giấu đáp án hoặc chống xem mã nguồn. API key của frontend cũng công khai; nó định danh Google API project, không phải mật khẩu để mở nội dung.
- Dữ liệu nguồn được giữ trong bộ nhớ của trang để tránh gọi API khi chuyển mục. Tải lại trang đọc lại bảng tính. Lỗi tải không được giữ trong bộ nhớ và có thể thử lại.
- Câu trả lời, kết quả, vị trí đọc, thẻ hiện tại và lựa chọn giao diện chỉ tồn tại trong bộ nhớ. Không localStorage, sessionStorage, IndexedDB, cookie, analytics hoặc service worker.

## Fork → sao chép bảng tính → cấu hình → deploy

### 1. Fork thành repository công khai

Fork repository chứa bản tùy chỉnh này vào tài khoản GitHub của bạn và giữ visibility **Public**. Nếu bắt đầu từ thư mục cục bộ, tạo repository Public mới rồi push bản tùy chỉnh vào đó; không push vào repository Enyalië gốc nếu bạn không phải maintainer.

Trong lần tùy chỉnh này chưa tạo/push repository GitHub hoặc Google Spreadsheet trực tuyến: chủ dự án chọn cấu hình sau. File mẫu sẵn sàng bên dưới; khi đã có bảng tính công khai, maintainer nên thêm URL `/copy` của nó vào README để người fork sao chép bằng một lần nhấn.

### 2. Sao chép mẫu Google Spreadsheet

**Mẫu có sẵn: [learning-template.xlsx](templates/google-sheets/learning-template.xlsx)** — chứa đủ 5 tab và dữ liệu mẫu tiếng Việt do dự án viết.

1. Tải file `.xlsx` về máy.
2. Tạo bảng tính ở [Google Sheets](https://sheets.google.com), chọn **Tệp → Nhập → Tải lên**, chọn file, rồi **Thay thế bảng tính**. Nếu mở từ Drive, chuyển sang định dạng Google Sheets.
3. Đảm bảo tên tab đúng: `Subjects`, `Chapters`, `Collections`, `Questions`, `Documents`.
4. Chọn **Chia sẻ → Quyền truy cập chung → Bất kỳ ai có đường liên kết → Người xem**. Người truy cập ứng dụng không cần đăng nhập Google. Không cần Apps Script hoặc “Xuất bản lên web”.
5. Lấy ID từ `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.

Nếu maintainer đã cung cấp URL mẫu trực tuyến, mở `https://docs.google.com/spreadsheets/d/TEMPLATE_ID/copy`, tạo bản sao rồi bật quyền xem công khai trên **bản sao**.

Các file CSV tương ứng nằm trong `templates/google-sheets/` để dễ review và đóng góp. Nếu sửa CSV, tạo lại XLSX bằng `python scripts/build-sheet-template.py` (Python 3, chỉ thư viện chuẩn; không cần cho việc chạy/deploy ứng dụng).

### 3. API key và cấu hình

Trong [Google Cloud Console](https://console.cloud.google.com/), tạo/chọn project, bật **Google Sheets API**, vào **APIs & Services → Credentials → Create credentials → API key**. Không cần OAuth consent screen, service account hay Google Drive API.

Copy `.env.example` thành `.env.local`:

```dotenv
VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
VITE_GOOGLE_API_KEY=your_public_api_key
```

Hai giá trị này được đưa vào bundle phía trình duyệt. Không dùng token cá nhân hoặc private key. Bạn có thể giới hạn key cho Google Sheets API và các HTTP referrer của website/localhost để quản lý hạn mức project; việc này không làm nội dung hay đáp án trở thành riêng tư.

### 4. Chạy hoặc triển khai

Node **22.13+** (khuyến nghị Node 24), npm:

```sh
npm ci
npm run dev
```

Mở `http://localhost:5173/`. Nếu chưa cấu hình, giao diện hiển thị hướng dẫn cấu hình; **không tự chuyển sang dữ liệu JSON cục bộ**. Khởi động lại Vite khi thay `.env.local`.

#### Vercel

Import repository Public, chọn Vite, build `npm run build`, output `dist`, Node 24. Thêm hai biến môi trường trên trong project settings rồi deploy. Thay cấu hình cần rebuild; sửa nội dung Sheets chỉ cần tải lại trang.

#### GitHub Pages

1. **Settings → Secrets and variables → Actions → Variables**: thêm `VITE_GOOGLE_SPREADSHEET_ID`, `VITE_GOOGLE_API_KEY`.
2. **Settings → Pages → Source → GitHub Actions**.
3. Push vào `main` hoặc chạy workflow `Deploy to GitHub Pages`.

Workflow chạy tests rồi build với các biến repository và publish `dist/`. `base: './'` và hash routing hỗ trợ cả domain gốc và `/repository-name/`; không cần rewrite phía server. Thiếu cấu hình sẽ cho trang hướng dẫn cấu hình, không tải dữ liệu mẫu.

## Biên tập nội dung

Xem **[schema và hướng dẫn Sheets](docs/GOOGLE-SHEETS.md)** để thêm môn, chương, thẻ, câu hỏi và tài liệu. Giữ dòng đầu là header; hàng trống được bỏ qua. Thứ tự hàng quyết định thứ tự hiển thị (câu hỏi trong bài kiểm tra vẫn được xáo trộn).

Các ID là khóa liên kết ổn định. Không cần nhập số lượng thẻ/câu hỏi: ứng dụng tự tính. Mỗi môn có `semester` nguyên dương, ví dụ `1` → **Kỳ 1**. Giá trị học kỳ mẫu chỉ là minh họa, không phải chương trình đào tạo chính thức.

Mọi thay đổi nội dung thực hiện trong Sheets hoặc repository, không qua UI học tập. Xóa các hàng con hoặc chuyển chúng sang chủ thể khác trước khi xóa môn/chương/bộ câu hỏi. Ứng dụng báo lỗi khi cấu trúc hoặc tham chiếu không hợp lệ.

### Hành vi học tập

- Thẻ: lật bằng F/dấu cách, di chuyển bằng ←/→, xáo trộn bằng S; ảnh trước/sau tùy chọn.
- Bài kiểm tra: một đáp án, nhiều đáp án, đúng/sai. Nhiều đáp án phải chọn đúng toàn bộ tập. Mỗi câu đúng 100 điểm; sai/chưa trả lời/hết giờ 0 điểm.
- Thời gian mỗi câu tùy chọn 10/20/30 giây. Có đồng hồ thì cần xác nhận và đáp án bị khóa; không đồng hồ thì sửa được đến khi nộp bài. Kết quả có giải thích, lọc câu sai và làm lại.
- Documents: nhấn tài liệu để mở URL ở tab mới; việc đọc, tải xuống và quyền truy cập do trang đích (ví dụ Google Drive) quản lý. Website không nhúng trình đọc.
- Tải lại/đóng tab xóa toàn bộ tiến độ và kết quả. URL chỉ giữ điều hướng nội dung, không lưu trạng thái học.

## Cấu trúc và kiểm tra

```text
src/lib/sheets.ts             # GET + chuyển hàng Sheets sang model hiện có
src/lib/content.ts            # API đọc nội dung, cache bộ nhớ trong trang
src/lib/contentValidation.ts  # kiểm tra schema và tham chiếu
src/quiz/                    # quiz engine gốc, không persistence
src/views/                   # thư viện môn, chương và các trình học
public/documents/            # tài sản tĩnh công khai
templates/google-sheets/     # mẫu CSV, XLSX và giấy phép nội dung mẫu
tests/fixtures/              # dữ liệu lịch sử phục vụ kiểm thử, không deploy
docs/                        # hướng dẫn và lịch sử kiến trúc
```

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests dùng Google Sheets responses giả lập; không yêu cầu API key thật và không ghi Google Sheets. Browser tests chạy Vite trên port 4173 với ID/key giả lập, chặn các yêu cầu Sheets và kiểm tra desktop/mobile, retry, reader, quiz và xóa trạng thái khi reload. Kiểm tra kết nối Google thật cần bảng tính/API key của chủ dự án.

## Vị trí quảng cáo

Cấu hình tại `src/config/ads.ts`:

- `home-top`: đầu danh sách môn học.
- `side-left`: banner dọc bên trái danh sách môn học và trang chi tiết môn học.
- `side-right`: banner dọc bên phải danh sách môn học và trang chi tiết môn học.

Hai banner dọc thay cho quảng cáo cuối trang, chỉ hiển thị khi màn hình rộng từ 1280px và nằm ngoài nội dung chính. Màn hình nhỏ tự ẩn hai banner bên. Dùng ảnh dọc, ví dụ 160 × 600 px; mỗi bên có ảnh và liên kết riêng.

Đặt ảnh trong `public/ads/`, sau đó điền cấu hình, ví dụ:

```ts
'home-top': {
  enabled: true,
  image: 'ads/banner.webp',
  alt: 'Tên nhà tài trợ và nội dung ưu đãi',
  href: 'https://example.com',
},
```

Đặt `enabled: false` để tắt một vị trí. Đặt `showAdPlaceholders = false` để ẩn các khung chưa có banner khi xuất bản. Mặc định các khung mẫu được hiển thị để dễ xem vị trí. Link mở tab mới, có nhãn Quảng cáo; không có script quảng cáo, đo lượt xem/click hay lưu dữ liệu. Thay cấu hình/ảnh cần deploy lại.

## Quyền chia sẻ và đóng góp

Chỉ đưa vào repository/Sheets các tài liệu mà chủ dự án có quyền phân phối. Giữ tác giả, nguồn, giấy phép và attribution theo yêu cầu. Nội dung công khai trên mạng không tự động có quyền tái phân phối. Xem [giấy phép nội dung mẫu](templates/google-sheets/LICENSE.md) và [hướng dẫn đóng góp](CONTRIBUTING.md).

Ứng dụng không triển khai cơ chế che giấu học liệu. Các biện pháp hiển thị thông thường (React text escaping, sandbox DOCX, kiểm tra đường dẫn) giúp đọc tệp ổn định, không dùng để giấu đáp án.

Upstream Enyalië: Aditya Doppalapudi, MIT, baseline `a13be9791b52a71f603a016a9a721ab4bfa608ef`. Xem [LICENSE](LICENSE), [dependencies](docs/DEPENDENCIES.md), [nguồn lịch sử](docs/CONTENT-SOURCES.md). Các tài liệu customization trước đây ghi lại giai đoạn JSON; README và GOOGLE-SHEETS.md mô tả kiến trúc hiện tại. Không chạy các script migration cũ lên nội dung tùy chỉnh.
