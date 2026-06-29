package com.parkflow.modules.communication.domain.repository;

import com.parkflow.modules.communication.domain.CommunicationSettings;
import com.parkflow.modules.communication.domain.enums.ChannelType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunicationSettingsPort {
    Optional<CommunicationSettings> findByCompanyIdAndChannel(UUID companyId, ChannelType channel);
    List<CommunicationSettings> findByCompanyId(UUID companyId);
    CommunicationSettings save(CommunicationSettings settings);
}
