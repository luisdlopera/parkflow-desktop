package com.parkflow.modules.common.outbox.infrastructure.messaging;

import com.parkflow.modules.common.outbox.domain.MessagePublisherPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Fallback in-memory publisher when SQS is disabled (default in dev/test).
 */
@Component
@ConditionalOnProperty(name = "aws.sqs.enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryMessagePublisherAdapter implements MessagePublisherPort {

    private static final Logger log = LoggerFactory.getLogger(InMemoryMessagePublisherAdapter.class);

    public InMemoryMessagePublisherAdapter() {
        log.info("Initialized InMemoryMessagePublisherAdapter (SQS disabled)");
    }

    @Override
    public void publish(String topic, String message) {
        log.debug("Simulating publish to topic '{}': {}", topic, message);
    }
}
