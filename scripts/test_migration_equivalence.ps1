<#
.SYNOPSIS
  GEBZE-EKYS migrasyon seti eşdeğerlik testi (db/migration V1..Vn  <->  db/migration-prod V1..Vm).

.DESCRIPTION
  1. Yerel Oracle konteynerinde (FREEPDB1) iki BOŞ geçici şema açar: VARLIK_EQ_DEV ve VARLIK_EQ_PROD.
  2. scripts/MigrationEquivalence.java ile her iki migrasyon setini Flyway API üzerinden uygular.
  3. Tablo, sütun, indeks, kısıt, tetikleyici, görünüm, sequence ve resmi taksonomiyi karşılaştırır.
  4. Geçici şemaları her durumda (finally) DROP USER ... CASCADE ile kaldırır.
  Ana geliştirme şemasına (varlik_app) DOKUNMAZ.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/test_migration_equivalence.ps1
#>
param(
    [string]$Container = "gebze-varlik-oracle23ai",
    [string]$Pdb = "FREEPDB1",
    [string]$JdbcUrl = "jdbc:oracle:thin:@//localhost:1521/FREEPDB1"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$pw = "EqTest123456X9"

function Invoke-Sys([string]$sql) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    $header = "WHENEVER SQLERROR EXIT SQL.SQLCODE`r`nALTER SESSION SET CONTAINER=$Pdb;`r`n"
    $footer = "`r`nexit`r`n"
    [System.IO.File]::WriteAllText($tempFile, $header + $sql + $footer)
    try {
        $out = Get-Content $tempFile -Raw | docker exec -i $Container sqlplus -s / as sysdba
        if ($LASTEXITCODE -ne 0) { throw "sqlplus hatasi (kod $LASTEXITCODE)" }
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
}

$drop = @'
BEGIN
  FOR u IN (SELECT username FROM dba_users WHERE username IN ('VARLIK_EQ_PROD')) LOOP
    EXECUTE IMMEDIATE 'DROP USER ' || u.username || ' CASCADE';
  END LOOP;
END;
/
'@

$q = [char]34
$create = "CREATE USER VARLIK_EQ_PROD IDENTIFIED BY " + $q + "GebzeVarlik2026!" + $q + " QUOTA UNLIMITED ON USERS;`r`nGRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE TRIGGER, CREATE VIEW, CREATE PROCEDURE TO VARLIK_EQ_PROD;"

try {
    Write-Host "== Gecici bos semalar olusturuluyor (VARLIK_EQ_PROD) =="
    Invoke-Sys ($drop + $create) | Out-Null

    if (-not (Test-Path target/cp.txt)) {
        & .\mvnw.cmd -q dependency:build-classpath "-Dmdep.outputFile=target/cp.txt" "-Dmdep.includeScope=runtime"
    }
    $cp = (Get-Content target/cp.txt -Raw).Trim()

    Write-Host "== Migrasyonlar uygulanip veri sozlukleri karsilastiriliyor =="
    $cp = "target/classes;scripts;" + $cp
    & java -cp $cp MigrationEquivalence $JdbcUrl VARLIK_APP 'GebzeVarlik2026!' VARLIK_EQ_PROD 'GebzeVarlik2026!'
    $code = $LASTEXITCODE
}
finally {
    Write-Host "`n== Gecici semalar kaldiriliyor =="
    Invoke-Sys $drop | Out-Null
}
exit $code
