package tr.gov.gebze.varlik.asset.bulkimport;

import java.io.InputStream;
import java.io.OutputStream;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetRequest;
import tr.gov.gebze.varlik.asset.AssetService;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.hierarchy.AssetCategory;
import tr.gov.gebze.varlik.hierarchy.Department;
import tr.gov.gebze.varlik.hierarchy.HierarchyRepository;
import tr.gov.gebze.varlik.hierarchy.Room;

@Service
public class BulkImportService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final int MAX_ROWS = 2000;

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TR_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final JdbcClient jdbcClient;
    private final HierarchyRepository hierarchyRepository;
    private final AssetService assetService;

    public BulkImportService(
            JdbcClient jdbcClient,
            HierarchyRepository hierarchyRepository,
            AssetService assetService
    ) {
        this.jdbcClient = jdbcClient;
        this.hierarchyRepository = hierarchyRepository;
        this.assetService = assetService;
    }

    /**
     * Rol ve yetki bazlı dinamik Excel şablonu üretir.
     */
    public void generateTemplate(OutputStream out, String userRole, Long userDepartmentId) {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Varlik_Listesi");
            Sheet refSheet = wb.createSheet("Referans_Veriler");

            // Başlık stili
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            font.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Başlıklar
            String[] headers = {
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

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 20 * 256);
            }
            sheet.setColumnWidth(0, 22 * 256); // Kod
            sheet.setColumnWidth(1, 30 * 256); // Ad
            sheet.setColumnWidth(4, 25 * 256); // Oda QR

            // Referans verilerini çek
            List<AssetCategory> categories = hierarchyRepository.findAllCategories();
            List<Department> departments = hierarchyRepository.findAllDepartments();
            List<Room> allRooms = hierarchyRepository.findAllRooms(null, null, null, null);

            // Kullanıcı yetkisine göre müdürlük filtresi
            List<Department> allowedDepts = new ArrayList<>();
            boolean isAdmin = "ADMIN".equalsIgnoreCase(userRole);
            for (Department d : departments) {
                if (isAdmin || (userDepartmentId != null && d.id().equals(userDepartmentId))) {
                    allowedDepts.add(d);
                }
            }

            // Yetkili odalar
            List<Room> allowedRooms = new ArrayList<>();
            for (Room r : allRooms) {
                if (isAdmin || (userDepartmentId != null && userDepartmentId.equals(r.departmentId()))) {
                    allowedRooms.add(r);
                }
            }

            // Referans sayfasına yaz
            Row refHeader = refSheet.createRow(0);
            refHeader.createCell(0).setCellValue("Kategoriler");
            refHeader.createCell(1).setCellValue("Müdürlükler");
            refHeader.createCell(2).setCellValue("Odalar");

            int maxRef = Math.max(categories.size(), Math.max(allowedDepts.size(), allowedRooms.size()));
            for (int r = 0; r < maxRef; r++) {
                Row row = refSheet.createRow(r + 1);
                if (r < categories.size()) {
                    row.createCell(0).setCellValue(categories.get(r).code());
                }
                if (r < allowedDepts.size()) {
                    row.createCell(1).setCellValue(allowedDepts.get(r).code());
                }
                if (r < allowedRooms.size()) {
                    row.createCell(2).setCellValue(allowedRooms.get(r).qrCode());
                }
            }

            wb.setSheetHidden(1, true); // Referans sayfasını gizle

            // Veri Doğrulama (Açılır Liste Dropdown)
            DataValidationHelper validationHelper = sheet.getDataValidationHelper();
            if (!categories.isEmpty()) {
                DataValidationConstraint catConstraint = validationHelper.createFormulaListConstraint("Referans_Veriler!$A$2:$A$" + (categories.size() + 1));
                CellRangeAddressList catList = new CellRangeAddressList(1, 2000, 2, 2);
                DataValidation catVal = validationHelper.createValidation(catConstraint, catList);
                catVal.setShowErrorBox(true);
                sheet.addValidationData(catVal);
            }

            if (!allowedDepts.isEmpty()) {
                DataValidationConstraint deptConstraint = validationHelper.createFormulaListConstraint("Referans_Veriler!$B$2:$B$" + (allowedDepts.size() + 1));
                CellRangeAddressList deptList = new CellRangeAddressList(1, 2000, 3, 3);
                DataValidation deptVal = validationHelper.createValidation(deptConstraint, deptList);
                deptVal.setShowErrorBox(true);
                sheet.addValidationData(deptVal);
            }

            if (!allowedRooms.isEmpty()) {
                DataValidationConstraint roomConstraint = validationHelper.createFormulaListConstraint("Referans_Veriler!$C$2:$C$" + (allowedRooms.size() + 1));
                CellRangeAddressList roomList = new CellRangeAddressList(1, 2000, 4, 4);
                DataValidation roomVal = validationHelper.createValidation(roomConstraint, roomList);
                roomVal.setShowErrorBox(true);
                sheet.addValidationData(roomVal);
            }

            // Örnek 1 satır veri
            Row sampleRow = sheet.createRow(1);
            sampleRow.createCell(0).setCellValue("GBZ-VRK-2026-0001");
            sampleRow.createCell(1).setCellValue("Örnek Masaüstü Bilgisayar");
            sampleRow.createCell(2).setCellValue(!categories.isEmpty() ? categories.get(0).code() : "CAT-01");
            sampleRow.createCell(3).setCellValue(!allowedDepts.isEmpty() ? allowedDepts.get(0).code() : "DEPT-11");
            sampleRow.createCell(4).setCellValue(!allowedRooms.isEmpty() ? allowedRooms.get(0).qrCode() : "GBZ-ROOM-FEN-KZ-01");
            sampleRow.createCell(5).setCellValue("8690001112233");
            sampleRow.createCell(6).setCellValue("255.02.01.01");
            sampleRow.createCell(7).setCellValue("Dell OptiPlex 7000");
            sampleRow.createCell(8).setCellValue("SN-2026-X99");
            sampleRow.createCell(9).setCellValue("15.01.2026");
            sampleRow.createCell(10).setCellValue("15.01.2028");
            sampleRow.createCell(11).setCellValue(45000.0);
            sampleRow.createCell(12).setCellValue("DMO Genel Müdürlüğü");
            sampleRow.createCell(13).setCellValue("Şantiye ofisi için temin edilmiştir.");

            wb.write(out);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Şablon dosyası oluşturulamadı: " + e.getMessage());
        }
    }

    /**
     * Yüklenen dosyayı doğrular (Dry-Run / Önizleme modu). Veritabanına yazmaz.
     */
    public BulkImportValidationResult validateFile(
            MultipartFile file,
            String username,
            String userRole,
            Long userDepartmentId
    ) {
        validateFileMeta(file);

        List<BulkImportError> errors = new ArrayList<>();
        List<BulkImportRow> validRows = new ArrayList<>();

        // Referans verilerini önbelleğe al
        Map<String, Department> deptMap = loadDepartments();
        Map<String, AssetCategory> catMap = loadCategories();
        Map<String, Room> roomMap = loadRooms();

        Set<String> existingCodes = loadExistingCodes();
        Set<String> existingBarcodes = loadExistingBarcodes();

        Set<String> fileCodes = new HashSet<>();
        Set<String> fileBarcodes = new HashSet<>();

        String userDeptCode = null;
        if (userDepartmentId != null) {
            for (Department d : deptMap.values()) {
                if (userDepartmentId.equals(d.id())) {
                    userDeptCode = d.code();
                    break;
                }
            }
        }

        DataFormatter formatter = new DataFormatter();
        int totalRows = 0;

        Workbook wb;
        try {
            wb = WorkbookFactory.create(file.getInputStream());
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Geçersiz veya bozuk Excel dosyası: Yalnızca modern Excel (.xlsx) biçimi desteklenmektedir. Eski format (.xls) veya bozuk dosyalar işlenemez.");
        }

        try (wb) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null) {
                errors.add(new BulkImportError(0, "Dosya", file.getOriginalFilename(), "Excel dosyasında çalışma sayfası bulunamadı."));
                return new BulkImportValidationResult(file.getOriginalFilename(), 0, 0, 1, errors, validRows);
            }

            int lastRow = sheet.getLastRowNum();
            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row, formatter)) {
                    continue; // Boş satırları atla
                }

                totalRows++;
                if (totalRows > MAX_ROWS) {
                    errors.add(new BulkImportError(r + 1, "Dosya", String.valueOf(totalRows),
                            "Maksimum satır sınırı aşıldı (En fazla " + MAX_ROWS + " satır yüklenebilir)."));
                    break;
                }

                int rowNum = r + 1;
                boolean rowHasError = false;

                // 1. Hücre Değerlerini Oku
                String code = getCellString(row.getCell(0), formatter);
                String name = getCellString(row.getCell(1), formatter);
                String catCode = getCellString(row.getCell(2), formatter);
                String deptCode = getCellString(row.getCell(3), formatter);
                String roomQr = getCellString(row.getCell(4), formatter);
                String barcode = getCellString(row.getCell(5), formatter);
                String tifCode = getCellString(row.getCell(6), formatter);
                String brandModel = getCellString(row.getCell(7), formatter);
                String serial = getCellString(row.getCell(8), formatter);
                String acqDateStr = getCellString(row.getCell(9), formatter);
                String warDateStr = getCellString(row.getCell(10), formatter);
                String estValStr = getCellString(row.getCell(11), formatter);
                String supplier = getCellString(row.getCell(12), formatter);
                String notes = getCellString(row.getCell(13), formatter);

                // 2. Güvenlik Kontrolleri (Formula / CSV Injection & Formül engeli)
                for (int c = 0; c <= 13; c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null) {
                        if (cell.getCellType() == CellType.FORMULA) {
                            errors.add(new BulkImportError(rowNum, "Hücre " + (c + 1), "",
                                    "Formül içeren hücreler güvenlik gerekçesiyle kabul edilmez. Lütfen düz metin giriniz."));
                            rowHasError = true;
                        }
                    }
                }

                // Metin alanlarında sadece '=' ve '@' engellenir; '+' ve '-' metin alanlarında kabul edilir
                String[] textFields = {code, name, catCode, deptCode, roomQr, barcode, tifCode, brandModel, serial, acqDateStr, warDateStr, supplier, notes};
                String[] textFieldNames = {"Varlık Kodu", "Varlık Adı", "Kategori Kodu", "Müdürlük Kodu", "Oda QR Kodu", "Barkod", "TİF No", "Marka/Model", "Seri No", "Edinim Tarihi", "Garanti Bitiş", "Tedarikçi", "Notlar"};

                for (int i = 0; i < textFields.length; i++) {
                    String val = textFields[i];
                    if (val != null && !val.isBlank()) {
                        char first = val.trim().charAt(0);
                        if (first == '=' || first == '@') {
                            errors.add(new BulkImportError(rowNum, textFieldNames[i], val,
                                    "Güvenlik Uyarısı: Formül veya zararlı içerik tespiti ('=' veya '@' ile başlayan metinler kabul edilmez)."));
                            rowHasError = true;
                        }
                    }
                }

                // Sayısal alanda (Tahmini Değer): '=' ve '@' güvenlik hatası; '+' ve '-' ile başlayan metin yalnızca sayısal alanlarda hata
                if (estValStr != null && !estValStr.isBlank()) {
                    String trimmedEst = estValStr.trim();
                    char first = trimmedEst.charAt(0);
                    if (first == '=' || first == '@') {
                        errors.add(new BulkImportError(rowNum, "Tahmini Değer", estValStr,
                                "Güvenlik Uyarısı: Formül veya zararlı içerik tespiti ('=' veya '@' ile başlayan metinler kabul edilmez)."));
                        rowHasError = true;
                    } else if (first == '+' || first == '-') {
                        errors.add(new BulkImportError(rowNum, "Tahmini Değer", estValStr,
                                "Sayısal alanda '+' veya '-' işaretiyle başlayan değer girilemez. Lütfen pozitif sayı giriniz."));
                        rowHasError = true;
                    }
                }

                // 3. Zorunlu Alan Kontrolleri
                if (code == null || code.isBlank()) {
                    errors.add(new BulkImportError(rowNum, "Varlık Kodu", code, "Varlık kodu zorunludur, boş bırakılamaz."));
                    rowHasError = true;
                } else if (code.length() > 64) {
                    errors.add(new BulkImportError(rowNum, "Varlık Kodu", code, "Varlık kodu en fazla 64 karakter olabilir."));
                    rowHasError = true;
                }

                if (name == null || name.isBlank()) {
                    errors.add(new BulkImportError(rowNum, "Varlık Adı", name, "Varlık adı zorunludur, boş bırakılamaz."));
                    rowHasError = true;
                } else if (name.length() > 255) {
                    errors.add(new BulkImportError(rowNum, "Varlık Adı", name, "Varlık adı en fazla 255 karakter olabilir."));
                    rowHasError = true;
                }

                if (catCode == null || catCode.isBlank()) {
                    errors.add(new BulkImportError(rowNum, "Kategori Kodu", catCode, "Kategori kodu zorunludur."));
                    rowHasError = true;
                }

                if (deptCode == null || deptCode.isBlank()) {
                    errors.add(new BulkImportError(rowNum, "Müdürlük Kodu", deptCode, "Müdürlük kodu zorunludur."));
                    rowHasError = true;
                }

                if (roomQr == null || roomQr.isBlank()) {
                    errors.add(new BulkImportError(rowNum, "Oda QR Kodu", roomQr, "Oda QR kodu zorunludur."));
                    rowHasError = true;
                }

                // 4. Uzunluk Sınırları
                if (barcode != null && barcode.length() > 64) {
                    errors.add(new BulkImportError(rowNum, "Barkod", barcode, "Barkod en fazla 64 karakter olabilir."));
                    rowHasError = true;
                }
                if (tifCode != null && tifCode.length() > 64) {
                    errors.add(new BulkImportError(rowNum, "TİF Kodu", tifCode, "TİF kodu en fazla 64 karakter olabilir."));
                    rowHasError = true;
                }
                if (brandModel != null && brandModel.length() > 128) {
                    errors.add(new BulkImportError(rowNum, "Marka/Model", brandModel, "Marka/Model en fazla 128 karakter olabilir."));
                    rowHasError = true;
                }
                if (serial != null && serial.length() > 64) {
                    errors.add(new BulkImportError(rowNum, "Seri No", serial, "Seri No en fazla 64 karakter olabilir."));
                    rowHasError = true;
                }
                if (supplier != null && supplier.length() > 255) {
                    errors.add(new BulkImportError(rowNum, "Tedarikçi", supplier, "Tedarikçi en fazla 255 karakter olabilir."));
                    rowHasError = true;
                }
                if (notes != null && notes.length() > 1000) {
                    errors.add(new BulkImportError(rowNum, "Notlar", notes, "Açıklama / Notlar en fazla 1000 karakter olabilir."));
                    rowHasError = true;
                }

                // 5. Mükerrerlik Kontrolleri
                if (code != null && !code.isBlank()) {
                    String normCode = code.trim().toUpperCase(Locale.ROOT);
                    if (!fileCodes.add(normCode)) {
                        errors.add(new BulkImportError(rowNum, "Varlık Kodu", code, "Varlık kodu dosya içerisinde mükerrerdir (başka bir satırda da geçiyor)."));
                        rowHasError = true;
                    }
                    if (existingCodes.contains(normCode)) {
                        errors.add(new BulkImportError(rowNum, "Varlık Kodu", code, "Bu varlık kodu sistemde kayıtlı aktif bir varlık tarafından kullanılmaktadır (Mükerrer)."));
                        rowHasError = true;
                    }
                }

                if (barcode != null && !barcode.isBlank()) {
                    String normBarcode = barcode.trim().toUpperCase(Locale.ROOT);
                    if (!fileBarcodes.add(normBarcode)) {
                        errors.add(new BulkImportError(rowNum, "Barkod", barcode, "Barkod numarası dosya içerisinde mükerrerdir."));
                        rowHasError = true;
                    }
                    if (existingBarcodes.contains(normBarcode)) {
                        errors.add(new BulkImportError(rowNum, "Barkod", barcode, "Bu barkod numarası sistemde kayıtlı aktif bir varlıkta mevcuttur (Mükerrer)."));
                        rowHasError = true;
                    }
                }

                // 6. Referans Verisi ve Yetki Kontrolleri
                AssetCategory cat = null;
                if (catCode != null && !catCode.isBlank()) {
                    cat = catMap.get(catCode.trim().toUpperCase(Locale.ROOT));
                    if (cat == null) {
                        errors.add(new BulkImportError(rowNum, "Kategori Kodu", catCode, "Tanımsız kategori kodu."));
                        rowHasError = true;
                    }
                }

                Department dept = null;
                if (deptCode != null && !deptCode.isBlank()) {
                    dept = deptMap.get(deptCode.trim().toUpperCase(Locale.ROOT));
                    if (dept == null) {
                        errors.add(new BulkImportError(rowNum, "Müdürlük Kodu", deptCode, "Tanımsız müdürlük kodu."));
                        rowHasError = true;
                    } else {
                        // DEPT_MANAGER yetki kontrolü
                        if (!"ADMIN".equalsIgnoreCase(userRole)) {
                            if (userDepartmentId == null || !dept.id().equals(userDepartmentId)) {
                                errors.add(new BulkImportError(rowNum, "Müdürlük Kodu", deptCode,
                                        "Yetkisiz müdürlük: Yalnızca kendi müdürlüğünüz (" + (userDeptCode != null ? userDeptCode : userDepartmentId) + ") adına varlık aktarabilirsiniz."));
                                rowHasError = true;
                            }
                        }
                    }
                }

                Room room = null;
                if (roomQr != null && !roomQr.isBlank()) {
                    room = roomMap.get(roomQr.trim().toUpperCase(Locale.ROOT));
                    if (room == null) {
                        errors.add(new BulkImportError(rowNum, "Oda QR Kodu", roomQr, "Tanımsız oda QR kodu."));
                        rowHasError = true;
                    } else if (dept != null && room.departmentId() != null && !room.departmentId().equals(dept.id())) {
                        errors.add(new BulkImportError(rowNum, "Oda QR Kodu", roomQr,
                                "Oda-Müdürlük Uyumsuzluğu: Girilen oda ('" + room.name() + "') seçilen '" + dept.name() + "' müdürlüğüne değil, '" + room.departmentName() + "' müdürlüğüne aittir."));
                        rowHasError = true;
                    }
                }

                // 7. Tarih ve Sayı Biçimi Kontrolleri
                String parsedAcqDate = null;
                if (acqDateStr != null && !acqDateStr.isBlank()) {
                    parsedAcqDate = parseDateString(acqDateStr);
                    if (parsedAcqDate == null) {
                        errors.add(new BulkImportError(rowNum, "Edinim Tarihi", acqDateStr, "Geçersiz tarih biçimi. Kabul edilen formatlar: gg.aa.yyyy veya yyyy-aa-gg."));
                        rowHasError = true;
                    }
                }

                String parsedWarDate = null;
                if (warDateStr != null && !warDateStr.isBlank()) {
                    parsedWarDate = parseDateString(warDateStr);
                    if (parsedWarDate == null) {
                        errors.add(new BulkImportError(rowNum, "Garanti Bitiş", warDateStr, "Geçersiz tarih biçimi. Kabul edilen formatlar: gg.aa.yyyy veya yyyy-aa-gg."));
                        rowHasError = true;
                    }
                }

                Double parsedEstValue = null;
                if (estValStr != null && !estValStr.isBlank()) {
                    String trimmedEst = estValStr.trim();
                    if (!trimmedEst.startsWith("+") && !trimmedEst.startsWith("-") && !trimmedEst.startsWith("=") && !trimmedEst.startsWith("@")) {
                        parsedEstValue = parseNumberString(estValStr);
                        if (parsedEstValue == null || parsedEstValue < 0) {
                            errors.add(new BulkImportError(rowNum, "Tahmini Değer", estValStr, "Geçersiz sayısal tutar."));
                            rowHasError = true;
                        }
                    }
                }

                // Hata yoksa geçerli listesine ekle
                if (!rowHasError) {
                    validRows.add(new BulkImportRow(
                            rowNum,
                            code.trim(),
                            name.trim(),
                            catCode.trim().toUpperCase(Locale.ROOT),
                            deptCode.trim().toUpperCase(Locale.ROOT),
                            roomQr.trim().toUpperCase(Locale.ROOT),
                            (barcode == null || barcode.isBlank()) ? null : barcode.trim(),
                            (tifCode == null || tifCode.isBlank()) ? null : tifCode.trim(),
                            (brandModel == null || brandModel.isBlank()) ? null : brandModel.trim(),
                            (serial == null || serial.isBlank()) ? null : serial.trim(),
                            parsedAcqDate,
                            parsedWarDate,
                            parsedEstValue,
                            (supplier == null || supplier.isBlank()) ? null : supplier.trim(),
                            (notes == null || notes.isBlank()) ? null : notes.trim()
                    ));
                }
            }

        } catch (Exception e) {
            errors.add(new BulkImportError(0, "Dosya", file.getOriginalFilename(), "Excel dosyası okunamadı: " + e.getMessage()));
        }

        int validCount = validRows.size();
        int invalidCount = totalRows - validCount;

        return new BulkImportValidationResult(
                file.getOriginalFilename(),
                totalRows,
                validCount,
                invalidCount,
                errors,
                validRows
        );
    }

    /**
     * Dosyayı sunucu tarafında yeniden doğrulayarak veritabanına aktarır (Commit).
     */
    @Transactional
    public BulkImportCommitResult commitImport(
            MultipartFile file,
            boolean partialImportAllowed,
            String username,
            String userFullName,
            String userRole,
            Long userDepartmentId,
            String clientIp
    ) {
        // 1. Sunucu tarafında YENİDEN doğrula
        BulkImportValidationResult validation = validateFile(file, username, userRole, userDepartmentId);

        if (!partialImportAllowed && validation.hasErrors()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    String.format("Dosyada %d adet doğrulama hatası bulunmaktadır. Lütfen hataları düzeltiniz veya 'yalnızca geçerli satırları aktar' seçeneğini kullanınız.",
                            validation.invalidRowsCount()));
        }

        List<BulkImportRow> rowsToImport = validation.validRows();
        if (rowsToImport.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aktarılacak geçerli varlık satırı bulunamadı.");
        }

        Map<String, Department> deptMap = loadDepartments();
        Map<String, AssetCategory> catMap = loadCategories();
        Map<String, Room> roomMap = loadRooms();

        String batchId = "BATCH-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        int importedCount = 0;

        for (BulkImportRow row : rowsToImport) {
            Department dept = deptMap.get(row.departmentCode());
            AssetCategory cat = catMap.get(row.categoryCode());
            Room room = roomMap.get(row.roomQrCode());

            String specifications = String.format("{\"importBatchId\":\"%s\",\"importedAt\":\"%s\"}", batchId, LocalDate.now());

            AssetRequest req = new AssetRequest(
                    row.code(),
                    row.tifCode(),
                    row.barcode(),
                    row.name(),
                    cat != null ? cat.name() : "Genel",
                    row.brandModel(),
                    row.serialNumber(),
                    dept != null ? dept.name() : "Belediye Birimi",
                    room != null ? room.name() : "Genel Mahal",
                    "Atanmamış (Depo Sorumlusu)",
                    "Depoda",
                    "Çok İyi",
                    row.acquisitionDate(),
                    row.warrantyEndDate(),
                    row.estimatedValue(),
                    row.supplier(),
                    row.notes(),
                    dept != null ? dept.id() : null,
                    null, // subUnitId
                    room != null ? room.buildingId() : null,
                    room != null ? room.floorId() : null,
                    room != null ? room.id() : null,
                    cat != null ? cat.id() : null
            );

            Asset created = assetService.create(req);

            // specifications alanına batchId ekle
            jdbcClient.sql("UPDATE assets SET specifications = :spec WHERE id = :id")
                    .param("spec", specifications)
                    .param("id", created.id())
                    .update();

            importedCount++;
        }

        // Audit Log kaydı oluştur
        String auditDesc = String.format("Excel Toplu İçe Aktarım Tamamlandı. Dosya: %s, BatchId: %s, Toplam: %d, Başarılı: %d, Hatalı/Atlanan: %d (Kısmi Mod: %s)",
                file.getOriginalFilename(), batchId, validation.totalRows(), importedCount, validation.invalidRowsCount(), partialImportAllowed);

        String auditOldJson = String.format("{\"totalRows\":%d}", validation.totalRows());
        String auditNewJson = String.format("{\"batchId\":\"%s\",\"imported\":%d,\"skipped\":%d,\"partial\":%b}",
                batchId, importedCount, validation.invalidRowsCount(), partialImportAllowed);

        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description, old_value_json, new_value_json
                ) VALUES (
                    'ASSET_IMPORT', 'BATCH', :batchId, :username, :actorName, :ip, :desc, :oldJson, :newJson
                )
            """)
            .param("batchId", batchId)
            .param("username", username)
            .param("actorName", userFullName != null ? userFullName : username)
            .param("ip", clientIp != null ? clientIp : "127.0.0.1")
            .param("desc", auditDesc)
            .param("oldJson", auditOldJson)
            .param("newJson", auditNewJson)
            .update();
        } catch (Exception e) {
            // Audit log hatası transaction'ı bozmasın
        }

        return new BulkImportCommitResult(
                batchId,
                file.getOriginalFilename(),
                validation.totalRows(),
                importedCount,
                validation.invalidRowsCount(),
                validation.errors(),
                true,
                String.format("Toplu aktarım başarıyla tamamlandı. %d kayıt sisteme aktarıldı (Batch: %s).", importedCount, batchId)
        );
    }

    private void validateFileMeta(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Lütfen bir Excel dosyası yükleyiniz.");
        }
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yalnızca .xlsx uzantılı modern Excel dosyaları kabul edilmektedir (.xls veya diğer biçimler desteklenmez).");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Dosya boyutu maksimum sınırı (5 MB) aşamaz.");
        }
    }

    private String getCellString(Cell cell, DataFormatter formatter) {
        if (cell == null) return null;
        String val = formatter.formatCellValue(cell);
        return val != null ? val.trim() : null;
    }

    private boolean isRowEmpty(Row row, DataFormatter formatter) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String s = formatter.formatCellValue(cell);
                if (s != null && !s.trim().isEmpty()) return false;
            }
        }
        return true;
    }

    private String parseDateString(String str) {
        if (str == null || str.isBlank()) return null;
        String s = str.trim();
        try {
            if (s.contains(".")) {
                return LocalDate.parse(s, TR_FORMATTER).format(ISO_FORMATTER);
            } else if (s.contains("-")) {
                return LocalDate.parse(s, ISO_FORMATTER).format(ISO_FORMATTER);
            }
        } catch (DateTimeParseException ignored) {}
        return null;
    }

    private Double parseNumberString(String str) {
        if (str == null || str.isBlank()) return null;
        String s = str.trim().replace("₺", "").replace("TL", "").replace("tl", "").trim();
        try {
            if (s.contains(",") && s.contains(".")) {
                int lastDot = s.lastIndexOf('.');
                int lastComma = s.lastIndexOf(',');
                if (lastDot < lastComma) {
                    // 1.234,56
                    s = s.replace(".", "").replace(",", ".");
                } else {
                    // 1,234.56
                    s = s.replace(",", "");
                }
            } else if (s.contains(",")) {
                // 1234,56
                s = s.replace(",", ".");
            }
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Map<String, Department> loadDepartments() {
        Map<String, Department> map = new HashMap<>();
        for (Department d : hierarchyRepository.findAllDepartments()) {
            if (d.code() != null) map.put(d.code().toUpperCase(Locale.ROOT).trim(), d);
        }
        return map;
    }

    private Map<String, AssetCategory> loadCategories() {
        Map<String, AssetCategory> map = new HashMap<>();
        for (AssetCategory c : hierarchyRepository.findAllCategories()) {
            if (c.code() != null) map.put(c.code().toUpperCase(Locale.ROOT).trim(), c);
        }
        return map;
    }

    private Map<String, Room> loadRooms() {
        Map<String, Room> map = new HashMap<>();
        for (Room r : hierarchyRepository.findAllRooms(null, null, null, null)) {
            if (r.qrCode() != null) map.put(r.qrCode().toUpperCase(Locale.ROOT).trim(), r);
        }
        return map;
    }

    private Set<String> loadExistingCodes() {
        return new HashSet<>(jdbcClient.sql("SELECT code FROM assets WHERE is_deleted = 0 AND code IS NOT NULL")
                .query((rs, i) -> rs.getString("code").toUpperCase(Locale.ROOT).trim()).list());
    }

    private Set<String> loadExistingBarcodes() {
        return new HashSet<>(jdbcClient.sql("SELECT barcode FROM assets WHERE is_deleted = 0 AND barcode IS NOT NULL")
                .query((rs, i) -> rs.getString("barcode").toUpperCase(Locale.ROOT).trim()).list());
    }
}

