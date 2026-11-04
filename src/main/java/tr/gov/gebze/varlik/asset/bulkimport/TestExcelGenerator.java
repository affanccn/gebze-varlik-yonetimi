package tr.gov.gebze.varlik.asset.bulkimport;

import java.io.File;
import java.io.FileOutputStream;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

public class TestExcelGenerator {

    private static final String[] HEADERS = {
            "Varlık Kodu *",
            "Varlık Adı *",
            "Kategori Kodu *",
            "Müdürlük Kodu *",
            "Oda QR Kodu *",
            "Barkod No",
            "TİF / Taşınır Kodu",
            "Marka / Model",
            "Seri No",
            "Edinim Tarihi",
            "Garanti Bitiş Tarihi",
            "Tahmini Değer (₺)",
            "Tedarikçi / Firma",
            "Açıklama / Notlar"
    };

    public static void main(String[] args) throws Exception {
        File outDir = new File("target/test-excels");
        outDir.mkdirs();

        createMixedFile(new File(outDir, "mixed_5_valid_2_invalid.xlsx"));
        createFormulaInjectionFile(new File(outDir, "formula_injection.xlsx"));
        createDuplicateFile(new File(outDir, "duplicate_test.xlsx"));
        createOtherDeptFile(new File(outDir, "other_dept.xlsx"));

        System.out.println("ALL_TEST_EXCELS_GENERATED_SUCCESSFULLY");
    }

    private static void writeHeaders(Sheet sheet, CellStyle style) {
        Row h = sheet.createRow(0);
        for (int i = 0; i < HEADERS.length; i++) {
            Cell c = h.createCell(i);
            c.setCellValue(HEADERS[i]);
            c.setCellStyle(style);
        }
    }

    private static CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font f = wb.createFont();
        f.setBold(true);
        style.setFont(f);
        return style;
    }

    private static void createMixedFile(File file) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); FileOutputStream fos = new FileOutputStream(file)) {
            Sheet s = wb.createSheet("Varliklar");
            CellStyle hs = createHeaderStyle(wb);
            writeHeaders(s, hs);

            // 5 Valid Rows (Fen İşleri DEPT-11, Room GBZ-ROOM-FEN-KZ-01, Category CAT-01 / CAT-02)
            for (int i = 1; i <= 5; i++) {
                Row r = s.createRow(i);
                r.createCell(0).setCellValue("GBZ-TEST-IMP-00" + i);
                r.createCell(1).setCellValue("Test İçe Aktarım Varlığı " + i);
                r.createCell(2).setCellValue(i % 2 == 0 ? "CAT-01" : "CAT-02");
                r.createCell(3).setCellValue("DEPT-11");
                r.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");
                r.createCell(5).setCellValue("99900010000" + i);
                r.createCell(6).setCellValue("255.02.01." + i);
                r.createCell(7).setCellValue("Test Marka Model " + i);
                r.createCell(8).setCellValue("SN-TEST-00" + i);
                r.createCell(9).setCellValue("10.02.2026");
                r.createCell(10).setCellValue("10.02.2028");
                r.createCell(11).setCellValue(15000.0 * i);
                r.createCell(12).setCellValue("Gebze Test Tedarik A.Ş.");
                r.createCell(13).setCellValue("Faz 1D Test satırı " + i);
            }

            // Row 6: Invalid - Unknown Category
            Row r6 = s.createRow(6);
            r6.createCell(0).setCellValue("GBZ-TEST-IMP-ERR1");
            r6.createCell(1).setCellValue("Hatalı Kategori Varlığı");
            r6.createCell(2).setCellValue("CAT-UNKNOWN-999");
            r6.createCell(3).setCellValue("DEPT-11");
            r6.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");
            r6.createCell(5).setCellValue("999000100006");

            // Row 7: Invalid - Missing required name & invalid date format
            Row r7 = s.createRow(7);
            r7.createCell(0).setCellValue("GBZ-TEST-IMP-ERR2");
            r7.createCell(1).setCellValue(""); // Empty name
            r7.createCell(2).setCellValue("CAT-01");
            r7.createCell(3).setCellValue("DEPT-11");
            r7.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");
            r7.createCell(9).setCellValue("31/12/2026-INVALID");

            wb.write(fos);
        }
    }

    private static void createFormulaInjectionFile(File file) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); FileOutputStream fos = new FileOutputStream(file)) {
            Sheet s = wb.createSheet("Varliklar");
            writeHeaders(s, createHeaderStyle(wb));

            Row r1 = s.createRow(1);
            r1.createCell(0).setCellValue("GBZ-INJ-001");
            r1.createCell(1).setCellValue("=SUM(1+2)"); // Formula injection attempt
            r1.createCell(2).setCellValue("CAT-01");
            r1.createCell(3).setCellValue("DEPT-11");
            r1.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");

            Row r2 = s.createRow(2);
            r2.createCell(0).setCellValue("GBZ-INJ-002");
            r2.createCell(1).setCellValue("@evil_user"); // @ injection
            r2.createCell(2).setCellValue("CAT-01");
            r2.createCell(3).setCellValue("DEPT-11");
            r2.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");

            wb.write(fos);
        }
    }

    private static void createDuplicateFile(File file) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); FileOutputStream fos = new FileOutputStream(file)) {
            Sheet s = wb.createSheet("Varliklar");
            writeHeaders(s, createHeaderStyle(wb));

            // Row 1 & 2 have duplicate code in file
            Row r1 = s.createRow(1);
            r1.createCell(0).setCellValue("GBZ-DUP-FILE-01");
            r1.createCell(1).setCellValue("Mükerrer Varlık 1");
            r1.createCell(2).setCellValue("CAT-01");
            r1.createCell(3).setCellValue("DEPT-11");
            r1.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");
            r1.createCell(5).setCellValue("888800000001");

            Row r2 = s.createRow(2);
            r2.createCell(0).setCellValue("GBZ-DUP-FILE-01"); // DUPLICATE CODE
            r2.createCell(1).setCellValue("Mükerrer Varlık 2");
            r2.createCell(2).setCellValue("CAT-01");
            r2.createCell(3).setCellValue("DEPT-11");
            r2.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");
            r2.createCell(5).setCellValue("888800000002");

            // Row 3 duplicates existing DB code DEMO-VRK-001
            Row r3 = s.createRow(3);
            r3.createCell(0).setCellValue("DEMO-VRK-001"); // EXISTING IN DB
            r3.createCell(1).setCellValue("DB ile Mükerrer Varlık");
            r3.createCell(2).setCellValue("CAT-01");
            r3.createCell(3).setCellValue("DEPT-11");
            r3.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01");

            wb.write(fos);
        }
    }

    private static void createOtherDeptFile(File file) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); FileOutputStream fos = new FileOutputStream(file)) {
            Sheet s = wb.createSheet("Varliklar");
            writeHeaders(s, createHeaderStyle(wb));

            // Row 1: Park ve Bahçeler DEPT-06
            Row r1 = s.createRow(1);
            r1.createCell(0).setCellValue("GBZ-PARK-IMP-01");
            r1.createCell(1).setCellValue("Park Bankı");
            r1.createCell(2).setCellValue("CAT-01");
            r1.createCell(3).setCellValue("DEPT-06"); // Other department
            r1.createCell(4).setCellValue("GBZ-ROOM-FEN-KZ-01"); // Room belongs to DEPT-11 (mismatch)

            wb.write(fos);
        }
    }
}
