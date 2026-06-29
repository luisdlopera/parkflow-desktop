package com.parkflow.modules.communication.application.usecase;

import com.parkflow.modules.communication.domain.CommunicationSettings;
import com.parkflow.modules.communication.domain.enums.ChannelType;
import com.parkflow.modules.communication.domain.repository.CommunicationSettingsPort;
import com.parkflow.modules.communication.infrastructure.security.EncryptionService;
import com.parkflow.modules.communication.infrastructure.dto.EmailSettingsDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ManageCommunicationSettingsUseCaseTest {

    @Mock
    private CommunicationSettingsPort port;

    @Mock
    private EncryptionService encryptionService;

    @InjectMocks
    private ManageCommunicationSettingsUseCase useCase;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldPreserveExistingPasswordIfNewPasswordIsEmpty() {
        UUID companyId = UUID.randomUUID();
        
        CommunicationSettings existingSettings = new CommunicationSettings();
        existingSettings.setCompanyId(companyId);
        existingSettings.setChannel(ChannelType.EMAIL);
        existingSettings.setPasswordEncrypted("encrypted-old-pass");
        
        when(port.findByCompanyIdAndChannel(companyId, ChannelType.EMAIL)).thenReturn(Optional.of(existingSettings));
        when(port.save(any())).thenAnswer(i -> i.getArguments()[0]);

        EmailSettingsDto request = new EmailSettingsDto();
        request.setEnabled(true);
        request.setPassword(""); // Empty password should not overwrite
        
        useCase.saveEmailSettings(companyId, request);
        
        verify(port).save(argThat(settings -> 
            "encrypted-old-pass".equals(settings.getPasswordEncrypted())
        ));
        verify(encryptionService, never()).encrypt(anyString());
    }

    @Test
    void shouldEncryptNewPasswordIfProvided() {
        UUID companyId = UUID.randomUUID();
        
        CommunicationSettings existingSettings = new CommunicationSettings();
        existingSettings.setCompanyId(companyId);
        existingSettings.setChannel(ChannelType.EMAIL);
        
        when(port.findByCompanyIdAndChannel(companyId, ChannelType.EMAIL)).thenReturn(Optional.of(existingSettings));
        when(encryptionService.encrypt("new-pass")).thenReturn("encrypted-new-pass");
        when(port.save(any())).thenAnswer(i -> i.getArguments()[0]);

        EmailSettingsDto request = new EmailSettingsDto();
        request.setEnabled(true);
        request.setPassword("new-pass"); 
        
        useCase.saveEmailSettings(companyId, request);
        
        verify(port).save(argThat(settings -> 
            "encrypted-new-pass".equals(settings.getPasswordEncrypted())
        ));
    }
}
