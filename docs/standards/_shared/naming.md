# Nguyên tắc: Đặt tên

Nguyên tắc đặt tên không phụ thuộc ngôn ngữ, framework, hay nghiệp vụ. Casing cụ thể, tên bảng ví dụ, ngoại lệ theo project: xem file standards gốc.

## Nguyên tắc chủ đạo — "một tên, xuyên tầng"

Giảm **tối đa** số lằn ranh đổi casing. Mỗi chỗ casing bị lật (`x_y` ↔ `xY`) là một chỗ dễ ghi sai, dễ lệch, phải bảo trì. Nên: chỉ giữ **đúng một** ranh giới đổi tên trong toàn hệ, và đặt nó ở nơi tự nhiên nhất.

- **Data shape** (object mang hình dạng dữ liệu: từ tầng lưu trữ → service → biên API) giữ **một casing thống nhất khớp store**, dùng **nguyên tên field từ lưu trữ**, **KHÔNG map qua lại**. Quy tắc rút gọn: *field dữ liệu = tên ở store, ở mọi tầng.*
- **Định danh ngôn ngữ** (biến/hàm local, type, thành phần code thuần) theo **idiom của ngôn ngữ** — để không chọi framework/thư viện.

**Ranh giới duy nhất: giữa *dữ liệu* và *code-logic*.** Không có mapping store↔API. Ai chạm dữ liệu thì dùng tên ở store; ai viết logic thuần thì dùng idiom ngôn ngữ.

## Quy ước tên nhất quán

- **Boolean:** tiền tố nhất quán (vd `is_...`) → đọc là câu hỏi đúng/sai.
- **Thời gian:** hậu tố nhất quán (vd `..._at`) → biết ngay là mốc thời gian.
- **Tên tập hợp vs phần tử:** bảng/tập dữ liệu số **nhiều**, model/thực thể số **ít**.
- **Khóa ngoại:** `<entity>_id` → nhìn tên biết trỏ về thực thể nào.
- **Field DẪN XUẤT** (không phải trường gốc ở store — lấy qua join/tính toán) đặt **phẳng** cùng cấp, gắn **suffix nhất quán** để phân biệt với trường gốc. Trường gốc giữ nguyên; chỉ kèm field dẫn xuất khi ngữ cảnh cần.

Vì sao: quy ước nhất quán biến tên thành thông tin đọc-được-ngay, không phải đoán; người đọc code/schema hiểu vai trò của field mà không cần tra định nghĩa.

## STOP-AND-DISCUSS — gặp tên không khớp quy ước thì DỪNG

**Bắt buộc.** Đang code mà gặp trường hợp đặt tên **không** khớp bất kỳ quy tắc nào:

1. **DỪNG lại.** KHÔNG tự ý đặt tên rồi đi tiếp.
2. **Thảo luận với con người** — nêu tình huống, đề xuất 1–2 phương án kèm lý do, hỏi để chốt.
3. **Ghi quy tắc mới vào file standards** (đúng mục tương ứng) sau khi thống nhất.
4. **Tiếp tục code** theo quy tắc vừa chốt.

Không suy diễn "chắc là theo pattern X". Tên đặt sai lan ra store/API/code rất khó sửa về sau — **chi phí 1 câu hỏi ≪ chi phí đổi tên toàn hệ.**
