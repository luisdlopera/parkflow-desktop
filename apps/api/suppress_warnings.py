import os
import re

files_to_suppress = [
    "src/main/java/com/parkflow/modules/configuration/controller/ConfigurationMonthlyContractController.java",
    "src/main/java/com/parkflow/modules/configuration/controller/ConfigurationAgreementController.java",
    "src/main/java/com/parkflow/modules/configuration/controller/ConfigurationPrepaidController.java",
    "src/main/java/com/parkflow/modules/configuration/application/service/ConfigurationSyncService.java",
    "src/main/java/com/parkflow/modules/configuration/application/service/BillingManagementFacadeService.java",
    "src/main/java/com/parkflow/modules/configuration/application/service/SettingsManagementFacadeService.java",
    "src/main/java/com/parkflow/modules/configuration/application/service/CompanyConfigurationFacadeService.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/AgreementServiceTest.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/FeatureConfigurationServiceImplTest.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/MonthlyContractServiceTest.java",
    # additional tests with deprecation:
    "src/test/java/com/parkflow/modules/configuration/application/service/CapacityManagementServiceImplTest.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/RegionConfigurationServiceImplTest.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/ModuleConfigurationServiceImplTest.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/ShiftConfigurationServiceImplTest.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/HelmetHandlingServiceImplTest.java",
    "src/test/java/com/parkflow/modules/configuration/application/service/PrepaidServiceTest.java",
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
        
    # Find the class definition line. Can be 'public class ...'
    # We will insert the annotation right before the class declaration.
    match = re.search(r'^(?:@\w+(?:\([^)]*\))?\s*)*public\s+(?:final\s+)?class\s+\w+', content, flags=re.MULTILINE)
    if match:
        class_decl = match.group(0)
        # Find the first annotation or 'public'
        first_token_match = re.search(r'^(@|public)', class_decl)
        if first_token_match:
            new_class_decl = '@SuppressWarnings({"deprecation", "unchecked", "removal"})\n' + class_decl
            new_content = content.replace(class_decl, new_class_decl)
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Added SuppressWarnings to {rel_path}")

