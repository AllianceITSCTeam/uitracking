/**
 * Custom ESLint rule: require-testid-on-interactive
 * Yêu cầu `data-testid` trên phần tử JSX tương tác để E2E (Playwright) định vị bằng
 * getByTestId. Bắt cả 2 dạng:
 *   1. Tag intrinsic chữ thường: input/select/textarea/button.
 *   2. Wrapper shadcn/ui PascalCase: Button/Input/Textarea/Switch/SelectTrigger.
 *      Các primitive này forward `...props` xuống DOM thật (vd Button → <button>),
 *      nên `data-testid` trên wrapper truyền được xuống → getByTestId dùng được.
 *      Chỉ liệt kê control TƯƠNG TÁC thật; KHÔNG gồm root không-render-DOM (Select, Form,
 *      Label) — testid vô nghĩa ở đó.
 * Chuẩn: ../frontend-ui-standards.md §14 + ../naming-conventions.md §2 (data-testid).
 * Lý do: testid-first — locator bền nhất (đổi text/CSS test vẫn xanh); app đa ngôn ngữ.
 *
 * HEURISTIC theo tên tag/component. Chỉ bắt phần tử TƯƠNG TÁC — KHÔNG bắt text hiển thị
 * (phạm vi thu hẹp: chỉ gắn testid khi E2E cần assert → không lint được tĩnh, review tay).
 * File primitive `src/components/ui/**` được loại trừ ở config (chúng định nghĩa wrapper,
 * không phải nơi đặt testid) — xem eslint.config.mjs.
 *
 * Bỏ qua (giảm false-positive):
 *   - `<input type="hidden">` (ignoreInputTypes).
 *   - Phần tử có spread (`{...register(...)}`, `{...props}`) khi allowSpread=true (mặc định)
 *     — không biết tĩnh spread có bơm testid không; đặt false để bắt chặt.
 *   - Phần tử có `asChild` (radix Slot): nó KHÔNG render DOM của chính nó mà thay bằng
 *     child (vd `<Button asChild><a/></Button>` → chỉ có `<a>` ở DOM). testid đặt trên
 *     child (`_link`) theo thông lệ repo → bỏ qua wrapper để khỏi báo nhầm. child là
 *     `<a>`/`<Link>` không nằm trong danh sách nên review tay khi cần assert.
 *
 * Tinh chỉnh qua options:
 *   [{ elements: [...], allowSpread: bool, ignoreInputTypes: [...] }].
 */

'use strict';

const DEFAULT_ELEMENTS = [
  // intrinsic (chữ thường)
  'input', 'select', 'textarea', 'button',
  // wrapper shadcn/ui (PascalCase) — control tương tác render DOM
  'Button', 'Input', 'Textarea', 'Switch', 'SelectTrigger',
];
const DEFAULT_IGNORE_INPUT_TYPES = ['hidden'];

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Yêu cầu data-testid trên phần tử JSX tương tác (E2E Playwright)' },
    schema: [{
      type: 'object',
      properties: {
        elements: { type: 'array', items: { type: 'string' } },
        allowSpread: { type: 'boolean' },
        ignoreInputTypes: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    }],
    messages: {
      missing:
        'Phần tử tương tác <{{name}}> thiếu data-testid — E2E định vị bằng getByTestId. ' +
        'Tên snake_case (vd document_title_input, document_save_btn). Xem frontend-ui-standards §14.',
    },
  },

  create(context) {
    const opts = context.options[0] || {};
    const elements = new Set(opts.elements || DEFAULT_ELEMENTS);
    const allowSpread = opts.allowSpread !== false; // mặc định true
    const ignoreInputTypes = new Set(opts.ignoreInputTypes || DEFAULT_IGNORE_INPUT_TYPES);

    return {
      JSXOpeningElement(node) {
        // Chỉ JSXIdentifier (intrinsic `button` HOẶC component `Button`); bỏ member (`Select.Trigger`)
        // / namespaced. Lọc tiếp theo danh sách `elements` — chỉ tên có trong đó mới bị bắt.
        if (node.name.type !== 'JSXIdentifier') return;
        const tag = node.name.name;
        if (!elements.has(tag)) return;

        let hasTestid = false;
        let hasSpread = false;
        let hasAsChild = false;
        let inputType = null;

        for (const attr of node.attributes) {
          if (attr.type === 'JSXSpreadAttribute') { hasSpread = true; continue; }
          if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
          if (attr.name.name === 'data-testid') hasTestid = true;
          // `asChild` bare (=true) hoặc `asChild={true}`; `asChild={false}` KHÔNG tính.
          if (attr.name.name === 'asChild') {
            hasAsChild =
              attr.value == null ||
              (attr.value.type === 'JSXExpressionContainer' &&
                attr.value.expression.type === 'Literal' &&
                attr.value.expression.value === true);
          }
          if (
            (tag === 'input' || tag === 'Input') &&
            attr.name.name === 'type' &&
            attr.value &&
            attr.value.type === 'Literal'
          ) {
            inputType = attr.value.value;
          }
        }

        if ((tag === 'input' || tag === 'Input') && inputType != null && ignoreInputTypes.has(inputType)) return;
        if (hasTestid) return;
        if (hasAsChild) return;
        if (allowSpread && hasSpread) return;

        context.report({ node, messageId: 'missing', data: { name: tag } });
      },
    };
  },
};
