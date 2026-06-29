package com.parkflow.modules.communication.infrastructure.service;

import com.parkflow.modules.communication.domain.enums.ChannelType;
import com.parkflow.modules.communication.domain.enums.ProviderType;
import com.parkflow.modules.communication.domain.CommunicationSettings;
import com.parkflow.modules.communication.domain.repository.CommunicationSettingsPort;
import com.parkflow.modules.communication.infrastructure.security.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Properties;
import java.util.UUID;

import jakarta.mail.Session;
import jakarta.mail.Transport;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommunicationConnectionService {

    private final CommunicationSettingsPort port;
    private final EncryptionService encryptionService;

    public void testConnection(UUID companyId, ChannelType channel) {
        CommunicationSettings settings = port.findByCompanyIdAndChannel(companyId, channel)
                .orElseThrow(() -> new RuntimeException("Configuración no encontrada para el canal: " + channel));

        if (!settings.isEnabled()) {
            throw new RuntimeException("El canal " + channel + " está deshabilitado.");
        }

        if (channel == ChannelType.EMAIL) {
            testEmailConnection(settings);
        } else {
            // Stub for SMS and Bulk Email
            log.info("Test de conexión para {} simulado exitosamente.", channel);
        }
    }

    private void testEmailConnection(CommunicationSettings settings) {
        if (settings.getProvider() != ProviderType.SMTP) {
            log.info("Conexión simulada para proveedor: {}", settings.getProvider());
            return;
        }

        try {
            Properties props = new Properties();
            props.put("mail.smtp.host", settings.getHost());
            props.put("mail.smtp.port", settings.getPort());
            props.put("mail.smtp.auth", "true");
            
            if (settings.getSecurityMode() != null) {
                if (settings.getSecurityMode().name().equals("TLS")) {
                    props.put("mail.smtp.starttls.enable", "true");
                } else if (settings.getSecurityMode().name().equals("SSL")) {
                    props.put("mail.smtp.ssl.enable", "true");
                }
            }

            Session session = Session.getInstance(props, null);
            Transport transport = session.getTransport("smtp");
            
            String pass = settings.getPasswordEncrypted() != null ? 
                encryptionService.decrypt(settings.getPasswordEncrypted()) : "";

            transport.connect(settings.getHost(), settings.getUsername(), pass);
            transport.close();
            log.info("Conexión SMTP exitosa al host: {}", settings.getHost());
        } catch (Exception e) {
            log.error("Fallo la conexión SMTP: {}", e.getMessage());
            throw new RuntimeException("Error conectando al servidor de correo: " + e.getMessage());
        }
    }
}
