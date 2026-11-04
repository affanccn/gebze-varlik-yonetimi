package tr.gov.gebze.varlik.asset.bulkimport;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.security.SystemUserDetails;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api/assets")
public class BulkImportController {

    private final BulkImportService bulkImportService;
    private final AuthService authService;
    private final TenantQueryScope tenantQueryScope;

    public BulkImportController(
            BulkImportService bulkImportService,
            AuthService authService,
            TenantQueryScope tenantQueryScope
    ) {
        this.bulkImportService = bulkImportService;
        this.authService = authService;
        this.tenantQueryScope = tenantQueryScope;
    }

    private UserSession requireImportAccess(String token) {
        UserSession session = authService.requireSession(token);
        String role = session.role();
        if (!"ADMIN".equalsIgnoreCase(role) && !"DEPT_MANAGER".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Excel toplu içe aktarım yetkisi yalnızca Sistem Yöneticisi (ADMIN) ve Müdürlük Yöneticisi (DEPT_MANAGER) rollerine aittir (" + session.roleLabel() + ").");
        }
        return session;
    }

    @GetMapping("/export-template")
    public void exportTemplate(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletResponse response
    ) throws IOException {
        UserSession session = requireImportAccess(token);
        SystemUserDetails userDetails = tenantQueryScope.getCurrentUser();
        Long deptId = userDetails != null ? userDetails.getDepartmentId() : null;

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"gebze_varlik_ice_aktarim_sablonu.xlsx\"");

        bulkImportService.generateTemplate(response.getOutputStream(), session.role(), deptId);
    }

    @PostMapping(value = "/import/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BulkImportValidationResult validateImport(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-Auth-Token", required = false) String token
    ) {
        UserSession session = requireImportAccess(token);
        SystemUserDetails userDetails = tenantQueryScope.getCurrentUser();
        Long deptId = userDetails != null ? userDetails.getDepartmentId() : null;

        return bulkImportService.validateFile(file, session.username(), session.role(), deptId);
    }

    @PostMapping(value = "/import/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BulkImportCommitResult commitImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "partialImportAllowed", defaultValue = "false") boolean partialImportAllowed,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletRequest request
    ) {
        UserSession session = requireImportAccess(token);
        SystemUserDetails userDetails = tenantQueryScope.getCurrentUser();
        Long deptId = userDetails != null ? userDetails.getDepartmentId() : null;
        String clientIp = request.getRemoteAddr();

        return bulkImportService.commitImport(
                file,
                partialImportAllowed,
                session.username(),
                session.fullName(),
                session.role(),
                deptId,
                clientIp
        );
    }
}
