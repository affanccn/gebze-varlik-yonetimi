package tr.gov.gebze.varlik.personnel.bulkimport;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelImportController {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5 MB

    private final PersonnelImportService importService;
    private final AuthService authService;
    private final TenantQueryScope tenantQueryScope;

    public PersonnelImportController(
            PersonnelImportService importService,
            AuthService authService,
            TenantQueryScope tenantQueryScope
    ) {
        this.importService = importService;
        this.authService = authService;
        this.tenantQueryScope = tenantQueryScope;
    }

    private UserSession requirePersonnelManageAccess(String token) {
        UserSession session = authService.requireSession(token);
        String role = session.role();
        if (!"ADMIN".equalsIgnoreCase(role) && !"DEPT_MANAGER".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Personel yönetimi ve aktarım yetkisi yalnızca Sistem Yöneticisi (ADMIN) ve Müdürlük Yöneticisi (DEPT_MANAGER) rollerine aittir.");
        }
        return session;
    }

    private void validateUploadedFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yüklenecek Excel dosyası boş olamaz.");
        }
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Yalnızca .xlsx uzantılı modern Excel dosyaları kabul edilmektedir (.xls veya CSV desteklenmez).");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Dosya boyutu maksimum sınırı (5 MB) aşamaz.");
        }
    }

    @GetMapping("/export-template")
    public void exportTemplate(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletResponse response
    ) throws IOException {
        UserSession session = requirePersonnelManageAccess(token);
        Long deptId = session.departmentId() != null ? session.departmentId() :
                (tenantQueryScope.getCurrentUser() != null ? tenantQueryScope.getCurrentUser().getDepartmentId() : null);

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"gebze_personel_ice_aktarim_sablonu.xlsx\"");

        importService.generateTemplate(response.getOutputStream(), session.role(), deptId);
    }

    @PostMapping(value = "/import/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PersonnelImportValidationResult validateImport(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        UserSession session = requirePersonnelManageAccess(token);
        validateUploadedFile(file);
        Long deptId = session.departmentId() != null ? session.departmentId() :
                (tenantQueryScope.getCurrentUser() != null ? tenantQueryScope.getCurrentUser().getDepartmentId() : null);

        return importService.validateExcel(file.getInputStream(), session.role(), deptId);
    }

    @PostMapping(value = "/import/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PersonnelImportCommitResult commitImport(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        UserSession session = requirePersonnelManageAccess(token);
        validateUploadedFile(file);
        Long deptId = session.departmentId() != null ? session.departmentId() :
                (tenantQueryScope.getCurrentUser() != null ? tenantQueryScope.getCurrentUser().getDepartmentId() : null);

        return importService.commitImport(file.getInputStream(), session.role(), deptId, session.username());
    }
}

