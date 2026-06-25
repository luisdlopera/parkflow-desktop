import os
import glob
import re

files = glob.glob('/Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/test/java/com/parkflow/modules/parking/operation/application/service/RegisterEntry*.java')

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    # Fix RegisterEntryService constructor
    if "SimpleMeterRegistry()" in new_content:
        new_content = new_content.replace(
            "new io.micrometer.core.instrument.simple.SimpleMeterRegistry());",
            "new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), org.mockito.Mockito.mock(com.parkflow.modules.settings.domain.repository.ParkingParametersPort.class), org.mockito.Mockito.mock(com.parkflow.modules.support.domain.provider.MessagingProvider.class));"
        )
    
    # Fix EntryRequest constructor with 20 args to 22 args
    new_content = new_content.replace(
        ", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);",
        ", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);"
    )

    # Fix EntryRequest constructor with 21 args to 22 args
    new_content = new_content.replace(
        "List.of(new CustodiedItemRequest(\"LOCKER-01\", null, null)));",
        "List.of(new CustodiedItemRequest(\"LOCKER-01\", null, null)), null);"
    )
    new_content = new_content.replace(
        "List.of(new CustodiedItemRequest(\"LOCKER-01\", \"Negro\", null)));",
        "List.of(new CustodiedItemRequest(\"LOCKER-01\", \"Negro\", null)), null);"
    )

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
