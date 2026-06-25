package com.parkflow.modules.support.application.service;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.domain.Conversation;
import com.parkflow.modules.support.domain.Message;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.Channel;
import com.parkflow.modules.support.domain.enums.SenderType;
import com.parkflow.modules.support.domain.enums.TicketCategory;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import com.parkflow.modules.support.domain.repository.ConversationRepository;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import com.parkflow.modules.support.domain.provider.MessagingProvider;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppMessageProcessor {

    private final TicketService ticketService;
    private final TicketRepository ticketRepository;
    private final ConversationRepository conversationRepository;
    private final MessagingProvider messagingProvider;

    @Transactional
    public void processIncomingMessage(String phoneNumber, String content, UUID tenantId) {
        log.info("Processing incoming WhatsApp message from {}", phoneNumber);
        
        // In a real scenario, we'd lookup the customer by phone number and tenantId.
        // For now, we mock a customer ID.
        UUID customerId = UUID.nameUUIDFromBytes(phoneNumber.getBytes());

        // Find active ticket for this customer
        List<Ticket> openTickets = ticketRepository.findByCustomerIdAndStatus(customerId, TicketStatus.OPEN);
        if (openTickets.isEmpty()) {
            openTickets = ticketRepository.findByCustomerIdAndStatus(customerId, TicketStatus.IN_PROGRESS);
        }

        Ticket ticket;
        Conversation conversation;

        if (openTickets.isEmpty()) {
            // Create a new ticket
            CreateTicketRequest request = new CreateTicketRequest(
                    "New WhatsApp Support Request",
                    content,
                    TicketPriority.MEDIUM,
                    TicketCategory.OTHER,
                    Channel.WHATSAPP,
                    customerId,
                    tenantId
            );
            ticket = ticketService.createTicket(request);
            
            conversation = new Conversation();
            conversation.setTicket(ticket);
            conversation.setChannel(Channel.WHATSAPP);
            conversation.setTenantId(tenantId);
            conversation = conversationRepository.save(conversation);
            
            // Send auto-reply
            messagingProvider.sendMessage(phoneNumber, "Thank you for contacting ParkFlow Support. Your ticket number is " + ticket.getTicketNumber());
        } else {
            ticket = openTickets.get(0);
            Optional<Conversation> convOpt = conversationRepository.findByTicketId(ticket.getId());
            if (convOpt.isEmpty()) {
                conversation = new Conversation();
                conversation.setTicket(ticket);
                conversation.setChannel(Channel.WHATSAPP);
                conversation.setTenantId(tenantId);
                conversation = conversationRepository.save(conversation);
            } else {
                conversation = convOpt.get();
            }
        }

        // Add message to conversation
        // In reality, we'd have a MessageRepository to save this, adding it here for completeness
        Message message = new Message();
        message.setConversation(conversation);
        message.setSenderType(SenderType.CUSTOMER);
        message.setContent(content);
        message.setTenantId(tenantId);
        
        log.info("Message processed and attached to ticket {}", ticket.getTicketNumber());
    }
}
