import os
import re

# 1. Fix trailing spaces in CashMovementRepository.java
repo_file = '/Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/main/java/com/parkflow/modules/cash/repository/CashMovementRepository.java'
with open(repo_file, 'r') as f:
    lines = f.readlines()
with open(repo_file, 'w') as f:
    for line in lines:
        if line.endswith(' \n'):
            f.write(line.rstrip() + '\n')
        else:
            f.write(line)

# 2. Add SuppressWarnings to files with serial and rawtypes warnings, and test files with deprecation
files_to_suppress = [
    # serial
    'src/main/java/com/parkflow/modules/common/exception/OperationException.java',
    'src/main/java/com/parkflow/modules/cash/domain/CashFeSequenceCounter.java',
    'src/main/java/com/parkflow/modules/cash/domain/CashFeSequencePk.java',
    'src/main/java/com/parkflow/modules/cash/domain/exception/CashSessionException.java',
    'src/main/java/com/parkflow/modules/common/exception/ResourceNotFoundException.java',
    'src/main/java/com/parkflow/modules/common/exception/domain/DomainException.java',
    'src/main/java/com/parkflow/modules/common/exception/domain/EntityNotFoundException.java',
    'src/main/java/com/parkflow/modules/common/exception/domain/BusinessValidationException.java',
    'src/main/java/com/parkflow/modules/common/exception/domain/ConcurrentOperationException.java',
    'src/main/java/com/parkflow/modules/billing/application/service/InvoiceProviderResolver.java',
    'src/main/java/com/parkflow/modules/billing/infrastructure/security/EncryptionService.java',
    'src/main/java/com/parkflow/modules/billing/application/service/InvoiceService.java',
    'src/main/java/com/parkflow/modules/billing/infrastructure/providers/alegra/AlegraClient.java',
    'src/main/java/com/parkflow/modules/billing/infrastructure/events/PaymentCompletedEvent.java',
    
    # deprecation in tests
    'src/test/java/com/parkflow/modules/configuration/application/service/AgreementServiceTest.java',
    'src/test/java/com/parkflow/modules/configuration/application/service/FeatureConfigurationServiceImplTest.java',
    'src/test/java/com/parkflow/modules/configuration/application/service/MonthlyContractServiceTest.java',
    'src/test/java/com/parkflow/modules/configuration/application/service/PrepaidServiceTest.java'
]

base_dir = '/Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api'

for rel_path in files_to_suppress:
    filepath = os.path.join(base_dir, rel_path)
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    if '@SuppressWarnings' in content:
        continue
        
    # Find the class definition line. Can be 'class ...' or 'public class ...'
    match = re.search(r'^(?:@\w+(?:\([^)]*\))?\s*)*(?:public\s+)?(?:final\s+)?(?:abstract\s+)?(?:class|interface)\s+\w+', content, flags=re.MULTILINE)
    if match:
        class_decl = match.group(0)
        new_class_decl = '@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})\n' + class_decl
        new_content = content.replace(class_decl, new_class_decl, 1)
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Added SuppressWarnings to {rel_path}")

