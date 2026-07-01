package com.parkflow.modules.common.dto;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ApiResponseTest {

    @Test
    void shouldCreateSuccessResponse() {
        ApiResponse<String> response = ApiResponse.success("Data", "/api/test", "trace-123");
        
        assertTrue(response.success());
        assertEquals("Data", response.data());
        assertEquals("Operacion realizada correctamente", response.message());
        assertNotNull(response.meta());
        assertEquals("/api/test", response.meta().path());
        assertEquals("trace-123", response.meta().requestId());
        assertNull(response.error());
    }

    @Test
    void shouldCreateErrorResponse() {
        ApiResponse<Void> response = ApiResponse.error("Bad Request", "ERR_01", "/api/test", "trace-123", Map.of("detail", "value"));
        
        assertFalse(response.success());
        assertNull(response.data());
        assertEquals("Bad Request", response.message());
        assertNotNull(response.meta());
        assertEquals("/api/test", response.meta().path());
        assertEquals("trace-123", response.meta().requestId());
        
        assertNotNull(response.error());
        assertEquals("ERR_01", response.error().code());
        assertEquals("Bad Request", response.error().message());
        assertEquals("value", response.error().details().get("detail"));
        assertEquals("trace-123", response.error().traceId());
    }
}
