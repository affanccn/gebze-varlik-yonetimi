-- =============================================================================
-- GEBZE-EKYS V14: Giriş Güvenliği ve Hesap Kilitleme Sütunları (system_users)
-- =============================================================================

ALTER TABLE system_users ADD (
    failed_attempts NUMBER(3) DEFAULT 0 NOT NULL,
    locked_until    TIMESTAMP
);

