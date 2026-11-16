$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $project '.runtime'
$binary = Join-Path $runtime 'mariadb-11.4.10-winx64\bin'
$data = Join-Path $runtime 'mariadb-data'
if (!(Test-Path -LiteralPath (Join-Path $binary 'mariadbd.exe'))) {
 New-Item -ItemType Directory -Force -Path $runtime | Out-Null
 $archive = Join-Path $runtime 'mariadb.zip'
 if (!(Test-Path -LiteralPath $archive)) { Invoke-WebRequest 'https://archive.mariadb.org/mariadb-11.4.10/winx64-packages/mariadb-11.4.10-winx64.zip' -OutFile $archive }
 tar.exe -xf $archive -C $runtime
 if ($LASTEXITCODE -ne 0) { throw 'Falha ao extrair MariaDB.' }
}
if (!(Test-Path -LiteralPath (Join-Path $data 'mysql'))) {
 & (Join-Path $binary 'mariadb-install-db.exe') "--datadir=$data" --port=3307
 if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar MariaDB local.' }
}
$running = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
if ($running) {
 $ownerProcess = Get-Process -Id ($running | Select-Object -First 1).OwningProcess
 $expectedExe = [System.IO.Path]::GetFullPath((Join-Path $binary 'mariadbd.exe'))
 if ($ownerProcess.Path -ne $expectedExe) { throw 'A porta 3307 pertence a outro processo. Configure um banco existente no .env.' }
}
if (!$running) {
 Start-Process -FilePath (Join-Path $binary 'mariadbd.exe') -ArgumentList @("--datadir=`"$data`"",'--port=3307','--bind-address=127.0.0.1','--character-set-server=utf8mb4','--collation-server=utf8mb4_unicode_ci') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'mariadb.out.log') -RedirectStandardError (Join-Path $runtime 'mariadb.err.log')
 for ($i=0; $i -lt 30; $i++) { if (Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue) { break }; Start-Sleep -Milliseconds 400 }
}
if (!(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue)) { throw 'O banco não iniciou. Consulte .runtime/mariadb.err.log.' }
Write-Host 'MariaDB local disponível em 127.0.0.1:3307. Dados em .runtime/mariadb-data.'
