<#
.SYNOPSIS
    Creates an integrity-recorded logical backup of the System B PostgreSQL database.

.DESCRIPTION
    Wraps `pg_dump` in custom format (restorable with pg_restore, supports
    selective restore). Credentials are read from DATABASE_URL only.

    STATUS: syntax-checked, NOT executed against a real database. Requires the
    PostgreSQL client tools on PATH and a valid connection string. See README.md.

.EXAMPLE
    $env:DATABASE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require'
    .\backup-postgres.ps1
#>
[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\database\backups\postgres'),
    [string]$PgDumpPath = 'pg_dump'
)

$ErrorActionPreference = 'Stop'

if (-not $env:DATABASE_URL) {
    throw "DATABASE_URL is not set. Provide a read-only or backup-capable connection string in the current shell only."
}
if (-not (Get-Command $PgDumpPath -ErrorAction SilentlyContinue)) {
    throw "pg_dump not found at '$PgDumpPath'. Install the PostgreSQL client tools or pass -PgDumpPath."
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$fileName = "rms_{0}.dump" -f $stamp
$filePath = Join-Path $OutputDirectory $fileName

& $PgDumpPath `
    --format=custom `
    --no-owner `
    --no-privileges `
    --file="$filePath" `
    $env:DATABASE_URL

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump exited with code $LASTEXITCODE. Backup is NOT valid."
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
