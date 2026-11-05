-- =============================================================================
-- GEBZE-EKYS: FAZ 1F-3 YÜKSEK ÖLÇEKLİ PERFORMANS VE İNDEKS BENCHMARK BETİĞİ
-- Test Veritabanı: Port 1522 (gebze-oracle-perftest)
-- =============================================================================

SET SERVEROUTPUT ON SIZE UNLIMITED;
SET LINESIZE 200;
SET PAGESIZE 1000;
SET FEEDBACK OFF;

ALTER SESSION SET NLS_COMP=LINGUISTIC;
ALTER SESSION SET NLS_SORT=TURKISH_AI;

PROMPT =============================================================================
PROMPT 1. TABLO SATIR SAYILARI VE İSTATİSTİK DURUMU
PROMPT =============================================================================

SELECT table_name, num_rows, blocks, last_analyzed
FROM user_tables
WHERE table_name IN ('ASSETS', 'ASSET_ASSIGNMENTS', 'ASSET_MOVEMENTS', 'STOCK_TRANSACTIONS', 'SYSTEM_AUDIT_LOGS')
ORDER BY table_name;

PROMPT 
PROMPT =============================================================================
PROMPT 2. BENCHMARK ÖLÇÜMLERİ (MİLİSANİYE CİNSİNDEN ORTALAMA SÜRELER)
PROMPT =============================================================================

DECLARE
    v_t1 TIMESTAMP;
    v_t2 TIMESTAMP;
    v_elapsed_ms NUMBER;
    v_dummy NUMBER;
    
    -- Ölçüm yardımcı prosedürü
    PROCEDURE measure_query(p_name VARCHAR2, p_target_ms NUMBER, p_sql VARCHAR2) IS
        v_start TIMESTAMP;
        v_end TIMESTAMP;
        v_total_ms NUMBER := 0;
        v_runs CONSTANT PLS_INTEGER := 10;
        v_cur SYS_REFCURSOR;
        v_row_count NUMBER := 0;
        v_status VARCHAR2(10);
    BEGIN
        -- Isınma (warmup)
        OPEN v_cur FOR p_sql;
        LOOP
            FETCH v_cur INTO v_dummy;
            EXIT WHEN v_cur%NOTFOUND;
        END LOOP;
        CLOSE v_cur;

        -- 10 tekrar ile ortalama ölçüm
        FOR i IN 1..v_runs LOOP
            v_start := SYSTIMESTAMP;
            OPEN v_cur FOR p_sql;
            LOOP
                FETCH v_cur INTO v_dummy;
                EXIT WHEN v_cur%NOTFOUND;
            END LOOP;
            CLOSE v_cur;
            v_end := SYSTIMESTAMP;
            
            v_total_ms := v_total_ms + (
                EXTRACT(SECOND FROM (v_end - v_start)) * 1000 +
                EXTRACT(MINUTE FROM (v_end - v_start)) * 60000
            );
        END LOOP;

        v_total_ms := ROUND(v_total_ms / v_runs, 2);
        IF v_total_ms <= p_target_ms THEN
            v_status := 'BASARILI';
        ELSE
            v_status := 'BASARISIZ';
        END IF;

        DBMS_OUTPUT.PUT_LINE(
            RPAD(p_name, 55) || ' | Ort: ' || 
            LPAD(TO_CHAR(v_total_ms, '990.99'), 8) || ' ms | Hedef: < ' || 
            LPAD(TO_CHAR(p_target_ms), 4) || ' ms | ' || v_status
        );
    END;
BEGIN
    DBMS_OUTPUT.PUT_LINE(RPAD('TEST SENARYOSU', 55) || ' | ' || LPAD('SURE', 12) || ' | ' || LPAD('HEDEF', 11) || ' | DURUM');
    DBMS_OUTPUT.PUT_LINE(RPAD('-', 95, '-'));

    -- 1. Asset İlk Sayfa (OFFSET 0 FETCH 20)
    measure_query(
        '1. Asset Ilk Sayfa (OFFSET 0 FETCH 20, Dept=1)', 
        50,
        'SELECT id FROM assets WHERE is_deleted = 0 AND department_id = 1 ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY'
    );

    -- 2. Asset Derin Sayfa (Page 500 / OFFSET 10.000 FETCH 20)
    measure_query(
        '2. Asset Derin Sayfa (OFFSET 10000 FETCH 20, Dept=1)', 
        300,
        'SELECT id FROM assets WHERE is_deleted = 0 AND department_id = 1 ORDER BY id DESC OFFSET 10000 ROWS FETCH NEXT 20 ROWS ONLY'
    );

    -- 3. Asset Turkce Metin Arama ("kamyon")
    measure_query(
        '3. Asset Turkce Arama (q=kamyon, OFFSET 0 FETCH 20)', 
        100,
        'SELECT id FROM assets WHERE is_deleted = 0 AND (code LIKE ''%KAMYON%'' OR name LIKE ''%kamyon%'') ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY'
    );

    -- 4. Asset Turkce Metin Arama ("bilgisayar")
    measure_query(
        '4. Asset Turkce Arama (q=bilgisayar, OFFSET 0 FETCH 20)', 
        100,
        'SELECT id FROM assets WHERE is_deleted = 0 AND (code LIKE ''%BILGISAYAR%'' OR name LIKE ''%bilgisayar%'') ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY'
    );

    -- 5. Asset Fiyat Siralama (sort=estimatedValue,desc)
    measure_query(
        '5. Asset Fiyat Siralama (sort=estimatedValue,desc)', 
        150,
        'SELECT id FROM assets WHERE is_deleted = 0 AND department_id = 1 ORDER BY estimated_value DESC, id DESC OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY'
    );

    -- 6. Audit Logs Keyset Ilk Sayfa (FETCH 20) - 1M kayitta
    measure_query(
        '6. Audit Logs Keyset Ilk Sayfa (1M satirdan)', 
        15,
        'SELECT id FROM system_audit_logs ORDER BY id DESC FETCH FIRST 20 ROWS ONLY'
    );

    -- 7. Audit Logs Keyset Derin Sayfa (id < 500000) - 1M kayitta O(1)
    measure_query(
        '7. Audit Logs Keyset Derin Sayfa (id < 500000)', 
        15,
        'SELECT id FROM system_audit_logs WHERE id < 500000 ORDER BY id DESC FETCH FIRST 20 ROWS ONLY'
    );

    -- 8. Movements Keyset Ilk Sayfa (500k kayitta)
    measure_query(
        '8. Movements Keyset Ilk Sayfa (500k satirdan)', 
        15,
        'SELECT id FROM asset_movements ORDER BY id DESC FETCH FIRST 20 ROWS ONLY'
    );

    -- 9. Movements Keyset Derin Sayfa (id < 250000)
    measure_query(
        '9. Movements Keyset Derin Sayfa (id < 250000)', 
        15,
        'SELECT id FROM asset_movements WHERE id < 250000 ORDER BY id DESC FETCH FIRST 20 ROWS ONLY'
    );

    -- 10. Stock Transactions Keyset Ilk Sayfa (500k kayitta)
    measure_query(
        '10. Stock Transactions Keyset Ilk Sayfa (500k)', 
        15,
        'SELECT id FROM stock_transactions ORDER BY id DESC FETCH FIRST 20 ROWS ONLY'
    );

    -- 11. Stock Transactions Keyset Derin Sayfa (id < 250000)
    measure_query(
        '11. Stock Transactions Keyset Derin Sayfa (id < 250000)', 
        15,
        'SELECT id FROM stock_transactions WHERE id < 250000 ORDER BY id DESC FETCH FIRST 20 ROWS ONLY'
    );

    -- 12. Asset Assignments OFFSET Sayfalama (300k kayitta)
    measure_query(
        '12. Asset Assignments OFFSET 0 FETCH 20 (300k)', 
        50,
        'SELECT id FROM asset_assignments WHERE status = ''AKTIF'' ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY'
    );

    DBMS_OUTPUT.PUT_LINE(RPAD('-', 95, '-'));
END;
/

PROMPT 
PROMPT =============================================================================
PROMPT 3. EXPLAIN PLAN İNCELEMELERİ (İNDEKS ERİŞİM YÖNTEMLERİ)
PROMPT =============================================================================

PROMPT >>> Plan 1: Asset Kapsam ve Derin Sayfalama (idx_assets_dept_scope)
EXPLAIN PLAN SET STATEMENT_ID = 'ASSET_DEPT' FOR
SELECT * FROM assets WHERE is_deleted = 0 AND department_id = 1 ORDER BY id DESC OFFSET 1000 ROWS FETCH NEXT 20 ROWS ONLY;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', 'ASSET_DEPT', 'TYPICAL'));

PROMPT >>> Plan 2: Audit Logs Keyset İmleç Taraması (idx_syslog_keyset / PK)
EXPLAIN PLAN SET STATEMENT_ID = 'AUDIT_KEYSET' FOR
SELECT * FROM system_audit_logs WHERE id < 500000 ORDER BY id DESC FETCH FIRST 20 ROWS ONLY;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', 'AUDIT_KEYSET', 'TYPICAL'));

PROMPT >>> Plan 3: Movements Keyset İmleç Taraması (idx_movements_keyset / PK)
EXPLAIN PLAN SET STATEMENT_ID = 'MOVE_KEYSET' FOR
SELECT * FROM asset_movements WHERE id < 250000 ORDER BY id DESC FETCH FIRST 20 ROWS ONLY;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', 'MOVE_KEYSET', 'TYPICAL'));

PROMPT >>> Plan 4: Stock Transactions Keyset İmleç Taraması
EXPLAIN PLAN SET STATEMENT_ID = 'STOCK_KEYSET' FOR
SELECT * FROM stock_transactions WHERE id < 250000 ORDER BY id DESC FETCH FIRST 20 ROWS ONLY;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', 'STOCK_KEYSET', 'TYPICAL'));

EXIT;
