# scripts/build-frontend.ps1
# GEBZE-EKYS React Frontend Derleme ve Spring Boot Static Dağıtım Betiği
param (
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$FrontendDir = "$ProjectRoot\frontend"
$StaticDir = "$ProjectRoot\src\main\resources\static"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "GEBZE-EKYS Frontend Derleme Süreci Başlıyor" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Bağımlılık kontrolü
Set-Location $FrontendDir
if (-not $SkipInstall) {
    Write-Host "[1/4] Bağımlılıklar doğrulanıyor..." -ForegroundColor Yellow
    npm ci
}

# 2. Tip Kontrolü ve Derleme
Write-Host "[2/4] React uygulaması derleniyor (npm run build)..." -ForegroundColor Yellow
npm run build

# 3. Statik Klasörünün Temizlenmesi
Write-Host "[3/4] Spring Boot static klasörü hazırlanıyor..." -ForegroundColor Yellow
if (Test-Path $StaticDir) {
    Get-ChildItem -Path $StaticDir -Exclude .gitkeep | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $StaticDir -Force | Out-Null
}

# 4. Derleme Çıktısının Kopyalanması
Write-Host "[4/4] frontend/dist -> src/main/resources/static kopyalanıyor..." -ForegroundColor Yellow
Copy-Item -Path "$FrontendDir\dist\*" -Destination $StaticDir -Recurse -Force

# 5. Çalışan Spring Boot ortamı için target/classes/static senkronizasyonu
$TargetStaticDir = "$ProjectRoot\target\classes\static"
if (Test-Path $TargetStaticDir) {
    Write-Host "[5/5] frontend/dist -> target/classes/static senkronize ediliyor..." -ForegroundColor Yellow
    Get-ChildItem -Path $TargetStaticDir -Exclude .gitkeep | Remove-Item -Recurse -Force
    Copy-Item -Path "$FrontendDir\dist\*" -Destination $TargetStaticDir -Recurse -Force
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "BAŞARILI: React ön yüzü derlendi ve static klasörüne yerleştirildi." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

