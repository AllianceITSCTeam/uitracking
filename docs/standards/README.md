# Standards — UI Tracking Tool

> Bộ quy ước kỹ thuật cho **Tool Tracking UI Changes** (xem [`UI-TRACKING-TOOL-PLAN.md`](../../UI-TRACKING-TOOL-PLAN.md)).
> Stack: **Node.js/TypeScript · Playwright · pnpm monorepo · commander CLI · React + Vite dashboard · YAML config · Filesystem JSON (P1) → SQLite (P2)**.

## Nguồn gốc & cách chọn lọc

Các file trong [`_shared/`](_shared/) được **kế thừa nguyên văn** từ bộ standards của project *Chatbot Platform*
([2allianceitsc/i-am-bot → docs/standards](https://github.com/2allianceitsc/i-am-bot/tree/dev/docs/standards)).
Bộ gốc gắn với stack Chatbot (Next.js/Vercel · Postgres+pgvector · multi-tenant · LLM/RAG) — **phần lớn KHÔNG áp cho tool này**.
Tôi chỉ lấy tầng **`_shared/` agnostic** (nguyên tắc không phụ thuộc framework/nghiệp vụ — tác giả gốc thiết kế để copy sang project khác) và loại các standard gắn chặt Chatbot.

Ký hiệu: ✅ áp trực tiếp · 🟡 áp một phần (bỏ phần gắn tenant/DB/LLM) · ⏳ áp ở phase sau.

---

## Standard áp dụng — và ánh xạ vào tool này

### Nền tảng code

| File | Áp | Ánh xạ vào UI Tracking Tool · Đọc khi |
|---|---|---|
| [_shared/architecture.md](_shared/architecture.md) | ✅ | Layering **CLI → service → capture/diff/storage**; YAGNI/KISS/DRY cho monorepo (`core`/`capture`/`diff`/`recorder`/`dashboard`); **cấu hình thay vì hardcode** (đúng tinh thần config-driven `screens.config.yaml`); "convention→đảm bảo" = lint + wrapper. **Đọc khi:** dựng package mới, chia tầng, viết service. |
| [_shared/naming.md](_shared/naming.md) | ✅ | "Một tên xuyên tầng" — áp cho **snapshot model** (`key`/`role`/`tag`/`order`/`text`…) giữ nguyên field từ core → diff → dashboard, **không map qua lại**. Boolean `is_*`, thời gian `*_at`. **STOP-AND-DISCUSS** khi tên `ChangeType`/locator strategy không khớp quy ước. **Đọc khi:** đặt tên bất kỳ (field snapshot, ChangeType, key registry). |
| [_shared/validation-and-errors.md](_shared/validation-and-errors.md) | ✅ | **Zod parse ở biên** cho `projects.yaml` / `screens.config.yaml` / `*.locators.yaml` — schema nghiêm ngặt, *từ chối key lạ*, parse-không-throw. **Sanitize filename** khi ghi `snapshots/<screen>.<locale>.json` + `screenshots/*.png` (chống path traversal từ `screen-id`/`locale` do người dùng đặt). Whitelist `strategy` (getByTestId…css) + `ChangeType` bằng enum. **Đọc khi:** đọc/validate config, sinh đường dẫn artifact. |
| [_shared/testing.md](_shared/testing.md) | ✅ | Test pyramid: **unit** cho tree-diff/normalize/mask; **integration** cho capture→snapshot→diff trên **store thật (filesystem)** — KHÔNG mock FS; **E2E** chạy tool trên 1 trang HTML fixture. Fixture factory cho snapshot; 1 test = 1 kịch bản; assert giá trị cụ thể (đúng loại `ChangeType`, đúng before/after). **Đọc khi:** viết/chạy test, dựng fixture. |
| [_shared/logging.md](_shared/logging.md) | 🟡 | Lấy nguyên tắc **tách loại log + structured + correlation `run_id`** cho CLI (mỗi run một id, xuyên capture→diff→report). Bỏ phần audit-in-DB-transaction (tool P1 không có DB). "Không nuốt lỗi thầm", `LOCATOR_BROKEN` phải nổi lên report chứ không im. **Đọc khi:** thêm log CLI, ghi report run. |

### Frontend (Dashboard React + Vite)

| File | Áp | Ánh xạ · Đọc khi |
|---|---|---|
| [_shared/frontend.md](_shared/frontend.md) | ✅ | **URL giữ state điều hướng** — chọn project / locale / loại thay đổi / run-id đặt ở **query param** (link share được, back/forward đúng). **Một fetch wrapper** gọi API dashboard. Component nhỏ + composition; tách data-fetching khỏi render (diff viewer). **Design token** tập trung; **a11y** (semantic HTML, contrast cho highlight diff). **Đọc khi:** viết component/page/hook dashboard. |
| [eslint-rules/require-testid-on-interactive.js](eslint-rules/require-testid-on-interactive.js) | ✅ | **Trúng trực tiếp triết lý tool**: locator bền nhất = `getByTestId`. (1) Áp cho **code React của chính dashboard**. (2) Là **rule nên khuyến nghị dev của app đích** gắn `data-testid` → giảm `LOCATOR_BROKEN`, tăng độ chính xác diff. Tên `snake_case` (vd `customer_email_input`). **Đọc khi:** wire ESLint dashboard; tư vấn app đích chuẩn bị testid. |

### Hạ tầng lưu trữ / artifact / job nền

| File | Áp | Ánh xạ · Đọc khi |
|---|---|---|
| [_shared/file-handling.md](_shared/file-handling.md) | 🟡 | **Bất biến sau khi ghi + versioning** áp cho layout `runs/<run-id>/` và `baseline/`: mỗi run là object bất biến, **checksum + size** cho snapshot/screenshot phục vụ toàn vẹn & so regression; chuẩn hóa tên file. Bỏ phần object-store/presigned/IDOR (tool dùng FS cục bộ). **Đọc khi:** thiết kế storage layout, ghi snapshot/screenshot. |
| [_shared/memory-safety.md](_shared/memory-safety.md) | ✅ | **Rất quan trọng với Playwright**: `Browser`/`BrowserContext` là client nặng → **singleton, reuse, đóng tường minh** mỗi screen/locale (context.close) tránh rò khi chạy hàng loạt màn. Cache locator/snapshot in-memory phải **bounded**. Timer/retry có đường dọn. **Đọc khi:** viết capture runner, chạy song song nhiều màn/locale. |
| [_shared/background-jobs.md](_shared/background-jobs.md) | ⏳ | **Phase 5** (cron/CI): capture-run phải **idempotent** (`run_id` suy diễn được), **retry+backoff** cho snapshot flaky (lỗi tạm) vs bỏ ngay nếu config sai (lỗi vĩnh viễn), **graceful shutdown** để không bỏ dở run. **Đọc khi:** làm scheduler/CI, notify thay đổi. |
| [_shared/data-modeling.md](_shared/data-modeling.md) | ⏳ | **Phase 2 (SQLite)**: `runs`/`history` là **append-only bất biến** (chỉ nhóm "tạo"); public id **opaque + sortable theo thời gian** cho `run_id` (dựng timeline không cần cột phụ); FK đúng kiểu native. **Đọc khi:** chuyển storage sang SQLite. |
| [_shared/api-design.md](_shared/api-design.md) | 🟡 | API nội bộ dashboard (list projects/runs/reports): **một response envelope**, **phân trang có trần** cho danh sách run, **taxonomy mã lỗi `UPPER_SNAKE`**, `meta` luôn có. Bỏ phần header-auth/tenant. **Đọc khi:** thiết kế endpoint dashboard. |

---

## Standard của bộ gốc đã LOẠI (không áp cho tool này)

Ghi lại để minh bạch lý do — tránh sau này ai đó tưởng còn thiếu:

| Nhóm | File gốc | Vì sao loại |
|---|---|---|
| Multi-tenant / DB | `database-table-standards`, `authorization-standards`, `db-snapshot-standards`, `sql-scripts-standards` | Tool không multi-tenant; P1 không có DB (filesystem). Cân nhắc lại phần data-modeling ở P2. |
| LLM / RAG | `llm-config`, `site-context`, `answer-playbook`, `tool-calling`, `search-indexing` | Không có LLM/vector/RAG trong tool. |
| Chatbot domain | `enduser-identity`, `platform-admin`, `admin-assistant`, `tool-auth-delegation`, `rate-limiting`, `external-api-call-observability`, `settings-standards` | Nghiệp vụ Chatbot SaaS, không liên quan tracking UI. |
| Hạ tầng khác | `file-storage-standards` (Vercel Blob), `request-tracing` (AsyncLocalStorage per-request) | Tool dùng FS cục bộ + CLI, không có server request lifecycle. Đã thay bằng `_shared/file-handling` + correlation nhẹ trong logging. |
| Contract Chatbot | `api-contract*` | Envelope gắn Chatbot; dùng `_shared/api-design` (agnostic) thay thế. |

> Nếu sau này tool mở rộng (multi-user dashboard, DB, notify), quay lại lấy thêm từ [repo gốc](https://github.com/2allianceitsc/i-am-bot/tree/dev/docs/standards).

## Nguyên tắc xuyên suốt tool này (bất biến số 1)

Bộ Chatbot có bất biến "cô lập tenant". Tool này có bất biến tương đương của riêng nó:

> **Định danh control phải ổn định qua phiên bản.** Mọi so khớp diff dựa trên **`key` logic của Locator Registry**, KHÔNG dựa DOM path/class/id. Ưu tiên locator `getByTestId → getByRole → getByLabel → getByPlaceholder → getByText → css`. `LOCATOR_BROKEN` là tín hiệu, không phải để nuốt.

Chi tiết registry & snapshot model: [`UI-TRACKING-TOOL-PLAN.md` §4](../../UI-TRACKING-TOOL-PLAN.md).
