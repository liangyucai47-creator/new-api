$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = 'C:\Users\wayne&partners\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$webDir = Join-Path $repoRoot 'web'
$viteCli = Join-Path $webDir 'node_modules\vite\bin\vite.js'

if (-not (Test-Path $nodeExe)) {
    throw "Node runtime not found: $nodeExe"
}

if (-not (Test-Path $viteCli)) {
    throw "Vite CLI not found. Please make sure frontend dependencies are installed in web/node_modules."
}

Push-Location $webDir
try {
    & $nodeExe $viteCli
} finally {
    Pop-Location
}
