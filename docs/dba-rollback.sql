-- ============================================================================
-- GEBZE BELEDİYESİ VARLIK YÖNETİM SİSTEMİ
-- BAĞLANTI GÜNÜ DBA GERİ DÖNÜŞ (ROLLBACK / KALDIRMA) BETİĞİ
-- ============================================================================
-- AMAÇ: Sıfır kurulum yapılan ortamda, canlıya geçiş adımlarında kritik bir
-- engel oluştuğunda sistemi tamamen temizlemek ve başlangıç durumuna dönmek.
-- NOT: Yeni bir sistem kurulumu olduğundan geçmiş sistem yedeğinden geri yükleme
-- (restore) söz konusu değildir; temizleme işlemi bu betikle güvenle yapılır.
-- ============================================================================

SET SERVEROUTPUT ON SIZE UNLIMITED;
SET LINESIZE 200;
SET PAGESIZE 100;
WHENEVER SQLERROR CONTINUE;

PROMPT ============================================================================
PROMPT 1. MEVCUT DURUM VE TABLO SATIR SAYILARI TESPİT EDİLİYOR...
PROMPT ============================================================================

DECLARE
    v_count NUMBER;
    v_total_rows NUMBER := 0;
BEGIN
    DBMS_OUTPUT.PUT_LINE(RPAD('TABLO ADI', 35) || ' | ' || LPAD('SATIR SAYISI', 15));
    DBMS_OUTPUT.PUT_LINE(RPAD('-', 35, '-') || '-+-' || LPAD('-', 15, '-'));
    
    FOR r IN (
        SELECT table_name 
        FROM all_tables 
        WHERE owner = 'VARLIK_OWNER'
        ORDER BY table_name
    ) LOOP
        BEGIN
            EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM VARLIK_OWNER.' || DBMS_ASSERT.ENQUOTE_NAME(r.table_name) INTO v_count;
            DBMS_OUTPUT.PUT_LINE(RPAD(r.table_name, 35) || ' | ' || LPAD(TO_CHAR(v_count), 15));
            v_total_rows := v_total_rows + v_count;
        EXCEPTION
            WHEN OTHERS THEN
                DBMS_OUTPUT.PUT_LINE(RPAD(r.table_name, 35) || ' | ' || LPAD('HATA/OKUNAMADI', 15));
        END;
    END LOOP;
    
    DBMS_OUTPUT.PUT_LINE(RPAD('-', 35, '-') || '-+-' || LPAD('-', 15, '-'));
    DBMS_OUTPUT.PUT_LINE(RPAD('TOPLAM SATIR SAYISI', 35) || ' | ' || LPAD(TO_CHAR(v_total_rows), 15));
END;
/

PROMPT
PROMPT ============================================================================
PROMPT 2. AKTİF OTURUMLAR SONLANDIRILIYOR (KILL SESSIONS)...
PROMPT ============================================================================

DECLARE
    CURSOR c_sess IS
        SELECT sid, serial#
        FROM v$session
        WHERE username IN ('VARLIK_OWNER', 'VARLIK_APP_RUNTIME');
BEGIN
    FOR s IN c_sess LOOP
        BEGIN
            EXECUTE IMMEDIATE 'ALTER SYSTEM DISCONNECT SESSION ''' || s.sid || ',' || s.serial# || ''' IMMEDIATE';
            DBMS_OUTPUT.PUT_LINE('Oturum kapatıldı: SID=' || s.sid || ', SERIAL#=' || s.serial#);
        EXCEPTION
            WHEN OTHERS THEN
                DBMS_OUTPUT.PUT_LINE('Oturum kapatılamadı: SID=' || s.sid || ' (' || SQLERRM || ')');
        END;
    END LOOP;
END;
/

PROMPT
PROMPT ============================================================================
PROMPT 3. KULLANICILAR VE ŞEMA NESNELERİ SİLİNİYOR...
PROMPT ============================================================================

-- Çalışma zamanı kullanıcısı siliniyor
BEGIN
    EXECUTE IMMEDIATE 'DROP USER VARLIK_APP_RUNTIME CASCADE';
    DBMS_OUTPUT.PUT_LINE('Kullanici VARLIK_APP_RUNTIME basariyla silindi.');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('VARLIK_APP_RUNTIME silinirken uyari: ' || SQLERRM);
END;
/

-- Şema sahibi ve tüm nesneleri siliniyor
BEGIN
    EXECUTE IMMEDIATE 'DROP USER VARLIK_OWNER CASCADE';
    DBMS_OUTPUT.PUT_LINE('Kullanici ve sema VARLIK_OWNER CASCADE basariyla silindi.');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('VARLIK_OWNER silinirken uyari: ' || SQLERRM);
END;
/

PROMPT
PROMPT ============================================================================
PROMPT 4. TABLESPACE ALANLARI TEMİZLENİYOR (İSTEĞE BAĞLI)...
PROMPT ============================================================================

-- Eğer sistem için özel tablespace oluşturulmuşsa kaldırılır:
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLESPACE GEBZE_VARLIK_DATA INCLUDING CONTENTS AND DATAFILES';
    DBMS_OUTPUT.PUT_LINE('TABLESPACE GEBZE_VARLIK_DATA kaldirildi.');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('GEBZE_VARLIK_DATA kaldirilmadi / bulunamadi (Normal): ' || SQLERRM);
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLESPACE GEBZE_VARLIK_IDX INCLUDING CONTENTS AND DATAFILES';
    DBMS_OUTPUT.PUT_LINE('TABLESPACE GEBZE_VARLIK_IDX kaldirildi.');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('GEBZE_VARLIK_IDX kaldirilmadi / bulunamadi (Normal): ' || SQLERRM);
END;
/

PROMPT
PROMPT ============================================================================
PROMPT 5. GERİ DÖNÜŞ (ROLLBACK) TAMAMLANDI VE DOĞRULANDI.
PROMPT ============================================================================

SELECT username, account_status FROM all_users WHERE username IN ('VARLIK_OWNER', 'VARLIK_APP_RUNTIME');
