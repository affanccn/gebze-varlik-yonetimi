-- =============================================================================
-- GEBZE-EKYS: FAZ 1F-3 İZOLE PERFORMANS TEST VERİSİ ÜRETİMİ (PORT 1522 İÇİN)
-- Hacim: 100k Asset, 300k Assignment, 500k Movement, 500k Stock Tx, 1M Audit Log
-- =============================================================================

SET SERVEROUTPUT ON SIZE UNLIMITED;
SET TIMING ON;

DECLARE
    v_start TIMESTAMP := SYSTIMESTAMP;
    v_asset_count NUMBER;
    v_assign_count NUMBER;
    v_move_count NUMBER;
    v_stock_tx_count NUMBER;
    v_audit_count NUMBER;
    v_stock_id NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('--- 1. Kontrol ve Sentetik Veri Yüklemesi Başlıyor: ' || TO_CHAR(v_start, 'HH24:MI:SS'));

    -- Stock Item ID tespiti
    SELECT MIN(id) INTO v_stock_id FROM stock_items;
    IF v_stock_id IS NULL THEN
        INSERT INTO stock_items (item_code, item_name, category, warehouse_name, current_quantity, min_threshold, unit, unit_price, status)
        VALUES ('STK-PERF-01', 'Test Sarf Malzemesi', 'Kırtasiye', 'Merkez Depo', 100000, 100, 'Adet', 25.50, 'NORMAL')
        RETURNING id INTO v_stock_id;
        COMMIT;
    END IF;

    -- 1. ASSETS KONTROLÜ
    SELECT COUNT(*) INTO v_asset_count FROM assets;
    DBMS_OUTPUT.PUT_LINE('>> Mevcut Assets Sayısı: ' || v_asset_count);
    IF v_asset_count < 100000 THEN
        DBMS_OUTPUT.PUT_LINE('>> Assets 100.000 adede tamamlanıyor...');
        FOR b IN 1..10 LOOP
            INSERT /*+ APPEND */ INTO assets (
                code, tif_code, barcode, name, category, brand_model, serial_number,
                unit_name, location_info, assignee_name, status, condition_status,
                acquisition_date, warranty_end_date, estimated_value, supplier, notes,
                updated_at, department_id, sub_unit_id, building_id, floor_id, room_id,
                category_id, is_active, is_deleted, deleted_at, deleted_by, lifecycle_status,
                specifications
            )
            SELECT 
                'GBZ-PF-' || LPAD((b-1)*10000 + LEVEL, 7, '0') AS code,
                'TIF-PF-' || LPAD((b-1)*10000 + LEVEL, 7, '0') AS tif_code,
                '869000' || LPAD((b-1)*10000 + LEVEL, 7, '0') AS barcode,
                CASE MOD(LEVEL, 5)
                    WHEN 0 THEN 'İş Makinesi ve Kamyon ' || ((b-1)*10000 + LEVEL)
                    WHEN 1 THEN 'Dizüstü Bilgisayar ' || ((b-1)*10000 + LEVEL)
                    WHEN 2 THEN 'Lazer Yazıcı ve Tarayıcı ' || ((b-1)*10000 + LEVEL)
                    WHEN 3 THEN 'Belediye Hizmet Aracı ' || ((b-1)*10000 + LEVEL)
                    ELSE 'Makam Masası ve Mobilya ' || ((b-1)*10000 + LEVEL)
                END AS name,
                CASE MOD(LEVEL, 4)
                    WHEN 0 THEN 'İş Makinesi'
                    WHEN 1 THEN 'Bilişim Ekipmanı'
                    WHEN 2 THEN 'Ulaşım Aracı'
                    ELSE 'Büro Mefruşatı'
                END AS category,
                'Marka-' || MOD(LEVEL, 20) || ' Model-' || MOD(LEVEL, 10) AS brand_model,
                'SN-PF-' || LPAD((b-1)*10000 + LEVEL, 8, '0') AS serial_number,
                'Müdürlük Birimi ' || (MOD(LEVEL, 10) + 1) AS unit_name,
                'Gebze Hizmet Binası Kat ' || MOD(LEVEL, 5) AS location_info,
                'Personel ' || MOD(LEVEL, 500) AS assignee_name,
                'Aktif' AS status,
                'İyi' AS condition_status,
                SYSDATE - MOD(LEVEL, 1000) AS acquisition_date,
                SYSDATE + MOD(LEVEL, 1000) AS warranty_end_date,
                ROUND(DBMS_RANDOM.VALUE(1000, 250000), 2) AS estimated_value,
                'Tedarikçi A.Ş. ' || MOD(LEVEL, 30) AS supplier,
                'Performans test sentetik varlık verisi' AS notes,
                SYSTIMESTAMP - NUMTODSINTERVAL(MOD(LEVEL, 365), 'DAY') AS updated_at,
                (MOD(LEVEL, 10) + 1) AS department_id,
                1 AS sub_unit_id,
                1 AS building_id,
                1 AS floor_id,
                1 AS room_id,
                (MOD(LEVEL, 10) + 1) AS category_id,
                1 AS is_active,
                0 AS is_deleted,
                NULL AS deleted_at,
                NULL AS deleted_by,
                CASE MOD(LEVEL, 10)
                    WHEN 0 THEN 'MAINTENANCE'
                    WHEN 1 THEN 'RETIRED'
                    ELSE 'ACTIVE'
                END AS lifecycle_status,
                JSON_OBJECT('ram' VALUE '16GB', 'cpu' VALUE 'i7', 'os' VALUE 'Pardus') AS specifications
            FROM DUAL CONNECT BY LEVEL <= 10000;
            COMMIT;
        END LOOP;
    END IF;

    -- 2. ASSET_ASSIGNMENTS (300.000) - Assets tablosundaki gerçek ID'ler cross join ile alınır
    SELECT COUNT(*) INTO v_assign_count FROM asset_assignments;
    DBMS_OUTPUT.PUT_LINE('>> Mevcut Assignments Sayısı: ' || v_assign_count);
    IF v_assign_count < 300000 THEN
        DBMS_OUTPUT.PUT_LINE('>> Asset Assignments 300.000 satıra dolduruluyor...');
        -- 3 parti halinde 100k asset ile cross join (3 x 100k = 300k)
        FOR b IN 1..3 LOOP
            INSERT /*+ APPEND */ INTO asset_assignments (
                document_no, asset_id, assignee_name, assignee_title, unit_name,
                location_info, status, assigned_by, assigned_at, returned_at, return_note, note
            )
            SELECT 
                'ZMT-PF-' || b || '-' || LPAD(ROWNUM, 7, '0') AS document_no,
                a.id AS asset_id,
                'Zimmet Alan Personel ' || MOD(ROWNUM, 1000) AS assignee_name,
                'Uzman' AS assignee_title,
                'Destek Hizmetleri' AS unit_name,
                'Oda ' || MOD(ROWNUM, 200) AS location_info,
                CASE WHEN MOD(ROWNUM, 3) = 0 THEN 'IADE_EDILDI' ELSE 'AKTIF' END AS status,
                'admin' AS assigned_by,
                SYSTIMESTAMP - NUMTODSINTERVAL(MOD(ROWNUM, 500), 'DAY') AS assigned_at,
                CASE WHEN MOD(ROWNUM, 3) = 0 THEN SYSTIMESTAMP - NUMTODSINTERVAL(MOD(ROWNUM, 100), 'DAY') ELSE NULL END AS returned_at,
                NULL AS return_note,
                'Performans test zimmet kaydı' AS note
            FROM (SELECT id FROM assets WHERE is_deleted = 0 FETCH FIRST 100000 ROWS ONLY) a;
            COMMIT;
        END LOOP;
        DBMS_OUTPUT.PUT_LINE('>> Asset Assignments 300.000 tamamlandı.');
    END IF;

    -- 3. ASSET_MOVEMENTS (500.000)
    SELECT COUNT(*) INTO v_move_count FROM asset_movements;
    DBMS_OUTPUT.PUT_LINE('>> Mevcut Movements Sayısı: ' || v_move_count);
    IF v_move_count < 500000 THEN
        DBMS_OUTPUT.PUT_LINE('>> Asset Movements 500.000 satıra dolduruluyor...');
        FOR b IN 1..5 LOOP
            INSERT /*+ APPEND */ INTO asset_movements (
                asset_id, asset_code, asset_name, movement_type, type_label,
                from_unit, from_location, to_unit, to_location, performed_by, note, created_at
            )
            SELECT 
                a.id AS asset_id,
                a.code AS asset_code,
                a.name AS asset_name,
                CASE MOD(ROWNUM, 4)
                    WHEN 0 THEN 'TRANSFER'
                    WHEN 1 THEN 'ZIMMET'
                    WHEN 2 THEN 'BAKIM'
                    ELSE 'SAYIM'
                END AS movement_type,
                'Transfer İşlemi' AS type_label,
                'Eski Birim ' || MOD(ROWNUM, 10) AS from_unit,
                'Eski Konum ' || MOD(ROWNUM, 20) AS from_location,
                'Yeni Birim ' || MOD(ROWNUM, 10) AS to_unit,
                'Yeni Konum ' || MOD(ROWNUM, 20) AS to_location,
                'admin' AS performed_by,
                'Sentetik hareket kaydı' AS note,
                SYSTIMESTAMP - NUMTODSINTERVAL(MOD(ROWNUM, 700), 'DAY') AS created_at
            FROM (SELECT id, code, name FROM assets WHERE is_deleted = 0 FETCH FIRST 100000 ROWS ONLY) a;
            COMMIT;
        END LOOP;
        DBMS_OUTPUT.PUT_LINE('>> Asset Movements 500.000 tamamlandı.');
    END IF;

    -- 4. STOCK_TRANSACTIONS (500.000)
    SELECT COUNT(*) INTO v_stock_tx_count FROM stock_transactions;
    DBMS_OUTPUT.PUT_LINE('>> Mevcut Stock Transactions Sayısı: ' || v_stock_tx_count);
    IF v_stock_tx_count < 500000 THEN
        DBMS_OUTPUT.PUT_LINE('>> Stock Transactions 500.000 satıra dolduruluyor...');
        FOR b IN 1..10 LOOP
            INSERT /*+ APPEND */ INTO stock_transactions (
                transaction_code, stock_item_id, tx_type, quantity, department_id,
                department_name, recipient_name, performed_by, notes, tx_date
            )
            SELECT 
                'STX-PF-' || LPAD((b-1)*50000 + LEVEL, 8, '0') AS transaction_code,
                v_stock_id AS stock_item_id,
                CASE WHEN MOD(LEVEL, 2) = 0 THEN 'GIRIS' ELSE 'CIKIS' END AS tx_type,
                ROUND(DBMS_RANDOM.VALUE(1, 50), 2) AS quantity,
                (MOD(LEVEL, 10) + 1) AS department_id,
                'Müdürlük ' || (MOD(LEVEL, 10) + 1) AS department_name,
                'Teslim Alan ' || MOD(LEVEL, 200) AS recipient_name,
                'admin' AS performed_by,
                'Sentetik stok hareketi' AS notes,
                SYSTIMESTAMP - NUMTODSINTERVAL(MOD(LEVEL, 600), 'DAY') AS tx_date
            FROM DUAL CONNECT BY LEVEL <= 50000;
            COMMIT;
        END LOOP;
        DBMS_OUTPUT.PUT_LINE('>> Stock Transactions 500.000 tamamlandı.');
    END IF;

    -- 5. SYSTEM_AUDIT_LOGS (1.000.000)
    SELECT COUNT(*) INTO v_audit_count FROM system_audit_logs;
    DBMS_OUTPUT.PUT_LINE('>> Mevcut System Audit Logs Sayısı: ' || v_audit_count);
    IF v_audit_count < 1000000 THEN
        DBMS_OUTPUT.PUT_LINE('>> System Audit Logs 1.000.000 satıra dolduruluyor...');
        FOR b IN 1..10 LOOP
            INSERT /*+ APPEND */ INTO system_audit_logs (
                action_type, entity_type, entity_id, actor_username, actor_name,
                ip_address, description, created_at
            )
            SELECT 
                CASE MOD(LEVEL, 5)
                    WHEN 0 THEN 'CREATE'
                    WHEN 1 THEN 'UPDATE'
                    WHEN 2 THEN 'ASSIGN'
                    WHEN 3 THEN 'MAINTENANCE'
                    ELSE 'VIEW'
                END AS action_type,
                'ASSET' AS entity_type,
                TO_CHAR((b-1)*100000 + LEVEL) AS entity_id,
                'kullanici_' || MOD(LEVEL, 50) AS actor_username,
                'Kullanıcı ' || MOD(LEVEL, 50) AS actor_name,
                '192.168.1.' || (MOD(LEVEL, 250) + 1) AS ip_address,
                'Denetim log kaydı #' || ((b-1)*100000 + LEVEL) AS description,
                SYSTIMESTAMP - NUMTODSINTERVAL(MOD(LEVEL, 1000), 'DAY') AS created_at
            FROM DUAL CONNECT BY LEVEL <= 100000;
            COMMIT;
        END LOOP;
        DBMS_OUTPUT.PUT_LINE('>> System Audit Logs 1.000.000 tamamlandı.');
    END IF;

    -- 6. İSTATİSTİK TOPLAMA (GATHER_SCHEMA_STATS)
    DBMS_OUTPUT.PUT_LINE('>> Şema istatistikleri toplanıyor (DBMS_STATS)...');
    DBMS_STATS.GATHER_SCHEMA_STATS(ownname => 'VARLIK_APP', cascade => TRUE, degree => 2);
    DBMS_OUTPUT.PUT_LINE('>> İstatistikler başarıyla toplandı.');

    DBMS_OUTPUT.PUT_LINE('--- Bütün İşlemler Tamamlandı! Süre: ' || TO_CHAR(SYSTIMESTAMP - v_start));
END;
/
EXIT;
