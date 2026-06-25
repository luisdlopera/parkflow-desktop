import os
import glob

replacements = {
    "com.parkflow.modules.audit.service.AuditService": "com.parkflow.modules.audit.application.service.AuditService",
    "com.parkflow.modules.cash.service.CashDomainAuditService": "com.parkflow.modules.cash.application.service.CashDomainAuditService",
    "com.parkflow.modules.cash.service.CashPolicyResolver": "com.parkflow.modules.cash.application.service.CashPolicyResolver",
    "com.parkflow.modules.cash.service.CashSequentialSupportService": "com.parkflow.modules.cash.application.service.CashSequentialSupportService",
    "com.parkflow.modules.cash.service.CashClosingOutboundNotifier": "com.parkflow.modules.cash.application.service.CashClosingOutboundNotifier",
    "com.parkflow.modules.cash.service.CashAutoCloseScheduler": "com.parkflow.modules.cash.application.service.CashAutoCloseScheduler",
    "com.parkflow.modules.parking.locker.service.LockerService": "com.parkflow.modules.parking.locker.application.service.LockerService",
    "com.parkflow.modules.parking.spaces.service.ParkingSpaceService": "com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService",
    "com.parkflow.modules.configuration.service.AgreementService": "com.parkflow.modules.configuration.application.service.AgreementService",
    "com.parkflow.modules.configuration.service.MonthlyContractService": "com.parkflow.modules.configuration.application.service.MonthlyContractService",
    "com.parkflow.modules.configuration.service.OperationalConfigurationService": "com.parkflow.modules.configuration.application.service.OperationalConfigurationService",
    "com.parkflow.modules.configuration.service.PrepaidService": "com.parkflow.modules.configuration.application.service.PrepaidService",
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
        
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('/Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/test/java'):
    for file in files:
        if file.endswith('.java'):
            process_file(os.path.join(root, file))
