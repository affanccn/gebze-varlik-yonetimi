ALTER SESSION SET CONTAINER=FREEPDB1;
SET SERVEROUTPUT ON
SET FEEDBACK OFF
PROMPT --- 1) v$nls_valid_values: TURKISH tabanli siralama
SELECT parameter, value FROM v$nls_valid_values WHERE parameter='SORT' AND value IN ('TURKISH','XTURKISH');
PROMPT --- 2) TURKISH_AI oturumda gecerli mi + esitlik testi
ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI;
SELECT SYS_CONTEXT('USERENV','NLS_SORT') AS nls_sort,
       CASE WHEN 'İSTANBUL' = 'istanbul' THEN 'OK' ELSE 'FAIL' END AS i_test,
       CASE WHEN 'ŞİŞLİ' = 'sisli' THEN 'OK' ELSE 'FAIL' END AS ai_test
  FROM dual;
PROMPT --- 3) Tek ALTER SESSION ile CURRENT_SCHEMA + NLS (logon trigger fallback)
ALTER SESSION SET CURRENT_SCHEMA=SYSTEM NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI;
SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS cur_schema, SYS_CONTEXT('USERENV','NLS_SORT') AS nls_sort FROM dual;
ALTER SESSION SET CURRENT_SCHEMA=SYS;
PROMPT --- 4) CLOB IS JSON kisiti
CREATE TABLE system.tmp_json_chk (id NUMBER, doc CLOB CONSTRAINT tmp_json_chk_c CHECK (doc IS JSON));
INSERT INTO system.tmp_json_chk VALUES (1, '{"ram":"16GB"}');
DECLARE
  e_chk EXCEPTION; PRAGMA EXCEPTION_INIT(e_chk, -2290);
BEGIN
  INSERT INTO system.tmp_json_chk VALUES (2, 'gecersiz-json');
  DBMS_OUTPUT.PUT_LINE('FAIL: gecersiz JSON kabul edildi');
EXCEPTION WHEN e_chk THEN DBMS_OUTPUT.PUT_LINE('OK: gecersiz JSON ORA-02290 ile reddedildi');
END;
/
SELECT JSON_VALUE(doc, '$.ram') AS ram FROM system.tmp_json_chk;
DROP TABLE system.tmp_json_chk PURGE;
exit

