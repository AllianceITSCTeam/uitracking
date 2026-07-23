# Nguyên tắc: Frontend / UI

Nguyên tắc dựng UI, không phụ thuộc framework. T1 ở tầng này ít — phần lớn hướng dẫn cụ thể nằm ở file standards gốc của project.

## Server-default — đẩy logic lên server

- **Mặc định render phía SERVER.** Chỉ chuyển sang thành phần chạy ở client khi thật sự cần **tương tác** (state, event, input). Đẩy logic phức tạp lên server → giảm mã gửi xuống client, tối ưu UX.
- **Ranh giới sắc nét:** thành phần client **không** truy vấn lưu trữ trực tiếp — phải đi qua một lớp server (route/action). Thành phần server không dùng state/event của client.

## Không tin client — server enforce

- **Ẩn/hiện UI theo quyền chỉ là UX**, không phải cơ chế bảo mật. **SERVER PHẢI enforce** mọi quyền ở tầng route/service; đừng suy quyền từ việc client "thấy được nút". Nguyên tắc deny-by-default + server enforce: [authorization.md](authorization.md).

## URL là nơi giữ trạng thái điều hướng

- Filter / sort / pagination đặt ở **URL** (query param), không giấu trong state cục bộ → link **chia sẻ được**, nút **back/forward** hoạt động đúng, reload không mất ngữ cảnh.
- State cục bộ chỉ dành cho **UI thuần** (toggle modal, focus, lỗi nhập tạm).

## Một cổng gọi API duy nhất

- **Một fetch wrapper dùng chung** cho mọi request client → server: gắn header chuẩn (correlation/context), bóc lớp `data`, ném lỗi có kiểu tại một chỗ.
- **KHÔNG** gọi fetch thô rải rác trong component; **KHÔNG** tự thêm header lẻ ngoài wrapper.

## Component nhỏ + composition

- Component **nhỏ, một trách nhiệm**, ghép bằng **composition thay vì kế thừa**. Tên = **công dụng**; tránh `Base*` / `Abstract*`.
- Tách **data fetching** khỏi **render**: nơi lấy dữ liệu tách khỏi nơi hiển thị → dễ test, dễ tái dùng.

## Design token tập trung

- Màu / spacing / typography khai báo **một chỗ** (design token / theme config), **không hardcode** rải rác trong component → đổi giao diện không phải sửa khắp nơi.

## Schema validation dùng chung client–server

- Định nghĩa **một schema** dùng cho **cả** validate ở server **lẫn** suy kiểu + báo lỗi ở client — **không** định nghĩa 2 chỗ (DRY). Chi tiết parse-ở-biên & lỗi có kiểu: [validation-and-errors.md](validation-and-errors.md).

## Accessibility

- Dùng **HTML ngữ nghĩa** (`nav`/`main`/`section`, `label` gắn field, nhãn cho nút chỉ-có-icon); đảm bảo tương phản màu tối thiểu. A11y là mặc định, không phải việc làm sau.
