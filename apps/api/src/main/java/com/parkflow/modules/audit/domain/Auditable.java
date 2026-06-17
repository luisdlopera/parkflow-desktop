package com.parkflow.modules.audit.domain;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    
    /**
     * The module this action belongs to (e.g., 'Caja', 'Tarifas')
     */
    String module();
    
    /**
     * The specific action being performed (e.g., 'Apertura', 'Actualización')
     */
    String action();
    
    /**
     * The class of the entity being modified (Optional, can be inferred)
     */
    Class<?> entityClass() default Void.class;
}
