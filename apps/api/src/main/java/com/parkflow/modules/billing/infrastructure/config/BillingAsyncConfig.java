package com.parkflow.modules.billing.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async configuration for invoice generation.
 * Invoices are sent to providers asynchronously to avoid blocking parking session closure.
 */
@Configuration
@EnableAsync
public class BillingAsyncConfig {

  @Bean(name = "billingExecutor")
  public Executor billingExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(15);
    executor.setQueueCapacity(200);
    executor.setThreadNamePrefix("billing-async-");
    executor.setWaitForTasksToCompleteOnShutdown(true);
    executor.setAwaitTerminationSeconds(30);
    executor.initialize();
    return executor;
  }
}
