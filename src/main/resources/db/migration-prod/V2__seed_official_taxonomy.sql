-- =============================================================================
-- GEBZE BELEDİYESİ KURUMSAL VARLIK VE KAYNAK YÖNETİM SİSTEMİ (GEBZE-EKYS)
-- ÜRETİM (PROD) RESMİ TAKSONOMİ VE BAŞLANGIÇ PARAMETRELERİ (V2)
-- İçerik: 30 Resmi Müdürlük, 16 Ana Varlık Kategorisi, Temel Hizmet Binaları/Odalar
--         ve Sistem Parametreleri. (SIFIR DEMO VARLIK / SIFIR DEMO PERSONEL)
-- =============================================================================

-- A. 30 RESMİ MÜDÜRLÜK
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-01', 'Bilgi İşlem Müdürlüğü', 1);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-02', 'Destek Hizmetleri Müdürlüğü', 2);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-03', 'İnsan Kaynakları ve Eğitim Müdürlüğü', 3);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-04', 'Mali Hizmetler Müdürlüğü', 4);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-05', 'Gelirler Müdürlüğü', 5);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-06', 'Yazı İşleri Müdürlüğü', 6);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-07', 'Özel Kalem Müdürlüğü', 7);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-08', 'Hukuk İşleri Müdürlüğü', 8);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-09', 'Rehberlik ve Teftiş Kurulu Müdürlüğü', 9);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-10', 'Basın Yayın ve Halkla İlişkiler Müdürlüğü', 10);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-11', 'Fen İşleri Müdürlüğü', 11);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-12', 'Park ve Bahçeler Müdürlüğü', 12);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-13', 'Temizlik İşleri Müdürlüğü', 13);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-14', 'Makine İkmal, Bakım ve Onarım Müdürlüğü', 14);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-15', 'İmar ve Şehircilik Müdürlüğü', 15);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-16', 'Emlak ve İstimlak Müdürlüğü', 16);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-17', 'Plan ve Proje Müdürlüğü', 17);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-18', 'Etüt ve Proje Müdürlüğü', 18);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-19', 'Yapı Kontrol Müdürlüğü', 19);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-20', 'Ruhsat ve Denetim Müdürlüğü', 20);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-21', 'Zabıta Müdürlüğü', 21);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-22', 'Veteriner İşleri Müdürlüğü', 22);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-23', 'Mezarlıklar Müdürlüğü', 23);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-24', 'Sosyal Destek Hizmetleri Müdürlüğü', 24);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-25', 'Kültür İşleri Müdürlüğü', 25);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-26', 'Gençlik ve Spor Hizmetleri Müdürlüğü', 26);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-27', 'Kadın ve Aile Hizmetleri Müdürlüğü', 27);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-28', 'İşletme ve İştirakler Müdürlüğü', 28);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-29', 'Afet İşleri ve Risk Yönetimi Müdürlüğü', 29);
INSERT INTO departments (code, name, display_order) VALUES ('DEPT-30', 'İklim Değişikliği ve Sıfır Atık Müdürlüğü', 30);

-- B. 16 ANA VARLIK KATEGORİSİ
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-01', 'Bilişim Ekipmanları', 'computer', 'Sunucu, bilgisayar, dizüstü, yazıcı, ağ cihazları ve çevre birimleri');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-02', 'Ofis Mobilyaları', 'chair', 'Masa, sandalye, etajer, toplantı masası, evrak dolabı, sehpa');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-03', 'Elektronik Cihazlar', 'devices', 'TV, projeksiyon, ses sistemi, akıllı tahta, telsiz, anons cihazları');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-04', 'İklimlendirme ve Enerji', 'ac_unit', 'Klima, VRF sistemi, jeneratör, kesintisiz güç kaynağı (UPS), trafo');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-05', 'İş Makineleri', 'precision_manufacturing', 'Ekskavatör, kazıcı yükleyici, greyder, silindir, asfalt serme');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-06', 'Araç ve Taşıtlar', 'directions_car', 'Binek hizmet araçları, zabıta araçları, çöp kamyonları, minibüsler');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-07', 'El Aletleri ve Ekipmanları', 'handyman', 'Matkap, spiral, kaynak makinesi, takım çantası, mekanik aletler');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-08', 'İnşaat ve Teknik Malzemeler', 'construction', 'Ölçüm cihazları, nivo, teodolit, lazer metre, şantiye teçhizatı');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-09', 'Temizlik Ekipmanları', 'cleaning_services', 'Yol süpürme makineleri, basınçlı yıkama, zemin temizleme otomatları');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-10', 'Güvenlik ve Koruma Ekipmanları', 'security', 'Kamera sistemi, NVR/DVR, yangın algılama, X-ray, turnike');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-11', 'Tıbbi ve Veteriner Ekipmanları', 'medical_services', 'Röntgen cihazı, veteriner ameliyat masası, anestezi cihazı, sterilizatör');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-12', 'Spor Ekipmanları', 'fitness_center', 'Fitness aletleri, koşu bandı, saha ekipmanları, skorboard');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-13', 'Kültür ve Etkinlik Ekipmanları', 'theater_comedy', 'Işık mikseri, sahne ses sistemi, sahne mobilyası, sergi panosu');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-14', 'Park ve Bahçe Ekipmanları', 'yard', 'Çim biçme traktörü, çit budama, motorlu testere, otomatik sulama');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-15', 'Depo ve Taşıma Ekipmanları', 'forklift', 'Forklift, transpalet, istifleyici, depo raf sistemleri');
INSERT INTO asset_categories (code, name, icon, description) VALUES ('CAT-16', 'Diğer Demirbaşlar', 'category', 'Özel nitelikli diğer demirbaş ve taşınırlar');

-- C. TEMEL HİZMET BİNALARI VE YERLEŞKELER (12 RESMİ TESİS)
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-ANA', 'Ana Hizmet Binası', 'Hizmet Binası', 'Mevlana Mah. Issıkgöl Cad. No:1 Gebze/Kocaeli', 6);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-EK', 'Ek Hizmet Binası', 'Hizmet Binası', 'Güzeller Mah. Hükümet Cad. No:24 Gebze/Kocaeli', 4);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-FEN', 'Fen İşleri Şantiyesi', 'Şantiye', 'Kirazpınar Mah. Yeni Sanayi Alanı Gebze/Kocaeli', 2);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-PARK', 'Park ve Bahçeler Şantiyesi', 'Şantiye', 'Barış Mah. Fatih Sultan Mehmet Cad. Gebze/Kocaeli', 2);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-TMZ', 'Temizlik İşleri Garajı', 'Garaj', 'Pelitli Mah. Sanayi Yolu Gebze/Kocaeli', 2);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-VET', 'Veteriner İşleri Hayvan Bakımevi', 'Bakımevi / Klinik', 'Pelitli Mah. Bakımevi Yolu No:8 Gebze/Kocaeli', 2);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-KUL', 'Gebze Kültür Merkezi', 'Kültür Merkezi', 'Osman Yılmaz Mah. Şehit Numan Dede Cad. Gebze/Kocaeli', 4);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-SPR', 'Gebze Spor Kompleksi ve Tesisleri', 'Spor Tesisi', 'Gaziler Mah. Gençlik Cad. Gebze/Kocaeli', 3);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-SOS', 'Sosyal Tesisler ve Aşevi', 'Sosyal Tesis', 'Eskihisar Mah. Sahil Cad. No:12 Gebze/Kocaeli', 2);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-DEP', 'Merkez Depo ve Ambar Tesisleri', 'Depo ve Ambar', 'Kirazpınar Mah. Lojistik Sahası Gebze/Kocaeli', 2);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-ZAB', 'Merkez Zabıta Hizmet Noktası', 'Zabıta Noktası', 'Hacı Halil Mah. Cumhuriyet Meydanı Gebze/Kocaeli', 2);
INSERT INTO buildings (code, name, building_type, address, total_floors) VALUES
('BLD-SAH', 'Saha ve Muhtarlık Hizmet Noktaları', 'Saha Hizmet Noktası', 'Muhtelif Mahalleler Gebze/Kocaeli', 1);

-- D. ANA HİZMET BİNASI VE MERKEZ DEPO TEMEL KATLARI
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'), 'BODRUM', 'Bodrum Kat', -1, 'Ana arşiv, teknik hacimler ve kapalı otopark alanı');
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'), 'ZEMIN', 'Zemin Kat', 0, 'Vatandaş giriş, danışma, gelirler vezneleri ve bekleme salonu');
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'), 'KAT_1', '1. Kat', 1, 'Mali Hizmetler, Yazı İşleri ve Evrak Kayıt');
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'), 'KAT_2', '2. Kat', 2, 'İnsan Kaynakları, Destek Hizmetleri ve Satın Alma');
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'), 'KAT_3', '3. Kat', 3, 'Bilgi İşlem Müdürlüğü, Sistem Odası ve Yazılım Ofisleri');
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'), 'KAT_4', '4. Kat', 4, 'Başkanlık Makamı, Özel Kalem ve Meclis Salonu');
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-DEP'), 'ZEMIN', 'Zemin Kat (Ana Ambar Sahası)', 0, 'Taşınır ambar giriş, kabul ve istif alanı');

-- E. TEMEL BAŞLANGIÇ ODALARI (EXCEL AKTARIM EŞLEŞTİRMESİ İÇİN)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, capacity, qr_code, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'),
 (SELECT id FROM floors WHERE building_id = (SELECT id FROM buildings WHERE code = 'BLD-ANA') AND floor_code = 'KAT_3'),
 '301', 'Bilgi İşlem Müdür Odası', 'Müdür Odası',
 (SELECT id FROM departments WHERE code = 'DEPT-01'), 6, 'GBZ-ROOM-ANA-K3-301', 'Müdürlük makam ve kabul ofisi');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, capacity, qr_code, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'),
 (SELECT id FROM floors WHERE building_id = (SELECT id FROM buildings WHERE code = 'BLD-ANA') AND floor_code = 'KAT_3'),
 '302', 'Yazılım ve Uygulama Geliştirme Ofisi', 'Personel Ofisi',
 (SELECT id FROM departments WHERE code = 'DEPT-01'), 8, 'GBZ-ROOM-ANA-K3-302', 'Yazılım mühendisleri ve veritabanı uzmanları çalışma alanı');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, capacity, qr_code, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'),
 (SELECT id FROM floors WHERE building_id = (SELECT id FROM buildings WHERE code = 'BLD-ANA') AND floor_code = 'KAT_3'),
 '303', 'Merkez Sistem Odası (Datacenter)', 'Sistem Odası',
 (SELECT id FROM departments WHERE code = 'DEPT-01'), 2, 'GBZ-ROOM-ANA-K3-303', 'Merkez sunucu ve ağ odası');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, capacity, qr_code, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-ANA'),
 (SELECT id FROM floors WHERE building_id = (SELECT id FROM buildings WHERE code = 'BLD-ANA') AND floor_code = 'KAT_2'),
 '201', 'Destek Hizmetleri Müdür Odası', 'Müdür Odası',
 (SELECT id FROM departments WHERE code = 'DEPT-02'), 6, 'GBZ-ROOM-ANA-K2-201', 'Müdürlük makam ofisi');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, capacity, qr_code, description) VALUES
((SELECT id FROM buildings WHERE code = 'BLD-DEP'),
 (SELECT id FROM floors WHERE building_id = (SELECT id FROM buildings WHERE code = 'BLD-DEP') AND floor_code = 'ZEMIN'),
 'D-101', 'Merkez Taşınır Ana Ambarı', 'Depo / Ambar',
 (SELECT id FROM departments WHERE code = 'DEPT-02'), 10, 'GBZ-ROOM-DEP-KZ-101', 'Merkez taşınır ve demirbaş ambarı');

-- F. VARSAYILAN SİSTEM PARAMETRELERİ
INSERT INTO system_settings (param_key, param_value, param_group, description)
VALUES ('CURRENCY_SYMBOL', '₺', 'FINANS', 'Sistem genelinde kullanılacak resmi para birimi simgesi.');
INSERT INTO system_settings (param_key, param_value, param_group, description)
VALUES ('DEPRECIATION_METHOD', 'DOGRUSAL', 'AMORTISMAN', 'Resmi amortisman hesaplama formülü (Doğrusal / Normal Amortisman).');
INSERT INTO system_settings (param_key, param_value, param_group, description)
VALUES ('DEFAULT_USEFUL_LIFE_YEARS', '5', 'AMORTISMAN', 'Genel demirbaşlar için varsayılan faydalı ömür yılı.');
INSERT INTO system_settings (param_key, param_value, param_group, description)
VALUES ('ALERT_WARRANTY_DAYS', '60', 'BILDIRIM', 'Garanti süresi bitişine kaç gün kala sarı uyarı gösterileceği.');
INSERT INTO system_settings (param_key, param_value, param_group, description)
VALUES ('ALERT_INSPECTION_DAYS', '30', 'BILDIRIM', 'Araç muayene (TÜVTÜRK) ve sigorta bitişine kaç gün kala kritik bildirim verileceği.');
INSERT INTO system_settings (param_key, param_value, param_group, description)
VALUES ('QR_CODE_PREFIX', 'GBZ-QR-', 'ETIKET', 'Varlık ve oda etiketleri için resmi belediye QR kod öneki.');
INSERT INTO system_settings (param_key, param_value, param_group, description)
VALUES ('LABEL_PRINT_FORMAT', '80x50_THERMAL', 'ETIKET', 'Varsayılan barkod ve QR kod etiket yazıcı formatı (80mm x 50mm Termal).');

-- G. KURUMSAL BAŞLANGIÇ SAYIM OTURUMU (Saha Sayımı İçin Hazır Oturum)
INSERT INTO inventory_audits (audit_code, title, building_id, department_id, scope_description, total_expected, total_scanned, total_missing, total_excess, status, started_at, lead_auditor, notes)
VALUES ('AUD-KURUMSAL-01', 'Kurumsal Başlangıç ve Yıl Sonu Envanter Sayımı',
        (SELECT id FROM buildings WHERE code = 'BLD-ANA'),
        (SELECT id FROM departments WHERE code = 'DEPT-01'),
        'Ana Hizmet Binası ve bağlı birimlerde barkod/QR okutularak yapılan fiziksel varlık doğrulaması.',
        0, 0, 0, 0, 'DEVAM_EDIYOR', CURRENT_TIMESTAMP, 'Taşınır Kayıt ve Kontrol Yetkilisi', 'Resmi başlangıç sayım oturumu.');

