CREATE INDEX IF NOT EXISTS idx_session_event_type_actor ON session_event (type, actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_event_session_type ON session_event (session_id, type);
