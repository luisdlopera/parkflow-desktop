ALTER TABLE rate
  ADD COLUMN IF NOT EXISTS pricing_configuration jsonb,
  ADD COLUMN IF NOT EXISTS pricing_engine_version varchar(32);

UPDATE rate
SET pricing_engine_version = COALESCE(pricing_engine_version, 'pricing_engine_v1')
WHERE pricing_engine_version IS NULL;

UPDATE rate
SET pricing_configuration = jsonb_build_object(
  'version', 'pricing_engine_v1',
  'currency', 'COP',
  'active', is_active,
  'strategy', jsonb_build_object(
    'type',
      CASE
        WHEN rate_type = 'FRACTIONAL' THEN 'FRACTIONAL'
        WHEN rate_type = 'DAILY' THEN 'DAILY'
        WHEN applies_night AND max_daily_value IS NOT NULL THEN 'MIXED'
        WHEN applies_night THEN 'NIGHT'
        ELSE 'HOURLY'
      END,
    'label',
      CASE
        WHEN rate_type = 'FRACTIONAL' THEN 'Por fracción'
        WHEN rate_type = 'DAILY' THEN 'Diaria'
        WHEN applies_night AND max_daily_value IS NOT NULL THEN 'Hora + día + horario especial'
        WHEN applies_night THEN 'Nocturna'
        ELSE 'Por hora'
      END
  ),
  'rates', jsonb_build_object(
    'pricePerHour', CASE WHEN rate_type IN ('HOURLY', 'FLAT') OR (applies_night AND max_daily_value IS NOT NULL) THEN amount ELSE NULL END,
    'fractionMinutes', CASE WHEN rate_type = 'FRACTIONAL' THEN fraction_minutes WHEN fraction_minutes IS NOT NULL THEN fraction_minutes ELSE NULL END,
    'fractionPrice', CASE WHEN rate_type = 'FRACTIONAL' THEN amount ELSE NULL END,
    'dailyPrice', CASE WHEN rate_type = 'DAILY' THEN amount ELSE max_daily_value END,
    'nightPrice', CASE WHEN applies_night THEN amount ELSE NULL END
  ),
  'rules', jsonb_build_object(
    'executionOrder', to_jsonb(ARRAY['GRACE_PERIOD', 'MINIMUM_CHARGE', 'ROUNDING', 'STRATEGY_PRICE', 'DAILY_CAP']),
    'graceMinutes', grace_minutes,
    'minimumChargeMinutes', 0,
    'rounding', jsonb_build_object(
      'mode', COALESCE(rounding_mode, 'NONE'),
      'incrementMinutes',
        CASE
          WHEN rate_type = 'DAILY' THEN 1440
          WHEN rate_type = 'FRACTIONAL' THEN GREATEST(COALESCE(fraction_minutes, 1), 1)
          WHEN fraction_minutes IS NOT NULL AND fraction_minutes > 0 THEN fraction_minutes
          ELSE 60
        END
    ),
    'specialHours', jsonb_build_object(
      'enabled', applies_night OR window_start IS NOT NULL OR window_end IS NOT NULL,
      'startTime', COALESCE(TO_CHAR(window_start, 'HH24:MI'), '20:00'),
      'endTime', COALESCE(TO_CHAR(window_end, 'HH24:MI'), '06:00')
    ),
    'weekends', jsonb_build_object(
      'enabled', applies_holiday,
      'surchargePercent', holiday_surcharge_percent,
      'fixedPrice', NULL
    ),
    'dailyCaps', jsonb_build_object(
      'enabled', max_daily_value IS NOT NULL,
      'maxDailyPrice', max_daily_value
    ),
    'vehicleOverrides', '{}'::jsonb
  ),
  'overrides', '{}'::jsonb
)
WHERE pricing_configuration IS NULL;
