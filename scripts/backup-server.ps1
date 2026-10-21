# ==============================================================================
# Hospital Residential Allocation & Management System
# শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
# Automated Central Server Backup Script (Windows PowerShell)
# ==============================================================================

param (
    [string]$BackupRoot = "D:\SSNIMCH_Backups",
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path,
    [string]$PgDatabase = "ssnimch_residential_db",
    [string]$PgUser = "postgres",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$TargetFolder = Join-Path $BackupRoot "Backup_$Timestamp"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SSNIMCH Central Server Backup Starting: $Timestamp" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (!(Test-Path $TargetFolder)) {
    New-Item -ItemType Directory -Path $TargetFolder -Force | Out-Null
}

# 1. Copy JSON / Central State Database
$CentralDbFile = Join-Path $ProjectRoot "database\central-data.json"
if (Test-Path $CentralDbFile) {
    Copy-Item -Path $CentralDbFile -Destination (Join-Path $TargetFolder "central-data.json") -Force
    Write-Host "[OK] Central State JSON Database backed up." -ForegroundColor Green
}

# 2. PostgreSQL Dump (if PostgreSQL service is active on host)
if (Get-Command "pg_dump" -ErrorAction SilentlyContinue) {
    $PgDumpFile = Join-Path $TargetFolder "$PgDatabase`_$Timestamp.sql"
    pg_dump -U $PgUser -d $PgDatabase -F p -f $PgDumpFile
    Write-Host "[OK] PostgreSQL SQL Dump completed: $PgDumpFile" -ForegroundColor Green
}

# 3. Protected Document Repository Backup
$StorageDir = Join-Path $ProjectRoot "storage\documents"
if (Test-Path $StorageDir) {
    $DocsArchive = Join-Path $TargetFolder "documents_storage.zip"
    Compress-Archive -Path "$StorageDir\*" -DestinationPath $DocsArchive -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Protected Document Storage archived." -ForegroundColor Green
}

# 4. Generate SHA-256 Checksum Manifest
$ManifestPath = Join-Path $TargetFolder "checksums_sha256.txt"
Get-ChildItem -Path $TargetFolder -File | ForEach-Object {
    $Hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash
    "$Hash  $($_.Name)" | Out-File -FilePath $ManifestPath -Append -Encoding utf8
}

# 5. Cleanup Old Backups Beyond Retention Policy
Get-ChildItem -Path $BackupRoot -Directory | Where-Object {
    $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays)
} | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force
    Write-Host "[CLEANUP] Removed expired backup folder: $($_.Name)" -ForegroundColor Yellow
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Backup Completed Successfully at: $TargetFolder" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
