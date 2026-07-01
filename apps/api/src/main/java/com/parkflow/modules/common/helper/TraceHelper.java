package com.parkflow.modules.common.helper;

import org.slf4j.MDC;
import static com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY;
import java.util.UUID;

public final class TraceHelper {

    private TraceHelper() {}

    public static String getTraceId() {
        String traceId = MDC.get(CORRELATION_ID_MDC_KEY);
        if (traceId == null || traceId.isBlank()) {
            return UUID.randomUUID().toString();
        }
        return traceId;
    }
}
