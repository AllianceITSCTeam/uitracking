---
name: debqc-standards
description: >-
  Quy ước kỹ thuật cho UI Tracking Tool (Node/TS · Playwright · pnpm monorepo ·
  commander CLI · React+Vite dashboard · YAML config · filesystem→SQLite). Nạp
  TRƯỚC khi viết/sửa code load-bearing của tool: chia package/tầng, đặt tên field
  snapshot & ChangeType, validate/parse YAML config (projects/screens/locators),
  viết capture runner Playwright, tree-diff engine, storage layout runs/baseline,
  component dashboard, hay wire ESLint. Route tới đúng file trong docs/standards/.
---

# DEBQC Standards — router

Trước khi code phần load-bearing, **đọc file standard tương ứng bên dưới** rồi mới viết.
Nguồn đầy đủ + lý do chọn lọc: [docs/standards/README.md](../../../docs/standards/README.md).
Quyết định *local* (tên biến, thứ tự hàm, refactor 1 file) **không cần** đọc standard — theo code xung quanh (KISS/YAGNI).

## Bất biến số 1 (áp mọi lúc)

**Định danh control ổn định qua phiên bản.** Diff so khớp theo `key` logic của Locator Registry, KHÔNG theo
DOM path/class/id. Ưu tiên `getByTestId → getByRole → getByLabel → getByPlaceholder → getByText → css`.
`LOCATOR_BROKEN` là tín hiệu phải nổi lên report — cấm nuốt thầm.

## Đọc file nào khi làm gì

| Sắp làm | ĐỌC TRƯỚC |
|---|---|
| Dựng package mới, chia tầng CLI→service→capture/diff/storage, quyết định config-vs-hardcode | [_shared/architecture.md](../../../docs/standards/_shared/architecture.md) |
| Đặt tên **bất kỳ**: field snapshot model, `ChangeType`, `key` registry, locator strategy | [_shared/naming.md](../../../docs/standards/_shared/naming.md) — nếu tên không khớp quy ước → **DỪNG, hỏi người dùng**, ghi quy ước mới vào standards |
| Đọc/validate `projects.yaml` · `screens.config.yaml` · `*.locators.yaml`; sinh path artifact | [_shared/validation-and-errors.md](../../../docs/standards/_shared/validation-and-errors.md) — Zod parse-không-throw ở biên, schema nghiêm ngặt (từ chối key lạ), sanitize filename chống path traversal, whitelist strategy/ChangeType bằng enum |
| Viết capture runner Playwright, chạy song song nhiều màn/locale | [_shared/memory-safety.md](../../../docs/standards/_shared/memory-safety.md) — Browser/Context là client nặng: singleton, reuse, **đóng tường minh** mỗi screen; cache bounded; retry có đường dọn |
| Viết/chạy test (unit tree-diff, integration capture→diff, e2e trên HTML fixture) | [_shared/testing.md](../../../docs/standards/_shared/testing.md) — store thật (filesystem, KHÔNG mock FS), 1 test = 1 kịch bản, assert giá trị cụ thể |
| Component/page/hook dashboard | [_shared/frontend.md](../../../docs/standards/_shared/frontend.md) — filter project/locale/ChangeType/run-id ở **URL query**, một fetch wrapper, tách data-fetching↔render, a11y |
| Viết JSX tương tác trong dashboard | Gắn `data-testid` snake_case; rule [eslint-rules/require-testid-on-interactive.js](../../../docs/standards/eslint-rules/require-testid-on-interactive.js) |
| Thêm log CLI, ghi report của run | [_shared/logging.md](../../../docs/standards/_shared/logging.md) — structured + correlation `run_id` xuyên capture→diff→report; không nuốt lỗi |
| Thiết kế storage layout `runs/<run-id>/`, `baseline/`; ghi snapshot/screenshot | [_shared/file-handling.md](../../../docs/standards/_shared/file-handling.md) — bất biến sau ghi, checksum+size, versioning |
| Thiết kế API nội bộ dashboard (list projects/runs/reports) | [_shared/api-design.md](../../../docs/standards/_shared/api-design.md) — một envelope, phân trang có trần, mã lỗi `UPPER_SNAKE` |
| **Phase 5** cron/CI, notify thay đổi | [_shared/background-jobs.md](../../../docs/standards/_shared/background-jobs.md) — run idempotent (`run_id` suy diễn được), retry+backoff, graceful shutdown |
| **Phase 2** chuyển sang SQLite | [_shared/data-modeling.md](../../../docs/standards/_shared/data-modeling.md) — `runs`/`history` append-only bất biến, id opaque+sortable-theo-thời-gian |

## Không áp cho tool này

Bộ gốc (Chatbot) còn nhiều standard multi-tenant/DB/LLM/RAG **đã loại** — xem bảng "Standard đã LOẠI" trong
[docs/standards/README.md](../../../docs/standards/README.md). Đừng đi tìm chúng.
