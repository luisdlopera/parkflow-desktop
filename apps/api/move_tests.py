import os
import shutil

moves = [
    ("configuration/service/AgreementServiceTest.java", "configuration/application/service/AgreementServiceTest.java"),
    ("configuration/service/MonthlyContractServiceTest.java", "configuration/application/service/MonthlyContractServiceTest.java"),
    ("configuration/service/OperationalConfigurationServiceTest.java", "configuration/application/service/OperationalConfigurationServiceTest.java"),
    ("configuration/service/PrepaidServiceTest.java", "configuration/application/service/PrepaidServiceTest.java"),
    ("cash/service/CashAutoCloseSchedulerTest.java", "cash/application/service/CashAutoCloseSchedulerTest.java"),
    ("cash/service/CashClosingOutboundNotifierTest.java", "cash/application/service/CashClosingOutboundNotifierTest.java"),
    ("cash/service/CashSequentialSupportServiceTest.java", "cash/application/service/CashSequentialSupportServiceTest.java"),
    ("audit/service/AuditServiceTest.java", "audit/application/service/AuditServiceTest.java"),
    ("parking/spaces/service/ParkingSpaceServiceTest.java", "parking/spaces/application/service/ParkingSpaceServiceTest.java"),
    ("parking/locker/service/LockerServiceTest.java", "parking/locker/application/service/LockerServiceTest.java")
]

base_dir = "/Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/test/java/com/parkflow/modules"

for old_path, new_path in moves:
    full_old = os.path.join(base_dir, old_path)
    full_new = os.path.join(base_dir, new_path)
    
    os.makedirs(os.path.dirname(full_new), exist_ok=True)
    
    if os.path.exists(full_old):
        with open(full_old, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('package '):
                lines[i] = line.replace('.service;', '.application.service;')
                break
                
        content = '\n'.join(lines)
        
        with open(full_new, 'w') as f:
            f.write(content)
            
        os.remove(full_old)
        print(f"Moved and updated {old_path} -> {new_path}")
    else:
        print(f"Not found: {full_old}")
