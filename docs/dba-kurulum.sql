-- =============================================================================
-- T.C. GEBZE BELEDİYESİ KURUMSAL VARLIK VE KAYNAK YÖNETİM SİSTEMİ (GEBZE-EKYS)
-- ORACLE VERİTABANI YÖNETİCİSİ (DBA) KURULUM VE YETKİLENDİRME BETİĞİ
-- Uyumlu Sürümler: Oracle Database 19c / 21c / 23ai (CDB/PDB veya Non-CDB)
-- =============================================================================
-- KULLANIM AMACI:
-- Bu betik Belediye Veritabanı Yöneticisi (DBA) tarafından SYSDBA / PDBADMIN
-- yetkisiyle çalıştırılır. En az ayrıcalık (Least Privilege) ilkesine göre
-- iki ayrı kullanıcı oluşturur:
--   1) VARLIK_OWNER       : Şema sahibi ve Flyway DDL migrasyon kullanıcısı.
--   2) VARLIK_APP_RUNTIME : Uygulamanın çalışma zamanında (7/24) bağlandığı,
--                           DROP/ALTER/TRUNCATE yetkisi OLMAYAN ve denetim
--                           günlüğünde (system_audit_logs) SİLME/GÜNCELLEME
--                           yapamayan güvenli DML kullanıcısı.
-- =============================================================================

-- [ADIM 0] İlgili Pluggable Database (PDB) içine geçiş (Örn: GEBZEPDB veya FREEPDB1)
-- ALTER SESSION SET CONTAINER = GEBZEPDB;

-- =============================================================================
-- [ADIM 1] TABLESPACE OLUŞTURULMASI (Veri ve İndeks Ayrımı)
-- Not: Veri dosyası yollarını (+DATA ASM disk grubu veya dosya sistemi)
--      belediye sunucu yapısına göre uyarlayınız. Oracle OMF açıksa DATAFILE
--      parametresi olmadan da çalıştırılabilir.
-- =============================================================================
CREATE TABLESPACE GEBZE_VARLIK_DATA
    DATAFILE 'gebze_varlik_data01.dbf' SIZE 512M
    AUTOEXTEND ON NEXT 256M MAXSIZE 10G
    EXTENT MANAGEMENT LOCAL AUTOALLOCATE
    SEGMENT SPACE MANAGEMENT AUTO;

CREATE TABLESPACE GEBZE_VARLIK_IDX
    DATAFILE 'gebze_varlik_idx01.dbf' SIZE 256M
    AUTOEXTEND ON NEXT 128M MAXSIZE 5G
    EXTENT MANAGEMENT LOCAL AUTOALLOCATE
    SEGMENT SPACE MANAGEMENT AUTO;

-- =============================================================================
-- [ADIM 2] ŞEMA SAHİBİ VE MİGRASYON KULLANICISI (VARLIK_OWNER — DDL YETKİLİ)
-- Yalnızca Flyway şema kurulumu ve sürüm geçişlerinde kullanılır.
-- =============================================================================
CREATE USER VARLIK_OWNER IDENTIFIED BY "Degistir_Owner_2026#GbZ!"
    DEFAULT TABLESPACE GEBZE_VARLIK_DATA
    TEMPORARY TABLESPACE TEMP
    QUOTA UNLIMITED ON GEBZE_VARLIK_DATA
    QUOTA UNLIMITED ON GEBZE_VARLIK_IDX
    ACCOUNT UNLOCK;

GRANT CREATE SESSION       TO VARLIK_OWNER;
GRANT CREATE TABLE         TO VARLIK_OWNER;
GRANT CREATE VIEW          TO VARLIK_OWNER;
GRANT CREATE SEQUENCE      TO VARLIK_OWNER;
GRANT CREATE TRIGGER       TO VARLIK_OWNER;
GRANT CREATE PROCEDURE     TO VARLIK_OWNER;
GRANT CREATE SYNONYM       TO VARLIK_OWNER;

-- =============================================================================
-- [ADIM 3] UYGULAMA ÇALIŞMA ZAMANI KULLANICISI (VARLIK_APP_RUNTIME — SADECE DML)
-- Uygulama sunucusu (.env içinde DB_USER) bu kullanıcı ile bağlanır.
-- DDL (DROP/TRUNCATE/ALTER) yetkisi kesinlikle verilmez.
-- =============================================================================
CREATE USER VARLIK_APP_RUNTIME IDENTIFIED BY "Degistir_Runtime_2026#GbZ!"
    DEFAULT TABLESPACE GEBZE_VARLIK_DATA
    TEMPORARY TABLESPACE TEMP
    QUOTA 0M ON GEBZE_VARLIK_DATA
    ACCOUNT UNLOCK;

GRANT CREATE SESSION TO VARLIK_APP_RUNTIME;

-- =============================================================================
-- [ADIM 4] LOGON TRIGGER (OTOMATİK ŞEMA VE TÜRKÇE DİLBİLİMSEL SIRALAMA AYARI)
-- VARLIK_APP_RUNTIME bağlandığında otomatik olarak VARLIK_OWNER şemasını
-- varsayılan şema yapar ve Türkçe duyarsız aramayı (TURKISH_AI) etkinleştirir.
-- =============================================================================
CREATE OR REPLACE TRIGGER VARLIK_OWNER.TRG_RUNTIME_LOGON_INIT
AFTER LOGON ON VARLIK_APP_RUNTIME.SCHEMA
BEGIN
    EXECUTE IMMEDIATE 'ALTER SESSION SET CURRENT_SCHEMA = VARLIK_OWNER';
    EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_COMP = LINGUISTIC';
    EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_SORT = TURKISH_AI';
END;
/

-- =============================================================================
-- [ADIM 5] FLYWAY MİGRASYONU SONRASI DML YETKİLERİNİN VERİLMESİプロSEDÜRÜ
-- Not: Uygulama ilk kez FLYWAY_USER=VARLIK_OWNER ile başlatılıp 19 tablo
--      oluşturulduktan sonra (veya her yeni sürüm sonrasında) çalıştırılır.
--      system_audit_logs tablosuna DELETE ve UPDATE yetkisi VERİLMEZ!
-- =============================================================================
CREATE OR REPLACE PROCEDURE VARLIK_OWNER.PRC_GRANT_RUNTIME_PRIVS AS
BEGIN
    FOR t IN (
        SELECT table_name
        FROM all_tables
        WHERE owner = 'VARLIK_OWNER'
          AND table_name NOT LIKE 'FLYWAY%'
    ) LOOP
        IF t.table_name = 'SYSTEM_AUDIT_LOGS' THEN
            -- Denetim günlüğü tablosunda yalnızca INSERT ve SELECT yetkisi!
            EXECUTE IMMEDIATE 'GRANT SELECT, INSERT ON VARLIK_OWNER.' || t.table_name || ' TO VARLIK_APP_RUNTIME';
        ELSE
            EXECUTE IMMEDIATE 'GRANT SELECT, INSERT, UPDATE, DELETE ON VARLIK_OWNER.' || t.table_name || ' TO VARLIK_APP_RUNTIME';
        END IF;
    END LOOP;

    -- Flyway geçmiş tablosu için salt okunur yetki (doğrulama için)
    FOR f IN (
        SELECT table_name
        FROM all_tables
        WHERE owner = 'VARLIK_OWNER'
          AND table_name LIKE 'FLYWAY%'
    ) LOOP
        EXECUTE IMMEDIATE 'GRANT SELECT ON VARLIK_OWNER.' || f.table_name || ' TO VARLIK_APP_RUNTIME';
    END LOOP;
END;
/

-- İlk kurulumda tablolar oluştuktan sonra çalıştırmak için:
-- EXEC VARLIK_OWNER.PRC_GRANT_RUNTIME_PRIVS;

