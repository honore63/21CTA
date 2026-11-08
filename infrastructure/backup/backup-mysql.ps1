<#
.SYNOPSIS
    Creates an integrity-recorded logical backup of the System A MySQL database.

.DESCRIPTION
    Wraps `mysqldump` with flags suitable for a consistent, restorable backup:
      --single-transaction  (no table locks on InnoDB)
      --routines --triggers --events
    Connection details are read from environment variables ONLY. Never hardcode
    credentials in this file or any other tracked file.

    STATUS: syntax-checked, NOT executed against a real database. Requires the
    MySQL client tools on PATH and valid credentials. See README.md.

.EXAMPLE
    $env:DB_HOST='...'; $env:DB_PORT='3306'; $env:DB_USER='...'
    $env:DB_PASSWORD='...'; $env:DB_NAME='lessonplan_db'
    .\backup-mysql.ps1
#>
[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\database\backups\mysql'),
    [string]$MySqlDumpPath = 'mysqldump'
)

$ErrorActionPreference = 'Stop'

$required = @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME')
$missing = @($required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) })
if ($missing.Count -gt 0) {
    throw "Missing environment variables: $($missing -join ', '). Set them in the current shell only."
}

if (-not (Get-Command $MySqlDumpPath -ErrorAction SilentlyContinue)) {
    throw "mysqldump not found at '$MySqlDumpPath'. Install the MySQL client tools or pass -MySqlDumpPath."
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$fileName = "{0}_{1}.sql" -f $env:DB_NAME, $stamp
$filePath = Join-Path $OutputDirectory $fileName

$previousPwd = $env:MYSQL_PWD
try {
    $env:MYSQL_PWD = $env:DB_PASSWORD
    & $MySqlDumpPath `
        --host=$env:DB_HOST `
        --port=$env:DB_PORT `
        --user=$env:DB_USER `
        --single-transaction `
        --routines `
        --triggers `
        --events `
        --set-gtid-purged=OFF `
        --default-character-set=utf8mb4 `
        --result-file="$filePath" `
        $env:DB_NAME

    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump exited with code $LASTEXITCODE. Backup is NOT valid."
    }
}
finally {
    $env:MYSQL_PWD = $previousPwd
}

if (-not (Test-Path $filePath)) { throw "Backup file was not created: $filePath" }
$size = (Get-Item $filePath).Length
if ($size -lt 1024) { throw "Backup file is suspiciously small ($size bytes): $filePath" }

$hash = (Get-FileHash -Algorithm SHA256 -Path $filePath).Hash
$manifest = Join-Path $OutputDirectory 'manifest.tsv'
if (-not (Test-Path $manifest)) {
    "timestamp`tfile`tsha256`tbytes" | Set-Content -Path $manifest -Encoding utf8
}
"{0}`t{1}`t{2}`t{3}" -f $stamp, $fileName, $hash, $size | Add-Content -Path $manifest -Encoding utf8

Write-Output "Backup written: $filePath"
Write-Output "Bytes:          $size"
Write-Output "SHA256:         $hash"
Write-Output "Manifest:       $manifest"
Write-Output "A backup is not proven until it has been restored. Run verify-restore.ps1."
