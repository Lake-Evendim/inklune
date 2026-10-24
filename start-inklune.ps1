param([switch]$Compare, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$inkluneRoot = $PSScriptRoot
$inkluneUrl = 'http://127.0.0.1:5174/'
# Keep the legacy -Compare launcher compatible; it opens the final app.
function Test-InkluneServer {
    try {
        $page = Invoke-WebRequest -Uri 'http://127.0.0.1:5174/' -UseBasicParsing -TimeoutSec 2
        return $page.StatusCode -eq 200 -and $page.Content -match '<title>Inklune' -and $page.Content -match 'assets/index-'
    } catch { return $false }
}
try {
    if (-not (Test-InkluneServer)) {
        if (Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue) {
            throw 'Port 5174 is used by another app. Inklune did not change that process.'
        }
        $inkluneNode = (Get-Command node.exe -ErrorAction Stop).Source
        Push-Location -LiteralPath $inkluneRoot
        try {
            if (-not (Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) {
                & npm.cmd ci
                if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
            }
            if (-not (Test-Path -LiteralPath 'dist/index.html')) {
                & npm.cmd run build
                if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
            }
        } finally { Pop-Location }
        $inkluneLogs = Join-Path $inkluneRoot '.inklune-logs'
        New-Item -ItemType Directory -Path $inkluneLogs -Force | Out-Null
        $inkluneProcess = Start-Process -FilePath $inkluneNode -ArgumentList @('node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5174','--strictPort') -WorkingDirectory $inkluneRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $inkluneLogs 'server.log') -RedirectStandardError (Join-Path $inkluneLogs 'server-error.log') -PassThru
        $inkluneReady = $false
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            if (Test-InkluneServer) { $inkluneReady = $true; break }
            if ($inkluneProcess.HasExited) { break }
            Start-Sleep -Milliseconds 250
        }
        if (-not $inkluneReady) { throw "Inklune did not start. Check $inkluneLogs/server-error.log." }
    }
    Write-Host "Inklune is ready: $inkluneUrl"
    if (-not $NoBrowser) { Start-Process -FilePath $inkluneUrl }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
