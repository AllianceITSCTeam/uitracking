/** Sinh `runId` từ timestamp hiện tại — sắp xếp được theo thời gian, hợp lệ làm tên thư mục (`sanitizeIdSegment`). */
export function generateRunId(now: Date = new Date()): string {
  return now.toISOString().replace(/[:.]/g, "-");
}
