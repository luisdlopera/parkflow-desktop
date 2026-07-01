package com.parkflow.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.dto.ApiResponse;
import com.parkflow.modules.common.interceptor.DeprecatedApiInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;
import java.util.List;
import java.util.ListIterator;

/**
 * Spring MVC configuration.
 *
 * <p><strong>Critical Fix #2 — String Bypass Elimination:</strong>
 * By default, Spring Boot registers {@link StringHttpMessageConverter} before
 * {@link MappingJackson2HttpMessageConverter}. When a {@code @RestController}
 * method returns a {@code String}, Spring selects {@code StringHttpMessageConverter}
 * and the body is serialized as a raw string <em>before</em> {@code ApiResponseWrapperAdvice}
 * has a chance to wrap it — causing a {@link ClassCastException} if the advice tries to wrap it.
 *
 * <p>To fix this without a static bypass in the advice, we relocate
 * {@link StringHttpMessageConverter} to the <em>end</em> of the converter list
 * (after Jackson). This means Jackson handles {@code String} returns by serializing
 * them as quoted JSON strings inside the envelope — which is the correct behavior.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final DeprecatedApiInterceptor deprecatedApiInterceptor;
    private final ObjectMapper objectMapper;

    public WebMvcConfig(DeprecatedApiInterceptor deprecatedApiInterceptor, ObjectMapper objectMapper) {
        this.deprecatedApiInterceptor = deprecatedApiInterceptor;
        this.objectMapper = objectMapper;
    }

    @Value("${app.uploads.dir:uploads}")
    private String uploadsDir;

    @Value("${app.uploads.base-url:/uploads}")
    private String uploadsBaseUrl;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absoluteDir = Paths.get(uploadsDir).toAbsolutePath().normalize().toString();
        registry.addResourceHandler(uploadsBaseUrl + "/**")
            .addResourceLocations("file:" + absoluteDir + "/");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(deprecatedApiInterceptor);
    }

    /**
     * Reorders message converters so that Jackson ({@link MappingJackson2HttpMessageConverter})
     * takes precedence over {@link StringHttpMessageConverter}.
     *
     * <p>This eliminates the need for the {@code if (body instanceof String) return body;} bypass
     * in {@code ApiResponseWrapperAdvice}, allowing all String-returning endpoints to be
     * properly wrapped in the canonical {@link ApiResponse} envelope.
     */
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // Add the project's Jackson converter first — this ensures it wins for String returns
        converters.add(0, new MappingJackson2HttpMessageConverter(objectMapper));
    }

    /**
     * Moves any existing {@link StringHttpMessageConverter} to the end of the list
     * after Spring's default converters have been added via {@link #configureMessageConverters}.
     */
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        StringHttpMessageConverter stringConverter = null;
        ListIterator<HttpMessageConverter<?>> it = converters.listIterator();
        while (it.hasNext()) {
            HttpMessageConverter<?> converter = it.next();
            if (converter instanceof StringHttpMessageConverter) {
                stringConverter = (StringHttpMessageConverter) converter;
                it.remove();
            }
        }
        if (stringConverter != null) {
            converters.add(stringConverter); // move to end
        }
    }
}
