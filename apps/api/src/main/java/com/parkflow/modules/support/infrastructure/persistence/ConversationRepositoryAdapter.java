package com.parkflow.modules.support.infrastructure.persistence;

import com.parkflow.modules.support.application.port.out.ConversationRepositoryPort;
import com.parkflow.modules.support.domain.repository.ConversationRepository;
import com.parkflow.modules.support.domain.Conversation;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ConversationRepositoryAdapter implements ConversationRepositoryPort, ConversationRepository {

    private final ConversationJpaRepository jpaRepository;

    @Override
    public Conversation save(Conversation conversation) {
        return jpaRepository.save(conversation);
    }

    @Override
    public Optional<Conversation> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<Conversation> findByTicketId(UUID ticketId) {
        return jpaRepository.findByTicketId(ticketId);
    }
}