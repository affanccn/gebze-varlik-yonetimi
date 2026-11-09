package tr.gov.gebze.varlik.personnel.bulkimport;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.*;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.security.SecurityAuditService;

@Service
public class PersonnelImportService {

    private static final Logger log = LoggerFactory.getLogger(PersonnelImportService.class);
    private static final int MAX_ROWS = 2000;
    private static final Locale TR_LOCALE = Locale.forLanguageTag("tr-TR");

    static {
        ZipSecureFile.setMinInflateRatio(0.005);
        ZipSecureFile.setMaxEntrySize(50L * 1024 * 1024);
    }

    private final JdbcClient jdbcClient;

    public PersonnelImportService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void generateTemplate(OutputStream out, String role, Long deptId) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Personel Listesi");

            // Başlık stili
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            String[] headers = {
                    "Sicil No*", "Ad*", "Soyad*", "Unvan", "Müdürlük Kodu*",
                    "Alt Birim Adı", "Oda No", "Telefon", "E-Posta"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 20 * 256);
            }

            // Örnek Satır 1
            Row sampleRow = sheet.createRow(1);
            sampleRow.createCell(0).setCellValue("SCL-2026-001");
            sampleRow.createCell(1).setCellValue("Ali");
            sampleRow.createCell(2).setCellValue("Yılmaz");
            sampleRow.createCell(3).setCellValue("Elektrik Mühendisi");
            sampleRow.createCell(4).setCellValue(deptId != null ? String.format("DEPT-%02d", deptId) : "DEPT-11");
            sampleRow.createCell(5).setCellValue("Atölye ve Saha Amirliği");
            sampleRow.createCell(6).setCellValue("101");
            sampleRow.createCell(7).setCellValue("0262 642 00 01");
            sampleRow.createCell(8).setCellValue("ali.yilmaz@gebze.bel.tr");

            workbook.write(out);
        }
    }

    public PersonnelImportValidationResult validateExcel(InputStream is, String role, Long userDeptId) {
        List<PersonnelImportError> errors = new ArrayList<>();
        List<PersonnelImportRow> validRows = new ArrayList<>();
        Set<String> seenRegNumbers = new HashSet<>();

        Map<String, Long> deptCodeMap = loadDepartmentCodeMap();
        Map<String, String> deptNameMap = loadDepartmentNameMap();
        Map<String, Long> roomNumberMap = loadRoomNumberMap();
        Map<String, Long> subUnitMap = loadSubUnitMap();

        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int rowCount = sheet.getLastRowNum();
            int nonEmptyCount = 0;

            for (int r = 1; r <= rowCount; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;

                nonEmptyCount++;
                int rowNum = r + 1;
                if (nonEmptyCount > MAX_ROWS) {
                    errors.add(new PersonnelImportError(rowNum, "Dosya",
                            "Maksimum satır sınırı aşıldı (En fazla " + MAX_ROWS + " satır yüklenebilir)."));
                    break;
                }

                boolean hasError = false;
                for (int c = 0; c <= 8; c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == CellType.FORMULA) {
                        errors.add(new PersonnelImportError(rowNum, "Hücre " + (c + 1),
                                "Formül içeren hücreler güvenlik gerekçesiyle kabul edilmez."));
                        hasError = true;
                    }
                }

                String regNo = getCellString(row.getCell(0));
                String firstName = getCellString(row.getCell(1));
                String lastName = getCellString(row.getCell(2));
                String title = getCellString(row.getCell(3));
                String deptCode = getCellString(row.getCell(4));
                String subUnit = getCellString(row.getCell(5));
                String roomNo = getCellString(row.getCell(6));
                String phone = getCellString(row.getCell(7));
                String email = getCellString(row.getCell(8));

                String[] checkFields = {regNo, firstName, lastName, title, deptCode, subUnit, roomNo, email};
                for (String val : checkFields) {
                    String trimmed = val.trim();
                    if (!trimmed.isEmpty()) {
                        char firstChar = trimmed.charAt(0);
                        if (firstChar == '=' || firstChar == '@' || firstChar == '+' || firstChar == '-') {
                            errors.add(new PersonnelImportError(rowNum, "Güvenlik",
                                    "Formül enjeksiyonu riski taşıyan karakter ('" + firstChar + "') ile başlayan metin kabul edilmez."));
                            hasError = true;
                            break;
                        }
                    }
                }

                if (regNo.isBlank()) {
                    errors.add(new PersonnelImportError(rowNum, "Sicil No", "Sicil No zorunludur."));
                    hasError = true;
                } else if (!seenRegNumbers.add(regNo.trim().toUpperCase(Locale.ROOT))) {
                    errors.add(new PersonnelImportError(rowNum, "Sicil No", "Dosya içinde mükerrer sicil no: " + regNo));
                    hasError = true;
                }

                if (firstName.isBlank()) {
                    errors.add(new PersonnelImportError(rowNum, "Ad", "Personel adı zorunludur."));
                    hasError = true;
                }
                if (lastName.isBlank()) {
                    errors.add(new PersonnelImportError(rowNum, "Soyad", "Personel soyadı zorunludur."));
                    hasError = true;
                }

                Long deptId = null;
                String deptName = null;
                if (deptCode.isBlank()) {
                    errors.add(new PersonnelImportError(rowNum, "Müdürlük Kodu", "Müdürlük kodu zorunludur."));
                    hasError = true;
                } else {
                    String normDeptCode = deptCode.trim().toUpperCase(Locale.ROOT);
                    deptId = deptCodeMap.get(normDeptCode);
                    deptName = deptNameMap.get(normDeptCode);
                    if (deptId == null) {
                        errors.add(new PersonnelImportError(rowNum, "Müdürlük Kodu", "Geçersiz müdürlük kodu: " + deptCode));
                        hasError = true;
                    } else if ("DEPT_MANAGER".equalsIgnoreCase(role) && userDeptId != null && !deptId.equals(userDeptId)) {
                        errors.add(new PersonnelImportError(rowNum, "Müdürlük Kodu", "Kendi müdürlüğünüz dışına personel ekleyemezsiniz."));
                        hasError = true;
                    }
                }

                Long subUnitId = null;
                if (!subUnit.isBlank() && deptId != null) {
                    subUnitId = resolveSubUnitId(subUnitMap, deptId, subUnit);
                }

                Long roomId = null;
                if (!roomNo.isBlank()) {
                    roomId = roomNumberMap.get(roomNo.trim());
                }

                if (!hasError) {
                    validRows.add(new PersonnelImportRow(
                            rowNum, regNo.trim(), firstName.trim(), lastName.trim(),
                            title.isBlank() ? "Personel" : title.trim(),
                            deptCode.trim(), deptName, subUnit.trim(), roomNo.trim(),
                            phone.trim(), email.trim(), deptId, subUnitId, roomId
                    ));
                }
            }
        } catch (Exception e) {
            log.error("Excel parse hatası", e);
            errors.add(new PersonnelImportError(0, "Dosya", "Excel dosyası okunamadı: " + e.getMessage()));
        }

        List<PersonnelImportRow> preview = validRows.stream().limit(10).toList();
        return new PersonnelImportValidationResult(
                validRows.size() + errors.size(),
                validRows.size(),
                errors.size(),
                errors,
                preview
        );
    }

    @Transactional
    public PersonnelImportCommitResult commitImport(InputStream is, String role, Long userDeptId, String actorUsername) {
        byte[] data;
        try {
            data = is.readAllBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Excel dosyası okunamadı: " + e.getMessage());
        }

        PersonnelImportValidationResult valResult = validateExcel(new ByteArrayInputStream(data), role, userDeptId);
        if (valResult.errorRows() > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "İçe aktarım durduruldu. Dosyada " + valResult.errorRows() + " adet hata bulunmaktadır.");
        }

        return executeCommit(new ByteArrayInputStream(data), role, userDeptId, actorUsername);
    }

    @Transactional
    public PersonnelImportCommitResult executeCommit(InputStream is, String role, Long userDeptId, String actorUsername) {
        Map<String, Long> deptCodeMap = loadDepartmentCodeMap();
        Map<String, Long> roomNumberMap = loadRoomNumberMap();
        Map<String, Long> subUnitMap = loadSubUnitMap();

        int inserted = 0;
        int updated = 0;

        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int rowCount = sheet.getLastRowNum();

            for (int r = 1; r <= rowCount; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row)) continue;

                String regNo = getCellString(row.getCell(0)).trim();
                String firstName = getCellString(row.getCell(1)).trim();
                String lastName = getCellString(row.getCell(2)).trim();
                String title = getCellString(row.getCell(3)).trim();
                String deptCode = getCellString(row.getCell(4)).trim().toUpperCase(Locale.ROOT);
                String subUnit = getCellString(row.getCell(5)).trim();
                String roomNo = getCellString(row.getCell(6)).trim();
                String phone = getCellString(row.getCell(7)).trim();
                String email = getCellString(row.getCell(8)).trim();

                Long deptId = deptCodeMap.get(deptCode);
                Long subUnitId = (!subUnit.isBlank() && deptId != null) ? resolveSubUnitId(subUnitMap, deptId, subUnit) : null;
                Long roomId = roomNo.isBlank() ? null : roomNumberMap.get(roomNo);
                String fullName = firstName + " " + lastName;

                Integer exists = jdbcClient.sql("SELECT COUNT(*) FROM personnel WHERE registration_number = ?")
                        .param(1, regNo).query(Integer.class).single();

                if (exists != null && exists > 0) {
                    jdbcClient.sql("""
                        UPDATE personnel
                        SET first_name = ?, last_name = ?, full_name = ?, title = ?,
                            department_id = ?, sub_unit_id = ?, room_id = ?, phone = ?, email = ?,
                            is_active = 1, is_deleted = 0, deleted_at = NULL, deleted_by = NULL
                        WHERE registration_number = ?
                    """)
                    .param(1, firstName)
                    .param(2, lastName)
                    .param(3, fullName)
                    .param(4, title.isBlank() ? "Personel" : title)
                    .param(5, deptId)
                    .param(6, subUnitId)
                    .param(7, roomId)
                    .param(8, phone.isBlank() ? null : phone)
                    .param(9, email.isBlank() ? null : email)
                    .param(10, regNo)
                    .update();
                    updated++;
                } else {
                    jdbcClient.sql("""
                        INSERT INTO personnel (
                            registration_number, first_name, last_name, full_name,
                            title, department_id, sub_unit_id, room_id, phone, email, is_active, is_deleted
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
                    """)
                    .param(1, regNo)
                    .param(2, firstName)
                    .param(3, lastName)
                    .param(4, fullName)
                    .param(5, title.isBlank() ? "Personel" : title)
                    .param(6, deptId)
                    .param(7, subUnitId)
                    .param(8, roomId)
                    .param(9, phone.isBlank() ? null : phone)
                    .param(10, email.isBlank() ? null : email)
                    .update();
                    inserted++;
                }
            }

            // Audit Log
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name,
                    ip_address, description, created_at
                ) VALUES ('TOPLU_PERSONEL_ICE_AKTARIM', 'PERSONNEL', 'BULK', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """)
            .param(1, actorUsername)
            .param(2, actorUsername)
            .param(3, SecurityAuditService.resolveCurrentClientIp())
            .param(4, "Excel ile toplu personel içe aktarıldı. Eklenen: " + inserted + ", Güncellenen: " + updated)
            .update();

        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Toplu aktarım hatası", e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Kayıt sırasında hata oluştu: " + e.getMessage());
        }

        return new PersonnelImportCommitResult(inserted, updated, inserted + updated);
    }

    private Map<String, Long> loadDepartmentCodeMap() {
        Map<String, Long> map = new HashMap<>();
        jdbcClient.sql("SELECT code, id FROM departments WHERE is_active = 1")
                .query((rs, r) -> map.put(rs.getString("code").toUpperCase(Locale.ROOT), rs.getLong("id"))).list();
        return map;
    }

    private Map<String, String> loadDepartmentNameMap() {
        Map<String, String> map = new HashMap<>();
        jdbcClient.sql("SELECT code, name FROM departments WHERE is_active = 1")
                .query((rs, r) -> map.put(rs.getString("code").toUpperCase(Locale.ROOT), rs.getString("name"))).list();
        return map;
    }

    private Map<String, Long> loadSubUnitMap() {
        Map<String, Long> map = new HashMap<>();
        jdbcClient.sql("SELECT id, department_id, code, name FROM sub_units WHERE is_active = 1")
                .query((rs, r) -> {
                    long id = rs.getLong("id");
                    long deptId = rs.getLong("department_id");
                    String code = rs.getString("code");
                    String name = rs.getString("name");
                    if (code != null) {
                        map.put(deptId + ":" + code.trim().toLowerCase(TR_LOCALE), id);
                        map.put("ANY:" + code.trim().toLowerCase(TR_LOCALE), id);
                    }
                    if (name != null) {
                        map.put(deptId + ":" + name.trim().toLowerCase(TR_LOCALE), id);
                        map.put("ANY:" + name.trim().toLowerCase(TR_LOCALE), id);
                    }
                }).list();
        return map;
    }

    private Long resolveSubUnitId(Map<String, Long> subUnitMap, Long deptId, String subUnitText) {
        String norm = subUnitText.trim().toLowerCase(TR_LOCALE);
        Long byDept = subUnitMap.get(deptId + ":" + norm);
        return byDept != null ? byDept : subUnitMap.get("ANY:" + norm);
    }

    private Map<String, Long> loadRoomNumberMap() {
        Map<String, Long> map = new HashMap<>();
        jdbcClient.sql("SELECT room_number, id FROM rooms WHERE is_active = 1")
                .query((rs, r) -> map.put(rs.getString("room_number").trim(), rs.getLong("id"))).list();
        return map;
    }

    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK && !getCellString(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }
}
