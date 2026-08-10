/** Kết quả phân giải 1 registry control không ra đúng 1 element — xem Bất biến #1 (LOCATOR_BROKEN). */
export type BrokenControl = { key: string; reason: "NOT_FOUND" | "AMBIGUOUS"; count: number };
