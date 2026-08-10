export type LogLevel = "info" | "warn" | "error";

/** Ghi 1 dòng JSON log ra stdout — `run_id` (nếu có trong `fields`) xuyên suốt capture→diff→report. */
export function log(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields }));
}
