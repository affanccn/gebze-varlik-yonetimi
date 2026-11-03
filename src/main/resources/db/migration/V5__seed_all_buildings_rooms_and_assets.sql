-- ====================================================================
-- GEBZE BELEDİYESİ VARLIK YÖNETİMİ
-- V5: 12 HİZMET BİNASININ TAMAMINA KAT, ODA VE 16 KATEGORİDE DEMİRBAŞ SEEDING
-- ====================================================================

-- 1. KATLARIN EKLENMESİ (Henüz katı bulunmayan binalar için)
-- --------------------------------------------------------------------

-- Bina 2: Ek Hizmet Binası (3 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 2, 'ZEMIN', 'Zemin Kat (Müracaat & Danışma)', 0, 'Vatandaş müracaat, imar ve ruhsat danışma', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 2 AND floor_code = 'ZEMIN');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 2, 'KAT_1', '1. Kat (İmar ve Şehircilik)', 1, 'İmar ve Şehircilik Müdürlüğü teknik ofisleri', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 2 AND floor_code = 'KAT_1');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 2, 'KAT_2', '2. Kat (Emlak ve İstimlak)', 2, 'Emlak ve İstimlak Müdürlüğü işlem odaları', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 2 AND floor_code = 'KAT_2');

-- Bina 4: Park ve Bahçeler Şantiyesi (2 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 4, 'ZEMIN', 'Zemin Kat (Fidanlık & Sera)', 0, 'Sera, fidanlık ve atölye sahası', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 4 AND floor_code = 'ZEMIN');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 4, 'KAT_1', '1. Kat (Peyzaj & İdari)', 1, 'Peyzaj mimarları ve şeflik ofisleri', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 4 AND floor_code = 'KAT_1');

-- Bina 5: Temizlik İşleri Garajı (2 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 5, 'ZEMIN', 'Zemin Kat (Filo Sahası & Kademe)', 0, 'Süpürme ve çöp araçları peronları', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 5 AND floor_code = 'ZEMIN');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 5, 'KAT_1', '1. Kat (Saha Operasyon Amirliği)', 1, 'Temizlik İşleri vardiya ve sevk amirliği', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 5 AND floor_code = 'KAT_1');

-- Bina 6: Veteriner İşleri Hayvan Bakımevi (2 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 6, 'ZEMIN', 'Zemin Kat (Klinik & Muayene)', 0, 'Klinik, cerrahi operasyon ve muayene salonları', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 6 AND floor_code = 'ZEMIN');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 6, 'KAT_1', '1. Kat (İdari & Karantina)', 1, 'Veteriner hekimlik ve idari kayıt masası', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 6 AND floor_code = 'KAT_1');

-- Bina 7: Gebze Kültür Merkezi (2 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 7, 'ZEMIN', 'Zemin Kat (Tiyatro & Oditoryum)', 0, 'Ana tiyatro salonu, fuaye ve sahne arkası', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 7 AND floor_code = 'ZEMIN');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 7, 'KAT_1', '1. Kat (Şehir Kütüphanesi)', 1, 'Kütüphane, etüt ve dijital araştırma odaları', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 7 AND floor_code = 'KAT_1');

-- Bina 8: Gebze Spor Kompleksi ve Tesisleri (2 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 8, 'ZEMIN', 'Zemin Kat (Kapalı Spor Salonu)', 0, 'Parke zeminli ana spor salonu ve tribünler', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 8 AND floor_code = 'ZEMIN');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 8, 'KAT_1', '1. Kat (Fitness & Antrenör)', 1, 'Kondisyon salonu ve hakem odaları', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 8 AND floor_code = 'KAT_1');

-- Bina 9: Sosyal Tesisler ve Aşevi (1 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 9, 'ZEMIN', 'Zemin Kat (Aşevi & Dağıtım)', 0, 'Sıcak yemek hazırlık, erzak ambarı ve dağıtım', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 9 AND floor_code = 'ZEMIN');

-- Bina 11: Merkez Zabıta Hizmet Noktası (2 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 11, 'ZEMIN', 'Zemin Kat (Karakol & Nöbetçi)', 0, 'Nöbetçi amirliği ve vatandaş şikayet masası', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 11 AND floor_code = 'ZEMIN');

INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 11, 'KAT_1', '1. Kat (Denetim & Telsiz Merkezi)', 1, 'Telsiz santrali, kamera takip ve komuta merkezi', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 11 AND floor_code = 'KAT_1');

-- Bina 12: Saha ve Muhtarlık Hizmet Noktaları (1 kat)
INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
SELECT 12, 'ZEMIN', 'Zemin Kat (İrtibat Masası)', 0, 'Muhtarlıklar koordinasyon ve saha hizmet ofisi', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM floors WHERE building_id = 12 AND floor_code = 'ZEMIN');


-- 2. ODALARIN EKLENMESİ (Tüm binalarda temsili odalar)
-- --------------------------------------------------------------------

-- Bina 1: Ana Hizmet Binası eksik kat odaları
-- Zemin Kat (Floor id: 2)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 2, 'Z-01', 'Vatandaş İletişim ve Danışma Masası', 'Bekleme / Danışma', 10, NULL, 'Selin Aydın', 4, 'GBZ-ROOM-ANA-KZ-Z01', 'Giriş danışma ve vatandaş karşılama masası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-KZ-Z01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 2, 'Z-04', 'Emlak ve Gelirler Veznesi', 'Personel Ofisi', 5, NULL, 'Murat Çelik', 6, 'GBZ-ROOM-ANA-KZ-Z04', 'Belediye gelir tahsilat vezneleri', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-KZ-Z04');

-- 1. Kat (Floor id: 3)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 3, '105', 'Mali Hizmetler Bütçe Servisi', 'Personel Ofisi', 4, NULL, 'Kemal Şahin', 8, 'GBZ-ROOM-ANA-K1-105', 'Bütçe ve muhasebe kesin hesap ofisi', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-105');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 3, '112', 'Yazı İşleri ve Evrak Kayıt Ofisi', 'Personel Ofisi', 6, NULL, 'Ayşe Demir', 6, 'GBZ-ROOM-ANA-K1-112', 'Genel evrak kayıt ve gelen-giden evrak', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-112');

-- 4. Kat (Floor id: 6)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 6, '401', 'Başkanlık Çalışma Makamı', 'Müdür Odası', 7, NULL, 'Özel Kalem Müdürü', 12, 'GBZ-ROOM-ANA-K4-401', 'Belediye Başkanı kabul ve çalışma makamı', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K4-401');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 6, '405', 'Belediye Meclis Salonu', 'Toplantı Odası', 6, NULL, 'Yazı İşleri Müdürü', 60, 'GBZ-ROOM-ANA-K4-405', 'Aylık meclis ve encümen karar salonu', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K4-405');

-- Bina 2: Ek Hizmet Binası
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 2, (SELECT id FROM floors WHERE building_id = 2 AND floor_code = 'ZEMIN'), 'EK-Z01', 'İmar Başvuru ve Ruhsat Masası', 'Personel Ofisi', 15, NULL, 'Tolga Kara', 6, 'GBZ-ROOM-EK-KZ-Z01', 'Vatandaş imar durum ve ruhsat başvuruları', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-KZ-Z01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 2, (SELECT id FROM floors WHERE building_id = 2 AND floor_code = 'KAT_1'), 'EK-102', 'Şehir Plancıları ve Mimari Proje Çizim Ofisi', 'Teknik Oda', 15, NULL, 'Merve Korkmaz', 8, 'GBZ-ROOM-EK-K1-102', 'Nazım imar planları ve CAD tasarım istasyonları', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K1-102');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 2, (SELECT id FROM floors WHERE building_id = 2 AND floor_code = 'KAT_2'), 'EK-201', 'Emlak İstimlak ve Kamulaştırma Servisi', 'Personel Ofisi', 16, NULL, 'Bülent Yalçın', 6, 'GBZ-ROOM-EK-K2-201', 'Taşınmaz kayıtları ve kamulaştırma işlemleri', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K2-201');

-- Bina 3: Fen İşleri Şantiyesi
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 3, 7, 'F-02', 'İş Makineleri Hangarı ve Sevk Odası', 'Depo / Ambar', 11, 9, 'Hasan Güler', 4, 'GBZ-ROOM-FEN-KZ-F02', 'Beko loder, silindir ve ekskavatör kapalı park alanı', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-KZ-F02');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 3, 8, 'F-101', 'Yol Yapım ve Şantiye Mühendislik Ofisi', 'Personel Ofisi', 11, 10, 'Erdem Aksoy', 6, 'GBZ-ROOM-FEN-K1-F101', 'Saha keşif, metraj ve asfalt serim kontrol', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-K1-F101');

-- Bina 4: Park ve Bahçeler Şantiyesi
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 4, (SELECT id FROM floors WHERE building_id = 4 AND floor_code = 'ZEMIN'), 'P-01', 'Sera ve Fidanlık İdare Ofisi', 'Personel Ofisi', 12, 13, 'Gülfem Yurt', 4, 'GBZ-ROOM-PRK-KZ-P01', 'Fidan, mevsimlik çiçek ve çalı üretim kontrolü', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-PRK-KZ-P01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 4, (SELECT id FROM floors WHERE building_id = 4 AND floor_code = 'ZEMIN'), 'P-02', 'Motorlu Aletler ve Çim Biçme Deposu', 'Depo / Ambar', 12, 12, 'Osman Tarhan', 4, 'GBZ-ROOM-PRK-KZ-P02', 'Çim traktörleri, tırpan ve dal öğütücüler', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-PRK-KZ-P02');

-- Bina 5: Temizlik İşleri Garajı
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 5, (SELECT id FROM floors WHERE building_id = 5 AND floor_code = 'ZEMIN'), 'T-01', 'Çöp Kamyonları ve Filo Garaj Odası', 'Depo / Ambar', 13, NULL, 'Cemil Koç', 4, 'GBZ-ROOM-TEM-KZ-T01', 'Hidrolik sıkıştırmalı çöp araçları ve süpürme makineleri', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-TEM-KZ-T01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 5, (SELECT id FROM floors WHERE building_id = 5 AND floor_code = 'KAT_1'), 'T-101', 'Saha Operasyon ve Vardiya Amirliği', 'Personel Ofisi', 13, NULL, 'Fatih Vural', 6, 'GBZ-ROOM-TEM-K1-T101', 'İlçe geneli temizlik güzergahı ve personel sevk', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-TEM-K1-T101');

-- Bina 6: Veteriner İşleri Hayvan Bakımevi
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 6, (SELECT id FROM floors WHERE building_id = 6 AND floor_code = 'ZEMIN'), 'V-01', 'Veteriner Muayene ve Röntgen Odası', 'Teknik Oda', 26, NULL, 'Vet. Hekim Canan Efe', 4, 'GBZ-ROOM-VET-KZ-V01', 'Sokak hayvanları dijital röntgen ve ultrason teşhis odası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-VET-KZ-V01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 6, (SELECT id FROM floors WHERE building_id = 6 AND floor_code = 'ZEMIN'), 'V-02', 'Aşı ve Medikal İlaç Deposu', 'Depo / Ambar', 26, NULL, 'Sağlık Teknikeri Emre', 2, 'GBZ-ROOM-VET-KZ-V02', 'Soğuk zincir kuduz aşıları ve cerrahi sarf deposu', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-VET-KZ-V02');

-- Bina 7: Gebze Kültür Merkezi
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 7, (SELECT id FROM floors WHERE building_id = 7 AND floor_code = 'ZEMIN'), 'K-01', 'Tiyatro Salonu Ses ve Reji Kabini', 'Teknik Oda', 22, NULL, 'Serdar Kurt (Sesçi)', 3, 'GBZ-ROOM-KUL-KZ-K01', '600 kişilik tiyatro salonu ışık robotları ve ses masası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-KUL-KZ-K01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 7, (SELECT id FROM floors WHERE building_id = 7 AND floor_code = 'KAT_1'), 'K-101', 'Şehir Kütüphanesi Araştırma Salonu', 'Personel Ofisi', 22, NULL, 'Kütüphaneci Zeynep', 40, 'GBZ-ROOM-KUL-K1-K101', 'Gençlik etüt, dijital katalog ve kitap okuma salonu', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-KUL-K1-K101');

-- Bina 8: Gebze Spor Kompleksi ve Tesisleri
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 8, (SELECT id FROM floors WHERE building_id = 8 AND floor_code = 'ZEMIN'), 'S-01', 'Kapalı Spor Salonu Tesis Yönetimi', 'Personel Ofisi', 23, NULL, 'Uğur Sönmez', 4, 'GBZ-ROOM-SPR-KZ-S01', 'Basketbol / Voleybol sahası ve turnuva koordinasyonu', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-SPR-KZ-S01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 8, (SELECT id FROM floors WHERE building_id = 8 AND floor_code = 'KAT_1'), 'S-101', 'Fitness ve Kondisyon Ekipmanları Alanı', 'Ortak Alan', 23, NULL, 'Antrenör Barış', 25, 'GBZ-ROOM-SPR-K1-S101', 'Halka açık spor ve kardiyo aletleri istasyonu', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-SPR-K1-S101');

-- Bina 9: Sosyal Tesisler ve Aşevi
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 9, (SELECT id FROM floors WHERE building_id = 9 AND floor_code = 'ZEMIN'), 'A-01', 'Aşevi Mutfak ve Sıcak Yemek Üretim Alanı', 'Teknik Oda', 24, NULL, 'Aşçıbaşı Necati Usta', 8, 'GBZ-ROOM-SOS-KZ-A01', 'Günlük 3000 kişilik sıcak yemek kazanı ve hazırlık', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-SOS-KZ-A01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 9, (SELECT id FROM floors WHERE building_id = 9 AND floor_code = 'ZEMIN'), 'A-02', 'Soğuk Hava Deposu ve Gıda Ambarı', 'Depo / Ambar', 24, NULL, 'Depo Sorumlusu İsmet', 2, 'GBZ-ROOM-SOS-KZ-A02', 'Et, sebze ve kuru erzak muhafaza ambarı', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-SOS-KZ-A02');

-- Bina 10: Merkez Depo ve Ambar Tesisleri
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 10, 9, 'D-102', 'Dayanıklı Taşınır ve Bilişim Deposu', 'Depo / Ambar', 2, 6, 'Ahmet Yıldız', 4, 'GBZ-ROOM-DEP-KZ-D102', 'Yeni gelen bilgisayar, mobilya ve donanım kabul ambarı', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-DEP-KZ-D102');

-- Bina 11: Merkez Zabıta Hizmet Noktası
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 11, (SELECT id FROM floors WHERE building_id = 11 AND floor_code = 'ZEMIN'), 'Z-01', 'Merkez Zabıta Karakol Amirliği', 'Personel Ofisi', 21, 14, 'Zabıta Komiseri Levent', 8, 'GBZ-ROOM-ZAB-KZ-Z01', 'Çarşı, pazar ve işyeri denetim ekipleri toplanma alanı', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ZAB-KZ-Z01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 11, (SELECT id FROM floors WHERE building_id = 11 AND floor_code = 'KAT_1'), 'Z-101', 'Kent Güvenlik ve Telsiz Santrali', 'Teknik Oda', 21, 15, 'Telsiz Operatörü Sinan', 4, 'GBZ-ROOM-ZAB-K1-Z101', 'Telsiz anonsları ve kamera takip masası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ZAB-K1-Z101');

-- Bina 12: Saha ve Muhtarlık Hizmet Noktaları
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 12, (SELECT id FROM floors WHERE building_id = 12 AND floor_code = 'ZEMIN'), 'M-01', 'Muhtarlıklar Koordinasyon Masası', 'Personel Ofisi', 29, NULL, 'Muhtarlık Koordinatörü Ali', 4, 'GBZ-ROOM-SAH-KZ-M01', '40 mahalle muhtarı irtibat ve talep masası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-SAH-KZ-M01');


-- 3. TÜM 16 KATEGORİDE VE HER BİNADA GERÇEKÇİ DEMİRBAŞLAR
-- --------------------------------------------------------------------

-- Kategori 5: İş Makineleri
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-006', '255.05.01.01', 'GBZ-869020260006', 'Lastikli Kazıcı Yükleyici (Beko Loder)',
    'İş Makineleri', 'JCB 4CX Tier 4 Final', 'SN-JCB-889012',
    'Fen İşleri Müdürlüğü (Yol Bakım ve Onarım Birimi)',
    'Fen İşleri Şantiyesi - Hangar - Oda F-02', 'Operatör Mehmet Dağ',
    'Aktif', 'Çok İyi', DATE '2025-04-10', DATE '2028-04-10', 4850000.0,
    'SİF İş Makineleri A.Ş.', 'İlçe geneli altyapı, kanal ve yol kazı çalışmalarında kullanılmaktadır.',
    11, 9, 3, 7, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-KZ-F02'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-05'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-006');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-007', '255.05.02.04', 'GBZ-869020260007', 'Tandem Asfalt Silindiri (Vibrasyonlu)',
    'İş Makineleri', 'Bomag BW 120 AD-5', 'SN-BMG-774019',
    'Fen İşleri Müdürlüğü (Asfalt Üretim ve Serim Şefliği)',
    'Fen İşleri Şantiyesi - Hangar - Oda F-02', 'Operatör Selim Güçlü',
    'Aktif', 'İyi', DATE '2024-06-15', DATE '2027-06-15', 3200000.0,
    'Borusan Makina', 'Asfalt serim sıkıştırma ve yol onarım çalışmalarında görevli.',
    11, 10, 3, 7, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-KZ-F02'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-05'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-007');

-- Kategori 6: Araç ve Taşıtlar
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-009', '255.06.01.08', 'GBZ-869020260009', 'Hidrolik Sıkıştırmalı Çöp Kamyonu (13+1.5 m³)',
    'Araç ve Taşıtlar', 'Ford Cargo 1833 DC Hidromak', 'SN-FRD-990145',
    'Temizlik İşleri Müdürlüğü (Araç ve Ekipman Birimi)',
    'Temizlik İşleri Garajı - Zemin Kat - Oda T-01', 'Kaptan Şoför Recep Uçar',
    'Aktif', 'İyi', DATE '2025-01-20', DATE '2028-01-20', 5600000.0,
    'Ford Otosan A.Ş.', 'Gebze merkez mahalleleri çöp toplama ve nakil aracı.',
    13, NULL, 5, (SELECT id FROM floors WHERE building_id = 5 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-TEM-KZ-T01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-06'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-009');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-011', '255.06.02.01', 'GBZ-869020260011', 'Zabıta Devriye Hizmet Aracı',
    'Araç ve Taşıtlar', 'Renault Megane Sedan 1.3 TCe Tepe Lambalı', 'SN-RNL-552140',
    'Zabıta Müdürlüğü (Trafik ve Çevre Zabıtası Birimi)',
    'Merkez Zabıta Hizmet Noktası - Zemin Kat - Oda Z-01', 'Zabıta Memuru Erkan',
    'Aktif', 'Çok İyi', DATE '2025-08-14', DATE '2028-08-14', 1450000.0,
    'Mais A.Ş.', 'Telsiz ve tepe lambası donanımlı resmi zabıta denetim aracı.',
    21, 15, 11, (SELECT id FROM floors WHERE building_id = 11 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ZAB-KZ-Z01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-06'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-011');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-012', '255.06.03.02', 'GBZ-869020260012', 'Hayvan Nakil ve Acil Müdahale Ambulansı',
    'Araç ve Taşıtlar', 'Ford Transit 350L Medikal Donanımlı', 'SN-FRD-441209',
    'Veteriner İşleri Müdürlüğü',
    'Veteriner İşleri Hayvan Bakımevi - Zemin Kat - Oda V-01', 'Saha Ekip Sorumlusu Tarık',
    'Aktif', 'Çok İyi', DATE '2025-05-18', DATE '2028-05-18', 2100000.0,
    'Ford Otosan / Özel Ambulans Dizayn', 'Yaralı ve hasta sokak hayvanları yerinde müdahale aracı.',
    26, NULL, 6, (SELECT id FROM floors WHERE building_id = 6 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-VET-KZ-V01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-06'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-012');

-- Kategori 9: Temizlik Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-013', '255.09.01.01', 'GBZ-869020260013', 'Kompakt Vakumlu Yol Süpürme Aracı',
    'Temizlik Ekipmanları', 'Dulevo 5000 Evolution', 'SN-DLV-330192',
    'Temizlik İşleri Müdürlüğü (Çevre Temizlik Birimi)',
    'Temizlik İşleri Garajı - Zemin Kat - Oda T-01', 'Operatör İlhan Şen',
    'Aktif', 'İyi', DATE '2024-09-10', DATE '2027-09-10', 4200000.0,
    'Dulevo Türkiye', 'Yaya yolları, meydanlar ve ana caddelerin vakumlu temizliğinde görevli.',
    13, NULL, 5, (SELECT id FROM floors WHERE building_id = 5 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-TEM-KZ-T01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-09'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-013');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-014', '255.09.02.04', 'GBZ-869020260014', 'Binicili Endüstriyel Zemin Yıkama Makinesi',
    'Temizlik Ekipmanları', 'Kärcher B 250 R Akülü', 'SN-KRC-881290',
    'Kültür İşleri Müdürlüğü (Kültür Merkezi Yönetimi)',
    'Gebze Kültür Merkezi - Zemin Kat - Oda K-01', 'Temizlik Şefi Fatma',
    'Aktif', 'Çok İyi', DATE '2025-02-11', DATE '2027-02-11', 480000.0,
    'Kärcher Türkiye', 'Kültür merkezi fuaye ve sergi salonlarının günlük hijyenik temizliği.',
    22, NULL, 7, (SELECT id FROM floors WHERE building_id = 7 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-KUL-KZ-K01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-09'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-014');

-- Kategori 11: Tıbbi ve Veteriner Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-016', '255.11.01.01', 'GBZ-869020260016', 'Dijital Veteriner Röntgen Cihazı (DR Panel)',
    'Tıbbi ve Veteriner Ekipmanları', 'Carestream Vita Flex CR & DR Panel', 'SN-CST-662319',
    'Veteriner İşleri Müdürlüğü',
    'Veteriner İşleri Hayvan Bakımevi - Zemin Kat - Oda V-01', 'Vet. Hekim Canan Efe',
    'Aktif', 'Çok İyi', DATE '2025-03-01', DATE '2028-03-01', 1350000.0,
    'Medikal Sistemler Ltd.', 'Yüksek çözünürlüklü dijital kemik ve yumuşak doku görüntüleme.',
    26, NULL, 6, (SELECT id FROM floors WHERE building_id = 6 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-VET-KZ-V01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-11'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-016');

-- Kategori 14: Park ve Bahçe Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-019', '255.14.01.02', 'GBZ-869020260019', 'Binicili Çim Biçme Traktörü',
    'Park ve Bahçe Ekipmanları', 'John Deere X350R Çift Bıçaklı', 'SN-JND-119283',
    'Park ve Bahçeler Müdürlüğü (Park Bakım ve Revizyon Şefliği)',
    'Park ve Bahçeler Şantiyesi - Zemin Kat - Oda P-02', 'Bahçıvan Başı Salih',
    'Aktif', 'Çok İyi', DATE '2025-04-25', DATE '2027-04-25', 450000.0,
    'Agro Bahçe Ekipmanları', 'Parklar ve yeşil alanlarda geniş yüzeyli çim biçme çalışmaları.',
    12, 12, 4, (SELECT id FROM floors WHERE building_id = 4 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-PRK-KZ-P02'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-14'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-019');

-- Kategori 13: Kültür ve Etkinlik Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-022', '255.13.01.03', 'GBZ-869020260022', '72 Kanallı Dijital Canlı Ses Konsolu',
    'Kültür ve Etkinlik Ekipmanları', 'Yamaha CL5 Digital Mixing Console', 'SN-YMH-881029',
    'Kültür İşleri Müdürlüğü (Organizasyon Birimi)',
    'Gebze Kültür Merkezi - Zemin Kat - Oda K-01', 'Ses Mühendisi Serdar Kurt',
    'Aktif', 'Çok İyi', DATE '2025-01-15', DATE '2028-01-15', 1150000.0,
    'Asf Ses Işık A.Ş.', 'Ana tiyatro salonu profesyonel ses miksajı ve Dante ağ entegrasyonu.',
    22, NULL, 7, (SELECT id FROM floors WHERE building_id = 7 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-KUL-KZ-K01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-13'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-022');

-- Kategori 12: Spor Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-025', '255.12.01.01', 'GBZ-869020260025', 'FIBA Onaylı 24 Saniye Elektronik Skorboard',
    'Spor Ekipmanları', 'Nevita Multisport Pro Skorboard Sistemi', 'SN-NVT-554109',
    'Gençlik ve Spor Hizmetleri Müdürlüğü',
    'Gebze Spor Kompleksi ve Tesisleri - Zemin Kat - Oda S-01', 'Spor Tesisleri Amiri Uğur Sönmez',
    'Aktif', 'Çok İyi', DATE '2025-06-10', DATE '2028-06-10', 380000.0,
    'Skorboard Elektronik', 'Resmi voleybol ve basketbol müsabakaları skor ve süre takip sistemi.',
    23, NULL, 8, (SELECT id FROM floors WHERE building_id = 8 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-SPR-KZ-S01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-12'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-025');

-- Kategori 10: Güvenlik ve Koruma Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-027', '255.10.01.02', 'GBZ-869020260027', 'Çanta ve Bagaj X-Ray Kontrol Cihazı',
    'Güvenlik ve Koruma Ekipmanları', 'Rapiscan 620XR Dual View', 'SN-RPS-443912',
    'Destek Hizmetleri Müdürlüğü (İdari İşler ve Hizmet Binaları Şefliği)',
    'Ana Hizmet Binası - Zemin Kat - Oda Z-01', 'Güvenlik Amiri Kadir',
    'Aktif', 'Çok İyi', DATE '2024-11-05', DATE '2027-11-05', 920000.0,
    'Savunma Güvenlik Ltd.', 'Ana hizmet binası protokol ve vatandaş giriş kapısı güvenlik kontrolü.',
    2, 7, 1, 2, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-KZ-Z01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-10'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-027');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-029', '255.10.02.01', 'GBZ-869020260029', 'Kriptolu Sayısal DMR Telsiz Santrali & Röle',
    'Güvenlik ve Koruma Ekipmanları', 'Aselsan 4700 Sayısal Röle ve Konsol', 'SN-ASL-998811',
    'Zabıta Müdürlüğü (Denetim ve İnzibat Şefliği)',
    'Merkez Zabıta Hizmet Noktası - 1. Kat - Oda Z-101', 'Telsiz Operatörü Sinan',
    'Aktif', 'Çok İyi', DATE '2025-02-14', DATE '2029-02-14', 650000.0,
    'Aselsan A.Ş.', 'İlçe genelindeki tüm zabıta ve saha araçlarıyla şifreli sayısal telsiz ağı.',
    21, 14, 11, (SELECT id FROM floors WHERE building_id = 11 AND floor_code = 'KAT_1'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ZAB-K1-Z101'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-10'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-029');

-- Kategori 4: İklimlendirme ve Enerji
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-030', '255.04.01.01', 'GBZ-869020260030', 'Kabinli Dizel Jeneratör Seti (275 kVA)',
    'İklimlendirme ve Enerji', 'Aksa APD-275A Cummins Motorlu', 'SN-AKS-771249',
    'Destek Hizmetleri Müdürlüğü (Bakım ve Onarım Atölye Şefliği)',
    'Ana Hizmet Binası - Bodrum Kat - Oda B-08', 'Teknisyen Zafer',
    'Aktif', 'Çok İyi', DATE '2024-08-20', DATE '2027-08-20', 1250000.0,
    'Aksa Jeneratör A.Ş.', 'Belediye ana hizmet binası kesintisiz otomatik şebeke yedek güç kaynağı.',
    2, 8, 1, 1, 9,
    (SELECT id FROM asset_categories WHERE code = 'CAT-04'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-030');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-032', '255.04.02.03', 'GBZ-869020260032', 'Endüstriyel Kesintisiz Güç Kaynağı (160 kVA)',
    'İklimlendirme ve Enerji', 'Schneider Galaxy VM 160kVA 3:3', 'SN-SCH-220194',
    'Bilgi İşlem Müdürlüğü (Sistem ve Ağ Yönetimi Birimi)',
    'Ana Hizmet Binası - Bodrum Kat - Oda B-08', 'Sistem Yöneticisi Hakan Çetin',
    'Aktif', 'Çok İyi', DATE '2025-01-10', DATE '2028-01-10', 950000.0,
    'Schneider Electric', 'Datacenter ve acil aydınlatma sistemlerini anlık besleyen akü grubu.',
    1, 2, 1, 1, 9,
    (SELECT id FROM asset_categories WHERE code = 'CAT-04'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-032');

-- Kategori 3: Elektronik Cihazlar
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-034', '255.03.01.01', 'GBZ-869020260034', 'Kurumsal IP Telefon Santrali & Sunucu',
    'Elektronik Cihazlar', 'Alcatel-Lucent OmniPCX Enterprise', 'SN-ALC-663012',
    'Bilgi İşlem Müdürlüğü (Sistem ve Ağ Yönetimi Birimi)',
    'Ana Hizmet Binası - 3. Kat - Oda 303 (Sistem Odası)', 'Santral Teknisyeni Kerem',
    'Aktif', 'Çok İyi', DATE '2024-10-15', DATE '2027-10-15', 780000.0,
    'Alcatel Türkiye', 'Gebze Belediyesi tüm hizmet binaları dahili görüşme santral altyapısı.',
    1, 2, 1, 5, 3,
    (SELECT id FROM asset_categories WHERE code = 'CAT-03'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-034');

-- Kategori 7: El Aletleri ve Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-035', '255.07.01.04', 'GBZ-869020260035', 'Ağır Hizmet Kırıcı Delici Matkap Seti',
    'El Aletleri ve Ekipmanları', 'Hilti TE 70-ATC/AVR SDS-Max', 'SN-HLT-551209',
    'Fen İşleri Müdürlüğü (Teknik Kontrol Birimi)',
    'Fen İşleri Şantiyesi - Zemin Kat - Oda F-01', 'Usta Başı Ali Kemal',
    'Aktif', 'İyi', DATE '2024-05-12', DATE '2026-05-12', 95000.0,
    'Hilti Türkiye', 'Beton kırım, karot ve asfalt ankraj işlerinde kullanılan el aleti seti.',
    11, NULL, 3, 7, 11,
    (SELECT id FROM asset_categories WHERE code = 'CAT-07'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-035');

-- Kategori 15: Depo ve Taşıma Ekipmanları
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-037', '255.15.01.01', 'GBZ-869020260037', 'Akülü Elektrikli Transpalet (2 Ton)',
    'Depo ve Taşıma Ekipmanları', 'Jungheinrich EJE 120 AC', 'SN-JNG-889120',
    'Destek Hizmetleri Müdürlüğü (Taşınır Kayıt ve Kontrol Birimi)',
    'Merkez Depo ve Ambar Tesisleri - Zemin Kat - Oda D-101', 'Ambar Memuru Hüseyin',
    'Aktif', 'Çok İyi', DATE '2025-02-18', DATE '2027-02-18', 280000.0,
    'Jungheinrich Türkiye', 'Gelen ambar malzemelerinin paletli yükleme, boşaltma ve istiflemesi.',
    2, 6, 10, 9, 10,
    (SELECT id FROM asset_categories WHERE code = 'CAT-15'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-037');

-- Kategori 16: Diğer Demirbaşlar
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-040', '255.16.01.05', 'GBZ-869020260040', 'Otomatik FM-200 Gazlı Yangın Söndürme Paneli',
    'Diğer Demirbaşlar', 'Fike Cheetah Xi FM-200 Gazlı Sistem', 'SN-FKE-443910',
    'Bilgi İşlem Müdürlüğü (Bilgi Güvenliği Birimi)',
    'Ana Hizmet Binası - 3. Kat - Oda 303 (Sistem Odası)', 'Güvenlik Sorumlusu Caner',
    'Aktif', 'Çok İyi', DATE '2025-01-08', DATE '2029-01-08', 410000.0,
    'Fike Yangın Güvenlik', 'Sistem odası ve sunucu kabinleri için kalıntısız temiz gazlı yangın koruması.',
    1, 4, 1, 5, 3,
    (SELECT id FROM asset_categories WHERE code = 'CAT-16'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-040');

-- Kategori 2: Ofis Mobilyaları (Ek Kayıtlar)
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-041', '255.02.01.03', 'GBZ-869020260041', 'Başkanlık VIP Deri Makam Grubu',
    'Ofis Mobilyaları', 'Doxa Executive VIP Makam Seti (Ceviz/Deri)', 'SN-DOX-110942',
    'Özel Kalem Müdürlüğü',
    'Ana Hizmet Binası - 4. Kat - Oda 401', 'Özel Kalem Müdürü',
    'Aktif', 'Çok İyi', DATE '2025-07-01', DATE '2028-07-01', 240000.0,
    'Doxa Ofis Mobilyaları', 'Başkanlık çalışma odası makam masası, etajer, sehpa ve deri koltuk takımı.',
    7, NULL, 1, 6, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K4-401'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-02'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-041');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-042', '255.02.02.01', 'GBZ-869020260042', 'Meclis ve Encümen Toplantı Masası (30 Kişilik)',
    'Ofis Mobilyaları', 'Bürotime Grand Konferans Serisi (30 Kişilik U Tipi)', 'SN-BRT-339182',
    'Yazı İşleri Müdürlüğü',
    'Ana Hizmet Binası - 4. Kat - Oda 405 (Meclis Salonu)', 'Meclis İşleri Şefi',
    'Aktif', 'Çok İyi', DATE '2024-12-10', DATE '2027-12-10', 310000.0,
    'Bürotime A.Ş.', 'Entegre mikrofon ve multimedya priz kutulu 30 kişilik toplantı masası.',
    6, NULL, 1, 6, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K4-405'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-02'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-042');

-- Kategori 1: Bilişim Ekipmanları (Ek Kayıtlar)
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-043', '255.01.01.01', 'GBZ-869020260043', 'Kurumsal Rack Veritabanı Sunucusu',
    'Bilişim Ekipmanları', 'Dell PowerEdge R750xs (2x Xeon Gold, 256GB RAM, 8x SAS SSD)', 'SN-DLL-994120',
    'Bilgi İşlem Müdürlüğü (Sistem ve Ağ Yönetimi Birimi)',
    'Ana Hizmet Binası - 3. Kat - Oda 303 (Sistem Odası)', 'Kıdemli Sistem Mühendisi Okan',
    'Aktif', 'Çok İyi', DATE '2025-03-20', DATE '2028-03-20', 680000.0,
    'Dell Technologies', 'Oracle 23ai ve belediye MIS uygulamaları birincil kurumsal veri tabanı sunucusu.',
    1, 2, 1, 5, 3,
    (SELECT id FROM asset_categories WHERE code = 'CAT-01'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-043');

INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-045', '255.01.02.04', 'GBZ-869020260045', 'İmar ve CAD Çizim İş İstasyonu',
    'Bilişim Ekipmanları', 'HP Z2 G9 Tower (Core i9, 64GB DDR5, RTX A4000 16GB)', 'SN-HPZ-332194',
    'İmar ve Şehircilik Müdürlüğü',
    'Ek Hizmet Binası - 1. Kat - Oda EK-102', 'Mimar Gülşen',
    'Aktif', 'Çok İyi', DATE '2025-06-12', DATE '2028-06-12', 145000.0,
    'HP Türkiye', 'Netcad, AutoCAD ve CBS coğrafi bilgi sistemleri harita çizim bilgisayarı.',
    15, NULL, 2, (SELECT id FROM floors WHERE building_id = 2 AND floor_code = 'KAT_1'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K1-102'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-01'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-045');

-- Saha İrtibat Masası Varlığı
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-046', '255.01.03.01', 'GBZ-869020260046', 'Saha Mobil İrtibat Dizüstü Bilgisayarı',
    'Bilişim Ekipmanları', 'Lenovo ThinkPad L15 G4 (AMD Ryzen 7, 32GB RAM)', 'SN-LNV-771203',
    'Muhtarlık İşleri Müdürlüğü',
    'Saha ve Muhtarlık Hizmet Noktaları - Zemin Kat - Oda M-01', 'Muhtarlık İrtibat Sorumlusu Ali',
    'Aktif', 'Çok İyi', DATE '2025-09-01', DATE '2028-09-01', 52000.0,
    'Lenovo Türkiye', 'Muhtarlarla saha görüşmeleri ve talep kayıt işlemleri için taşınabilir cihaz.',
    29, NULL, 12, (SELECT id FROM floors WHERE building_id = 12 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-SAH-KZ-M01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-01'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-046');

-- Aşevi Sıcak Yemek Pişirme Kazanı (Kategori 16: Diğer Demirbaşlar)
INSERT INTO assets (
    code, tif_code, barcode, name, category, brand_model, serial_number,
    unit_name, location_info, assignee_name, status, condition_status,
    acquisition_date, warranty_end_date, estimated_value, supplier, notes,
    department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active
)
SELECT
    'GBZ-AST-047', '255.16.02.01', 'GBZ-869020260047', 'Endüstriyel Devrilir Yemek Kaynatma Kazanı (500 Lt)',
    'Diğer Demirbaşlar', 'İnoksan Otomatik Buharlı Devrilir Tencere 500L', 'SN-INK-884190',
    'Sosyal Yardım İşleri Müdürlüğü',
    'Sosyal Tesisler ve Aşevi - Zemin Kat - Oda A-01', 'Aşçıbaşı Necati Usta',
    'Aktif', 'Çok İyi', DATE '2024-11-20', DATE '2027-11-20', 380000.0,
    'İnoksan Mutfak A.Ş.', 'Günlük sıcak çorba ve yemek pişiriminde kullanılan hidrolik devirmeli ana kazan.',
    24, NULL, 9, (SELECT id FROM floors WHERE building_id = 9 AND floor_code = 'ZEMIN'), (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-SOS-KZ-A01'),
    (SELECT id FROM asset_categories WHERE code = 'CAT-16'), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-047');

COMMIT;

