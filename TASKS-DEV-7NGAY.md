# Danh sách Task — UI Tracking Tool (1 Dev · 7 ngày · 8h/ngày)

**Tổng quỹ thời gian**: 56h. Ước lượng gồm code + self-test cơ bản.
**Nguyên tắc**: trước khi code phần *load-bearing*, đọc standard tương ứng (cột "Đọc trước"). Quyết định local (tên biến, thứ tự hàm) theo code xung quanh, không cần đọc.

## Bất biến bắt buộc (áp mọi task)
- **Định danh theo `key` logic của Locator Registry**, KHÔNG theo DOM path/class/id.
- Ưu tiên locator: `getByTestId → getByRole → getByLabel → getByPlaceholder → getByText → css`.
- `LOCATOR_BROKEN` **phải nổi lên report** — cấm nuốt lỗi thầm.
- Validate config ở biên bằng Zod (parse-không-throw, schema nghiêm ngặt, từ chối key lạ).
- Nếu đặt tên không khớp `naming.md` → **DỪNG, hỏi**, rồi ghi quy ước mới.

## Phạm vi MVP 7 ngày
Capture → Diff → Report (HTML) → Dashboard cơ bản → Recorder cơ bản. Tự động hóa (cron/CI), SQLite, notify = **ngoài phạm vi** (Phase sau).

---

## Ngày 1 — Khung dự án & Core model (8h)
| ID | Task | Ước tính | Đọc trước |
|---|---|---|---|
| T1.1 | Dựng pnpm monorepo: packages `core`, `capture`, `diff`, `cli`, `dashboard`, `recorder`; TS project refs | 2h | `_shared/architecture.md` |
| T1.2 | Wire ESLint + TS strict + rule `require-testid-on-interactive` | 1h | — |
| T1.3 | `core`: định nghĩa type snapshot model, enum `ChangeType`, registry model, diff/report model | 2h | `_shared/naming.md` |
| T1.4 | `core`: Zod schema cho `projects.yaml`, `screens.config.yaml`, `*.locators.yaml` (strict, reject key lạ) | 2.5h | `_shared/validation-and-errors.md` |
| T1.5 | Fixture: `workspace/` mẫu (projects.yaml + 1 screen config + 1 locators) + 1 trang HTML tĩnh (form + table) để test | 0.5h | — |

**Done**: `pnpm install` + build sạch; import được type/schema từ `core`; fixture parse qua Zod không lỗi.

---

## Ngày 2 — Config loader & khởi tạo Capture (8h)
| ID | Task | Ước tính | Đọc trước |
|---|---|---|---|
| T2.1 | Config loader: đọc + validate YAML bằng Zod, gộp lỗi thân thiện (chỉ rõ file/field) | 2h | `_shared/validation-and-errors.md` |
| T2.2 | Path builder + sanitize filename (chống path traversal) cho `runs/`, `baseline/`, `screenshots/` | 1h | `_shared/file-handling.md` |
| T2.3 | Capture: Playwright Browser **singleton**, Context lifecycle, **đóng tường minh** mỗi screen, retry có dọn | 2h | `_shared/memory-safety.md` |
| T2.4 | Capture: form login bằng user account + `reuseSession` (lưu/nạp `storageState`) | 3h | `_shared/memory-safety.md` |

**Done**: chạy CLI nạp 1 project, login thành công, mở được URL màn hình fixture, đóng context sạch (không leak).

---

## Ngày 3 — Phân giải Locator & trích Snapshot (8h)
| ID | Task | Ước tính | Đọc trước |
|---|---|---|---|
| T3.1 | Locator resolver: dispatch theo strategy; assert **đúng 1 element**; 0/>1 → `LOCATOR_BROKEN` (không throw, ghi vào kết quả) | 3h | Bất biến #1 |
| T3.2 | Snapshot extractor mỗi control: `text` (label/placeholder), `type`, `order`, `options` (dropdown/header), `style` (whitelist CSS) | 3h | `_shared/naming.md` |
| T3.3 | Vòng lặp theo `locales` + `localeSwitch` (url/cookie); table = structure-only | 1h | — |
| T3.4 | CLI `validate-locators`: kiểm tra toàn registry phân giải đúng 1; cảnh báo strategy ưu tiên thấp | 1h | `_shared/validation-and-errors.md` |

**Done**: `validate-locators` chạy trên fixture cho kết quả đúng; sinh snapshot JSON đủ field cho 1 màn × các locale.

---

## Ngày 4 — Storage & Diff engine (8h)
| ID | Task | Ước tính | Đọc trước |
|---|---|---|---|
| T4.1 | Storage writer: ghi snapshot + screenshot **bất biến sau ghi**, kèm checksum + size, layout `runs/<run-id>/` | 2h | `_shared/file-handling.md` |
| T4.2 | `history.json`: index append các run (dựng timeline) | 1h | `_shared/file-handling.md` |
| T4.3 | Diff engine: match theo `key`; phân loại `TEXT_CHANGED`/`OPTIONS_CHANGED`/`CONTROL_ADDED`/`REMOVED`/`LOCATOR_BROKEN`/`REORDERED`/`TYPE_CHANGED`/`STYLE_CHANGED` + severity | 3.5h | Bất biến #1 |
| T4.4 | Áp ignore/mask rules (regex data động) trước khi kết luận | 1.5h | — |

**Done**: chạy 2 lần trên fixture (sửa nhẹ HTML giữa 2 lần) → diff phân loại đúng từng thay đổi; `LOCATOR_BROKEN` xuất hiện khi cố tình xóa 1 control.

---

## Ngày 5 — i18n, Report & CLI wiring (8h)
| ID | Task | Ước tính | Đọc trước |
|---|---|---|---|
| T5.1 | Quy tắc so cùng-locale theo thời gian + cross-locale `MISSING_TRANSLATION`/`UNTRANSLATED` | 2h | — |
| T5.2 | `report.json` mỗi run (tổng hợp diff + severity + metadata run) | 1.5h | `_shared/logging.md` |
| T5.3 | Generator `report.html` xem offline (bảng thay đổi + before/after) | 2.5h | — |
| T5.4 | CLI `track run --project <id>` / `--all`: pipeline capture→diff→report; structured log + correlation `run_id` | 2h | `_shared/logging.md` |

**Done**: 1 lệnh `track run` chạy hết pipeline cho 1 project, sinh `report.json` + `report.html`; log có `run_id` xuyên suốt.

---

## Ngày 6 — Dashboard (8h)
| ID | Task | Ước tính | Đọc trước |
|---|---|---|---|
| T6.1 | Scaffold React+Vite + API nội bộ (list projects/runs/reports), 1 envelope + 1 fetch wrapper | 2.5h | `_shared/api-design.md`, `_shared/frontend.md` |
| T6.2 | Chọn project + danh sách run/timeline; **filter ở URL query** | 2h | `_shared/frontend.md` |
| T6.3 | Diff viewer: before/after theo `ChangeType`; filter theo loại + locale | 3h | `_shared/frontend.md` |
| T6.4 | Đánh dấu "đã review" cho từng run | 0.5h | — |

**Done**: mở dashboard → chọn project → xem timeline → mở report 1 run → thấy diff highlight, lọc được theo loại/locale. JSX tương tác có `data-testid`.

---

## Ngày 7 — Recorder, Test, Docs & Buffer (8h)
| ID | Task | Ước tính | Đọc trước |
|---|---|---|---|
| T7.1 | Recorder cơ bản: headed browser, click element → đề xuất locator theo thứ tự ưu tiên → append vào `*.locators.yaml` | 3h | Bất biến #1 |
| T7.2 | Test: unit tree-diff (nhiều kịch bản) + integration capture→diff trên HTML fixture (store filesystem thật, **không mock FS**) | 2.5h | `_shared/testing.md` |
| T7.3 | README + hướng dẫn dùng (setup, viết registry, chạy run, xem report) | 1h | — |
| T7.4 | Buffer / fix bug phát sinh | 1.5h | — |

**Done**: recorder sinh được locator hợp lệ cho vài control; test xanh; README đủ để người mới chạy tool.

---

## Sơ đồ phụ thuộc (thứ tự bắt buộc)
`core (D1)` → `config+capture (D2-3)` → `storage+diff (D4)` → `report+cli (D5)` → `dashboard (D6)`.
`recorder (D7)` phụ thuộc registry model (D1) + locator resolver (D3) → làm sau cùng an toàn.

## Rủi ro & thứ tự cắt giảm nếu trễ tiến độ
7 ngày là **khá gấp** cho toàn bộ. Nếu chậm, cắt theo thứ tự (giữ lõi QA regression):
1. **Recorder (T7.1)** → cắt trước tiên; tạm khai báo locator tay.
2. **Dashboard (D6)** → rút còn xem `report.html` offline; dashboard làm Phase sau.
3. **i18n cross-locale (T5.1 phần MISSING/UNTRANSLATED)** → giữ so cùng-locale, hoãn phần dịch.

**Lõi không được cắt**: Capture → Diff → report.json/html (đây là giá trị QA regression cốt lõi).

## Định nghĩa "Hoàn thành" chung (Definition of Done)
- Chạy được trên workspace fixture end-to-end bằng CLI.
- Config sai → báo lỗi rõ ràng (không crash mù).
- `LOCATOR_BROKEN` luôn hiện trong report.
- Không leak browser/context (đóng tường minh).
- Tên field/ChangeType khớp `naming.md`.
- Có README chạy được theo từng bước.
