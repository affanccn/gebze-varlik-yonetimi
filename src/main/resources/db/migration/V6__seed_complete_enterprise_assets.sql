-- ==============================================================================
-- GEBZE BELEDİYESİ VARLIK YÖNETİM SİSTEMİ
-- V6: 30 MÜDÜRLÜK, TÜM ALT BİRİMLER, ODALAR VE EKSİKSİZ DEMİRBAŞ ENENVANTERİ
-- Her müdürlükte, her alt birimde ve her odada en az bir veya birden fazla gerçek varlık.
-- ==============================================================================

-- 1. MEVCUT ODALARIN VE VARLIKLARIN DOĞRU MÜDÜRLÜK İLİŞKİLERİNİ GÜNCELLE
UPDATE rooms SET department_id = 22 WHERE room_number IN ('V-01', 'V-02');
UPDATE rooms SET department_id = 25 WHERE room_number IN ('K-01', 'K-101');
UPDATE rooms SET department_id = 26 WHERE room_number IN ('S-01', 'S-101');
UPDATE rooms SET department_id = 24 WHERE room_number IN ('A-01', 'A-02');
UPDATE rooms SET department_id = 10 WHERE room_number = 'Z-01' AND building_id = 1;
UPDATE rooms SET department_id = 5  WHERE room_number = 'Z-04';
UPDATE rooms SET department_id = 4  WHERE room_number = '105';
UPDATE rooms SET department_id = 16 WHERE room_number = 'EK-201';

UPDATE assets SET department_id = 22 WHERE id IN (25, 28);
UPDATE assets SET department_id = 25 WHERE id IN (27, 30);
UPDATE assets SET department_id = 26 WHERE id = 31;
UPDATE assets SET department_id = 24 WHERE id = 45;
UPDATE assets SET department_id = 15 WHERE id = 43;
UPDATE assets SET department_id = 6  WHERE id IN (5, 41);
UPDATE assets SET department_id = 7  WHERE id = 40;
UPDATE assets SET department_id = 29 WHERE id = 44;

-- 2. TÜM EKSİK ALT BİRİMLERİ (ŞEFLİKLER & SERVİSLER) EKLE
-- DEPT-03: İnsan Kaynakları ve Eğitim Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 3, 'SUB-03-01', 'Personel ve Özlük İşleri Şefliği', 'Şeflik', 'Mehmet Yılmaz', '0262 642 04 31', 'Tüm memur, sözleşmeli ve işçi personel özlük dosyaları ve sicil yönetimi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-03-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 3, 'SUB-03-02', 'Eğitim ve Gelişim Birimi', 'Birim', 'Gülşah Arslan', '0262 642 04 32', 'Hizmet içi eğitimler, stajyer koordinasyonu ve kurumsal akademi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-03-02');

-- DEPT-04: Mali Hizmetler Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 4, 'SUB-04-01', 'Bütçe ve Kesin Hesap Şefliği', 'Şeflik', 'Kemal Şahin', '0262 642 04 41', 'Yıllık belediye bütçesi hazırlık, performans programı ve kesin hesap'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-04-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 4, 'SUB-04-02', 'Muhasebe ve Finansman Servisi', 'Servis', 'Zeynep Kaya', '0262 642 04 42', 'Ödeme emirleri, emanet hesapları ve kamu banka mutabakatları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-04-02');

-- DEPT-05: Gelirler Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 5, 'SUB-05-01', 'Emlak ve Çevre Temizlik Vergisi Servisi', 'Servis', 'Murat Çelik', '0262 642 04 51', 'Bina, arsa, arazi beyanları ve vergi tarh işlemleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-05-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 5, 'SUB-05-02', 'Tahakkuk ve Tahsilat Vezneleri Şefliği', 'Şeflik', 'Fatma Doğan', '0262 642 04 52', 'Merkez vezneler, online ödeme sistemleri ve tahsilat takibi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-05-02');

-- DEPT-06: Yazı İşleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 6, 'SUB-06-01', 'Meclis ve Encümen Kararları Şefliği', 'Şeflik', 'Ayşe Demir', '0262 642 04 61', 'Belediye meclis gündemi, tutanaklar ve encümen kararları kaydı'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-06-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 6, 'SUB-06-02', 'Genel Evrak ve Arşiv Birimi', 'Birim', 'Hasan Güler', '0262 642 04 62', 'Kurumsal gelen-giden evrak ve dijital evrak kayıt arşivi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-06-02');

-- DEPT-07: Özel Kalem Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 7, 'SUB-07-01', 'Protokol ve Makam Koordinasyon Şefliği', 'Şeflik', 'Özel Kalem Müdürü', '0262 642 04 71', 'Belediye Başkanı günlük programı, kabul ve resmi heyet protokolü'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-07-01');

-- DEPT-08: Hukuk İşleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 8, 'SUB-08-01', 'Adli ve İdari Yargı Dava Servisi', 'Servis', 'Av. Burak Karaca', '0262 642 04 81', 'Belediyeyi ilgilendiren adli, idari ve vergi mahkemesi davaları takibi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-08-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 8, 'SUB-08-02', 'İcra Takip ve Hukuk Müşavirliği Şefliği', 'Şeflik', 'Av. Ece Yıldırım', '0262 642 04 82', 'Kurumsal alacak icra takipleri ve idari sözleşme hukuki incelemeleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-08-02');

-- DEPT-09: Rehberlik ve Teftiş Kurulu Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 9, 'SUB-09-01', 'Müfettiş İnceleme ve Denetim Grubu', 'Grup', 'Başmüfettiş Sinan Öz', '0262 642 04 91', 'Müdürlük ve birimlerin idari, mali ve yasal işleyiş denetimleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-09-01');

-- DEPT-10: Basın Yayın ve Halkla İlişkiler Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 10, 'SUB-10-01', 'Medya Takip ve Haber Bülteni Şefliği', 'Şeflik', 'Selin Aydın', '0262 642 05 01', 'Haber bültenleri, basın açıklamaları ve fotoğraf video arşivi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-10-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 10, 'SUB-10-02', 'Sosyal Medya ve Dijital İletişim Birimi', 'Birim', 'Cemil Koç', '0262 642 05 02', 'Sosyal medya hesap yönetimi, canlı yayınlar ve video prodüksiyon'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-10-02');

-- DEPT-13: Temizlik İşleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 13, 'SUB-13-01', 'Katı Atık ve Çöp Toplama Şefliği', 'Şeflik', 'Garaj Amiri Rıza', '0262 642 05 31', 'Gebze geneli 40 mahalle evsel atık toplama ve transfer istasyonları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-13-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 13, 'SUB-13-02', 'Cadde ve Meydan Süpürme Birimi', 'Birim', 'Vardiya Çavuşu İsmet', '0262 642 05 32', 'Mekanik süpürme araçları ve yaya süpürge ekipleri sevk ve idaresi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-13-02');

-- DEPT-14: Makine İkmal, Bakım ve Onarım Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 14, 'SUB-14-01', 'Ağır Vasıta ve İş Makinesi Bakım Şefliği', 'Şeflik', 'Usta Başı Erdal Uçar', '0262 642 05 41', 'Kamyon, kepçe, silindir ve dozer periyodik bakım ve onarımları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-14-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 14, 'SUB-14-02', 'Akaryakıt İkmal ve Yedek Parça Ambarı', 'Servis', 'Depo Amiri Vedat', '0262 642 05 42', 'Belediye araç filosu yakıt otomasyonu ve yedek parça stok yönetimi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-14-02');

-- DEPT-15: İmar ve Şehircilik Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 15, 'SUB-15-01', 'Harita ve Numarataj Şefliği', 'Şeflik', 'Müh. Tolga Kara', '0262 642 05 51', 'Parselasyon, ada-parsel sınırları ve kapı numarataj işlemleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-15-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 15, 'SUB-15-02', 'Mimari Proje ve Ruhsat Denetim Servisi', 'Servis', 'Mimar Gülşen', '0262 642 05 52', 'Yeni bina ruhsat başvuruları, tadilat projeleri ve statik inceleme'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-15-02');

-- DEPT-16: Emlak ve İstimlak Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 16, 'SUB-16-01', 'Kamulaştırma ve Tahsis Şefliği', 'Şeflik', 'Harun Keskin', '0262 642 05 61', 'Yol ve meydan kamulaştırmaları, kamu binası tahsisleri ve irtifak hakları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-16-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 16, 'SUB-16-02', 'Taşınmaz Kiralama ve Değerleme Servisi', 'Servis', 'Nilüfer Demir', '0262 642 05 62', 'Belediye mülkiyetindeki dükkan, büfe ve alanların kiralama takipleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-16-02');

-- DEPT-17: Plan ve Proje Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 17, 'SUB-17-01', 'Nazım ve İmar Planı Şefliği', 'Şeflik', 'Şehir Plancısı Berk', '0262 642 05 71', '1/5000 ve 1/1000 ölçekli revizyon imar planları ve plan notları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-17-01');

-- DEPT-18: Etüt ve Proje Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 18, 'SUB-18-01', 'Mimari Etüt ve Avan Proje Şefliği', 'Şeflik', 'Y. Mimar Pınar Kurt', '0262 642 05 81', 'Belediye hizmet binaları, park tesisleri ve kentsel meydan projeleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-18-01');

-- DEPT-19: Yapı Kontrol Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 19, 'SUB-19-01', 'Kaçak Yapı Denetim ve Yıkım Şefliği', 'Şeflik', 'İnş. Müh. Turgut', '0262 642 05 91', 'Ruhsatsız ve imara aykırı yapılar tespit, mühürleme ve yasal süreçler'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-19-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 19, 'SUB-19-02', 'İnşaat Seviye Tespit ve İskan Servisi', 'Servis', 'Murat Aslan', '0262 642 05 92', 'Yapı kullanım izin belgeleri (iskan) ve beton kalitesi denetimi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-19-02');

-- DEPT-20: Ruhsat ve Denetim Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 20, 'SUB-20-01', 'Sıhhi ve Gayrisıhhi Müessese Şefliği', 'Şeflik', 'Hakan Güven', '0262 642 06 01', 'Market, fırın, atölye ve fabrika işyeri açma ve çalışma ruhsatları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-20-01');

-- DEPT-22: Veteriner İşleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 22, 'SUB-22-01', 'Hayvan Sağlığı ve Klinik Tedavi Şefliği', 'Şeflik', 'Veteriner Hekim Caner', '0262 642 06 21', 'Sokak hayvanları aşılama, kısırlaştırma, cerrahi operasyon ve tedavi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-22-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 22, 'SUB-22-02', 'Bakımevi ve Besleme Odakları Birimi', 'Birim', 'Gönüllü Koordinatörü Esra', '0262 642 06 22', 'Barınak sahiplendirme programı ve sokak besleme odak noktaları lojistiği'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-22-02');

-- DEPT-23: Mezarlıklar Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 23, 'SUB-23-01', 'Cenaze Hizmetleri ve Defin Şefliği', 'Şeflik', 'İmam Hatip Mahmut', '0262 642 06 31', 'Cenaze nakil, yıkama, kefenleme, defin ve taziye çadırı hizmetleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-23-01');

-- DEPT-24: Sosyal Destek Hizmetleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 24, 'SUB-24-01', 'Sosyal Yardım İnceleme ve Tespit Şefliği', 'Şeflik', 'Sosyolog Deniz', '0262 642 06 41', 'Dar gelirli aile hane incelemeleri, sosyal kart ve eğitim desteği'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-24-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 24, 'SUB-24-02', 'Aşevi ve Gıda Dağıtım Servisi', 'Servis', 'Aşçıbaşı Necati Usta', '0262 642 06 42', 'Günlük sıcak çorba, sıcak yemek üretimi ve evde bakım gıda kolisi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-24-02');

-- DEPT-25: Kültür İşleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 25, 'SUB-25-01', 'Kültür Merkezleri ve Etkinlik Şefliği', 'Şeflik', 'Kültür Koordinatörü Barış', '0262 642 06 51', 'Tiyatro, konser, seminer ve festival organizasyonları yönetimi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-25-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 25, 'SUB-25-02', 'GESMEK Kursları ve Şehir Kütüphaneleri Birimi', 'Birim', 'Kütüphaneci Emel', '0262 642 06 52', 'Meslek edindirme kursları, çocuk kütüphaneleri ve kitap arşivi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-25-02');

-- DEPT-26: Gençlik ve Spor Hizmetleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 26, 'SUB-26-01', 'Spor Tesisleri ve Salonlar Şefliği', 'Şeflik', 'Antrenör Tayfun', '0262 642 06 61', 'Yüzme havuzu, kapalı spor salonları, halı sahalar ve yaz spor okulları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-26-01');

-- DEPT-27: Kadın ve Aile Hizmetleri Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 27, 'SUB-27-01', 'Aile Danışma ve Psikolojik Destek Şefliği', 'Şeflik', 'Uzm. Psikolog Seda', '0262 642 06 71', 'Bireysel ve ailevi psikolojik danışmanlık, çocuk gelişim takipleri'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-27-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 27, 'SUB-27-02', 'Kadın Girişimcilik ve El Emeği Atölyesi', 'Birim', 'Eğitmen Merve', '0262 642 06 72', 'Dikiş-nakış, seramik, el sanatları ve kadın kooperatifleri desteği'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-27-02');

-- DEPT-28: İşletme ve İştirakler Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 28, 'SUB-28-01', 'Sosyal Tesisler ve Kafeteryalar Şefliği', 'Şeflik', 'İşletme Müdürü Orhan', '0262 642 06 81', 'Belediye sosyal tesisleri, çay bahçeleri ve kent lokantaları yönetimi'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-28-01');

-- DEPT-29: Afet İşleri ve Risk Yönetimi Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 29, 'SUB-29-01', 'AKOM Afet Koordinasyon ve Lojistik Şefliği', 'Şeflik', 'Afet Uzmanı Erkan', '0262 642 06 91', 'Deprem hazırlığı, acil toplanma alanları ve sahra lojistik deposu'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-29-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 29, 'SUB-29-02', 'Arama Kurtarma (GEBAK) ve Sivil Savunma Birimi', 'Birim', 'Ekip Lideri Cengiz', '0262 642 06 92', 'Gebze Belediyesi Arama Kurtarma ekipleri tatbikat ve operasyonları'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-29-02');

-- DEPT-30: İklim Değişikliği ve Sıfır Atık Müdürlüğü
INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 30, 'SUB-30-01', 'Sıfır Atık Yönetimi ve Geri Kazanım Şefliği', 'Şeflik', 'Çevre Müh. Derya', '0262 642 07 01', 'Geri dönüştürülebilir atık kutuları, e-atık, atık yağ ve tekstil toplama'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-30-01');

INSERT INTO sub_units (department_id, code, name, unit_type, manager_name, phone, description)
SELECT 30, 'SUB-30-02', 'Kompost Üretim ve Karbon Ayak İzi Birimi', 'Birim', 'Biyolog Zafer', '0262 642 07 02', 'Pazar yeri organik atıklarından kompost gübre üretimi ve iklim eylem planı'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sub_units WHERE code = 'SUB-30-02');


-- 3. TÜM EKSİK ODALARI OLUŞTUR (HER MÜDÜRLÜĞÜN KENDİ ÇALIŞMA ALANI OLSUN)
-- Ana Hizmet Binası 1. Kat (Floor ID = 3)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 3, '106', 'İnsan Kaynakları ve Özlük Servisi', 'Personel Ofisi', 3, (SELECT id FROM sub_units WHERE code = 'SUB-03-01'), 'Mehmet Yılmaz', 6, 'GBZ-ROOM-ANA-K1-106', 'Personel özlük dosyaları, bordro ve sicil çalışma alanı', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-106');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 3, '107', 'Hukuk İşleri ve Dava Takip Müşavirliği', 'Personel Ofisi', 8, (SELECT id FROM sub_units WHERE code = 'SUB-08-01'), 'Av. Burak Karaca', 6, 'GBZ-ROOM-ANA-K1-107', 'Kurumsal dava dosyaları ve hukuki mütalaa ofisi', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-107');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 3, '108', 'Rehberlik ve Teftiş Kurulu Başkanlığı', 'Personel Ofisi', 9, (SELECT id FROM sub_units WHERE code = 'SUB-09-01'), 'Başmüfettiş Sinan Öz', 4, 'GBZ-ROOM-ANA-K1-108', 'Müfettiş çalışma ve gizli evrak inceleme odası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-108');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 3, '109', 'Basın Yayın Haber ve Kurgu Stüdyosu', 'Teknik Oda', 10, (SELECT id FROM sub_units WHERE code = 'SUB-10-02'), 'Cemil Koç', 4, 'GBZ-ROOM-ANA-K1-109', 'Video montaj, basın bülteni hazırlık ve canlı yayın rejisi', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-109');

-- Ana Hizmet Binası 2. Kat (Floor ID = 4)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 4, '208', 'İşyeri Açma ve Çalışma Ruhsat Servisi', 'Personel Ofisi', 20, (SELECT id FROM sub_units WHERE code = 'SUB-20-01'), 'Hakan Güven', 8, 'GBZ-ROOM-ANA-K2-208', 'Sıhhi ve gayrisıhhi işletme ruhsat kabul ve onay masası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-208');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 4, '209', 'Kadın ve Aile Danışma Merkezi', 'Personel Ofisi', 27, (SELECT id FROM sub_units WHERE code = 'SUB-27-01'), 'Uzm. Psikolog Seda', 4, 'GBZ-ROOM-ANA-K2-209', 'Aile danışmanlığı, psikolog görüşme ve rehberlik odası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-209');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 4, '210', 'İşletme ve İştirakler Yönetim Ofisi', 'Personel Ofisi', 28, (SELECT id FROM sub_units WHERE code = 'SUB-28-01'), 'İşletme Müdürü Orhan', 4, 'GBZ-ROOM-ANA-K2-210', 'Belediye sosyal tesisleri ve otoparklar koordinasyon servisi', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-210');

-- Ana Hizmet Binası 4. Kat (Floor ID = 6)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 1, 6, '402', 'Özel Kalem Protokol ve Kabul Ofisi', 'Personel Ofisi', 7, (SELECT id FROM sub_units WHERE code = 'SUB-07-01'), 'Özel Kalem Memuru', 6, 'GBZ-ROOM-ANA-K4-402', 'Başkanlık randevulu kabul ve resmi ziyaretçi bekleme salonu', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K4-402');

-- Ek Hizmet Binası 1. Kat (Floor ID = 22)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 2, 22, 'EK-103', 'Nazım İmar Planı ve CBS Çizim Ofisi', 'Personel Ofisi', 17, (SELECT id FROM sub_units WHERE code = 'SUB-17-01'), 'Şehir Plancısı Berk', 6, 'GBZ-ROOM-EK-K1-103', 'Plan ve Proje Müdürlüğü 1/1000 ve 1/5000 ölçekli çizim ofisi', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K1-103');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 2, 22, 'EK-104', 'Mimari ve Statik Etüt Proje Çizim Salonu', 'Personel Ofisi', 18, (SELECT id FROM sub_units WHERE code = 'SUB-18-01'), 'Y. Mimar Pınar Kurt', 6, 'GBZ-ROOM-EK-K1-104', 'Etüt ve Proje Müdürlüğü belediye binaları mimari tasarım laboratuvarı', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K1-104');

-- Ek Hizmet Binası 2. Kat (Floor ID = 23)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 2, 23, 'EK-202', 'Yapı Kontrol ve İskan Denetim Servisi', 'Personel Ofisi', 19, (SELECT id FROM sub_units WHERE code = 'SUB-19-01'), 'İnş. Müh. Turgut', 8, 'GBZ-ROOM-EK-K2-202', 'Kaçak inşaat ihbar takip, saha denetim ve yapı kullanım izin masası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K2-202');

-- Fen İşleri Şantiyesi (Building ID = 3, Floor ID = 7)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 3, 7, 'F-201', 'Makine İkmal Bakım Atölyesi İdare Ofisi', 'Personel Ofisi', 14, (SELECT id FROM sub_units WHERE code = 'SUB-14-01'), 'Usta Başı Erdal Uçar', 6, 'GBZ-ROOM-FEN-KZ-F201', 'Araç tamir iş emirleri, parça onay ve sevk ofisi', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-KZ-F201');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 3, 7, 'F-202', 'Ağır Vasıta Yedek Parça ve Akaryakıt Ambarı', 'Depo / Ambar', 14, (SELECT id FROM sub_units WHERE code = 'SUB-14-02'), 'Depo Amiri Vedat', 4, 'GBZ-ROOM-FEN-KZ-F202', 'Filtre, yağ, hidrolik hortum, akü ve akaryakıt malzeme deposu', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-KZ-F202');

-- Saha & Tesisler (Building ID = 12, Floor ID = 37)
INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 12, 37, 'AK-01', 'AKOM Afet Koordinasyon ve Kriz Merkezi', 'Teknik Oda', 29, (SELECT id FROM sub_units WHERE code = 'SUB-29-01'), 'Afet Uzmanı Erkan', 12, 'GBZ-ROOM-AKOM-KZ-AK01', 'Telsiz, meteoroloji, canlı kamera takip ve 7/24 kriz masası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-AKOM-KZ-AK01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 12, 37, 'AK-02', 'Arama Kurtarma Lojistik ve Sahra Malzeme Deposu', 'Depo / Ambar', 29, (SELECT id FROM sub_units WHERE code = 'SUB-29-02'), 'Ekip Lideri Cengiz', 4, 'GBZ-ROOM-AKOM-KZ-AK02', 'Çadırlar, jeneratörler, kesme-ayırma makineleri ve arama kurtarma ekipmanları', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-AKOM-KZ-AK02');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 12, 37, 'ZA-01', 'Sıfır Atık ve Geri Dönüşüm Koordinasyon Ofisi', 'Personel Ofisi', 30, (SELECT id FROM sub_units WHERE code = 'SUB-30-01'), 'Çevre Müh. Derya', 6, 'GBZ-ROOM-SIFIR-KZ-ZA01', 'Geri dönüşüm kutuları takibi ve çevre denetim kayıt ofisi', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-SIFIR-KZ-ZA01');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 12, 37, 'ZA-02', 'Kompost Gübre Üretim ve Atık Presleme Sahası', 'Teknik Oda', 30, (SELECT id FROM sub_units WHERE code = 'SUB-30-02'), 'Biyolog Zafer', 4, 'GBZ-ROOM-SIFIR-KZ-ZA02', 'Organik pazar atığı fermantasyon ve balyalama sahası', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-SIFIR-KZ-ZA02');

INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id, responsible_person, capacity, qr_code, description, is_active)
SELECT 12, 37, 'MZ-01', 'Mezarlıklar Defin İşlemleri ve Kayıt Masası', 'Personel Ofisi', 23, (SELECT id FROM sub_units WHERE code = 'SUB-23-01'), 'İmam Hatip Mahmut', 6, 'GBZ-ROOM-MEZ-KZ-MZ01', 'Ölüm tescil, defin ruhsatı ve mezar yeri tahsis işlemleri', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE qr_code = 'GBZ-ROOM-MEZ-KZ-MZ01');


-- 4. HER BİR MÜDÜRLÜĞE VE TÜM ODALARA GERÇEK VE NİTELİKLİ DEMİRBAŞLAR EKLE
-- ==============================================================================

-- [DEPT-01] BİLGİ İŞLEM MÜDÜRLÜĞÜ (Room 1 için: Müdür Odası donanımı)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-101', '255.01.02.01', 'GBZ-869020260101', 'Müdür Yönetici Masaüstü PC ve Çift Ekran Seti', 'Bilişim Ekipmanları', 'Dell OptiPlex 7010 (i7-13700, 32GB, 1TB NVMe + 2x 27" Dell IPS)', 'SN-DLL-991201', 'Bilgi İşlem Müdürlüğü', 'Ana Hizmet Binası - 3. Kat - Oda 301', 'Bilgi İşlem Müdürü', 'Zimmetli', 'Çok İyi', TO_DATE('2025-06-10', 'YYYY-MM-DD'), TO_DATE('2028-06-10', 'YYYY-MM-DD'), 48500, 'DMO', 'Müdür çalışma makamı ana bilgi işlem istasyonu', 1, 1, 1, 5, 1, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-101');

-- [DEPT-02] DESTEK HİZMETLERİ MÜDÜRLÜĞÜ (Room 5: Müdür Odası, Room 6: Taşınır, Room 9: UPS Odası)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-102', '255.03.01.01', 'GBZ-869020260102', 'Makam Çalışma Masası ve Ahşap Etajer Takımı', 'Ofis Mobilyaları', 'Bürotime Diamond Executive Ahşap Set', 'SN-BRT-44102', 'Destek Hizmetleri Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 201', 'Destek Hizmetleri Müdürü', 'Zimmetli', 'Çok İyi', TO_DATE('2024-04-12', 'YYYY-MM-DD'), TO_DATE('2029-04-12', 'YYYY-MM-DD'), 62000, 'Bürotime Mobilya A.Ş.', 'Destek Hizmetleri Müdürü makam odası mobilya grubu', 2, 7, 1, 4, 5, 2, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-102');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-103', '255.01.04.01', 'GBZ-869020260103', 'Endüstriyel Barkod ve Taşınır Etiket Yazıcısı', 'Bilişim Ekipmanları', 'Zebra ZT411 Termal Transfer (300 DPI)', 'SN-ZBR-77103', 'Destek Hizmetleri Müdürlüğü (Taşınır Kayıt)', 'Ana Hizmet Binası - 2. Kat - Oda 204', 'Taşınır Yetkilisi Ahmet', 'Aktif', 'Çok İyi', TO_DATE('2025-01-20', 'YYYY-MM-DD'), TO_DATE('2027-01-20', 'YYYY-MM-DD'), 36500, 'Zebra Dağıtıcı A.Ş.', 'Demirbaş barkod ve QR kod etiketlerinin basımında kullanılan ağır hizmet yazıcı', 2, 6, 1, 4, 6, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-103');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-104', '255.04.02.01', 'GBZ-869020260104', 'Merkez Bina Akü Grubu ve Statik By-Pass Paneli', 'İklimlendirme ve Enerji', 'Eaton 93PM 200 kVA VRLA Jel Akü Kabineti', 'SN-ETN-1104', 'Destek Hizmetleri Müdürlüğü (Hizmet Binaları)', 'Ana Hizmet Binası - Bodrum Kat - Oda B-08', 'Enerji Teknikeri Sinan', 'Aktif', 'Çok İyi', TO_DATE('2023-10-05', 'YYYY-MM-DD'), TO_DATE('2028-10-05', 'YYYY-MM-DD'), 340000, 'Eaton Güç Çözümleri', 'Belediye ana binası kesintisiz güç kaynağı batarya yedekleme bankası', 2, 8, 1, 1, 9, 4, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-104');

-- [DEPT-03] İNSAN KAYNAKLARI VE EĞİTİM MÜDÜRLÜĞÜ (Room 106)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-105', '255.01.05.02', 'GBZ-869020260105', 'Yüksek Hızlı Özlük Evrak Tarayıcı (ADF + Düz Yatak)', 'Bilişim Ekipmanları', 'Fujitsu fi-7700 (Dakikada 100 Sayfa / 300 DPI)', 'SN-FJT-88105', 'İnsan Kaynakları ve Eğitim Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 106', 'Mehmet Yılmaz', 'Aktif', 'Çok İyi', TO_DATE('2024-08-15', 'YYYY-MM-DD'), TO_DATE('2027-08-15', 'YYYY-MM-DD'), 84000, 'Ricoh Türkiye', 'Tüm belediye personeli özlük dosyalarının dijital arşive aktarılmasında kullanılır', 3, (SELECT id FROM sub_units WHERE code = 'SUB-03-01'), 1, 3, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-106'), 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-105');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-106', '255.03.02.01', 'GBZ-869020260106', 'Yangına Dayanıklı Çelik Özlük Arşiv Dolabı (4 Çekmeceli)', 'Ofis Mobilyaları', 'Dizayn Çelik Yangın Dayanımlı Kasa Dolap (120 Dakika)', 'SN-DZN-33106', 'İnsan Kaynakları ve Eğitim Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 106', 'Gülşah Arslan', 'Aktif', 'Çok İyi', TO_DATE('2024-03-10', 'YYYY-MM-DD'), TO_DATE('2034-03-10', 'YYYY-MM-DD'), 42500, 'Dizayn Çelik Kasa', 'Gizli personel sicil ve disiplin kararları muhafazası', 3, (SELECT id FROM sub_units WHERE code = 'SUB-03-01'), 1, 3, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-106'), 2, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-106');

-- [DEPT-04] MALİ HİZMETLER MÜDÜRLÜĞÜ (Room 23 / Oda 105)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-107', '255.03.04.01', 'GBZ-869020260107', 'Çift Cepli Sahte Para Dedektörlü Para Sayma Makinesi', 'Elektronik Cihazlar', 'Glory GFS-120 Multi-Currency (TCMB Onaylı)', 'SN-GLR-55107', 'Mali Hizmetler Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 105', 'Zeynep Kaya', 'Aktif', 'Çok İyi', TO_DATE('2025-02-10', 'YYYY-MM-DD'), TO_DATE('2028-02-10', 'YYYY-MM-DD'), 58000, 'Glory Para Sistemleri', 'Günlük belediye vezne teslimatları ve kesin hesap para mutabakatları', 4, (SELECT id FROM sub_units WHERE code = 'SUB-04-02'), 1, 3, 23, 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-107');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-108', '255.01.02.02', 'GBZ-869020260108', 'Bütçe ve Muhasebe Analiz İş İstasyonu', 'Bilişim Ekipmanları', 'HP EliteDesk 800 G9 (i7, 32GB RAM, 1TB NVMe, Çift Ekran)', 'SN-HPD-22108', 'Mali Hizmetler Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 105', 'Kemal Şahin', 'Zimmetli', 'Çok İyi', TO_DATE('2025-01-11', 'YYYY-MM-DD'), TO_DATE('2028-01-11', 'YYYY-MM-DD'), 44000, 'DMO', 'Analitik bütçe, kesin hesap ve Sayıştay raporlama bilgisayarı', 4, (SELECT id FROM sub_units WHERE code = 'SUB-04-01'), 1, 3, 23, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-108');

-- [DEPT-05] GELİRLER MÜDÜRLÜĞÜ (Room 22 / Oda Z-04)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-109', '255.01.06.01', 'GBZ-869020260109', 'Sıramatik Dokunmatik Bilet Dağıtım Kiosku', 'Elektronik Cihazlar', 'Q-Net 21" Kapasitif Dokunmatik Sıramatik Terminali', 'SN-QNT-77109', 'Gelirler Müdürlüğü', 'Ana Hizmet Binası - Zemin Kat - Oda Z-04', 'Murat Çelik', 'Aktif', 'Çok İyi', TO_DATE('2024-05-20', 'YYYY-MM-DD'), TO_DATE('2027-05-20', 'YYYY-MM-DD'), 52000, 'Q-Net Bilişim', 'Emlak vergisi ve çevre temizlik veznesi vatandaş sıra yönetim sistemi', 5, (SELECT id FROM sub_units WHERE code = 'SUB-05-02'), 1, 2, 22, 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-109');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-110', '255.01.03.02', 'GBZ-869020260110', 'Vezne Dokunmatik POS Tahsilat Bilgisayarı (All-in-One)', 'Bilişim Ekipmanları', 'Posiflex XT-3815 Pro POS Terminali + Çekmece', 'SN-PSF-44110', 'Gelirler Müdürlüğü', 'Ana Hizmet Binası - Zemin Kat - Oda Z-04', 'Fatma Doğan', 'Aktif', 'Çok İyi', TO_DATE('2024-11-10', 'YYYY-MM-DD'), TO_DATE('2027-11-10', 'YYYY-MM-DD'), 38000, 'Posiflex Türkiye', '1 Nolu ana vezne kredi kartı ve nakit tahsilat noktası', 5, (SELECT id FROM sub_units WHERE code = 'SUB-05-02'), 1, 2, 22, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-110');

-- [DEPT-06] YAZI İŞLERİ MÜDÜRLÜĞÜ (Room 8: Arşiv, Room 24: Evrak Kayıt)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-111', '255.03.03.01', 'GBZ-869020260111', 'Raylı Kompakt Çelik Arşiv Dolap Sistemi (30 Blok)', 'Ofis Mobilyaları', 'Dizayn Mekanik Direksiyonlu Kompakt Arşiv Ünitesi', 'SN-RKL-11111', 'Yazı İşleri Müdürlüğü', 'Ana Hizmet Binası - Bodrum Kat - Oda B-01', 'Hasan Güler', 'Aktif', 'Çok İyi', TO_DATE('2023-05-18', 'YYYY-MM-DD'), TO_DATE('2033-05-18', 'YYYY-MM-DD'), 280000, 'Dizayn Çelik Arşiv', '1980 yılından günümüze belediye meclis kararları ve encümen mazbata arşivi', 6, (SELECT id FROM sub_units WHERE code = 'SUB-06-02'), 1, 1, 8, 2, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-111');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-112', '255.01.04.02', 'GBZ-869020260112', 'Evrak Kayıt Barkod Okuyucu ve Damgalama Cihazı', 'Elektronik Cihazlar', 'Honeywell Xenon 1950G 2D Okuyucu Seti', 'SN-HNW-99112', 'Yazı İşleri Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 112', 'Ayşe Demir', 'Zimmetli', 'Çok İyi', TO_DATE('2025-03-01', 'YYYY-MM-DD'), TO_DATE('2028-03-01', 'YYYY-MM-DD'), 18500, 'Honeywell Dağıtıcı', 'Gelen-giden resmi evrak EBYS kayıt masası barkod tarayıcısı', 6, (SELECT id FROM sub_units WHERE code = 'SUB-06-01'), 1, 3, 24, 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-112');

-- [DEPT-07] ÖZEL KALEM MÜDÜRLÜĞÜ (Room 402: Protokol ve Kabul)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-113', '255.03.01.02', 'GBZ-869020260113', 'Protokol Misafir Koltuk Takımı ve Mermer Sehpa Grubu', 'Ofis Mobilyaları', 'Koleksiyon Havanna Hakiki Deri Berjer ve 3lü Kanepe Seti', 'SN-KLK-88113', 'Özel Kalem Müdürlüğü', 'Ana Hizmet Binası - 4. Kat - Oda 402', 'Özel Kalem Memuru', 'Aktif', 'Çok İyi', TO_DATE('2024-09-15', 'YYYY-MM-DD'), TO_DATE('2029-09-15', 'YYYY-MM-DD'), 115000, 'Koleksiyon Mobilya', 'Bakanlık, valilik ve yabancı delegasyon heyetleri bekleme salonu mobilyası', 7, (SELECT id FROM sub_units WHERE code = 'SUB-07-01'), 1, 6, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K4-402'), 2, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-113');

-- [DEPT-08] HUKUK İŞLERİ MÜDÜRLÜĞÜ (Room 107)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-114', '255.01.02.03', 'GBZ-869020260114', 'Hukuk UYAP / Avukat Çalışma İstasyonu Bilgisayarı', 'Bilişim Ekipmanları', 'Lenovo ThinkCentre Neo 50s (i7-13700, 32GB RAM, 1TB NVMe, 27" Monitör)', 'SN-LNV-66114', 'Hukuk İşleri Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 107', 'Av. Burak Karaca', 'Zimmetli', 'Çok İyi', TO_DATE('2025-02-05', 'YYYY-MM-DD'), TO_DATE('2028-02-05', 'YYYY-MM-DD'), 42000, 'DMO', 'Dava layihaları, UYAP duruşma bağlantıları ve hukuki görüş hazırlama bilgisayarı', 8, (SELECT id FROM sub_units WHERE code = 'SUB-08-01'), 1, 3, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-107'), 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-114');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-115', '255.03.02.02', 'GBZ-869020260115', 'Mevzuat ve Hukuk İçtihat Kitaplığı Ahşap Dolap Ünitesi', 'Ofis Mobilyaları', 'Masif Meşe Camlı Mevzuat ve Arşiv Kütüphanesi (3 Bölmeli)', 'SN-MSF-33115', 'Hukuk İşleri Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 107', 'Av. Ece Yıldırım', 'Aktif', 'Çok İyi', TO_DATE('2024-06-20', 'YYYY-MM-DD'), TO_DATE('2034-06-20', 'YYYY-MM-DD'), 35000, 'Yerel Marangoz İşleri', 'Yargıtay ve Danıştay içtihat külliyatı ve mevzuat kitaplığı', 8, (SELECT id FROM sub_units WHERE code = 'SUB-08-02'), 1, 3, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-107'), 2, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-115');

-- [DEPT-09] REHBERLİK VE TEFTİŞ KURULU MÜDÜRLÜĞÜ (Room 108)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-116', '255.01.01.01', 'GBZ-869020260116', 'Müfettiş Saha Denetim Kriptolu Dizüstü Bilgisayarı', 'Bilişim Ekipmanları', 'Dell Latitude 7440 (Intel Core i7, 32GB RAM, TPM 2.0 Kripto)', 'SN-DLL-44116', 'Rehberlik ve Teftiş Kurulu Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 108', 'Başmüfettiş Sinan Öz', 'Zimmetli', 'Çok İyi', TO_DATE('2025-04-10', 'YYYY-MM-DD'), TO_DATE('2028-04-10', 'YYYY-MM-DD'), 56000, 'DMO', 'Soruşturma raporları ve teftiş tutanakları hazırlama cihazı', 9, (SELECT id FROM sub_units WHERE code = 'SUB-09-01'), 1, 3, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-108'), 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-116');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-117', '255.03.04.02', 'GBZ-869020260117', 'Elektronik Şifreli Çelik Evrak Kasası', 'Elektronik Cihazlar', 'Kale Kasa Güvenlikli Teftiş Arşiv Kasası (Model KK-500)', 'SN-KLE-22117', 'Rehberlik ve Teftiş Kurulu Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 108', 'Başmüfettiş Sinan Öz', 'Aktif', 'Çok İyi', TO_DATE('2024-02-15', 'YYYY-MM-DD'), TO_DATE('2034-02-15', 'YYYY-MM-DD'), 32000, 'Kale Güvenlik Sistemleri', 'Devam eden idari soruşturma evraklarının gizlilik dereceli saklama kasası', 9, (SELECT id FROM sub_units WHERE code = 'SUB-09-01'), 1, 3, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-108'), 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-117');

-- [DEPT-10] BASIN YAYIN VE HALKLA İLİŞKİLER MÜDÜRLÜĞÜ (Room 21: Danışma, Room 109: Stüdyo)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-118', '255.03.05.01', 'GBZ-869020260118', 'Profesyonel 4K Sinema Kamerası ve Lens Seti', 'Elektronik Cihazlar', 'Sony FX6 Full-Frame Sinema Kamerası + FE 24-70mm GM II Lens', 'SN-SNY-77118', 'Basın Yayın ve Halkla İlişkiler Müdürlüğü', 'Ana Hizmet Binası - 1. Kat - Oda 109', 'Cemil Koç', 'Aktif', 'Çok İyi', TO_DATE('2024-10-01', 'YYYY-MM-DD'), TO_DATE('2027-10-01', 'YYYY-MM-DD'), 245000, 'Sony Eurasia', 'Belediye açılışları, tanıtım filmleri ve haber röportajları ana prodüksiyon kamerası', 10, (SELECT id FROM sub_units WHERE code = 'SUB-10-02'), 1, 3, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K1-109'), 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-118');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-119', '255.01.07.01', 'GBZ-869020260119', 'Vatandaş Karşılama ve Danışma Dokunmatik İnteraktif Ekran', 'Elektronik Cihazlar', 'Samsung 65" 4K Endüstriyel Dokunmatik Bilgilendirme Ekranı', 'SN-SMS-55119', 'Basın Yayın ve Halkla İlişkiler Müdürlüğü', 'Ana Hizmet Binası - Zemin Kat - Oda Z-01', 'Selin Aydın', 'Aktif', 'Çok İyi', TO_DATE('2025-01-15', 'YYYY-MM-DD'), TO_DATE('2028-01-15', 'YYYY-MM-DD'), 68000, 'Samsung Türkiye', 'Ana bina girişinde belediye hizmetleri ve kat yerleşim rehberi sunan interaktif terminal', 10, (SELECT id FROM sub_units WHERE code = 'SUB-10-01'), 1, 2, 21, 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-119');

-- [DEPT-11] FEN İŞLERİ MÜDÜRLÜĞÜ (Room 30: Hangar)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-120', '255.05.01.01', 'GBZ-869020260120', 'Paletli Asfalt Serici (Finişer)', 'İş Makineleri', 'Vögele Super 1800-3i Asfalt Finişeri (Genişlik: 2.55m - 5.00m)', 'SN-VGL-33120', 'Fen İşleri Müdürlüğü (Asfalt Şefliği)', 'Fen İşleri Şantiyesi - Zemin Kat - Oda F-02', 'Operatör Murat', 'Aktif', 'Çok İyi', TO_DATE('2023-04-10', 'YYYY-MM-DD'), TO_DATE('2026-04-10', 'YYYY-MM-DD'), 4850000, 'Wirtgen Group Türkiye', 'Gebze içi cadde ve ana arter sıcak asfalt serim makinesi', 11, 10, 3, 7, 30, 5, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-120');

-- [DEPT-12] PARK VE BAHÇELER MÜDÜRLÜĞÜ (Room 33: Alet Deposu)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-121', '255.07.01.01', 'GBZ-869020260121', 'Ağır Hizmet Dal ve Ağaç Budama Öğütme Makinesi', 'Park ve Bahçe Ekipmanları', 'Laski LS 160 DWB Dizel Mobil Dal Öğütme Makinesi', 'SN-LSK-88121', 'Park ve Bahçeler Müdürlüğü', 'Park ve Bahçeler Şantiyesi - Zemin Kat - Oda P-02', 'Usta Mehmet Usta', 'Aktif', 'Çok İyi', TO_DATE('2024-03-25', 'YYYY-MM-DD'), TO_DATE('2027-03-25', 'YYYY-MM-DD'), 420000, 'Laski Türkiye Dağıtıcı', 'Cadde ve park budama atıklarını organik talaş kompostuna dönüştüren mobil makine', 12, 12, 4, 24, 33, 14, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-121');

-- [DEPT-13] TEMİZLİK İŞLERİ MÜDÜRLÜĞÜ (Room 35: Vardiya Amirliği)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-122', '255.09.01.01', 'GBZ-869020260122', 'Yüksek Basınçlı Sıcak Sulu Konteyner ve Meydan Yıkama Ünitesi', 'Temizlik Ekipmanları', 'Kärcher HDS 10/20-4 M Sıcak Su Basınçlı Yıkama Sistemi', 'SN-KRC-55122', 'Temizlik İşleri Müdürlüğü', 'Temizlik İşleri Garajı - 1. Kat - Oda T-101', 'Vardiya Çavuşu İsmet', 'Aktif', 'Çok İyi', TO_DATE('2024-07-12', 'YYYY-MM-DD'), TO_DATE('2027-07-12', 'YYYY-MM-DD'), 165000, 'Kärcher Türkiye', 'Çöp konteynerleri sterilizasyonu ve pazar yerleri zemin yıkama ekipmanı', 13, (SELECT id FROM sub_units WHERE code = 'SUB-13-02'), 5, 27, 35, 9, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-122');

-- [DEPT-14] MAKİNE İKMAL, BAKIM VE ONARIM MÜDÜRLÜĞÜ (Rooms F-201, F-202)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-123', '255.07.02.01', 'GBZ-869020260123', '4 Sütunlu Elektro-Hidrolik Ağır Vasıta Araç Lifti (24 Ton)', 'El Aletleri ve Ekipmanları', 'Oma / Werther 4 Sütunlu Kamyon ve Otobüs Bakım Lifti', 'SN-WRT-66123', 'Makine İkmal, Bakım ve Onarım Müdürlüğü', 'Fen İşleri Şantiyesi - Zemin Kat - Oda F-201', 'Usta Başı Erdal Uçar', 'Aktif', 'Çok İyi', TO_DATE('2023-09-10', 'YYYY-MM-DD'), TO_DATE('2028-09-10', 'YYYY-MM-DD'), 780000, 'Oma Otomotiv Ekipmanları', 'Çöp kamyonları, itfaiye ve damperli kamyonların alt mekanik bakım ünitesi', 14, (SELECT id FROM sub_units WHERE code = 'SUB-14-01'), 3, 7, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-KZ-F201'), 7, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-123');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-124', '255.07.03.01', 'GBZ-869020260124', 'Ağır Vasıta ve İş Makinesi Diyagnoz Arıza Tespit Cihazı', 'Elektronik Cihazlar', 'Texa AXONE Voice + Navigator TXT Multihub Ağır Vasıta Paketi', 'SN-TXA-33124', 'Makine İkmal, Bakım ve Onarım Müdürlüğü', 'Fen İşleri Şantiyesi - Zemin Kat - Oda F-202', 'Depo Amiri Vedat', 'Aktif', 'Çok İyi', TO_DATE('2024-05-18', 'YYYY-MM-DD'), TO_DATE('2027-05-18', 'YYYY-MM-DD'), 195000, 'Texa Türkiye', 'Tüm Euro 6 dizel motor ve hidrolik sistem arıza kodu okuma ve kalibrasyon tableti', 14, (SELECT id FROM sub_units WHERE code = 'SUB-14-02'), 3, 7, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-FEN-KZ-F202'), 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-124');

-- [DEPT-15] İMAR VE ŞEHİRCİLİK MÜDÜRLÜĞÜ (Room 27: Başvuru Masası)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-125', '255.01.05.01', 'GBZ-869020260125', 'A0 Profesyonel Harita ve Mimari Çizim Plotteri', 'Bilişim Ekipmanları', 'Canon imagePROGRAF TX-4100 (44 İnç / 5 Renkli Pigment)', 'SN-CNN-88125', 'İmar ve Şehircilik Müdürlüğü', 'Ek Hizmet Binası - Zemin Kat - Oda EK-Z01', 'Tolga Kara', 'Aktif', 'Çok İyi', TO_DATE('2024-02-14', 'YYYY-MM-DD'), TO_DATE('2027-02-14', 'YYYY-MM-DD'), 185000, 'Canon Eurasia', 'İmar durumu, ada-parsel paftaları ve tasdikli mimari proje baskı ünitesi', 15, (SELECT id FROM sub_units WHERE code = 'SUB-15-01'), 2, 21, 27, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-125');

-- [DEPT-16] EMLAK VE İSTİMLAK MÜDÜRLÜĞÜ (Room 29 / Oda EK-201)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-126', '255.01.02.04', 'GBZ-869020260126', 'Tapu ve Kadastro Harita İnceleme Bilgisayarı', 'Bilişim Ekipmanları', 'Dell Precision 3660 Tower (i7, 32GB RAM, RTX A2000, 2x 4K Ekran)', 'SN-DLL-55126', 'Emlak ve İstimlak Müdürlüğü', 'Ek Hizmet Binası - 2. Kat - Oda EK-201', 'Harun Keskin', 'Zimmetli', 'Çok İyi', TO_DATE('2025-01-08', 'YYYY-MM-DD'), TO_DATE('2028-01-08', 'YYYY-MM-DD'), 64000, 'DMO', 'Kamulaştırma planları, mülkiyet sınırları ve TAKPAS tapu sorgulama bilgisayarı', 16, (SELECT id FROM sub_units WHERE code = 'SUB-16-01'), 2, 23, 29, 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-126');

-- [DEPT-17] PLAN VE PROJE MÜDÜRLÜĞÜ (Room EK-103)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-127', '255.01.02.05', 'GBZ-869020260127', 'CBS ve Nazım İmar Planı Coğrafi Analiz Sunucusu', 'Bilişim Ekipmanları', 'HP Z4 G5 Workstation (Intel Xeon W3-2423, 64GB ECC, RTX A4500 20GB)', 'SN-HPZ-99127', 'Plan ve Proje Müdürlüğü', 'Ek Hizmet Binası - 1. Kat - Oda EK-103', 'Şehir Plancısı Berk', 'Aktif', 'Çok İyi', TO_DATE('2024-11-05', 'YYYY-MM-DD'), TO_DATE('2027-11-05', 'YYYY-MM-DD'), 145000, 'HP Türkiye', 'Netcad, ArcGIS ve 1/5000 ölçekli nazım imar planı katman analiz terminali', 17, (SELECT id FROM sub_units WHERE code = 'SUB-17-01'), 2, 22, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K1-103'), 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-127');

-- [DEPT-18] ETÜT VE PROJE MÜDÜRLÜĞÜ (Room EK-104)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-128', '255.01.02.06', 'GBZ-869020260128', '3D Mimari Render ve BIM Modelleme İstasyonu', 'Bilişim Ekipmanları', 'Apple Mac Studio (M2 Ultra 24 CPU / 60 GPU, 64GB Unified RAM, 1TB SSD)', 'SN-APL-77128', 'Etüt ve Proje Müdürlüğü', 'Ek Hizmet Binası - 1. Kat - Oda EK-104', 'Y. Mimar Pınar Kurt', 'Zimmetli', 'Çok İyi', TO_DATE('2024-09-12', 'YYYY-MM-DD'), TO_DATE('2027-09-12', 'YYYY-MM-DD'), 160000, 'Apple Türkiye', 'Belediye kültür merkezleri, pazar alanları ve meydan projeleri 3 boyutlu modelleme ve animasyon bilgisayarı', 18, (SELECT id FROM sub_units WHERE code = 'SUB-18-01'), 2, 22, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K1-104'), 1, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-128');

-- [DEPT-19] YAPI KONTROL MÜDÜRLÜĞÜ (Room EK-202)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-129', '255.08.01.01', 'GBZ-869020260129', 'Ultrasonik Beton Test Çekici ve Donatı Tarama Cihazı', 'İnşaat ve Teknik Malzemeler', 'Proceq SilverSchmidt OS8200 Dijital Test Çekici', 'SN-PRC-44129', 'Yapı Kontrol Müdürlüğü', 'Ek Hizmet Binası - 2. Kat - Oda EK-202', 'İnş. Müh. Turgut', 'Aktif', 'Çok İyi', TO_DATE('2024-06-01', 'YYYY-MM-DD'), TO_DATE('2027-06-01', 'YYYY-MM-DD'), 125000, 'Proceq İsviçre', 'Gebze genelinde kaçak veya riskli binaların tahribatsız beton basınç dayanımı ölçüm cihazı', 19, (SELECT id FROM sub_units WHERE code = 'SUB-19-01'), 2, 23, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-EK-K2-202'), 8, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-129');

-- [DEPT-20] RUHSAT VE DENETİM MÜDÜRLÜĞÜ (Room 208)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-130', '255.07.04.01', 'GBZ-869020260130', 'Dijital Ses Seviyesi Ölçer (Desibelmetre - Tip 1 Onaylı)', 'Elektronik Cihazlar', 'Testo 816-1 Tip 1 Hassas Ses ve Gürültü Ölçüm Seti', 'SN-TST-11130', 'Ruhsat ve Denetim Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 208', 'Hakan Güven', 'Aktif', 'Çok İyi', TO_DATE('2024-05-10', 'YYYY-MM-DD'), TO_DATE('2027-05-10', 'YYYY-MM-DD'), 46000, 'Testo Türkiye', 'Eğlence mekanları, düğün salonları ve fabrikaların çevre gürültü ruhsat denetim cihazı', 20, (SELECT id FROM sub_units WHERE code = 'SUB-20-01'), 1, 4, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-208'), 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-130');

-- [DEPT-22] VETERİNER İŞLERİ MÜDÜRLÜĞÜ (Room 37: Aşı Deposu)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-131', '255.11.01.01', 'GBZ-869020260131', 'Medikal Aşı ve Serum Saklama Buzdolabı (+4°C Dijital Korumalı)', 'Tıbbi ve Veteriner Ekipmanları', 'Coolermed M390PRO Medikal İlaç ve Aşı Soğutucu', 'SN-CLM-88131', 'Veteriner İşleri Müdürlüğü', 'Veteriner İşleri Hayvan Bakımevi - Zemin Kat - Oda V-02', 'Veteriner Hekim Caner', 'Aktif', 'Çok İyi', TO_DATE('2024-01-20', 'YYYY-MM-DD'), TO_DATE('2027-01-20', 'YYYY-MM-DD'), 75000, 'Coolermed Medikal', 'Kuduz, karma aşılar ve acil cerrahi serumların soğuk zincir koruma dolabı', 22, (SELECT id FROM sub_units WHERE code = 'SUB-22-01'), 6, 28, 37, 11, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-131');

-- [DEPT-23] MEZARLIKLAR MÜDÜRLÜĞÜ (Room MZ-01)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-132', '255.06.01.01', 'GBZ-869020260132', '4 Tabut Kapasiteli Soğutmalı Cenaze Nakil Aracı', 'Araç ve Taşıtlar', 'Ford Transit 350L Panelvan (Özel İmalat Soğutuculu Cenaze Kasası)', 'SN-FRD-99132', 'Mezarlıklar Müdürlüğü', 'Saha ve Muhtarlık Hizmet Noktaları - Zemin Kat - Oda MZ-01', 'İmam Hatip Mahmut', 'Aktif', 'Çok İyi', TO_DATE('2023-08-15', 'YYYY-MM-DD'), TO_DATE('2026-08-15', 'YYYY-MM-DD'), 1850000, 'Ford Otosan', 'Gebze içi ve şehirlerarası vefat nakil işlemlerinde kullanılan soğutma üniteli araç', 23, (SELECT id FROM sub_units WHERE code = 'SUB-23-01'), 12, 37, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-MEZ-KZ-MZ01'), 6, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-132');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-133', '255.05.02.01', 'GBZ-869020260133', 'Kompakt Paletli Mezar Kazma Mini Ekskavatörü', 'İş Makineleri', 'Bobcat E19 Kompakt Mini Ekskavatör (Genişlik: 98cm)', 'SN-BBC-44133', 'Mezarlıklar Müdürlüğü', 'Saha ve Muhtarlık Hizmet Noktaları - Zemin Kat - Oda MZ-01', 'Operatör Salih', 'Aktif', 'Çok İyi', TO_DATE('2024-04-10', 'YYYY-MM-DD'), TO_DATE('2027-04-10', 'YYYY-MM-DD'), 1250000, 'Bobcat Türkiye', 'Dar mezarlık adalarında ağaçlara zarar vermeden mezar yeri kazımı yapan iş makinesi', 23, (SELECT id FROM sub_units WHERE code = 'SUB-23-01'), 12, 37, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-MEZ-KZ-MZ01'), 5, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-133');

-- [DEPT-24] SOSYAL DESTEK HİZMETLERİ MÜDÜRLÜĞÜ (Room 43: Soğuk Hava Deposu)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-134', '255.04.01.01', 'GBZ-869020260134', 'Merkezi Endüstriyel Soğuk Hava Deposu Motoru ve Panel Grubu (-18°C)', 'İklimlendirme ve Enerji', 'Frascold Yarı Hermetik Çift Kademeli Şoklama ve Saklama Grubu', 'SN-FRS-77134', 'Sosyal Destek Hizmetleri Müdürlüğü', 'Sosyal Tesisler ve Aşevi - Zemin Kat - Oda A-02', 'Depo Sorumlusu İsmet', 'Aktif', 'Çok İyi', TO_DATE('2023-11-20', 'YYYY-MM-DD'), TO_DATE('2028-11-20', 'YYYY-MM-DD'), 420000, 'Frascold Soğutma A.Ş.', 'Aşevi et, tavuk ve donuk gıda 60 tonluk ana muhafaza deposu soğutma grubu', 24, (SELECT id FROM sub_units WHERE code = 'SUB-24-02'), 9, 34, 43, 4, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-134');

-- [DEPT-25] KÜLTÜR İŞLERİ MÜDÜRLÜĞÜ (Room 39: Kütüphane)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-135', '255.01.08.01', 'GBZ-869020260135', 'Kütüphane RFID Kitap Güvenlik Kapısı ve Self-Check Terminali', 'Elektronik Cihazlar', '3M Library Systems RFID Çift Geçiş Güvenlik Kapısı + Ödünç Alma Kiosku', 'SN-3ML-55135', 'Kültür İşleri Müdürlüğü', 'Gebze Kültür Merkezi - 1. Kat - Oda K-101', 'Kütüphaneci Emel', 'Aktif', 'Çok İyi', TO_DATE('2024-02-18', 'YYYY-MM-DD'), TO_DATE('2027-02-18', 'YYYY-MM-DD'), 190000, '3M Türkiye', 'Şehir kütüphanesi 50.000 kitap kapasiteli otomatik ödünç-iade ve hırsızlık önleme ünitesi', 25, (SELECT id FROM sub_units WHERE code = 'SUB-25-02'), 7, 31, 39, 3, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-135');

-- [DEPT-26] GENÇLİK VE SPOR HİZMETLERİ MÜDÜRLÜĞÜ (Room 41: Fitness Alanı)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-136', '255.12.01.01', 'GBZ-869020260136', 'Profesyonel Koşu Bandı ve Kardiyo İstasyonu (5 Adet Takım)', 'Spor Ekipmanları', 'Life Fitness Integrity Series Ticari Koşu Bandı Grubu', 'SN-LFF-22136', 'Gençlik ve Spor Hizmetleri Müdürlüğü', 'Gebze Spor Kompleksi ve Tesisleri - 1. Kat - Oda S-101', 'Antrenör Tayfun', 'Aktif', 'Çok İyi', TO_DATE('2024-05-15', 'YYYY-MM-DD'), TO_DATE('2027-05-15', 'YYYY-MM-DD'), 480000, 'Life Fitness Türkiye', 'Halka açık spor salonu kardiyo ve dayanıklılık antrenman aletleri', 26, (SELECT id FROM sub_units WHERE code = 'SUB-26-01'), 8, 33, 41, 12, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-136');

-- [DEPT-27] KADIN VE AİLE HİZMETLERİ MÜDÜRLÜĞÜ (Room 209)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-137', '255.07.05.01', 'GBZ-869020260137', 'Sanayi Tipi Bilgisayarlı Nakış ve Dikiş Makinesi Grubu', 'El Aletleri ve Ekipmanları', 'Brother PR680W 6 İğneli Profesyonel Nakış Makinesi + 4 Adet Juki Dikiş', 'SN-BRT-99137', 'Kadın ve Aile Hizmetleri Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 209', 'Eğitmen Merve', 'Aktif', 'Çok İyi', TO_DATE('2024-03-22', 'YYYY-MM-DD'), TO_DATE('2027-03-22', 'YYYY-MM-DD'), 210000, 'Brother Türkiye', 'Kadın el emeği meslek edindirme kurslarında çeyiz ve nakış üretim istasyonu', 27, (SELECT id FROM sub_units WHERE code = 'SUB-27-02'), 1, 4, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-209'), 7, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-137');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-138', '255.03.01.03', 'GBZ-869020260138', 'Psikolojik Danışmanlık ve Terapi Mobilya Grubu', 'Ofis Mobilyaları', 'Ses Yalıtımlı Terapi Koltuk Takımı, Kitaplık ve Çocuk Oyun Masası', 'SN-TRP-44138', 'Kadın ve Aile Hizmetleri Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 209', 'Uzm. Psikolog Seda', 'Zimmetli', 'Çok İyi', TO_DATE('2024-08-10', 'YYYY-MM-DD'), TO_DATE('2029-08-10', 'YYYY-MM-DD'), 45000, 'Bürotime Mobilya', 'Bireysel ve ailevi danışmanlık görüşme odası mobilyası', 27, (SELECT id FROM sub_units WHERE code = 'SUB-27-01'), 1, 4, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-209'), 2, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-138');

-- [DEPT-28] İŞLETME VE İŞTİRAKLER MÜDÜRLÜĞÜ (Room 210)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-139', '255.16.03.01', 'GBZ-869020260139', 'Sosyal Tesis Endüstriyel Çift Gruplu Espresso Kahve Makinesi', 'Diğer Demirbaşlar', 'La Marzocco Linea PB 2 Gruplu Otomatik Espresso Makinesi', 'SN-LMZ-11139', 'İşletme ve İştirakler Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 210', 'İşletme Müdürü Orhan', 'Aktif', 'Çok İyi', TO_DATE('2024-09-01', 'YYYY-MM-DD'), TO_DATE('2027-09-01', 'YYYY-MM-DD'), 285000, 'La Marzocco Dağıtıcı', 'Belediye sosyal tesis kafeteryalarında sıcak içecek servisi ana cihazı', 28, (SELECT id FROM sub_units WHERE code = 'SUB-28-01'), 1, 4, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-210'), 16, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-139');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-140', '255.01.09.01', 'GBZ-869020260140', 'Otopark Otomatik Plaka Tanıma (PTS) ve Kollu Bariyer Sistemi', 'Güvenlik ve Koruma Ekipmanları', 'Arma Kontrol Hızlı Geçiş Bariyeri + 4K PTS Gece Görüş Kameraları', 'SN-ARM-55140', 'İşletme ve İştirakler Müdürlüğü', 'Ana Hizmet Binası - 2. Kat - Oda 210', 'İşletme Müdürü Orhan', 'Aktif', 'Çok İyi', TO_DATE('2024-04-18', 'YYYY-MM-DD'), TO_DATE('2027-04-18', 'YYYY-MM-DD'), 175000, 'Arma Kontrol Sistemleri', 'Katlı otoparklar giriş-çıkış ücretlendirme ve plaka okuma sistemi', 28, (SELECT id FROM sub_units WHERE code = 'SUB-28-02'), 1, 4, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-ANA-K2-210'), 10, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-140');

-- [DEPT-29] AFET İŞLERİ VE RİSK YÖNETİMİ MÜDÜRLÜĞÜ (Rooms AK-01, AK-02)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-141', '255.10.01.01', 'GBZ-869020260141', 'Hidrolik Arama Kurtarma Kesme ve Ayırma Takımı (Deprem Müdahale)', 'Güvenlik ve Koruma Ekipmanları', 'Holmatro Pentheon Serisi Akülü Hidrolik Makas, Ayırıcı ve Teleskopik Ram', 'SN-HLM-88141', 'Afet İşleri ve Risk Yönetimi Müdürlüğü', 'Saha ve Muhtarlık Hizmet Noktaları - Zemin Kat - Oda AK-02', 'Ekip Lideri Cengiz', 'Aktif', 'Çok İyi', TO_DATE('2024-02-10', 'YYYY-MM-DD'), TO_DATE('2027-02-10', 'YYYY-MM-DD'), 640000, 'Holmatro Türkiye', 'GEBAK ekiplerinin betonarme enkaz ve trafik kazası kurtarma ana teçhizatı', 29, (SELECT id FROM sub_units WHERE code = 'SUB-29-02'), 12, 37, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-AKOM-KZ-AK02'), 10, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-141');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-142', '255.04.03.01', 'GBZ-869020260142', 'Taşınabilir Sessiz Çanta Tipi Acil Durum Jeneratörü (7 kVA)', 'İklimlendirme ve Enerji', 'Honda EU70is İnvertörlü Ultra Sessiz Benzinli Jeneratör', 'SN-HND-33142', 'Afet İşleri ve Risk Yönetimi Müdürlüğü', 'Saha ve Muhtarlık Hizmet Noktaları - Zemin Kat - Oda AK-01', 'Afet Uzmanı Erkan', 'Aktif', 'Çok İyi', TO_DATE('2024-06-15', 'YYYY-MM-DD'), TO_DATE('2027-06-15', 'YYYY-MM-DD'), 145000, 'Honda Güç Ürünleri', 'Sahra çadırı ve seyyar telsiz istasyonu acil enerji kaynağı', 29, (SELECT id FROM sub_units WHERE code = 'SUB-29-01'), 12, 37, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-AKOM-KZ-AK01'), 4, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-142');

-- [DEPT-30] İKLİM DEĞİŞİKLİĞİ VE SIFIR ATIK MÜDÜRLÜĞÜ (Rooms ZA-01, ZA-02)
INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-143', '255.09.02.01', 'GBZ-869020260143', 'Endüstriyel Otomatik Organik Atık Kompost Makinesi (Günde 1 Ton)', 'Temizlik Ekipmanları', 'Ecomaster Biyo-Fermantasyon ve Kompost Üretim Ünitesi (Model EM-1000)', 'SN-ECM-99143', 'İklim Değişikliği ve Sıfır Atık Müdürlüğü', 'Saha ve Muhtarlık Hizmet Noktaları - Zemin Kat - Oda ZA-02', 'Biyolog Zafer', 'Aktif', 'Çok İyi', TO_DATE('2024-05-12', 'YYYY-MM-DD'), TO_DATE('2027-05-12', 'YYYY-MM-DD'), 890000, 'Ecomaster Çevre Teknolojileri', 'Belediye pazaryerleri ve aşevi organik atıklarını 24 saatte park gübresine dönüştürür', 30, (SELECT id FROM sub_units WHERE code = 'SUB-30-02'), 12, 37, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-SIFIR-KZ-ZA02'), 9, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-143');

INSERT INTO assets (code, tif_code, barcode, name, category, brand_model, serial_number, unit_name, location_info, assignee_name, status, condition_status, acquisition_date, warranty_end_date, estimated_value, supplier, notes, department_id, sub_unit_id, building_id, floor_id, room_id, category_id, is_active)
SELECT 'GBZ-AST-144', '255.06.02.01', 'GBZ-869020260144', 'Sıfır Atık Elektrikli Çöp ve Geri Dönüşüm Triportörü', 'Araç ve Taşıtlar', 'Volta VM4 Çevre Dostu Elektrikli Kargo ve Atık Taşıma Aracı', 'SN-VLT-44144', 'İklim Değişikliği ve Sıfır Atık Müdürlüğü', 'Saha ve Muhtarlık Hizmet Noktaları - Zemin Kat - Oda ZA-01', 'Çevre Müh. Derya', 'Aktif', 'Çok İyi', TO_DATE('2024-10-18', 'YYYY-MM-DD'), TO_DATE('2027-10-18', 'YYYY-MM-DD'), 135000, 'Volta Motor A.Ş.', 'Eski Çarşı ve yaya yollarında sıfır emisyonlu geri kazanılabilir atık toplama', 30, (SELECT id FROM sub_units WHERE code = 'SUB-30-01'), 12, 37, (SELECT id FROM rooms WHERE qr_code = 'GBZ-ROOM-SIFIR-KZ-ZA01'), 6, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM assets WHERE code = 'GBZ-AST-144');

-- 5. ASSET CATEGORY SENKRONİZASYONU VE FOREIGN KEY TUTARLILIĞI
UPDATE assets a SET a.category_id = (SELECT c.id FROM asset_categories c WHERE c.name = a.category) WHERE a.category_id IS NULL;
UPDATE assets a SET a.department_id = (SELECT r.department_id FROM rooms r WHERE r.id = a.room_id) WHERE a.room_id IS NOT NULL AND a.department_id IS NULL;
UPDATE assets a SET a.building_id = (SELECT r.building_id FROM rooms r WHERE r.id = a.room_id) WHERE a.room_id IS NOT NULL AND a.building_id IS NULL;
UPDATE assets a SET a.floor_id = (SELECT r.floor_id FROM rooms r WHERE r.id = a.room_id) WHERE a.room_id IS NOT NULL AND a.floor_id IS NULL;

