# PS7 recommended but optional; script will auto-relauch in PowerShell 7 if available
Param(
  [string]$ProjectRef = "xcyqfxufgmepfkqohejv",
  [string]$SupabaseUrlDefault = "https://xcyqfxufgmepfkqohejv.supabase.co",
  [string]$AllowedOriginsDefault = "https://iwishneed.netlify.app,http://localhost:5173",
  [int]$FileUrlExpiresDefault = 3600
)

# PowerShell version compatibility: if running under Windows PowerShell (<7), try to relaunch under pwsh if available
if ($PSVersionTable.PSVersion.Major -lt 7) {
  $candidates = @(
    "$env:ProgramFiles\PowerShell\7\pwsh.exe",
    "$env:ProgramFiles\PowerShell\7-preview\pwsh.exe"
  )
  $found = $null
  foreach ($p in $candidates) { if (Test-Path $p) { $found = $p; break } }
  if (-not $found) {
    try { $found = (Get-Command pwsh -ErrorAction Stop).Source } catch {}
  }
  if ($found) {
    & $found -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath
    exit $LASTEXITCODE
  } else {
    Write-Warning "未找到 PowerShell 7，将继续在当前环境运行。若失败请安装 PowerShell 7 或手动提供 pwsh 路径。"
  }
}

function Read-Secret($prompt) {
  $sec = Read-Host -AsSecureString -Prompt $prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host "== Supabase Functions 部署助手 ==" -ForegroundColor Cyan

# 1) 检查/安装 Supabase CLI
$cliVersion = ""
try {
  $cliVersion = (supabase --version) 2>$null
} catch {}
if (-not $cliVersion) {
  Write-Host "未检测到 Supabase CLI，开始安装..." -ForegroundColor Yellow
  npm i -g supabase --silent
  $cliVersion = (supabase --version)
  Write-Host "Supabase CLI 已安装: $cliVersion" -ForegroundColor Green
} else {
  Write-Host "Supabase CLI 已存在: $cliVersion" -ForegroundColor Green
}

# 2) 采集凭据（本机输入，不会回传）
$pat = Read-Secret "请输入 Supabase Personal Access Token (PAT)"
if (-not $pat) { Write-Error "缺少 PAT"; exit 1 }

$projectRef = Read-Host "项目 Ref (默认: $ProjectRef)；直接回车使用默认"
if (-not $projectRef) { $projectRef = $ProjectRef }

$supabaseUrl = Read-Host "SUPABASE_URL (默认: $SupabaseUrlDefault)；直接回车使用默认"
if (-not $supabaseUrl) { $supabaseUrl = $SupabaseUrlDefault }

$serviceRole = Read-Secret "SUPABASE_SERVICE_ROLE_KEY (Service Role Key)"
if (-not $serviceRole) { Write-Error "缺少 Service Role Key"; exit 1 }

$anonKey = Read-Secret "MAIN_SUPABASE_ANON_KEY (Anon Key)"
if (-not $anonKey) { Write-Error "缺少 Anon Key"; exit 1 }

$allowed = Read-Host "ALLOWED_ORIGINS 逗号分隔 (默认: $AllowedOriginsDefault)"
if (-not $allowed) { $allowed = $AllowedOriginsDefault }

$adminEmails = Read-Host "ADMIN_EMAILS（可选，逗号分隔，留空跳过）"
$fileUrlExpires = Read-Host "COMMENTS_FILEURL_EXPIRES 秒 (默认: $FileUrlExpiresDefault)"
if (-not $fileUrlExpires) { $fileUrlExpires = $FileUrlExpiresDefault }

# 3) 登录与 link
Write-Host "登录 Supabase CLI..." -ForegroundColor Cyan
supabase logout | Out-Null
supabase login --token $pat
if ($LASTEXITCODE -ne 0) { Write-Error "CLI 登录失败"; exit 1 }

Write-Host "关联项目 $projectRef ..." -ForegroundColor Cyan
supabase link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { Write-Error "项目关联失败"; exit 1 }

# 4) 设置函数 Secrets（使用变量引用，避免明文回显）
Write-Host "写入 Edge Functions Secrets ..." -ForegroundColor Cyan
$env:SUPABASE_URL = $supabaseUrl
$env:SUPABASE_SERVICE_ROLE_KEY = $serviceRole
$env:MAIN_SUPABASE_URL = $supabaseUrl
$env:MAIN_SUPABASE_ANON_KEY = $anonKey
$env:ALLOWED_ORIGINS = $allowed
$env:ADMIN_EMAILS = $adminEmails
$env:COMMENTS_FILEURL_EXPIRES = "$fileUrlExpires"

supabase secrets set `
  SUPABASE_URL="$env:SUPABASE_URL" `
  SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" `
  MAIN_SUPABASE_URL="$env:MAIN_SUPABASE_URL" `
  MAIN_SUPABASE_ANON_KEY="$env:MAIN_SUPABASE_ANON_KEY" `
  ALLOWED_ORIGINS="$env:ALLOWED_ORIGINS" `
  ADMIN_EMAILS="$env:ADMIN_EMAILS" `
  COMMENTS_FILEURL_EXPIRES="$env:COMMENTS_FILEURL_EXPIRES"
if ($LASTEXITCODE -ne 0) { Write-Error "写入 Secrets 失败"; exit 1 }

# 5) 部署函数
Write-Host "部署 Edge Functions ..." -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "..")
try {
  supabase functions deploy comments-add
  if ($LASTEXITCODE -ne 0) { throw "comments-add 部署失败" }
  supabase functions deploy comments-delete
  if ($LASTEXITCODE -ne 0) { throw "comments-delete 部署失败" }
  supabase functions deploy comments-upload-presign
  if ($LASTEXITCODE -ne 0) { throw "comments-upload-presign 部署失败" }
  supabase functions deploy comments-file-url
  if ($LASTEXITCODE -ne 0) { throw "comments-file-url 部署失败" }
} finally {
  Pop-Location
}

Write-Host "全部完成 ✅" -ForegroundColor Green
Write-Host "如需再次部署，可重复运行本脚本。" -ForegroundColor DarkGray