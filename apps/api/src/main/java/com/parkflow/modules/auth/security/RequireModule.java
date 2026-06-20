package com.parkflow.modules.auth.security;

import com.parkflow.modules.licensing.enums.ModuleType;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to enforce that the current tenant (company) has a specific module enabled.
 * If multiple modules are specified, by default ANY of them being active grants access (Logical OR).
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireModule {
  
  /**
   * Los módulos requeridos para acceder al endpoint.
   */
  ModuleType[] value();
  
  /**
   * Si es true, se requiere que TODOS los módulos especificados estén activos (AND logico).
   * Si es false, basta con que UNO de ellos esté activo (OR logico).
   */
  boolean requireAll() default false;
}
