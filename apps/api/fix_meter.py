import os
import glob

files = glob.glob('/Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/test/java/com/parkflow/modules/parking/operation/application/service/*.java')

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    
    # Replace "new SimpleMeterRegistry());"
    new_content = new_content.replace(
        "new SimpleMeterRegistry());",
        "new SimpleMeterRegistry(), org.mockito.Mockito.mock(com.parkflow.modules.settings.domain.repository.ParkingParametersPort.class), org.mockito.Mockito.mock(com.parkflow.modules.support.domain.provider.MessagingProvider.class));"
    )
    
    # Replace the fully qualified one
    new_content = new_content.replace(
        "new io.micrometer.core.instrument.simple.SimpleMeterRegistry());",
        "new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), org.mockito.Mockito.mock(com.parkflow.modules.settings.domain.repository.ParkingParametersPort.class), org.mockito.Mockito.mock(com.parkflow.modules.support.domain.provider.MessagingProvider.class));"
    )

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
