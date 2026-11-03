-- =============================================================================
-- GEBZE-EKYS V9: Çekirdek Şema Genişletmesi, Soft Delete ve Yaşam Döngüsü
-- =============================================================================

-- 1. ASSETS TABLOSU GENİŞLETMESİ
ALTER TABLE assets ADD (
    is_deleted        NUMBER(1) DEFAULT 0 NOT NULL,
    deleted_at        TIMESTAMP WITH TIME ZONE,
    deleted_by        VARCHAR2(80 CHAR),
    lifecycle_status  VARCHAR2(40 CHAR) DEFAULT 'KULLANIMDA' NOT NULL,
    specifications    JSON
);

-- 2. PERSONNEL TABLOSU GENİŞLETMESİ
ALTER TABLE personnel ADD (
    is_deleted        NUMBER(1) DEFAULT 0 NOT NULL,
    deleted_at        TIMESTAMP WITH TIME ZONE,
    deleted_by        VARCHAR2(80 CHAR)
);

-- 3. FLEET_VEHICLES TABLOSU GENİŞLETMESİ
ALTER TABLE fleet_vehicles ADD (
    is_deleted        NUMBER(1) DEFAULT 0 NOT NULL,
    deleted_at        TIMESTAMP WITH TIME ZONE,
    deleted_by        VARCHAR2(80 CHAR)
);

-- 4. STOCK_ITEMS TABLOSU GENİŞLETMESİ
ALTER TABLE stock_items ADD (
    is_deleted        NUMBER(1) DEFAULT 0 NOT NULL,
    deleted_at        TIMESTAMP WITH TIME ZONE,
    deleted_by        VARCHAR2(80 CHAR)
);

-- 5. SYSTEM_AUDIT_LOGS TABLOSU GENİŞLETMESİ (JSON Diff Desteği)
ALTER TABLE system_audit_logs ADD (
    old_value_json    JSON,
    new_value_json    JSON
);

-- 6. MEVCUT 74 VARLIĞIN STATUS DEĞERİNDEN LIFECYCLE_STATUS'UN DOLDURULMASI
UPDATE assets
SET lifecycle_status = CASE 
    WHEN status IN ('Depoda', 'depoda') THEN 'KAYDEDILDI'
    WHEN status IN ('Zimmetli', 'zimmetli') THEN 'ZIMMETLENDI'
    WHEN status IN ('Aktif', 'aktif') THEN 'KULLANIMDA'
    WHEN status IN ('Bakımda', 'Bakimda', 'bakımda') THEN 'BAKIMDA'
    WHEN status IN ('Hurda', 'hurda') THEN 'HURDAYA_AYRILDI'
    WHEN status IN ('Pasif', 'pasif') THEN 'PASIF_ASKIDA'
    ELSE 'KULLANIMDA'
END;
