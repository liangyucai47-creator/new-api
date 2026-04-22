$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$goExe = 'D:\project\tools\go\bin\go.exe'
$nodeExe = 'C:\Users\wayne&partners\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$appExe = Join-Path $repoRoot 'new-api.exe'
$webDir = Join-Path $repoRoot 'web'
$viteCli = Join-Path $webDir 'node_modules\vite\bin\vite.js'

$env:GOPROXY = 'https://goproxy.cn,direct'
$env:DISABLE_ESLINT_PLUGIN = 'true'

if (-not (Test-Path $goExe)) {
    throw "Go runtime not found: $goExe"
}

if (-not (Test-Path $nodeExe)) {
    throw "Node runtime not found: $nodeExe"
}

if (-not (Test-Path $viteCli)) {
    throw "Vite CLI not found. Please make sure frontend dependencies are installed in web/node_modules."
}

Push-Location $webDir
try {
    & $nodeExe $viteCli build
} finally {
    Pop-Location
}

Push-Location $repoRoot
try {
    & $goExe build -o $appExe .
    & $appExe --log-dir (Join-Path $repoRoot 'logs')
} finally {
    Pop-Location
}
