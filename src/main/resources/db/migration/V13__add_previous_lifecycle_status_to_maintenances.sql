-- =============================================================================
-- GEBZE-EKYS V13: Bakım Sürecinde Önceki Yaşam Döngüsü Durumu Desteği
-- =============================================================================

ALTER TABLE asset_maintenances ADD (
    previous_lifecycle_status VARCHAR2(32 CHAR)
);

