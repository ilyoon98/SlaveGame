$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw 'Node.js를 찾을 수 없습니다. Node.js 설치 후 다시 실행하세요.'
}
Push-Location -LiteralPath $PSScriptRoot
try {
    Write-Host '브라우저 주소: http://127.0.0.1:4173/Prototype/'
    Write-Host '서버를 종료하려면 Ctrl+C를 누르세요. 이미 실행했다면 같은 주소를 열면 됩니다.'
    & $nodeCommand.Source 'server.mjs'
    if ($LASTEXITCODE -ne 0) {
        throw '서버가 시작되지 않았습니다. 같은 포트를 사용하는 원정대 서버가 이미 열려 있는지 확인하세요.'
    }
}
finally {
    Pop-Location
}
