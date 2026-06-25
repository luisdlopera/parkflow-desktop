package com.parkflow.modules.support.domain.repository;

import com.parkflow.modules.support.domain.Conversation;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository {

    Conversation save(Conversation conversation);

    Optional<Conversation> findById(UUID id);

    Optional<Conversation> findByTicketId(UUID ticketId);
}
