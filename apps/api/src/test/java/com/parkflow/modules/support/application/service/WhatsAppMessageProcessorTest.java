package com.parkflow.modules.support.application.service;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.domain.Conversation;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import com.parkflow.modules.support.domain.provider.MessagingProvider;
import com.parkflow.modules.support.domain.repository.ConversationRepository;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppMessageProcessorTest {

    @Mock
    private TicketService ticketService;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessagingProvider messagingProvider;

    @InjectMocks
    private WhatsAppMessageProcessor processor;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
    }

    @Test
    void processIncomingMessage_noOpenTicket_createsNewTicketAndConversation() {
        String phoneNumber = "1234567890";
        UUID customerId = UUID.nameUUIDFromBytes(phoneNumber.getBytes());

        when(ticketRepository.findByCustomerIdAndStatus(customerId, TicketStatus.OPEN)).thenReturn(Collections.emptyList());
        when(ticketRepository.findByCustomerIdAndStatus(customerId, TicketStatus.IN_PROGRESS)).thenReturn(Collections.emptyList());

        Ticket ticket = new Ticket();
        ticket.setId(UUID.randomUUID());
        ticket.setTicketNumber("TK-TEST1234");
        when(ticketService.createTicket(any(CreateTicketRequest.class))).thenReturn(ticket);

        Conversation conv = new Conversation();
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conv);

        processor.processIncomingMessage(phoneNumber, "Hello", tenantId);

        verify(ticketService).createTicket(any(CreateTicketRequest.class));
        verify(conversationRepository).save(any(Conversation.class));
        verify(messagingProvider).sendMessage(eq(phoneNumber), contains("TK-TEST1234"));
    }

    @Test
    void processIncomingMessage_existingOpenTicket_addsToConversation() {
        String phoneNumber = "1234567890";
        UUID customerId = UUID.nameUUIDFromBytes(phoneNumber.getBytes());

        Ticket ticket = new Ticket();
        ticket.setId(UUID.randomUUID());

        Conversation conv = new Conversation();
        conv.setId(UUID.randomUUID());

        when(ticketRepository.findByCustomerIdAndStatus(customerId, TicketStatus.OPEN)).thenReturn(List.of(ticket));
        when(conversationRepository.findByTicketId(ticket.getId())).thenReturn(Optional.of(conv));

        processor.processIncomingMessage(phoneNumber, "Hello again", tenantId);

        verifyNoInteractions(ticketService);
        verify(conversationRepository, never()).save(any(Conversation.class)); // Only searches, doesn't create a new one
    }

    @Test
    void processIncomingMessage_existingOpenTicketButNoConversation_createsConversation() {
        String phoneNumber = "1234567890";
        UUID customerId = UUID.nameUUIDFromBytes(phoneNumber.getBytes());

        Ticket ticket = new Ticket();
        ticket.setId(UUID.randomUUID());

        Conversation conv = new Conversation();
        conv.setId(UUID.randomUUID());

        when(ticketRepository.findByCustomerIdAndStatus(customerId, TicketStatus.OPEN)).thenReturn(List.of(ticket));
        when(conversationRepository.findByTicketId(ticket.getId())).thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conv);

        processor.processIncomingMessage(phoneNumber, "Hello again", tenantId);

        verifyNoInteractions(ticketService);
        verify(conversationRepository).save(any(Conversation.class));
    }
}
