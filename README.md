# DEBQC — UI Tracking Tool

Tự động chụp lại cấu trúc UI của từng màn hình theo thời gian, so sánh giữa các lần chạy, và báo cáo
chính xác đã thay đổi những gì (text, options, structure, style, đa ngôn ngữ). Chi tiết thiết kế: xem
[UI-TRACKING-TOOL-PLAN.md](UI-TRACKING-TOOL-PLAN.md) và tóm tắt trình bày:
[SUMMARY-PLAN.md](SUMMARY-PLAN.md).

## Cấu trúc repo

pnpm monorepo (`packages/`):

| Package | Vai trò |
|---|---|
| `core` | Model dữ liệu chung (Screen/Control/Change...), đọc/ghi config & artifact trên filesystem |
| `capture` | Mở trình duyệt (Playwright), đăng nhập, chụp cấu trúc UI theo Locator Registry |
| `diff` | So sánh 2 snapshot (theo locale, theo run), phân loại từng thay đổi |
| `recorder` | Hỗ trợ khai báo locator bán tự động: click control trong trình duyệt → đề xuất locator |
| `cli` | `debqc` — lệnh dòng lệnh nối các bước trên (`record`, `track run`, `validate-locators`) |
| `dashboard` | Xem timeline run + report trên trình duyệt (React + Vite) |

## Cài đặt

Yêu cầu Node.js ≥ 20, pnpm (qua corepack).

```sh
corepack enable
corepack pnpm install
corepack pnpm exec playwright install chromium   # tải trình duyệt cho Playwright
corepack pnpm -r build
```

## Workspace mẫu (fixture) đi kèm repo

Repo có sẵn 1 project fixture ở `workspace/` để chạy thử ngay không cần app thật:

```
workspace/
  projects.yaml                              # danh sách project
  projects/fixture-app/
    screens.config.yaml                      # baseUrl, locale, danh sách màn hình
    html/*.html                              # HTML tĩnh đóng vai "app" để test
    locators/customer-edit.locators.yaml     # Locator Registry của màn customer-edit
```

`screens.config.yaml` của `fixture-app` trỏ `baseUrl: http://localhost:4173` — cần serve thư mục HTML
tĩnh ở cổng đó trước khi chạy `record` hoặc `track run` trên fixture:

```sh
npx serve workspace/projects/fixture-app/html -l 4173
```

Để cổng này chạy trong 1 cửa sổ terminal riêng, rồi mở terminal khác cho các lệnh bên dưới.

## Dùng CLI

Tất cả lệnh chạy qua `packages/cli/dist/index.js` (sau khi `pnpm -r build`), gọi từ thư mục gốc repo,
mặc định đọc `workspace/` ở thư mục hiện tại (`--workspace <path>` để đổi):

```sh
node packages/cli/dist/index.js <command>
```

### 1. Khai báo locator cho 1 màn hình mới — `record`

Mở trình duyệt **headed** (có giao diện), click vào control cần theo dõi → tool đề xuất locator theo thứ
tự ưu tiên `getByTestId → getByRole → getByLabel → getByPlaceholder → getByText → css` → gõ 1 key (định
danh logic, vd `field.email`) → tool ghi vào `<screenId>.locators.yaml`. Enter bỏ trống để bỏ qua control
đó. Đóng cửa sổ trình duyệt để kết thúc phiên ghi.

```sh
node packages/cli/dist/index.js record --project fixture-app --screen customer-edit
```

`key` là định danh **ổn định qua các phiên bản UI** — diff so khớp theo `key` này, không theo DOM path/
class/id, nên đổi tên biến CSS hay thứ tự DOM không làm mất dấu control.

### 2. Chụp + so sánh + sinh report — `track run`

```sh
# 1 project
node packages/cli/dist/index.js track run --project fixture-app

# toàn bộ project khai báo trong workspace/projects.yaml
node packages/cli/dist/index.js track run --all
```

Lần chạy đầu tiên không có baseline → mọi control được báo `CONTROL_ADDED`. Từ lần chạy thứ 2 trở đi,
tool so với baseline (snapshot lần chạy trước) và phân loại thay đổi: `TEXT_CHANGED`, `OPTIONS_CHANGED`,
`TYPE_CHANGED`, `CONTROL_REORDERED`, `STYLE_CHANGED`, `CONTROL_ADDED`, `CONTROL_REMOVED`, và
`LOCATOR_BROKEN` khi 1 locator trong registry không còn resolve được (luôn nổi lên report, không bị nuốt).

Kết quả ghi vào `workspace/projects/<id>/runs/<run-id>/report.json` + `report.html` (mở trực tiếp bằng
trình duyệt), và `workspace/projects/<id>/history.json` (danh sách các lần chạy).

### 3. Kiểm tra locator registry còn resolve được không — `validate-locators`

Chạy nhanh, không chụp/không diff — chỉ xác nhận mọi locator trong registry hiện còn tìm thấy đúng 1
control trên trang thật. Hữu ích sau khi dev sửa UI, trước khi chạy `track run` đầy đủ.

```sh
node packages/cli/dist/index.js validate-locators --project fixture-app
```

## Xem report trên dashboard

```sh
corepack pnpm --filter dashboard dev
```

Mở URL Vite in ra (mặc định `http://localhost:5173`) → chọn project → xem timeline các lần `track run` →
mở 1 run để xem diff, lọc theo loại thay đổi/locale → đánh dấu "đã review".

## Chạy test

```sh
corepack pnpm -r test        # toàn bộ package
corepack pnpm --filter core test   # 1 package cụ thể
```

Test tích hợp (capture→diff, record) dùng trình duyệt Playwright headless thật và filesystem thật (không
mock) — cần đã chạy `playwright install chromium` ở bước Cài đặt.

## Quy chuẩn code / đóng góp

Xem [CLAUDE.md](CLAUDE.md) (quy chuẩn AI assistant, áp dụng chung cho mọi người đóng góp) và
[docs/standards/](docs/standards/README.md) (chi tiết naming, kiến trúc, testing, validation...).
