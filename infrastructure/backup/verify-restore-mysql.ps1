<#
.SYNOPSIS
    Restores a MySQL backup into an isolated scratch database and compares it
    with the source database.

.DESCRIPTION
    This is the proof step: a backup that has never been restored is not a backup.
    It refuses to run unless -Confirm is supplied, and it refuses to target the
    source database name.

    STATUS: syntax-checked, NOT executed against a real database. See README.md.

.EXAMPLE
    .\verify-restore-mysql.ps1 -BackupFile ..\..\database\backups\mysql\lessonplan_db_20261108_120000.sql `
        -ScratchDatabase lessonplan_restore_test -Confirm
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$BackupFile,
    [Parameter(Mandatory)][string]$ScratchDatabase,
    [string[]]$Tables = @('users', 'classes', 'subjects', 'lesson_plans', 'lessons'),
    [string]$MySqlPath = 'mysql',
    [switch]$Confirm
)

$ErrorActionPreference = 'Stop'

if (-not $Confirm) {
    throw "Refusing to restore without -Confirm. Restores write to a database."
}
if ($ScratchDatabase -notmatch '^[A-Za-z0-9_]+$') {
    throw "ScratchDatabase must contain only letters, digits and underscores."
}
if ($ScratchDatabase -eq $env:DB_NAME) {
    throw "ScratchDatabase must be different from the source DB_NAME."
}
$required = @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME')
$missing = @($required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) })
if ($missing.Count -gt 0) { throw "Missing environment variables: $($missing -join ', ')" }
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
if (-not (Get-Command $MySqlPath -ErrorAction SilentlyContinue)) { throw "mysql client not found: $MySqlPath" }

$previousPwd = $env:MYSQL_PWD
try {
    $env:MYSQL_PWD = $env:DB_PASSWORD
    $common = @("--host=$env:DB_HOST", "--port=$env:DB_PORT", "--user=$env:DB_USER")

    & $MySqlPath @common -e "DROP DATABASE IF EXISTS ``$ScratchDatabase``; CREATE DATABASE ``$ScratchDatabase`` CHARACTER SET utf8mb4;"
    if ($LASTEXITCODE -ne 0) { throw "Failed to create scratch database." }

    $forwardPath = (Resolve-Path $BackupFile).Path.Replace('\', '/')
    & $MySqlPath @common --database=$ScratchDatabase --execute="source $forwardPath"
    if ($LASTEXITCODE -ne 0) { throw "Restore failed. Scratch database may be incomplete." }

    $sourceTables = & $MySqlPath @common -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$($env:DB_NAME)' AND table_type='BASE TABLE';"
    $scratchTables = & $MySqlPath @common -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$ScratchDatabase' AND table_type='BASE TABLE';"
    Write-Output "Table count  source=$sourceTables  restored=$scratchTables"
    if ([int]$sourceTables -ne [int]$scratchTables) { throw "Table count mismatch." }

    $failures = 0
    foreach ($table in $Tables) {
        $sourceRows = & $MySqlPath @common -N -B -e "SELECT COUNT(*) FROM ``$($env:DB_NAME)``.``$table``;"
        $scratchRows = & $MySqlPath @common -N -B -e "SELECT COUNT(*) FROM ``$ScratchDatabase``.``$table``;"
        $match = ([int]$sourceRows -eq [int]$scratchRows)
        if (-not $match) { $failures++ }
        "{0,-24} source={1,-10} restored={2,-10} {3}" -f $table, $sourceRows, $scratchRows, $(if ($match) { 'OK' } else { 'MISMATCH' })
    }
    if ($failures -gt 0) { throw "$failures table(s) did not match. Restore is NOT verified." }
    Write-Output "Restore verified. Drop the scratch database after review: DROP DATABASE ``$ScratchDatabase``;"
}
finally {
    $env:MYSQL_PWD = $previousPwd
}
