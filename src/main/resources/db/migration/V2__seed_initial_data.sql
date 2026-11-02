-- =============================================================================
-- Gebze Belediyesi Varlık Yönetimi - Oracle 23ai Başlangıç Verileri (Flyway V2)
-- =============================================================================

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes
) VALUES (
    'DEMO-VRK-001', '255.02.01.01', 'GBZ-869020260001',
    'Taşınabilir İş İstasyonu (Örnek Cihaz A)', 'Bilişim Ekipmanı',
    'ThinkBook Pro 16 G6 (Demo)', 'SN-DEMO-900142',
    'Demo Birim A (Bilgi Sistemleri)', 'Demo Yerleşke - A Blok Kat 2 Oda 204',
    'Örnek Sorumlu 1 (Demo Kayıt)', 'Aktif', 'Çok İyi',
    DATE '2026-01-15', DATE '2028-01-15', 68500.00,
    'DMO (Devlet Malzeme Ofisi - Demo)',
    'Yazılım geliştirme ve sistem yönetimi için tahsis edilen kurgusal demo iş istasyonu.'
);

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes
) VALUES (
    'DEMO-VRK-002', '255.03.01.04', 'GBZ-869020260002',
    'Toplantı Masası 12 Kişilik (Örnek Mobilya)', 'Ofis Mobilyası',
    'Modüler Konferans Serisi 360cm (Demo)', 'SN-DEMO-440210',
    'Demo Birim B (İdari İşler)', 'Demo Yerleşke - B Blok Kat 1 Toplantı Salonu',
    'Örnek Sorumlu 2 (Demo Kayıt)', 'Aktif', 'İyi',
    DATE '2025-11-20', DATE '2027-11-20', 42000.00,
    'Açık İhale Alımı (Demo)',
    'Ortak toplantı salonu demirbaşı (kurgusal demo kaydı).'
);

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes
) VALUES (
    'DEMO-VRK-003', '255.02.02.03', 'GBZ-869020260003',
    'Çok Fonksiyonlu Ağ Yazıcısı (Örnek Donanım)', 'Bilişim Ekipmanı',
    'LaserJet Kurumsal A3 MFP (Demo)', 'SN-DEMO-771008',
    'Demo Birim C (Destek Hizmetleri)', 'Teknik Servis / Bakım Atölyesi (Demo)',
    'Örnek Sorumlu 3 (Demo Kayıt)', 'Bakımda', 'Onarım Gerekli',
    DATE '2024-06-10', DATE '2026-11-15', 54000.00,
    'DMO (Devlet Malzeme Ofisi - Demo)',
    'Periyodik tambur ve fırın ünitesi bakımında olan demo yazıcı.'
);

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes
) VALUES (
    'DEMO-VRK-004', '253.03.05.02', 'GBZ-869020260004',
    'Hassas GNSS Saha Ölçüm Cihazı (Örnek Ekipman)', 'Teknik Cihaz',
    'GeoSurvey RTK GNSS Alıcı Seti (Demo)', 'SN-DEMO-553901',
    'Demo Birim D (Saha Operasyon)', 'Demo Depo Alanı - Raf Kodu D-12',
    'Atanmamış (Depo Sorumlusu - Demo)', 'Depoda', 'Çok İyi',
    DATE '2026-03-04', DATE '2029-03-04', 145000.00,
    'Açık İhale Alımı (Demo)',
    'Harita ve saha ölçüm görevleri için zimmet atamasına hazır bekleyen demo teknik cihaz.'
);

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes
) VALUES (
    'DEMO-VRK-005', '255.03.02.01', 'GBZ-869020260005',
    'Çelik Evrak Dolabı Çift Kapaklı (Örnek Demirbaş)', 'Ofis Mobilyası',
    'ÇelikArşiv Güvenlikli Dolap 195cm (Demo)', 'SN-DEMO-310884',
    'Demo Birim B (İdari İşler)', 'Demo Yerleşke - B Blok Arşiv Odası',
    'Örnek Sorumlu 4 (Demo Kayıt)', 'Aktif', 'İyi',
    DATE '2025-08-01', DATE '2027-08-01', 14800.00,
    'Doğrudan Temin (Demo)',
    'Fiziki evrak arşivleme için kullanılan demo demirbaş dolap.'
);

INSERT INTO asset_assignments (
    document_no, asset_id, assignee_name, assignee_title,
    unit_name, location_info, status, assigned_by, note
) VALUES (
    'DEMO-ZMT-2026-001',
    (SELECT id FROM assets WHERE code = 'DEMO-VRK-001'),
    'Örnek Sorumlu 1 (Demo Kayıt)', 'Yazılım Geliştirme Uzmanı (Demo)',
    'Demo Birim A (Bilgi Sistemleri)', 'Demo Yerleşke - A Blok Kat 2 Oda 204',
    'AKTIF', 'Taşınır Kayıt Yetkilisi (Demo)',
    'Proje geliştirme çalışmaları kapsamında zimmetlendi.'
);

INSERT INTO asset_maintenances (
    order_no, asset_id, maintenance_type, priority,
    vendor_or_technician, issue_description, cost, status, created_by
) VALUES (
    'DEMO-BKM-2026-001',
    (SELECT id FROM assets WHERE code = 'DEMO-VRK-003'),
    'Periyodik Bakım & Onarım', 'Yüksek',
    'Kurumsal Yazıcı Teknik Servis A.Ş. (Demo)',
    'Kağıt besleme merdanesi aşınması ve tambur ünitesi değişimi.',
    3450.00, 'DEVAM_EDIYOR', 'Sistem Yöneticisi (Demo)'
);

INSERT INTO asset_movements (
    asset_id, asset_code, asset_name, movement_type, type_label,
    from_unit, from_location, to_unit, to_location, performed_by, note
) VALUES (
    (SELECT id FROM assets WHERE code = 'DEMO-VRK-001'),
    'DEMO-VRK-001', 'Taşınabilir İş İstasyonu (Örnek Cihaz A)',
    'ZIMMET_ATAMA', 'Zimmet Atama',
    'Demo Depo Alanı', 'Merkez Depo',
    'Demo Birim A (Bilgi Sistemleri)', 'Demo Yerleşke - A Blok Kat 2 Oda 204',
    'Taşınır Kayıt Yetkilisi (Demo)', 'Örnek Sorumlu 1 adına ilk zimmet teslimi.'
);

