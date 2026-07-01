package com.parkflow.modules.common.outbox.infrastructure.messaging;

import com.parkflow.modules.common.outbox.domain.MessagePublisherPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * SQS adapter for message publishing.
 * Enabled only when aws.sqs.enabled=true to avoid breaking local/test environments
 * without AWS credentials.
 */
@Component
@ConditionalOnProperty(name = "aws.sqs.enabled", havingValue = "true")
public class SqsMessagePublisherAdapter implements MessagePublisherPort {

    private static final Logger log = LoggerFactory.getLogger(SqsMessagePublisherAdapter.class);

    // In a full implementation, you would inject software.amazon.awssdk.services.sqs.SqsClient
    // or io.awspring.cloud.sqs.operations.SqsTemplate here.
    // private final SqsTemplate sqsTemplate;

    public SqsMessagePublisherAdapter() {
        log.info("Initialized SqsMessagePublisherAdapter for SQS message brokering");
    }

    @Override
    public void publish(String topic, String message) {
        log.info("Publishing message to SQS queue '{}': {}", topic, message);
        // sqsTemplate.send(topic, message);
    }
}
