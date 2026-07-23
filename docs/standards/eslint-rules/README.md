# ESLint rules — UI Tracking Tool

## `require-testid-on-interactive.js`

Bắt phần tử JSX **tương tác** (`input`/`select`/`textarea`/`button` + wrapper shadcn/ui) thiếu `data-testid`,
để Playwright định vị bằng `getByTestId` — locator bền nhất (đổi text/CSS/đa ngôn ngữ vẫn xanh).

**Vì sao rule này trúng đích với chính project này** — triết lý cốt lõi của tool là "định danh control ổn định qua
`getByTestId`" (xem [../README.md → Nguyên tắc xuyên suốt](../README.md)). Rule dùng ở **hai nơi**:

1. **Code React của dashboard** — enforce nội bộ để component dashboard luôn testable.
2. **Khuyến nghị cho app đích** — dev của app đang được track nên gắn `data-testid` để Locator Registry bền,
   giảm `LOCATOR_BROKEN`. Đây là "hợp đồng QA↔dev" nói ở plan §4.3.

### Lưu ý khi wire vào tool này
- Rule gốc từ project Chatbot: danh sách `elements` mặc định gồm wrapper **shadcn/ui**
  (`Button`/`Input`/`Textarea`/`Switch`/`SelectTrigger`). Nếu dashboard **không** dùng shadcn, chỉnh option
  `elements` cho khớp component library thực tế.
- Message rule trỏ tới `frontend-ui-standards §14` (doc của Chatbot, **không copy sang đây**). Khi dùng, đổi
  message trỏ về [../_shared/frontend.md](../_shared/frontend.md) §Accessibility + quy ước testid `snake_case`.
- Rollout `warn` trước, siết `error` sau khi codebase sạch.

### Cách bật (khi dựng ESLint cho package dashboard)
```js
// eslint.config.mjs (flat config) — ví dụ
import requireTestid from './docs/standards/eslint-rules/require-testid-on-interactive.js';
export default [
  {
    files: ['packages/dashboard/**/*.{tsx,jsx}'],
    plugins: { 'ui-tracking': { rules: { 'require-testid-on-interactive': requireTestid } } },
    rules: { 'ui-tracking/require-testid-on-interactive': 'warn' },
  },
];
```
