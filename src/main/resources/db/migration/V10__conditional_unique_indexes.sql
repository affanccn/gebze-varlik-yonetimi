-- =============================================================================
-- GEBZE-EKYS V10: Koşullu Tekil İndeksler ve Doğrudan Arama İndeksleri
-- =============================================================================

-- 1. ESKİ TEKİL KISITLARIN KALDIRILMASI (Mevcutsa kaldır)
BEGIN
    FOR c IN (
        SELECT table_name, constraint_name 
        FROM user_constraints 
        WHERE constraint_name IN (
            'UK_ASSETS_CODE', 'UK_PERSONNEL_REG', 'UK_FLEET_PLATE', 
            'UK_FLEET_CODE', 'UK_STOCK_ITEMS_CODE'
        )
    ) LOOP
        EXECUTE IMMEDIATE 'ALTER TABLE ' || c.table_name || ' DROP CONSTRAINT ' || c.constraint_name;
    END LOOP;
END;
/

-- 2. KOŞULLU TEKİL İNDEKSLER (Soft delete sonrasında aynı kodun tekrar açılabilmesi için)
CREATE UNIQUE INDEX uk_assets_active_code ON assets (
    CASE WHEN is_deleted = 0 THEN code ELSE NULL END
);

CREATE UNIQUE INDEX uk_assets_active_barcode ON assets (
    CASE WHEN is_deleted = 0 AND barcode IS NOT NULL THEN barcode ELSE NULL END
);

CREATE UNIQUE INDEX uk_personnel_active_reg ON personnel (
    CASE WHEN is_deleted = 0 THEN registration_number ELSE NULL END
);

CREATE UNIQUE INDEX uk_fleet_active_plate ON fleet_vehicles (
    CASE WHEN is_deleted = 0 THEN plate_number ELSE NULL END
);

CREATE UNIQUE INDEX uk_fleet_active_code ON fleet_vehicles (
    CASE WHEN is_deleted = 0 THEN vehicle_code ELSE NULL END
);

CREATE UNIQUE INDEX uk_stock_items_active_code ON stock_items (
    CASE WHEN is_deleted = 0 THEN item_code ELSE NULL END
);

-- 3. DOĞRUDAN ARAMA İNDEKSLERİ (WHERE code = :x vb. sorgularda Full Table Scan'i önlemek için)
-- Not: idx_assets_barcode zaten V1'de oluşturulmuştur: assets(barcode)
CREATE INDEX idx_assets_code ON assets (code);
CREATE INDEX idx_personnel_reg ON personnel (registration_number);
CREATE INDEX idx_fleet_plate ON fleet_vehicles (plate_number);
CREATE INDEX idx_stock_items_code ON stock_items (item_code);
