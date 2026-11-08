<#
.SYNOPSIS
    Restores a PostgreSQL backup into an isolated scratch database and compares
    it with the source database.

.DESCRIPTION
    This is the proof step: a backup that has never been restored is not a backup.
    It refuses to run unless -Confirm is supplied, and it refuses to reuse the
    source database name.

    STATUS: syntax-checked, NOT executed against a real database. See README.md.

.EXAMPLE
    $env:PGHOST='...'; $env:PGPORT='5432'; $env:PGUSER='...'
    $env:PGPASSWORD='...'; $env:PGDATABASE='postgres'
    .\verify-restore-postgres.ps1 -BackupFile ..\..\database\backups\postgres\rms_20261108_120000.dump `
        -ScratchDatabase rms_restore_test -Confirm
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$BackupFile,
    [Parameter(Mandatory)][string]$ScratchDatabase,
    [string[]]$Tables = @('users', 'teachers', 'learners', 'classes', 'marks', 'assessments'),
    [string]$PsqlPath = 'psql',
    [string]$PgRestorePath = 'pg_restore',
    [switch]$Confirm
)

$ErrorActionPreference = 'Stop'

if (-not $Confirm) {
    throw "Refusing to restore without -Confirm. Restores write to a database."
}
if ($ScratchDatabase -notmatch '^[A-Za-z0-9_]+$') {
    throw "ScratchDatabase must contain only letters, digits and underscores."
}
if ($ScratchDatabase -eq $env:PGDATABASE) {
    throw "ScratchDatabase must be different from the source PGDATABASE."
}
$required = @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE')
$missing = @($required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) })
if ($missing.Count -gt 0) { throw "Missing environment variables: $($missing -join ', ')" }
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
foreach ($tool in @($PsqlPath, $PgRestorePath)) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Client tool not found: $tool" }
}

$adminDb = if ($env:PGADMINDB) { $env:PGADMINDB } else { 'postgres' }

& $PsqlPath -d $adminDb -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ""$ScratchDatabase"" WITH (FORCE);"
if ($LASTEXITCODE -ne 0) { throw "Failed to drop existing scratch database." }
& $PsqlPath -d $adminDb -v ON_ERROR_STOP=1 -c "CREATE DATABASE ""$ScratchDatabase"";"
if ($LASTEXITCODE -ne 0) { throw "Failed to create scratch database." }

& $PgRestorePath --dbname=$ScratchDatabase --no-owner --no-privileges --exit-on-error $BackupFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed. Scratch database may be incomplete." }

$sourceTables = (& $PsqlPath -d $env:PGDATABASE -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';").Trim()
$scratchTables = (& $PsqlPath -d $ScratchDatabase -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';").Trim()
Write-Output "Table count  source=$sourceTables  restored=$scratchTables"
if ([int]$sourceTables -ne [int]$scratchTables) { throw "Table count mismatch." }

$failures = 0
foreach ($table in $Tables) {
    $sourceRows = (& $PsqlPath -d $env:PGDATABASE -t -A -c "SELECT count(*) FROM public.""$table"";").Trim()
    $scratchRows = (& $PsqlPath -d $ScratchDatabase -t -A -c "SELECT count(*) FROM public.""$table"";").Trim()
    $match = ([int64]$sourceRows -eq [int64]$scratchRows)
    if (-not $match) { $failures++ }
    "{0,-24} source={1,-10} restored={2,-10} {3}" -f $table, $sourceRows, $scratchRows, $(if ($match) { 'OK' } else { 'MISMATCH' })
}
if ($failures -gt 0) { throw "$failures table(s) did not match. Restore is NOT verified." }
Write-Output "Restore verified. Drop the scratch database after review: DROP DATABASE ""$ScratchDatabase"";"
