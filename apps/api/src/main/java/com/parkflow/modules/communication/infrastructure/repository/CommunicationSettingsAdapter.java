package com.parkflow.modules.communication.infrastructure.repository;

import com.parkflow.modules.communication.domain.CommunicationSettings;
import com.parkflow.modules.communication.domain.enums.ChannelType;
import com.parkflow.modules.communication.domain.repository.CommunicationSettingsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CommunicationSettingsAdapter implements CommunicationSettingsPort {

    private final CommunicationSettingsJpaRepository repository;

    @Override
    public Optional<CommunicationSettings> findByCompanyIdAndChannel(UUID companyId, ChannelType channel) {
        return repository.findByCompanyIdAndChannel(companyId, channel);
    }

    @Override
    public List<CommunicationSettings> findByCompanyId(UUID companyId) {
        return repository.findByCompanyId(companyId);
    }

    @Override
    public CommunicationSettings save(CommunicationSettings settings) {
        return repository.save(settings);
    }
}
