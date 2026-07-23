# Kế hoạch xây dựng Tool Tracking UI Changes

> Web app · Snapshot cấu trúc DOM · Playwright headless · History liên tục · Web dashboard · Node.js/TypeScript
> Mục đích: QA regression + Audit thay đổi UI

---

## 1. Mục tiêu & phạm vi

Tool phát hiện và ghi nhận **thay đổi UI** giữa các lần chạy trên từng màn hình của một web project:

- **Text**: label, placeholder, tooltip, button text, tiêu đề.
- **Data/nội dung**: options trong dropdown, header cột table, (tùy chọn) dữ liệu trong table.
- **Cấu trúc control**: loại control (input/select/button/checkbox...), thứ tự sắp xếp, thêm/bớt control.
- **Style**: màu sắc, font, kích thước, layout (thuộc tính CSS quan trọng).

Kết quả lưu thành **history theo thời gian** (timeline), xem trên **web dashboard**, highlight diff trực quan.

### Ngoài phạm vi (giai đoạn đầu)
- So sánh pixel/visual (ảnh) — chỉ dùng screenshot làm bằng chứng phụ, không dùng để diff.
- Đối chiếu với Figma/design.
- Tự động sửa lỗi UI.

---

## 2. Thách thức cốt lõi cần giải quyết sớm

Đây là các vấn đề quyết định tool có dùng được thực tế hay không:

1. **Nhiễu do dữ liệu động (data noise)** — Table/dropdown đổ data thật sẽ khác nhau mỗi lần chạy (ngày giờ, ID, số dòng). Nếu track hết → báo "thay đổi" giả liên tục.
   - **Giải pháp**: phân tách rõ **cấu trúc** (header cột, số cột, control type) với **nội dung** (giá trị từng ô). Cho phép cấu hình mức track theo từng vùng: `structure-only`, `structure+content`, hoặc `ignore`. Hỗ trợ regex mask (ví dụ mask ngày/số) để chuẩn hóa trước khi so sánh.

2. **Định danh control ổn định qua các phiên bản** — Nếu DOM đổi class/id, tool phải biết "đây vẫn là control cũ đã đổi màu" chứ không phải "control mới + control cũ bị xóa".
   - **Giải pháp (đã chốt)**: mỗi project chuẩn bị sẵn một **Bộ khai báo Locator (Locator Registry)** cho toàn bộ màn hình — xem [mục 4](#4-bộ-khai-báo-locator-locator-registry). Mỗi control có một **logical key** do QA đặt, tách rời khỏi DOM; tool phân giải key → element qua locator theo thứ tự ưu tiên Playwright. Không tự đoán key.

3. **Blind spot của chế độ declared-only** — Tool **chỉ** track control có trong registry. Hệ quả:
   - Control **bị xóa/đổi selector** → locator không phân giải được → **PHÁT HIỆN** là `CONTROL_REMOVED`/`LOCATOR_BROKEN`. ✅
   - Control **mới thêm nhưng chưa khai báo** → tool **KHÔNG thấy**. ⚠️
   - **Giảm thiểu (tùy chọn)**: thêm "structural drift check" nhẹ — đếm số con của một vài container mốc; nếu số con lệch so với lần trước thì **gắn cờ cảnh báo** "có control lạ xuất hiện" (không định danh, chỉ nhắc QA bổ sung locator). Đây là an toàn tối thiểu, không phá vỡ nguyên tắc declared-only.

4. **Trạng thái động của màn** — Nhiều thay đổi chỉ xuất hiện sau khi login, mở tab, bấm nút, load async.
   - **Giải pháp**: mỗi màn hình định nghĩa bằng một **kịch bản (scenario)** gồm các bước điều hướng + điều kiện "sẵn sàng" (wait for selector / network idle) trước khi snapshot.

5. **Timing / async render** — Snapshot quá sớm sẽ thiếu control.
   - **Giải pháp**: chờ `networkidle` + wait custom selector; retry nếu snapshot rỗng bất thường.

---

## 3. Kiến trúc tổng thể

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Capture Engine │     │   Diff Engine    │     │   Dashboard     │
│  (Playwright)   │────▶│  (tree compare)  │────▶│   (web UI)      │
│                 │     │                  │     │                 │
│ - chạy scenario │     │ - match node     │     │ - list screens  │
│ - normalize DOM │     │ - phân loại thay │     │ - timeline      │
│ - snapshot JSON │     │   đổi            │     │ - diff viewer   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                        │
         └───────────┬──────────┴────────────┬───────────┘
                     ▼                        ▼
             ┌──────────────┐         ┌──────────────┐
             │   Storage    │         │   Config     │
             │ snapshots +  │         │ screens.yaml │
             │ diffs + meta │         │ ignore rules │
             └──────────────┘         └──────────────┘
```

### 3.1 Capture Engine
- Playwright (Chromium) headless.
- Đọc config danh sách màn hình + scenario + **Locator Registry** (mục 4).
- Với mỗi màn: chạy scenario → chờ ổn định → phân giải từng locator đã khai báo → trích xuất **chỉ các control đó** thành **snapshot chuẩn hóa** (không lưu HTML thô).
- Chụp kèm screenshot làm bằng chứng phụ (lưu, không diff).

### 3.2 Snapshot chuẩn hóa (normalized model)
Mỗi control/node được rút gọn thành object:

```jsonc
{
  "key": "field.email",                    // logical key lấy từ Locator Registry (mục 4)
  "role": "textbox",                        // vai trò ngữ nghĩa
  "tag": "input",
  "type": "email",                          // control type
  "order": 3,                               // thứ tự trong parent
  "text": { "label": "Email", "placeholder": "Nhập email" },
  "options": null,                          // với select/dropdown
  "style": { "color": "#333", "bg": "#fff", "fontSize": "14px", "display": "block" },
  "attrs": { "required": true, "disabled": false },
  "children": [ ... ]
}
```

Chỉ giữ tập thuộc tính CSS **được whitelist** (color, background, font, border, size, visibility, order/flex) để tránh nhiễu.

### 3.3 Diff Engine
- So khớp theo `key` logic từ registry (không đoán, không so từng dòng DOM).
- Phân loại từng thay đổi:
  - `TEXT_CHANGED` (label/placeholder)
  - `OPTIONS_CHANGED` (dropdown/table header)
  - `CONTROL_REMOVED` (key cũ còn trong registry nhưng locator không phân giải được)
  - `CONTROL_ADDED` (key mới được QA thêm vào registry)
  - `LOCATOR_BROKEN` (locator gãy/ambiguous — cần QA sửa, phân biệt với removed thật)
  - `CONTROL_REORDERED` (đổi document order trong cùng container)
  - `TYPE_CHANGED`
  - `STYLE_CHANGED` (kèm before/after từng property)
  - `STRUCTURAL_DRIFT` (tùy chọn — cờ cảnh báo có control lạ chưa khai báo)
- Áp ignore rules (mask data động) trước khi kết luận.
- Xuất diff dạng JSON + mức độ nghiêm trọng (severity).

### 3.4 Storage — cấu trúc workspace, project & report

Tổ chức theo **project** (mỗi môi trường/ứng dụng = 1 project). Mỗi lần chạy = 1 **run** sinh ra 1 **report**:

```
workspace/
  projects.yaml                          # catalog: liệt kê tất cả project (xem mục 5.2)
  projects/
    <project-id>/                        # vd: myapp-staging
      screens.config.yaml                # cấu hình màn hình + auth + locales
      locators/
        <screen-id>.locators.yaml        # registry từng màn
      baseline/
        <screen-id>.<locale>.json        # snapshot mốc hiện hành
      runs/
        <run-id>/                        # 1 lần chạy (timestamp)
          snapshots/<screen>.<locale>.json
          screenshots/<screen>.<locale>.png
          report.json                    # kết quả diff toàn run
          report.html                    # báo cáo xem offline (tùy chọn)
      history.json                       # index các run → dựng timeline
```

- Giai đoạn 1: filesystem như trên (versionable, dễ backup, hợp chạy thủ công).
- Giai đoạn 2 (nhiều người xem đồng thời): SQLite hoặc Postgres.

### 3.5 Dashboard — nơi xem lại report
- Web UI (React + Vite).
- **Chọn project** (dropdown) → danh sách màn hình + trạng thái (có thay đổi mới không).
- **Danh sách run / timeline**: mỗi lần chạy là một mốc; mở lại report cũ bất kỳ để đối chiếu.
- Timeline mỗi screen: các mốc capture theo thời gian; **lọc theo locale**.
- Diff viewer: highlight before/after theo từng loại thay đổi; lọc theo loại (text/style/structure); xem screenshot đính kèm.
- Đánh dấu "đã review" (phục vụ audit/QA).
- (Offline) mỗi run còn có `report.html` xem được không cần mở dashboard.

### 3.6 Locator Recorder (hỗ trợ QA sinh registry)

Vì QA sở hữu registry và mỗi màn 20–50 control, viết tay rất tốn công → cần công cụ sinh bán tự động:

- Chạy Playwright ở chế độ **headed** (có giao diện) trên màn cần khai báo.
- QA **click chọn element** trên trang; recorder tự phân tích element và **đề xuất locator theo đúng thứ tự ưu tiên** (getByTestId → getByRole → getByLabel → getByPlaceholder → getByText → css), chọn cái khả dụng cao nhất.
- QA chỉ cần **đặt `key` logic** (hoặc chấp nhận gợi ý) và tinh chỉnh.
- Xuất ra `*.locators.yaml` đúng định dạng ở [mục 4](#4-bộ-khai-báo-locator-locator-registry).
- Tận dụng được `playwright codegen` làm nền, thêm lớp map sang định dạng registry của tool.

---

## 4. Bộ khai báo Locator (Locator Registry)

Đây là **trái tim của việc định danh ổn định**. Mỗi project áp dụng tool phải chuẩn bị một registry khai báo locator **cho từng control** trên từng màn hình. QA sở hữu và bảo trì.

### 4.1 Nguyên tắc

- Mỗi control có một **`key` logic** (do QA đặt, ổn định, không đổi kể cả khi DOM đổi) → đây chính là stable key dùng xuyên suốt snapshot & diff.
- Locator xác định theo **thứ tự ưu tiên** (đúng chuẩn Playwright), khai báo strategy nào thì tool dùng đúng strategy đó:

  | Ưu tiên | Strategy | Khi nào dùng |
  |---|---|---|
  | 1 | `getByTestId` | Bền nhất — dev gắn `data-testid`. **Khuyến nghị.** |
  | 2 | `getByRole` | Gắn ngữ nghĩa HTML (button, dialog, checkbox...) |
  | 3 | `getByLabel` | Control form có label |
  | 4 | `getByPlaceholder` | Input có placeholder |
  | 5 | `getByText` | Dựa nội dung hiển thị |
  | 6 | `locator('css')` | Chỉ khi hết cách trên |

- **Declared-only**: tool chỉ snapshot đúng các control trong registry (xem blind spot ở [mục 2](#2-thách-thức-cốt-lõi-cần-giải-quyết-sớm)).

### 4.2 Định dạng registry

`locators/<screen-id>.locators.yaml`:

```yaml
screen: customer-edit
controls:
  - key: field.email                 # logical key — ổn định, QA đặt
    locator:
      strategy: getByTestId
      value: customer-email
    track: [text, type, style]        # override mức track cho riêng control này (tùy chọn)

  - key: field.status
    locator:
      strategy: getByLabel
      value: "Trạng thái"
    track: [text, type, options, style]   # options = theo dõi dropdown

  - key: btn.submit
    locator:
      strategy: getByRole
      value: button
      options: { name: "Lưu" }        # tham số phụ của getByRole

  - key: table.customers
    locator:
      strategy: getByTestId
      value: customer-table
    track: [structure, options]        # header cột; không track từng ô data
```

### 4.3 Ràng buộc & health-check

Tool có lệnh `validate-locators` chạy trước khi capture, kiểm tra trên app thật:

- Mỗi locator phải phân giải về **đúng 1 element** (0 = broken/removed, >1 = ambiguous → báo lỗi để QA sửa bằng cách bổ sung scope/`nth`).
- Cảnh báo nếu control dùng strategy ưu tiên thấp (getByText/css) → gợi ý dev thêm `data-testid`.
- Là "hợp đồng" giữa QA và dev: locator gãy = tín hiệu sớm UI đã đổi.

### 4.4 Thứ tự & reorder

Vì mỗi control có key riêng, **thứ tự** được suy ra từ **document order** của các element đã phân giải trong cùng container → phát hiện `CONTROL_REORDERED` chính xác mà không phụ thuộc DOM path.

---

## 5. Cấu hình màn hình (config-driven)

Registry (mục 4) khai báo *control nào*; file cấu hình dưới đây khai báo *cách tới màn hình* (URL, login, scenario). `screens.config.yaml`:

```yaml
baseUrl: https://app.example.com
auth:
  type: form                        # form login bằng user account
  loginUrl: /login
  steps:
    - fill: "#username"  value: "${QA_USER}"
    - fill: "#password"  value: "${QA_PASS}"
    - click: "button[type=submit]"
    - waitFor: ".dashboard"
  reuseSession: true                # lưu storageState, login 1 lần rồi tái dùng cho mọi màn

locales: [vi, en]                   # chụp snapshot cho từng ngôn ngữ; xem mục 5.1
localeSwitch:                       # cách đổi ngôn ngữ trước khi capture
  strategy: url                     # url | cookie | ui-action
  pattern: "?lang={locale}"

screens:
  - id: customer-list
    url: /customers
    waitFor: "table.customer-table"
    track: [text, structure, style, options]
    tableContent: structure-only      # không track từng ô data
    ignore:
      - selector: ".timestamp"        # mask vùng ngày giờ
      - maskPattern: "\\d{2}/\\d{2}/\\d{4}"

  - id: customer-edit
    url: /customers/1/edit
    scenario:
      - click: "#tab-address"
      - waitFor: "#address-form"
    track: [text, structure, style, options]
```

Điểm mạnh: thêm màn hình mới = thêm vài dòng config, không cần code.

### 5.1 Xử lý đa ngôn ngữ (i18n)

- **Môi trường (dev/staging/prod) = mỗi cái một project riêng** (cấu hình `baseUrl` khác nhau, không so chéo).
- **Ngôn ngữ = một chiều (dimension) trong cùng project.** Với mỗi màn, tool chụp snapshot **cho từng locale** khai báo ở `locales`.
- **Quy tắc so sánh**: chỉ diff snapshot **cùng locale qua thời gian** (vi↔vi, en↔en). Không so vi↔en (khác text là đương nhiên, không phải regression).
- **Giá trị QA thêm được**: đối chiếu tập control giữa các locale trong cùng thời điểm để phát hiện:
  - `MISSING_TRANSLATION` — control có text ở locale này nhưng trống/không đổi ở locale kia.
  - `UNTRANSLATED` — text giống hệt locale gốc (nghi chưa dịch).
- **Registry dùng chung cho mọi locale**: `key` và locator là bất biến theo ngôn ngữ; chỉ *giá trị text kỳ vọng* mới khác theo locale. Lưu ý: nếu project dùng chính text để định vị (`getByText`/`getByLabel`), locator đó sẽ **gãy khi đổi ngôn ngữ** → thêm một lý do nữa ưu tiên `getByTestId`/`getByRole`.

### 5.2 Nơi định nghĩa nhiều project (catalog)

`workspace/projects.yaml` là **nơi khai báo tập trung mọi project** để CLI & dashboard nạp:

```yaml
projects:
  - id: myapp-staging
    name: "MyApp — Staging"
    config: projects/myapp-staging/screens.config.yaml
  - id: myapp-prod
    name: "MyApp — Prod"
    config: projects/myapp-prod/screens.config.yaml
```

- CLI: `track run --project myapp-staging` (chạy 1 project) hoặc `track run --all`.
- Dashboard đọc file này để hiện dropdown chọn project.
- Thêm project mới = thêm 1 mục ở đây + 1 thư mục theo layout [mục 3.4](#34-storage--cấu-trúc-workspace-project--report).

---

## 6. Lộ trình triển khai (phased)

### Phase 0 — Thống nhất & PoC (nhỏ, chứng minh khả thi)
- Xác nhận cơ chế login, số lượng màn hình ước tính.
- Viết thử registry cho 1 màn (khoảng 5–10 control) + lệnh `validate-locators`.
- PoC: capture 1 màn tĩnh + 1 màn có table → snapshot JSON → diff thủ công 2 phiên bản.
- **Mục tiêu**: kiểm chứng registry phân giải đúng 1 element/control và vấn đề "data noise" trên app thật.

### Phase 1 — Capture Engine + Snapshot model
- Playwright runner đọc config + registry, chạy form login + tái dùng session (storageState).
- Chụp theo từng locale khai báo; phân giải locator (theo strategy) → chỉ snapshot control đã khai báo.
- Chuẩn hóa mỗi control → snapshot JSON (text, type, order, options, style whitelist).
- Lưu filesystem + screenshot.
- (Tùy chọn) structural drift check: đếm số con container mốc để gắn cờ control lạ.

### Phase 2 — Locator Recorder (ưu tiên cao vì 20–50 control/màn)
- Playwright headed + codegen; QA click element → tự đề xuất locator theo thứ tự ưu tiên.
- QA đặt `key` → xuất `*.locators.yaml`.
- Giảm mạnh công viết registry thủ công; nên làm sớm để QA build registry cho các màn thật.

### Phase 3 — Diff Engine
- Match theo `key` logic; chỉ diff cùng locale qua thời gian.
- Phân loại đổi thay + severity; phát hiện `MISSING_TRANSLATION`/`UNTRANSLATED` giữa các locale.
- Ignore/mask rules. Output diff JSON + báo cáo tóm tắt CLI.

### Phase 4 — Dashboard
- Web UI: list screens, timeline, diff viewer, filter theo loại thay đổi & theo locale.
- Đánh dấu "đã review" (phục vụ audit/QA).

### Phase 5 — Tự động hóa (nâng cấp sau — giai đoạn đầu chạy thủ công)
- Chạy theo lịch (cron) hoặc tích hợp CI.
- Thông báo khi có thay đổi (email/Slack — tùy chọn).
- Baseline approval flow: QA xác nhận thay đổi "hợp lệ" → thành baseline mới.

---

## 7. Tech stack đề xuất

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ | TypeScript (Node.js) |
| Browser automation | Playwright |
| Diff cấu trúc | Thuật toán tree-diff tự viết (dựa trên stable key) + `deep-object-diff` cho property |
| Storage (P1) | Filesystem JSON; (P2) SQLite |
| Dashboard | React + Vite (hoặc Next.js) |
| Config | YAML (`js-yaml`) |
| CLI | `commander` |
| Recorder | Playwright headed + `playwright codegen` làm nền |
| Monorepo | pnpm workspaces: `packages/capture`, `packages/diff`, `packages/dashboard`, `packages/recorder`, `packages/core` (model dùng chung) |

---

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Control mới thêm không được track (declared-only) | Structural drift check gắn cờ; quy trình QA rà & bổ sung registry định kỳ |
| Chi phí bảo trì registry (QA sở hữu) | `validate-locators` phát hiện locator gãy sớm; ưu tiên `getByTestId` để bền; cân nhắc recorder hỗ trợ sinh locator |
| Locator gãy khi DOM đổi | Là tín hiệu hữu ích (báo UI đổi); health-check phân biệt "gãy do đổi" vs "thật sự removed" |
| Data động gây báo giả | Tách structure/content, mask pattern, cấu hình track theo control |
| Màn cần thao tác phức tạp | Scenario steps trong config |
| App SPA render chậm/async | Wait networkidle + custom selector + retry |
| Số màn hình lớn → chậm | Chạy song song (Playwright workers); incremental theo màn thay đổi |

---

## 9. Tổng hợp quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Loại app | Web (HTML/DOM) |
| Cách capture | Snapshot cấu trúc DOM đã chuẩn hóa (declared-only) |
| Truy cập | Playwright headless, tự động |
| Định danh | Locator Registry theo từng control, ưu tiên getByTestId→...→css; QA sở hữu |
| Mốc so sánh | History liên tục, diff cùng locale qua thời gian |
| Track | Text, options/table header, type & thứ tự, style |
| Table content | Chỉ cấu trúc + header (không track từng ô) |
| Login | Form login bằng user account (tái dùng session) |
| Quy mô | ~20–50 control/màn (tùy project) |
| Môi trường | Mỗi môi trường = 1 project riêng |
| Ngôn ngữ | Là 1 dimension; chụp & so theo từng locale; phát hiện thiếu/chưa dịch |
| Recorder | Có — sinh locator bán tự động cho QA |
| Vận hành | Giai đoạn đầu chạy thủ công, sau nâng cấp tự động |
| Xem kết quả | Web dashboard |
| Stack | Node.js/TypeScript + Playwright |

## 10. Bước tiếp theo

1. Dựng khung monorepo (`core`, `capture`, `diff`, `recorder`, `dashboard`).
2. Định nghĩa schema `core`: snapshot model + registry model + diff model (dùng chung).
3. Phase 0 PoC: 1 màn thật → registry mẫu → `validate-locators` → capture → diff 2 lần chạy.

> **Cần trước khi code Phase 0**: 1 URL màn hình mẫu + tài khoản test, hoặc 1 trang HTML tĩnh đại diện để dựng PoC không phụ thuộc app thật.
```
