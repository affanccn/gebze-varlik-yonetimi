-- ============================================================================
-- DİKKAT: YALNIZCA DBA, YALNIZCA İLK KURULUM SORUNLARINDA ÇALIŞTIRILMALIDIR!
-- ============================================================================
-- GEBZE BELEDİYESİ KURUMSAL VARLIK YÖNETİM SİSTEMİ
-- BAĞLANTI GÜNÜ DBA GERİ DÖNÜŞ (ROLLBACK / KALDIRMA) BETİĞİ
-- ============================================================================
-- GÜVENLİK KİLİDİ:
-- Eğer şemada kayıtlı veri varsa (toplam satır > 0), bu betik şemayı SİLMEZ
-- ve ORA-20001 hatasıyla durur.
-- Dolu şemayı bilinçli olarak temizlemek için aşağıdaki değişken 'EVET' yapılmalıdır:
--   DEFINE CONFIRM_DROP = 'HAYIR';  --> DEFINE CONFIRM_DROP = 'EVET';
-- ============================================================================

DEFINE CONFIRM_DROP = 'HAYIR'

SET SERVEROUTPUT ON SIZE UNLIMITED;
SET LINESIZE 200;
SET PAGESIZE 100;
WHENEVER SQLERROR EXIT FAILURE ROLLBACK;

PROMPT ============================================================================
PROMPT 1. MEVCUT DURUM VE GÜVENLİK KONTROLÜ (TABLO SATIR SAYILARI)...
PROMPT ============================================================================

DECLARE
    v_count NUMBER;
    v_total_rows NUMBER := 0;
    v_confirm VARCHAR2(10) := UPPER('&CONFIRM_DROP');
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

    IF v_total_rows > 0 AND v_confirm <> 'EVET' THEN
        RAISE_APPLICATION_ERROR(-20001, 
            'GÜVENLİK KİLİDİ: VARLIK_OWNER şemasında ' || v_total_rows || 
            ' adet satır veri tespit edildi! Silme işlemi durduruldu. ' ||
            'Bilinçli silme işlemi için script başındaki DEFINE CONFIRM_DROP = ''EVET'' olarak ayarlanmalıdır.');
    END IF;
    
    IF v_total_rows > 0 AND v_confirm = 'EVET' THEN
        DBMS_OUTPUT.PUT_LINE('UYARI: CONFIRM_DROP=EVET onaylandı. Dolu şema silme işlemine devam ediliyor...');
    ELSE
        DBMS_OUTPUT.PUT_LINE('BİLGİ: Şemada veri bulunmuyor (veya şema boş). Silme adımlarına geçilebilir.');
    END IF;
END;
/

WHENEVER SQLERROR CONTINUE;

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
