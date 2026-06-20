-- Eliminar la restricción UNIQUE en session_id para permitir pagos múltiples por sesión
ALTER TABLE payment DROP CONSTRAINT IF EXISTS uk_payment_session;
-- En H2/PostgreSQL el constraint de un @JoinColumn(unique=true) a veces recibe un nombre auto-generado si no se especificó.
-- Como es Hibernate el que generó el esquema inicial con @OneToOne, el constraint suele llamarse uc_payment_session_id.
ALTER TABLE payment DROP CONSTRAINT IF EXISTS uc_payment_session_id;

-- Si es necesario buscar el constraint y borrarlo dinámicamente en Postgres:
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
  WHERE tc.table_name = 'payment' AND tc.constraint_type = 'UNIQUE' AND ccu.column_name = 'session_id';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE payment DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;
