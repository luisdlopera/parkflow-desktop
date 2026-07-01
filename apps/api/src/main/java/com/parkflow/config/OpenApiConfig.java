package com.parkflow.config;

import io.swagger.v3.oas.models.media.Schema;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenApiCustomizer apiResponseWrapperCustomizer() {
        return openApi -> {
            openApi.getPaths().values().forEach(pathItem -> pathItem.readOperations().forEach(operation -> {
                operation.getResponses().forEach((status, apiResponse) -> {
                    if (apiResponse.getContent() != null) {
                        apiResponse.getContent().values().forEach(mediaType -> {
                            Schema<?> originalSchema = mediaType.getSchema();
                            if (originalSchema != null && !"ApiResponse".equals(originalSchema.getName())) {
                                Schema<?> wrapperSchema = new Schema<>();
                                wrapperSchema.setName("ApiResponse");
                                wrapperSchema.addProperty("success", new Schema<>().type("boolean"));
                                wrapperSchema.addProperty("status", new Schema<>().type("integer"));
                                wrapperSchema.addProperty("message", new Schema<>().type("string"));
                                wrapperSchema.addProperty("code", new Schema<>().type("string"));
                                wrapperSchema.addProperty("data", originalSchema);
                                mediaType.setSchema(wrapperSchema);
                            }
                        });
                    }
                });
            }));
        };
    }
}
