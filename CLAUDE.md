# CLAUDE.md — DEBQC / UI Tracking Tool

Quy chuẩn làm việc cho AI coding assistant trong repo này.
Stack: **Node/TS · pnpm monorepo · Playwright · commander CLI · React+Vite dashboard · YAML config · filesystem→SQLite**.

**Tradeoff:** Ưu tiên cẩn trọng hơn tốc độ. Task tầm thường thì dùng phán đoán.

---

## 1. Nghĩ trước khi code

**Đừng giả định. Đừng giấu chỗ mơ hồ. Nêu tradeoff.**

- Nói rõ giả định. Không chắc thì hỏi.
- Có nhiều cách hiểu → trình bày ra, đừng tự chọn im lặng.
- Có cách đơn giản hơn → nói. Push back khi cần.
- Có chỗ chưa rõ → DỪNG, gọi tên chỗ khó, hỏi.
- **Lệch quy ước naming/field/ChangeType so với `docs/standards/` → DỪNG và hỏi** (bất biến của core model).

## 2. Đơn giản trước

**Ít code nhất giải quyết được vấn đề. Không đầu cơ.**

- Không thêm tính năng ngoài yêu cầu.
- Không abstraction cho code dùng một lần.
- Không "linh hoạt/cấu hình" không ai yêu cầu.
- Không handle lỗi cho tình huống bất khả thi.
- Viết 200 dòng mà 50 dòng là đủ → viết lại.

Tự hỏi: "Senior engineer có nói cái này bị over-engineer không?" Nếu có → rút gọn.

## 3. Thay đổi phẫu thuật (surgical)

**Chỉ chạm cái buộc phải chạm. Chỉ dọn rác của chính mình.**

- Đừng "cải thiện" code/comment/format lân cận.
- Đừng refactor cái đang chạy tốt.
- Bám style hiện có, kể cả khi mình thích làm khác.
- Thấy dead code không liên quan → nhắc, đừng xoá.
- Thay đổi của mình tạo ra import/biến/hàm thừa → xoá phần đó. Dead code có sẵn thì để yên trừ khi được yêu cầu.

Kiểm tra: mỗi dòng đổi phải truy được về yêu cầu của user.

## 4. Chạy theo mục tiêu, lặp đến khi verify

Biến task thành mục tiêu kiểm chứng được:
- "Thêm validation" → "Viết test cho input sai, rồi làm cho pass"
- "Fix bug" → "Viết test tái hiện bug, rồi làm cho pass"
- "Refactor X" → "Test pass trước và sau"

Task nhiều bước → nêu plan ngắn:
```
1. [Bước] → verify: [check]
2. [Bước] → verify: [check]
```

## 5. Unit test là bắt buộc cho thay đổi logic

**Mỗi thay đổi logic đi kèm test tương ứng.**

Với thay đổi ở core model / capture / diff / storage / CLI:
- File test đặt cạnh code, đặt tên `*.test.ts` (Vitest).
- Test **happy path + ít nhất 1 edge/failure case**.
- Integration capture→diff chạy trên **HTML fixture** với **store filesystem thật — KHÔNG mock FS**.
- Assert **giá trị cụ thể**; 1 test = 1 kịch bản.
- Có test cũ đã bao phủ → cập nhật, đừng nhân bản.

**Chỉ bỏ khi:** thay đổi thuần cosmetic (rename/format/comment), hoặc wiring/config không có nhánh logic, hoặc user bảo bỏ. Khi bỏ → nêu lý do trong câu trả lời.

## 6. Dùng skill của dự án trước khi hành động

Trước khi viết/sửa code load-bearing, **check skill trước**:
- **`debqc-standards`** — nạp TRƯỚC khi viết capture runner, diff engine, config schema, storage layout, dashboard, hay wire ESLint. Route tới đúng file trong `docs/standards/`.
- **`pm-gensubtask:pm-synced-development`** — dùng khi thực thi implementation plan để tự đồng bộ tiến độ vào PM (xem Mục 9).
- Follow rigid skill đúng như mô tả; adapt flexible skill theo ngữ cảnh.
- Lệnh của user luôn ưu tiên hơn skill.

Dấu hiệu đang tự bào chữa (DỪNG): "Cái này đơn giản, khỏi skill" / "Để explore codebase trước rồi tính". Sai thứ tự — skill → rồi mới làm.

## 7. Branch & PR — AI KHÔNG BAO GIỜ merge

**Không commit thẳng vào `main`. Không ngoại lệ.**

- Trước khi viết code cho feature/fix: tạo branch mới `git checkout -b feature/<tên>` (hoặc `fix/<tên>`) như bước đầu tiên.
- Đang ở `main` → dừng, branch ra, rồi làm tiếp.
- Mọi thay đổi đi qua Pull Request, dù nhỏ.
- AI **không bao giờ** merge/close PR. Chỉ con người merge.
- AI được tạo PR + request review, rồi dừng.

Xong task: push branch → tạo PR (title + description rõ) → báo user "PR đã tạo — vui lòng review & merge" → không đụng PR nữa trừ khi được yêu cầu.
Nếu user bảo AI merge: **không merge** — hướng dẫn user tự làm (GitHub UI / `git`).

## 8. Task xong = chạy thật trên fixture

**Chưa chạy được thì chưa xong.** Compile pass + unit test green là cần nhưng chưa đủ.

Sau khi implement phần có thể chạy end-to-end:
1. Chạy `track run --project <id>` trên **HTML fixture** (T1.5).
2. Đối chiếu `report.json` / report HTML với kết quả mong đợi.
3. Với dashboard: mở Vite dev, xác nhận đọc đúng runs/report từ filesystem.

**Chỉ bỏ khi:** thay đổi cosmetic, hoặc refactor nội bộ đã có full unit test, hoặc user bảo bỏ. Khi bỏ → nêu lý do.

## 9. Đồng bộ PM (GenSubTaskPM)

**Mỗi subtask = 3 mốc tool bắt buộc:**

| Thời điểm | Tool |
|---|---|
| Ngay trước khi code | `pm_start_subtask(task_id)` → DOING |
| Giữa chừng (mỗi mốc con) | `pm_update_progress(task_id, progress_percent, actual_hours=Δ)` |
| Sau khi verify xong (Mục 5 + 8) | `pm_complete_subtask(task_id, actual_hours=Δ)` → DONE |

Nguyên tắc:
- `actual_hours` **luôn là delta** (giờ làm THÊM kể từ lần cập nhật trước), KHÔNG phải tổng — hệ thống tự cộng dồn.
- Chỉ `pm_complete_subtask` khi đạt Definition of Done, không phải khi vừa viết xong code.
- Biến các gạch "Các ý cần làm" thành checklist: `pm_add_checklist_items`. Chỉ tách subtask thật khi cần assignee/status riêng.
- Trước khi start 1 task, `pm_get_task` các task phụ thuộc (Dependencies) để chắc chúng đã DONE.
- Cuối ngày/tuần: `pm_audit_status(parent_task_id=<epic>)` cho từng epic để bắt task "start rồi bỏ quên".

## 10. Secrets — không commit session/login

Không phải service Docker, nhưng vẫn giữ nguyên tắc tối thiểu:
- **Không commit** `storageState` / file session login (T2.4), API key, cookie, token, mật khẩu test.
- Các file này + `Configs/`, `.env*`, `runs/`, `baseline/` phải nằm trong `.gitignore`.
- Thấy secret trong file đã track → **dừng, báo user, không commit tiếp**.
