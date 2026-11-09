-- =============================================================================
-- GEBZE BELEDİYESİ KURUMSAL VARLIK VE KAYNAK YÖNETİM SİSTEMİ (GEBZE-EKYS)
-- V17: Veri Tutarlılığı (Zimmet-Personel-Müdürlük Senkronizasyonu) ve Eksik İndeksler
-- =============================================================================

-- 1. Personel aktiflik durumu ve test kayıtlarının pasife alınması (Yıkıcı silme olmadan)
UPDATE personnel
SET is_active = 1, is_deleted = 0, deleted_at = NULL, deleted_by = NULL
WHERE id = 1;

UPDATE personnel
SET is_active = 0,
    is_deleted = 1,
    deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
    deleted_by = COALESCE(deleted_by, 'system_cleanup')
WHERE registration_number LIKE 'TEST-%'
   OR registration_number LIKE 'SCL-IK-2026-%'
   OR registration_number LIKE 'STF-%';

-- 2. Hiyerarşi tablolarındaki geçici test kayıtlarının pasife alınması
UPDATE departments SET is_active = 0 WHERE code LIKE 'TEST-%' OR code LIKE 'CSRF-%' OR code LIKE 'STF-%';
UPDATE buildings   SET is_active = 0 WHERE code LIKE 'TEST-%';
UPDATE floors      SET is_active = 0 WHERE floor_code LIKE 'TEST-%';
UPDATE rooms       SET is_active = 0 WHERE room_number LIKE '%SEC%' OR room_number LIKE '999%';
UPDATE sub_units   SET is_active = 0 WHERE code LIKE 'TEST-%';

-- 3. Müdürlüklerin yönetici (manager_name) bilgisinin personel tablosu ile senkronize edilmesi
MERGE INTO departments d
USING (
    SELECT department_id,
           COALESCE(
               MAX(CASE WHEN LOWER(title) LIKE '%müdür%' OR LOWER(title) LIKE '%mudur%' OR LOWER(title) LIKE '%başkan%' OR LOWER(title) LIKE '%müşavir%' THEN full_name END),
               MAX(CASE WHEN LOWER(title) LIKE '%amir%' OR LOWER(title) LIKE '%şef%' THEN full_name END),
               MAX(full_name)
           ) AS resolved_manager
    FROM personnel
    WHERE is_deleted = 0 AND is_active = 1 AND department_id IS NOT NULL
    GROUP BY department_id
) p
ON (d.id = p.department_id)
WHEN MATCHED THEN
    UPDATE SET d.manager_name = p.resolved_manager
    WHERE d.manager_name IS NULL OR d.manager_name <> p.resolved_manager;

-- 4. Varlık durum / yaşam döngüsü (status <-> lifecycle_status) ve zimmetli kişi tutarlılığı
UPDATE assets SET lifecycle_status = 'KULLANIMDA' WHERE id = 1 AND status = 'Aktif';
UPDATE assets SET lifecycle_status = 'BAKIMDA'    WHERE id = 3 AND status = 'Bakımda';
UPDATE assets
SET lifecycle_status = 'KAYDEDILDI',
    assignee_name = 'Atanmamış (Depo Sorumlusu)'
WHERE id = 4 AND status = 'Depoda';

UPDATE asset_assignments
SET status = 'IADE_EDILDI',
    returned_at = COALESCE(returned_at, CURRENT_TIMESTAMP),
    return_note = COALESCE(return_note, 'Depo durum senkronizasyonu')
WHERE asset_id = 4 AND status = 'AKTIF';

-- Unvan olarak yazılmış zimmetli varlık sorumlularının gerçek personel adlarıyla eşleştirilmesi
UPDATE assets SET assignee_name = 'Murat Yılmaz'    WHERE id = 46 AND code = 'GBZ-AST-101';
UPDATE assets SET assignee_name = 'Mustafa Özdemir' WHERE id = 47 AND code = 'GBZ-AST-102';

-- 5. Zimmetli (ZIMMETLENDI) varlıkların tamamı için aktif zimmet fişlerinin (asset_assignments) garanti altına alınması
MERGE INTO asset_assignments aa
USING (
    SELECT 'GBZ-ZMT-2026-002' AS doc_no, 53 AS asset_id, 10 AS personnel_id, 'Kemal Şahin' AS assignee_name, 'Bütçe ve Kesin Hesap Şefi' AS assignee_title, 'Mali Hizmetler Müdürlüğü' AS unit_name, 'Ana Hizmet Binası - 1. Kat - Oda 105' AS location_info FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-003', 57, 14, 'Ayşe Demir', 'Yazı İşleri ve Meclis Şefi', 'Yazı İşleri Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 112' FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-004', 59, 17, 'Av. Burak Karaca', '1. Hukuk Müşaviri', 'Hukuk İşleri Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 107' FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-005', 61, 19, 'Başmüfettiş Sinan Öz', 'Teftiş Kurulu Başkanı', 'Rehberlik ve Teftiş Kurulu Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 108' FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-006', 71, 30, 'Harun Keskin', 'Kamulaştırma Şefi', 'Emlak ve İstimlak Müdürlüğü', 'Ek Hizmet Binası - 2. Kat - Oda EK-201' FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-007', 73, 32, 'Y. Mimar Pınar Kurt', 'Etüt Proje Şefi', 'Etüt ve Proje Müdürlüğü', 'Ek Hizmet Binası - 1. Kat - Oda EK-104' FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-008', 83, 43, 'Uzm. Psikolog Seda', 'Aile Danışma Merkezi Şefi', 'Kadın ve Aile Hizmetleri Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 209' FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-009', 46, 1,  'Murat Yılmaz', 'Bilgi İşlem Müdürü', 'Bilgi İşlem Müdürlüğü', 'Ana Hizmet Binası - 3. Kat - Oda 301' FROM dual UNION ALL
    SELECT 'GBZ-ZMT-2026-010', 47, 5,  'Mustafa Özdemir', 'Destek Hizmetleri Müdürü', 'Destek Hizmetleri Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 201' FROM dual
) src
ON (aa.document_no = src.doc_no)
WHEN MATCHED THEN
    UPDATE SET
        aa.personnel_id = src.personnel_id,
        aa.assignee_name = src.assignee_name,
        aa.assignee_title = src.assignee_title,
        aa.status = 'AKTIF'
WHEN NOT MATCHED THEN
    INSERT (document_no, asset_id, personnel_id, assignee_name, assignee_title, unit_name, location_info, status, assigned_by, assigned_at, note)
    VALUES (src.doc_no, src.asset_id, src.personnel_id, src.assignee_name, src.assignee_title, src.unit_name, src.location_info, 'AKTIF', 'Taşınır Kayıt Yetkilisi', CURRENT_TIMESTAMP, 'Kurumsal zimmet senkronizasyonu (V17)');

-- 6. Eksik kalan personnel_id yabancı anahtarlarının isim eşleşmesiyle tamamlanması
MERGE INTO asset_assignments aa
USING (
    SELECT id, TRIM(LOWER(full_name)) AS norm_name
    FROM personnel
    WHERE is_deleted = 0
) p
ON (aa.personnel_id IS NULL AND TRIM(LOWER(aa.assignee_name)) = p.norm_name)
WHEN MATCHED THEN
    UPDATE SET aa.personnel_id = p.id;

-- 7. Eksik Yabancı Anahtar ve Sorgu Performans İndeksleri
CREATE INDEX idx_inv_audits_scope ON inventory_audits (department_id, building_id, floor_id);
CREATE INDEX idx_sys_users_dept   ON system_users (department_id);
CREATE INDEX idx_sys_users_pers   ON system_users (personnel_id);
CREATE INDEX idx_rooms_bld        ON rooms (building_id);
