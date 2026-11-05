-- =============================================================================
-- GEBZE BELEDİYESİ KURUMSAL VARLIK VE KAYNAK YÖNETİM SİSTEMİ (GEBZE-EKYS)
-- V16: Sayfalama, Filtreleme ve Yabancı Anahtar Performans İndeksleri
-- =============================================================================

-- 1. Varlık Listesi ve Kapsam İndeksleri
CREATE INDEX idx_assets_dept_scope ON assets (department_id, is_deleted, id DESC);
CREATE INDEX idx_assets_lifecycle ON assets (lifecycle_status, is_deleted);
CREATE INDEX idx_assets_category_id ON assets (category_id, is_deleted);

-- 2. Personel Listesi İndeksi
CREATE INDEX idx_personnel_dept_del ON personnel (department_id, is_deleted, id DESC);

-- 3. İlişkili Varlık ve Alt Tablo FK / Filtre İndeksleri
CREATE INDEX idx_assignments_asset_stat ON asset_assignments (asset_id, status, id DESC);
CREATE INDEX idx_maintenances_asset_stat ON asset_maintenances (asset_id, status, id DESC);
CREATE INDEX idx_documents_asset_fk ON asset_documents (asset_id, id DESC);
CREATE INDEX idx_audit_scans_audit_fk ON audit_scans (audit_id, id DESC);

-- 4. Modül Departman İzolasyonu İndeksleri
CREATE INDEX idx_stock_items_dept_fk ON stock_items (department_id, id DESC);
CREATE INDEX idx_fleet_dept_fk ON fleet_vehicles (department_id, id DESC);
CREATE INDEX idx_procurement_dept_fk ON procurement_orders (department_id, id DESC);

-- 5. Gelecek Keyset ve Denetim İndeksleri
CREATE INDEX idx_movements_keyset ON asset_movements (asset_id, created_at DESC, id DESC);
CREATE INDEX idx_stock_tx_keyset ON stock_transactions (stock_item_id, tx_date DESC, id DESC);
CREATE INDEX idx_syslog_keyset ON system_audit_logs (created_at DESC, id DESC);
CREATE INDEX idx_syslog_entity ON system_audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_syslog_actor ON system_audit_logs (actor_username, created_at DESC);

