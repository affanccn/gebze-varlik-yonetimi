-- =============================================================================
-- GEBZE-EKYS V12: asset_assignments Tablosuna personnel_id FK Eklenmesi
-- =============================================================================

-- 1. personnel_id sütununun eklenmesi
ALTER TABLE asset_assignments ADD (
    personnel_id NUMBER(19) CONSTRAINT fk_assignments_personnel REFERENCES personnel(id) ON DELETE SET NULL
);

-- 2. Sorgu performansı için B-Tree İndeksi
CREATE INDEX idx_assignments_personnel ON asset_assignments (personnel_id);

-- 3. Mevcut zimmet kayıtlarının personnel tablosu ile eşleştirilerek güncellenmesi
MERGE INTO asset_assignments aa
USING (
    SELECT id, TRIM(LOWER(first_name || ' ' || last_name)) AS full_name
    FROM personnel
    WHERE is_deleted = 0
) p
ON (TRIM(LOWER(aa.assignee_name)) = p.full_name)
WHEN MATCHED THEN
    UPDATE SET aa.personnel_id = p.id;

