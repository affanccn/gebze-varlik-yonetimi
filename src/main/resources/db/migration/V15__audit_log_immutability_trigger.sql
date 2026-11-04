-- =============================================================================
-- GEBZE-EKYS V15: system_audit_logs Tablosu İçin Değişmezlik (Immutability) Trigger'ı
-- =============================================================================
-- Yasal ve kurumsal güvenlik gereksinimleri uyarınca denetim kayıtları
-- (system_audit_logs) asla güncellenemez (UPDATE) veya silinemez (DELETE).
-- Yalnızca yeni denetim kaydı eklenebilir (INSERT).

CREATE OR REPLACE TRIGGER trg_system_audit_logs_immutable
BEFORE UPDATE OR DELETE ON system_audit_logs
FOR EACH ROW
BEGIN
    RAISE_APPLICATION_ERROR(-20001, 'Denetim günlüğü kayıtları değiştirilemez veya silinemez (Immutability Violation).');
END;
/
