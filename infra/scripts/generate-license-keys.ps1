#!/usr/bin/env powershell
# Script para generar claves RSA de licenciamiento ParkFlow
# Uso: .\generate-license-keys.ps1

param(
    [string]$OutputDir = "infra/keys",
    [int]$KeySize = 2048
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ParkFlow License Key Generator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorio si no existe
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    Write-Host "Created directory: $OutputDir" -ForegroundColor Green
}

$PrivateKeyFile = "$OutputDir/parkflow_license_private.pem"
$PublicKeyFile = "$OutputDir/parkflow_license_public.pem"

Write-Host "Generating RSA ${KeySize}-bit key pair..." -ForegroundColor Yellow

# Generar clave privada
openssl genrsa -out $PrivateKeyFile $KeySize 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate private key. Is OpenSSL installed?"
    exit 1
}
Write-Host "✓ Private key generated: $PrivateKeyFile" -ForegroundColor Green

# Extraer clave pública
openssl rsa -in $PrivateKeyFile -pubout -out $PublicKeyFile 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to extract public key"
    exit 1
}
Write-Host "✓ Public key generated: $PublicKeyFile" -ForegroundColor Green

# Convertir a base64 para variables de entorno
Write-Host ""
Write-Host "Converting to base64 for environment variables..." -ForegroundColor Yellow

$PrivateKeyBase64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($PrivateKeyFile))
$PublicKeyBase64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($PublicKeyFile))

# Guardar en archivo .env.local
$EnvFile = ".env.local"
$EnvContent = @"
# ParkFlow License Keys - Generated $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
PARKFLOW_LICENSE_PRIVATE_KEY=$PrivateKeyBase64
PARKFLOW_LICENSE_PUBLIC_KEY=$PublicKeyBase64
"@

$EnvContent | Out-File -FilePath $EnvFile -Encoding UTF8
Write-Host "✓ Environment variables saved to: $EnvFile" -ForegroundColor Green

# Mostrar instrucciones
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Instructions:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy the following to your backend .env file:" -ForegroundColor Yellow
Write-Host ""
Write-Host "PARKFLOW_LICENSE_PRIVATE_KEY=$($PrivateKeyBase64.Substring(0, 50))..." -ForegroundColor Gray
Write-Host "PARKFLOW_LICENSE_PUBLIC_KEY=$($PublicKeyBase64.Substring(0, 50))..." -ForegroundColor Gray
Write-Host ""
Write-Host "2. Or load automatically from .env.local:" -ForegroundColor Yellow
Write-Host "   The API will load these variables on startup" -ForegroundColor White
Write-Host ""
Write-Host "3. Key files location:" -ForegroundColor Yellow
Write-Host "   Private: $PrivateKeyFile" -ForegroundColor White
Write-Host "   Public:  $PublicKeyFile" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Keep the private key secret!" -ForegroundColor Red
Write-Host "   Never commit infra/keys/ to git." -ForegroundColor Red
Write-Host ""

# Verificar que se pueda usar para firmar
Write-Host "Testing signing capability..." -ForegroundColor Yellow
$TestData = "test-data"
$TestFile = "$OutputDir/test.txt"
$TestData | Out-File -FilePath $TestFile -Encoding UTF8

$SignatureFile = "$OutputDir/test.sig"
openssl dgst -sha256 -sign $PrivateKeyFile -out $SignatureFile $TestFile 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Signing test passed" -ForegroundColor Green

    # Verificar firma
    $VerifyResult = openssl dgst -sha256 -verify $PublicKeyFile -signature $SignatureFile $TestFile 2>&1
    if ($VerifyResult -match "Verified OK") {
        Write-Host "✓ Signature verification test passed" -ForegroundColor Green
    } else {
        Write-Warning "Signature verification test failed"
    }
} else {
    Write-Warning "Signing test failed"
}

# Limpiar archivos de prueba
Remove-Item -Path $TestFile -ErrorAction SilentlyContinue
Remove-Item -Path $SignatureFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Key generation completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
