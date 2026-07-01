package com.parkflow.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method or class as explicitly exempt from the canonical
 * {@link ApiResponse} envelope applied by {@link ApiResponseWrapperAdvice}.
 *
 * <p>Use this annotation <strong>only</strong> when the endpoint must comply with a
 * third-party protocol that dictates its own response format (e.g. webhooks from
 * Meta WhatsApp, payment provider callbacks, or binary file downloads).
 *
 * <p>Every usage of this annotation must provide a {@link #reason()} explaining why
 * the endpoint is exempt — this creates an auditable record of intentional exceptions
 * to the global API contract.
 *
 * <h3>Usage</h3>
 * <pre>
 * &#064;GetMapping("/webhooks/whatsapp")
 * &#064;RawResponse(reason = "Meta webhook verification requires a plain-text challenge string")
 * public ResponseEntity&lt;String&gt; verifyWebhook(...) { ... }
 * </pre>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RawResponse {

    /**
     * Mandatory reason explaining why this endpoint bypasses the canonical envelope.
     * Required to prevent accidental or undocumented exemptions.
     */
    String reason() default "";
}
