#!/usr/bin/env powershell
# Script de diagnóstico de licencias para soporte técnico ParkFlow
# Uso: .\diagnose-license.ps1 -CompanyId "uuid" -ApiKey "key"
#      .\diagnose-license.ps1 -DeviceFingerprint "fp-xxx" -ApiKey "key"

param(
    [Parameter(Mandatory=$false)]
    [string]$CompanyId,

    [Parameter(Mandatory=$false)]
    [string]$DeviceFingerprint,

    [Parameter(Mandatory=$true)]
    [string]$ApiKey,

    [Parameter(Mandatory=$false)]
    [string]$ApiBaseUrl = "http://localhost:6011",

    [Parameter(Mandatory=$false)]
    [switch]$GetPriorityCases,

    [Parameter(Mandatory=$false)]
    [switch]$GetUnresolvedBlocks,

    [Parameter(Mandatory=$false)]
    [switch]$GetStatistics
)

$ErrorActionPreference = "Stop"

# Colores
$colors = @{
    Reset = "`e[0m"
    Red = "`e[31m"
    Green = "`e[32m"
    Yellow = "`e[33m"
    Cyan = "`e[36m"
    White = "`e[37m"
}

function Write-Color($message, $color = "White") {
    Write-Host "$($colors[$color])$message$($colors.Reset)"
}

function Write-Header($title) {
    Write-Color "" "Reset"
    Write-Color "========================================" "Cyan"
    Write-Color $title "Cyan"
    Write-Color "========================================" "Cyan"
}

function Invoke-ApiRequest($endpoint, $method = "GET", $body = $null) {
    $headers = @{
        "X-API-Key" = $ApiKey
        "Content-Type" = "application/json"
    }

    $url = "$ApiBaseUrl/api/v1/licensing$endpoint"

    try {
        if ($method -eq "GET") {
            return Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        } else {
            return Invoke-RestMethod -Uri $url -Headers $headers -Method $method -Body ($body | ConvertTo-Json -Depth 10)
        }
    } catch {
        Write-Color "Error en API: $($_.Exception.Message)" "Red"
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Color "Respuesta: $errorBody" "Red"
        }
        return $null
    }
}

# Main
Write-Color "" "Reset"
Write-Color "ParkFlow License Diagnostic Tool" "Cyan"
Write-Color "=================================" "Cyan"
Write-Color "API: $ApiBaseUrl" "White"

# Casos prioritarios
if ($GetPriorityCases) {
    Write-Header "Casos Prioritarios (Pagos Post-Bloqueo)"

    $cases = Invoke-ApiRequest "/support/cases/priority"

    if ($cases -and $cases.Count -gt 0) {
        Write-Color "`u26a0 Encontrados $($cases.Count) casos prioritarios:" "Yellow"

        foreach ($case in $cases) {
            $priorityColor = if ($case.priority -eq "HIGH") { "Red" } elseif ($case.priority -eq "MEDIUM") { "Yellow" } else { "White" }

            Write-Color "" "Reset"
            Write-Color "  Empresa: $($case.companyName) [ID: $($case.companyId)]" $priorityColor
            Write-Color "  Prioridad: $($case.priority) | Días bloqueado: $($case.daysBlocked)" $priorityColor
            Write-Color "  Razón: $($case.blockReason)" "White"
            Write-Color "  Fecha bloqueo: $($case.blockDate)" "White"
            Write-Color "  Fecha pago: $($case.paymentDate)" "Green"
            Write-Color "  Ref pago: $($case.paymentReference)" "Green"
            Write-Color "  Estado empresa: $($case.companyStatus)" "White"

            Write-Color "" "Reset"
            Write-Color "  Acción recomendada:" "Yellow"
            Write-Color "  Invoke-RestMethod -Uri '$ApiBaseUrl/api/v1/licensing/support/company/$($case.companyId)/unblock' -Method POST -Headers @{'X-API-Key'='$ApiKey';'Content-Type'='application/json'} -Body '{`"reason`":`"Pago verificado - Ref: $($case.paymentReference)`",`"notifyCustomer`":true}'" "Cyan"
        }
    } else {
        Write-Color "✓ No hay casos prioritarios pendientes" "Green"
    }
}

# Bloqueos no resueltos
if ($GetUnresolvedBlocks) {
    Write-Header "Eventos de Bloqueo No Resueltos"

    $blocks = Invoke-ApiRequest "/support/blocks/unresolved"

    if ($blocks -and $blocks.Count -gt 0) {
        Write-Color "`u26a0 Encontrados $($blocks.Count) eventos no resueltos:" "Yellow"

        $grouped = $blocks | Group-Object -Property reasonCode

        foreach ($group in $grouped) {
            Write-Color "" "Reset"
            Write-Color "$($group.Name): $($group.Count) eventos" "Yellow"

            foreach ($block in $group.Group | Select-Object -First 3) {
                Write-Color "  - $($block.reasonDescription)" "White"
                Write-Color "    Empresa: $($block.companyId) | Fecha: $($block.createdAt)" "White"
            }
        }
    } else {
        Write-Color "✓ No hay bloqueos no resueltos" "Green"
    }
}

# Estadísticas
if ($GetStatistics) {
    Write-Header "Estadísticas de Bloqueos (Últimos 7 días)"

    $stats = Invoke-ApiRequest "/support/statistics?days=7"

    if ($stats) {
        Write-Color "Período: $($stats.periodStart) - $($stats.periodEnd)" "White"
        Write-Color "" "Reset"
        Write-Color "Total eventos: $($stats.totalBlockEvents)" "White"
        Write-Color "Resueltos: $($stats.resolvedEvents)" "Green"
        Write-Color "No resueltos: $($stats.unresolvedEvents)" $(if ($stats.unresolvedEvents -gt 5) { "Red" } else { "Yellow" })
        Write-Color "Tasa de resolución: $([math]::Round($stats.resolutionRate, 1))%" $(if ($stats.resolutionRate -gt 80) { "Green" } elseif ($stats.resolutionRate -gt 50) { "Yellow" } else { "Red" })

        Write-Color "" "Reset"
        Write-Color "Por razón:" "White"
        foreach ($reason in $stats.blocksByReason.PSObject.Properties) {
            Write-Color "  $($reason.Name): $($reason.Value)" "White"
        }
    }
}

# Diagnóstico de empresa
if ($CompanyId) {
    Write-Header "Diagnóstico de Empresa: $CompanyId"

    $diagnosis = Invoke-ApiRequest "/support/diagnose/company/$CompanyId"

    if ($diagnosis) {
        # Información básica
        $statusColor = if ($diagnosis.healthStatus -eq "HEALTHY") { "Green" } elseif ($diagnosis.healthStatus -eq "WARNING") { "Yellow" } else { "Red" }

        Write-Color "Empresa: $($diagnosis.companyName)" "White"
        Write-Color "Estado: $($diagnosis.currentStatus) | Plan: $($diagnosis.currentPlan)" $statusColor
        Write-Color "Salud: $($diagnosis.healthStatus)" $statusColor

        # Fechas
        Write-Color "" "Reset"
        Write-Color "Vencimiento: $($diagnosis.expiresAt)" $(if ($diagnosis.daysRemaining -lt 0) { "Red" } else { "White" })
        if ($diagnosis.daysRemaining -lt 0) {
            Write-Color "Días expirada: $([math]::Abs($diagnosis.daysRemaining))" "Red"
        } else {
            Write-Color "Días restantes: $($diagnosis.daysRemaining)" "Green"
        }

        if ($diagnosis.graceDaysRemaining) {
            Write-Color "Días gracia: $($diagnosis.graceDaysRemaining)" $(if ($diagnosis.graceDaysRemaining -lt 0) { "Red" } else { "Yellow" })
        }

        # Bloqueos
        Write-Color "" "Reset"
        Write-Color "Eventos de bloqueo: $($diagnosis.totalBlockEvents)" "White"
        Write-Color "No resueltos: $($diagnosis.unresolvedBlockEvents)" $(if ($diagnosis.unresolvedBlockEvents -gt 0) { "Red" } else { "Green" })

        # Dispositivos
        Write-Color "" "Reset"
        Write-Color "Dispositivos: $($diagnosis.registeredDevices) total | $($diagnosis.activeDevices) activos | $($diagnosis.blockedDevices) bloqueados" "White"

        # Advertencias
        if ($diagnosis.warnings -and $diagnosis.warnings.Count -gt 0) {
            Write-Color "" "Reset"
            Write-Color "⚠ Advertencias:" "Yellow"
            foreach ($warning in $diagnosis.warnings) {
                Write-Color "  - $warning" "Yellow"
            }
        }

        # Recomendaciones
        if ($diagnosis.recommendations -and $diagnosis.recommendations.Count -gt 0) {
            Write-Color "" "Reset"
            Write-Color "✓ Recomendaciones:" "Green"
            foreach ($rec in $diagnosis.recommendations) {
                Write-Color "  - $rec" "Green"
            }
        }

        # Comandos de acción
        if ($diagnosis.unresolvedBlockEvents -gt 0) {
            Write-Color "" "Reset"
            Write-Color "Comandos para resolver:" "Cyan"
            Write-Color "Ver bloqueos: curl -H 'X-API-Key: $ApiKey' $ApiBaseUrl/api/v1/licensing/support/blocks/company/$CompanyId" "White"
            Write-Color "Desbloquear: curl -X POST -H 'X-API-Key: $ApiKey' -H 'Content-Type: application/json' -d '{`"reason`":`"Resuelto por soporte`",`"notifyCustomer`":true}' $ApiBaseUrl/api/v1/licensing/support/company/$CompanyId/unblock" "White"
        }
    }
}

# Diagnóstico de dispositivo
if ($DeviceFingerprint) {
    Write-Header "Diagnóstico de Dispositivo: $DeviceFingerprint"

    $diagnosis = Invoke-ApiRequest "/support/diagnose/device/$DeviceFingerprint"

    if ($diagnosis) {
        Write-Color "Fingerprint: $($diagnosis.deviceFingerprint)" "White"
        Write-Color "Hostname: $($diagnosis.hostname)" "White"
        Write-Color "OS: $($diagnosis.operatingSystem) | App: $($diagnosis.appVersion)" "White"

        $statusColor = if ($diagnosis.currentStatus -eq "ACTIVE") { "Green" } else { "Red" }
        Write-Color "Estado: $($diagnosis.currentStatus)" $statusColor

        # Heartbeat
        Write-Color "" "Reset"
        if ($diagnosis.lastHeartbeatAt) {
            $onlineColor = if ($diagnosis.isOnline) { "Green" } else { "Red" }
            Write-Color "Último heartbeat: $($diagnosis.lastHeartbeatAt)" "White"
            Write-Color "Minutos desde HB: $($diagnosis.minutesSinceLastHeartbeat)" $onlineColor
            Write-Color "Estado: $(if ($diagnosis.isOnline) { 'ONLINE ✓' } else { 'OFFLINE ✗' })" $onlineColor
        } else {
            Write-Color "Sin heartbeats registrados" "Red"
        }

        # Licencia
        Write-Color "" "Reset"
        if ($diagnosis.licenseKey) {
            Write-Color "License Key: $($diagnosis.licenseKey.Substring(0, [Math]::Min(20, $diagnosis.licenseKey.Length)))..." "White"
        }
        if ($diagnosis.licenseExpiresAt) {
            Write-Color "Licencia vence: $($diagnosis.licenseExpiresAt)" $(if ([DateTime]$diagnosis.licenseExpiresAt -lt [DateTime]::Now) { "Red" } else { "White" })
        }

        # Bloqueos
        Write-Color "" "Reset"
        Write-Color "Total bloqueos: $($diagnosis.totalBlockEvents)" "White"

        if ($diagnosis.recentBlocks -and $diagnosis.recentBlocks.Count -gt 0) {
            Write-Color "Bloqueos recientes:" "Yellow"
            foreach ($block in $diagnosis.recentBlocks | Select-Object -First 3) {
                $resolved = if ($block.resolved) { "[RESUELTO]" } else { "[PENDIENTE]" }
                Write-Color "  - $($block.reasonCode) $resolved - $($block.createdAt)" $(if ($block.resolved) { "Green" } else { "Red" })
                Write-Color "    $($block.reasonDescription)" "White"
            }
        }

        Write-Color "" "Reset"
        Write-Color "Empresa: $($diagnosis.companyName) [ID: $($diagnosis.companyId)]" "Cyan"
    }
}

Write-Color "" "Reset"
Write-Color "========================================" "Cyan"
Write-Color "Diagnóstico completado" "Cyan"
Write-Color "========================================" "Cyan"
