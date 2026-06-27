package com.parkflow.modules.support.infrastructure.persistence;

import com.parkflow.modules.support.domain.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationJpaRepository extends JpaRepository<Conversation, UUID> {
    Optional<Conversation> findByTicketId(UUID ticketId);
}