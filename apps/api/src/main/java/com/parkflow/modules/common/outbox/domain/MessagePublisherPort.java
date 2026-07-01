package com.parkflow.modules.common.outbox.domain;

/**
 * Port for publishing messages to an external message broker (e.g. SQS, RabbitMQ).
 */
public interface MessagePublisherPort {
    /**
     * Publishes a message to the specified topic/queue.
     * @param topic Destination topic or queue name.
     * @param message The serialized message payload (JSON).
     */
    void publish(String topic, String message);
}
