# Schema Google Sheets (v2)

Syllabus tạm tắt (SOON), không được yêu cầu trong runtime. Các cột giới thiệu `description` và `detail` đã bỏ khỏi schema môn/chương/bộ thẻ/bài kiểm tra/tài liệu. Nếu bảng cũ còn các cột này, ứng dụng bỏ qua; có thể xóa cột trực tiếp trong Sheets. Giữ nguyên `Questions.explanation` vì đó là lời giải học tập.

Ứng dụng đọc 5 tab qua một GET `https://sheets.googleapis.com/v4/spreadsheets/{id}/values:batchGet`. Phạm vi mỗi tab là `A:Z`, hàng 1 là header. Không giới hạn số hàng cố định trong code. Header có thể đổi thứ tự nhưng phải giữ đúng tên, không trùng. Giữ cả cột tùy chọn trong mẫu; ô tùy chọn được để trống. Số hoặc boolean do Sheets trả về được chuyển về dạng chuỗi trước khi phân tích.

## Subjects

| Cột | Nội dung |
| --- | --- |
| `id` | Duy nhất; chữ thường, số, dấu `-`, ví dụ `database` |
| `courseId` | Mã hiển thị, ví dụ `DBI202`; trống → ID viết hoa |
| `name` | Tên môn học, không để trống |
| `semester` | Số nguyên dương: `1`, `2`, …; hiển thị `Kỳ n` |
| `category` | Nhóm chuyên môn để tìm kiếm, ví dụ `Công nghệ thông tin` |
| `color` | `blue`, `green`, `purple`, `amber` |

## Chapters

`subjectId`, `id`, `name`.

`subjectId` tham chiếu Subjects.id. `id` duy nhất trong môn, cùng quy tắc slug với Subjects.id. Thứ tự hàng là thứ tự chương. Có thể chỉ giữ header nếu không có chương.

## Collections

`id`, `subjectId`, `chapterId`, `kind`, `name`, `category`.

- `id` duy nhất **trên toàn bộ tab**, kể cả giữa thẻ và bài kiểm tra. Ví dụ `database-cards`, `database-test`.
- `kind`: `flashcards` hoặc `tests`.
- `chapterId`: tùy chọn; phải thuộc subjectId tương ứng nếu có. Bỏ trống để hiển thị trực tiếp trong môn, không có tiêu đề nhóm chung.
- `name`, `category`: không để trống. Màu và tên môn kế thừa Subjects; số câu tự tính.

## Questions

`collectionId`, `id`, `type`, `prompt`, `answer`, `choices`, `correctIndices`, `explanation`, `image`, `imageAlt`, `backImage`, `backImageAlt`.

- `collectionId` tham chiếu Collections.id; `id` duy nhất trong bộ câu hỏi.
- `prompt` là câu hỏi/mặt trước. `explanation` tùy chọn.
- `flashcard`: điền `answer` là mặt sau. Chỉ thuộc collection kind `flashcards`.
- `true_false`: điền `answer` là `TRUE` hoặc `FALSE` (không phụ thuộc hoa/thường). Chỉ thuộc `tests`.
- `multiple_choice`: `choices` là mảng JSON như `["JVM","DNS","CSS"]`; `correctIndices` là mảng đúng một chỉ số như `[0]`.
- `multiple_select`: cùng dạng choices; correctIndices như `[0,2]`, không lặp và phải trong phạm vi.
- **Chỉ số đáp án bắt đầu từ 0**, theo thứ tự gốc trong ô choices; engine tự ánh xạ khi xáo trộn.
- `image`, `backImage`: tùy chọn cho flashcard, đường dẫn như `documents/java/jvm.svg`; điền alt tương ứng khi có ảnh.
- Bộ câu hỏi phải có ít nhất một câu đúng loại. Không trộn flashcard vào tests.

Nhập mảng JSON vào một ô (không tách thành nhiều cột). Khi nhập CSV, Google Sheets xử lý dấu ngoặc kép CSV; trong giao diện Sheets bạn chỉ cần gõ `["A","B"]`. Không dùng dấu nháy cong. Câu hỏi/đáp án là văn bản, không phải HTML thực thi.

## Documents

`id`, `subjectId`, `chapterId`, `name`, `category`, `format`, `file`.

- `id` duy nhất trong tab. chapterId tùy chọn, như Collections.
- `format`: `pdf`, `docx`, `md`, `txt`.
- `file`: URL đầy đủ của tài liệu, ví dụ `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`. Nhập URL dạng văn bản trực tiếp, không dùng công thức HYPERLINK với nhãn thay thế.
- `subjectId`: môn của tài liệu khai báo khi đăng; bộ lọc mã môn lấy từ Subjects.courseId của môn này.
- Các trường trừ chapterId không được để trống. Không đặt tệp nhị phân trong ô Sheets.

Khi nhấn tài liệu trong trang môn học hoặc Documents, liên kết mở trực tiếp trong tab mới. Website không tải nội dung, nhúng iframe hoặc chuyển đổi link Google Drive. Hãy chia sẻ tệp Drive cho người xem phù hợp. Đường dẫn tệp cục bộ `documents/...` cũ vẫn được hỗ trợ và cũng mở tab mới. Thay liên kết trong Sheets chỉ cần reload trang.

## Xuất bản bản mẫu dùng chung

Sau khi nhập XLSX và chia sẻ bảng tính cho bất kỳ ai có đường liên kết (Viewer), thêm link `https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE_ID/copy` vào README của fork. Người tiếp theo chỉ cần sao chép, bật quyền xem trên bản sao, điền ID/key và deploy. Dự án không tự tạo bảng tính hoặc chỉnh quyền Drive.

## Lỗi thường gặp

- Thiếu cấu hình: điền đủ hai biến VITE trong `.env.local` hoặc hosting; restart/rebuild.
- 400: sai API key hoặc sai tên tab/phạm vi; giữ đủ 5 tab kể cả khi chỉ có header.
- 403/404: kiểm tra ID, quyền “Bất kỳ ai có đường liên kết — Người xem”, đã bật Sheets API và referrer nếu key có giới hạn.
- 429: hết hạn mức Google API project; đợi rồi thử lại. Các request thất bại không bị cache.
- Lỗi schema: kiểm tra header, ID trùng, tham chiếu chương/môn và mảng đáp án. Sửa Sheets rồi nhấn Thử lại.
- Thay nội dung nhưng chưa thấy: tải lại trang. Bộ nhớ nội dung chỉ tồn tại trong trang đang mở.

Không có kết nối Google trực tiếp trong unit/E2E tests. Kiểm tra thủ công sau cấu hình: mở trang không đăng nhập, thấy môn và kỳ đúng; đọc tài liệu, lật thẻ, nộp bài; reload và xác nhận kết quả biến mất. DevTools sẽ hiển thị đáp án trong response Sheets — đó là hành vi đúng của dự án công khai.
