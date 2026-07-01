package com.parkflow.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.core.task.TaskDecorator;
import com.parkflow.modules.auth.security.TenantContext;
import java.util.UUID;

@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

  private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

  @Bean
  public TaskDecorator tenantContextTaskDecorator() {
    return runnable -> {
      UUID tenantId = TenantContext.getTenantId();
      return () -> {
        try {
          if (tenantId != null) {
            TenantContext.setTenantId(tenantId);
          }
          runnable.run();
        } finally {
          TenantContext.clear();
        }
      };
    };
  }

  /**
   * Bounded executor for async audit tasks.
   *
   * <p>Uses AbortPolicy (not CallerRunsPolicy) so queue saturation raises a metric alert instead
   * of blocking the HTTP request thread and causing cascading timeouts. Monitor
   * parkflow.executor.rejected{executor=audit} to detect sustained backpressure.
   */
  @Bean(name = "auditExecutor")
  public Executor auditExecutor(MeterRegistry meterRegistry) {
    Counter rejected = Counter.builder("parkflow.executor.rejected")
        .tag("executor", "audit")
        .description("Audit tasks rejected due to full queue")
        .register(meterRegistry);

    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(4);
    executor.setMaxPoolSize(16);
    executor.setQueueCapacity(500);
    executor.setThreadNamePrefix("audit-");
    executor.setTaskDecorator(tenantContextTaskDecorator());
    executor.setRejectedExecutionHandler((runnable, pool) -> {
      rejected.increment();
      log.error("AUDIT_EXECUTOR_FULL: audit task rejected (queue={}, active={}). " +
          "Alert: parkflow.executor.rejected[executor=audit] > 0",
          pool.getQueue().size(), pool.getActiveCount());
      throw new RejectedExecutionException("Audit executor queue full — task dropped");
    });
    executor.initialize();
    return executor;
  }

  /**
   * Bounded executor for print-job side-effects triggered by session events.
   */
  @Bean(name = "printExecutor")
  public Executor printExecutor(MeterRegistry meterRegistry) {
    Counter rejected = Counter.builder("parkflow.executor.rejected")
        .tag("executor", "print")
        .description("Print tasks rejected due to full queue")
        .register(meterRegistry);

    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(8);
    executor.setQueueCapacity(200);
    executor.setThreadNamePrefix("print-");
    executor.setTaskDecorator(tenantContextTaskDecorator());
    executor.setRejectedExecutionHandler((runnable, pool) -> {
      rejected.increment();
      log.error("PRINT_EXECUTOR_FULL: print task rejected (queue={}, active={}). " +
          "Alert: parkflow.executor.rejected[executor=print] > 0",
          pool.getQueue().size(), pool.getActiveCount());
      throw new RejectedExecutionException("Print executor queue full — task dropped");
    });
    executor.initialize();
    return executor;
  }
}
