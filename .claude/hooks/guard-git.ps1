# PreToolUse guard cho Bash/PowerShell — thực thi CLAUDE.md Mục 7 & 10
# - Chặn git commit/push khi đang ở branch main/dev
# - Quét secret trong staged files trước khi commit
# Đọc hook input JSON từ stdin, trả permissionDecision=deny nếu vi phạm.

$ErrorActionPreference = 'SilentlyContinue'

$raw = [Console]::In.ReadToEnd()
if (-not $raw) { exit 0 }
try { $j = $raw | ConvertFrom-Json } catch { exit 0 }

$cmd = [string]$j.tool_input.command
if (-not $cmd) { exit 0 }

$isCommit = $cmd -match '\bgit\b[\s\S]*\bcommit\b'
$isPush   = $cmd -match '\bgit\b[\s\S]*\bpush\b'
if (-not ($isCommit -or $isPush)) { exit 0 }

$branch = (& git rev-parse --abbrev-ref HEAD 2>$null)
if (-not $branch) { exit 0 }
$branch = $branch.Trim()

$deny = $null

if ($branch -eq 'main' -or $branch -eq 'dev') {
  $action = if ($isPush) { 'push' } else { 'commit' }
  $deny = "CLAUDE.md Muc 7: khong duoc $action thang vao branch '$branch'. Hay tao branch moi truoc: git checkout -b feature/<ten> (hoac fix/<ten>) roi thao tac lai."
}

if (-not $deny -and $isCommit) {
  $bad = @()
  $staged = (& git diff --cached --name-only 2>$null)
  foreach ($f in $staged) {
    if (-not $f) { continue }
    if ($f -match '(?i)(^|/)storagestate') { $bad += $f; continue }
    if ($f -match '(?i)(^|/)\.env($|\.)' -and $f -notmatch '(?i)\.env\.(example|sample|template)$') { $bad += $f; continue }
    if ($f -match '(?i)\.(pem|key|p12|pfx)$') { $bad += $f; continue }
    if ($f -match '(?i)(^|/)(secrets?|credentials?)\.(json|ya?ml|txt)$') { $bad += $f; continue }
  }
  $content = (& git diff --cached 2>$null | Out-String)
  if ($content -match '(?i)(api[_-]?key|secret|password|passwd|token|bearer)["\s]*[:=]["\s]*[A-Za-z0-9_\-\.]{16,}') {
    $bad += '(noi dung staged chua chuoi giong secret/token)'
  }
  if ($bad.Count -gt 0) {
    $deny = "CLAUDE.md Muc 10: co the co secret trong staged files -> " + ($bad -join ', ') + ". Go khoi staging (git restore --staged <file>) va them vao .gitignore truoc khi commit."
  }
}

if ($deny) {
  $out = @{ hookSpecificOutput = @{ hookEventName = 'PreToolUse'; permissionDecision = 'deny'; permissionDecisionReason = $deny } }
  $out | ConvertTo-Json -Compress -Depth 6
}
exit 0
