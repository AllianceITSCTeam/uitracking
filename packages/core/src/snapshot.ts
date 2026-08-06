/** Vai trò/tag/type là chuỗi tự do (ARIA role, HTML tag, control type) — không giới hạn enum. */

export type ControlText = {
  label?: string;
  placeholder?: string;
};

/** Style properties whitelist ở tầng capture (T3.2); core chỉ giữ shape key-value. */
export type ControlStyle = Record<string, string>;

export type ControlAttrs = Record<string, string | boolean>;

export type Control = {
  key: string;
  role: string;
  tag: string;
  type: string;
  order: number;
  text: ControlText;
  options: string[] | null;
  style: ControlStyle;
  attrs: ControlAttrs;
};

export type Screen = {
  id: string;
  locale: string;
  capturedAt: string;
  controls: Control[];
};
