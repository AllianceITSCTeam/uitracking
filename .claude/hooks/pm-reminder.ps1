# Stop hook — nhắc đồng bộ PM (CLAUDE.md Mục 9).
# Chỉ nhắc khi lượt vừa rồi có động tới git/code (tránh spam mỗi lần trò chuyện).
$ErrorActionPreference = 'SilentlyContinue'
[Console]::In.ReadToEnd() | Out-Null

$dirty = (& git status --porcelain 2>$null)
if (-not $dirty) { exit 0 }

$msg = "Nhac PM sync (CLAUDE.md Muc 9): co thay doi chua commit. Neu vua bat dau/hoan thanh 1 subtask -> pm_start_subtask / pm_update_progress / pm_complete_subtask. Luu y: actual_hours la DELTA, khong phai tong."
@{ systemMessage = $msg } | ConvertTo-Json -Compress
exit 0
