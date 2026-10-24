param([switch]$Compare, [switch]$NoBrowser)
# Compatibility entry for previously downloaded launchers.
& (Join-Path $PSScriptRoot 'start-inklune.ps1') -Compare:$Compare -NoBrowser:$NoBrowser
exit $LASTEXITCODE
