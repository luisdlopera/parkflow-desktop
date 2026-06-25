#!/bin/bash

echo "=== GOD SERVICES VERIFICATION REPORT ==="
echo ""
echo "Checking all 18 god services for compliance (>5 methods = non-compliant)"
echo ""

count=0
services_over_5=0

for service in src/main/java/com/parkflow/modules/settings/application/service/SettingsVehicleTypeService.java \
               src/main/java/com/parkflow/modules/reports/application/service/ReportQueryService.java \
               src/main/java/com/parkflow/modules/licensing/application/service/LicenseAuditService.java \
               src/main/java/com/parkflow/modules/licensing/application/service/CompanyManagementService.java \
               src/main/java/com/parkflow/modules/parking/spaces/application/service/ParkingSpaceService.java \
               src/main/java/com/parkflow/modules/configuration/application/service/PrepaidService.java \
               src/main/java/com/parkflow/modules/onboarding/application/service/OnboardingService.java \
               src/main/java/com/parkflow/modules/licensing/application/service/PlanService.java \
               src/main/java/com/parkflow/modules/billing/application/service/InvoiceService.java \
               src/main/java/com/parkflow/modules/tickets/application/service/PrintJobService.java \
               src/main/java/com/parkflow/modules/configuration/application/service/ThemeConfigurationManagementService.java \
               src/main/java/com/parkflow/modules/parking/locker/application/service/LockerService.java \
               src/main/java/com/parkflow/modules/support/application/service/TicketService.java \
               src/main/java/com/parkflow/modules/settings/application/service/SettingsUserService.java \
               src/main/java/com/parkflow/modules/settings/application/service/SettingsRateService.java \
               src/main/java/com/parkflow/modules/customers/application/service/CustomerService.java \
               src/main/java/com/parkflow/modules/onboarding/application/service/OnboardingMaterializationService.java \
               src/main/java/com/parkflow/modules/configuration/application/service/AgreementService.java; do
    
    if [ -f "$service" ]; then
        methods=$(grep -c "^\s*public [^ ]* [^ ]*(" "$service" 2>/dev/null || echo "0")
        sname=$(basename "$service")
        ((count++))
        
        if [ "$methods" -gt 5 ]; then
            echo "❌ $sname - $methods methods (NON-COMPLIANT)"
            ((services_over_5++))
        else
            echo "✅ $sname - $methods methods (OK)"
        fi
    fi
done

echo ""
echo "=== SUMMARY ==="
echo "Scanned: $count services"
echo "Non-compliant (>5 methods): $services_over_5"
echo "Compliant (≤5 methods): $((count - services_over_5))"
echo ""

if [ "$services_over_5" -eq 0 ]; then
    echo "✅ ALL SERVICES COMPLIANT - REFACTORING COMPLETE"
else
    echo "⚠️  $services_over_5 services still need refactoring"
fi
