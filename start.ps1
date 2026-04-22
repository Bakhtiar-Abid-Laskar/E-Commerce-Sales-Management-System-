# SalesTracker — PowerShell dev launcher
# Run with: .\start.ps1  OR  right-click → "Run with PowerShell"

$ErrorActionPreference = "Stop"
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir  = Join-Path $root "nextapp"

Write-Host ""
Write-Host "  SalesTracker Dev Server" -ForegroundColor Cyan
Write-Host "  Frontend + Backend API  ->  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# ── Kill any process already holding port 3000 ────────────────────────────────
Write-Host "[INFO] Checking for processes on port 3000..." -ForegroundColor DarkGray

$connections = netstat -ano | Select-String ":3000\s"
$pids = $connections |
    ForEach-Object { ($_ -split "\s+")[-1] } |
    Where-Object { $_ -match "^\d+$" } |
    Select-Object -Unique

if ($pids) {
    foreach ($p in $pids) {
        try {
            $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "[INFO] Killing $($proc.Name) (PID $p) on port 3000..." -ForegroundColor Yellow
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        } catch { <# ignore #> }
    }
    Start-Sleep -Seconds 1
    Write-Host "[INFO] Port 3000 cleared." -ForegroundColor Green
} else {
    Write-Host "[INFO] Port 3000 is free." -ForegroundColor Green
}
Write-Host ""

# ── Install deps if missing ───────────────────────────────────────────────────
if (-not (Test-Path (Join-Path $appDir "node_modules"))) {
    Write-Host "[SETUP] node_modules not found. Running npm install..." -ForegroundColor Yellow
    Push-Location $appDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        Pop-Location; Read-Host "Press Enter to exit"; exit 1
    }
    Pop-Location
    Write-Host "[SETUP] Dependencies installed." -ForegroundColor Green
    Write-Host ""
}

# ── Warn if API key is still placeholder ─────────────────────────────────────
$envFile = Join-Path $appDir ".env.local"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "your_gemini_api_key_here") {
        Write-Host "[WARNING] .env.local still has the placeholder GEMINI_API_KEY." -ForegroundColor Yellow
        Write-Host "          Edit nextapp\.env.local to enable AI label parsing." -ForegroundColor Yellow
        Write-Host ""
    }
}

# ── Open browser after 3s ────────────────────────────────────────────────────
$job = Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
}

# ── Start Next.js (frontend + all /api/* routes) ─────────────────────────────
Write-Host "[INFO] Starting Next.js on http://localhost:3000 ..." -ForegroundColor Green
Write-Host "[INFO] Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Set-Location $appDir
npm run dev

Remove-Job $job -Force -ErrorAction SilentlyContinue
