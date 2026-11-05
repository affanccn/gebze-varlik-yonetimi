package tr.gov.gebze.varlik.personnel;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.security.SecurityAuditService;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelController {

    private final PersonnelService service;
    private final TenantQueryScope tenantQueryScope;
    private final AuthService authService;
    private final SecurityAuditService auditService;

    public PersonnelController(
            PersonnelService service,
            TenantQueryScope tenantQueryScope,
            AuthService authService,
            SecurityAuditService auditService
    ) {
        this.service = service;
        this.tenantQueryScope = tenantQueryScope;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    public PageResponse<Personnel> getAll(
            @RequestParam(name = "departmentId", required = false) Long departmentId,
            @RequestParam(name = "roomId", required = false) Long roomId,
            @RequestParam(name = "query", required = false) String searchQueryParam,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "sortBy", required = false) String sortBy,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "isActive", required = false) Boolean isActive,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        String searchQuery = (searchQueryParam != null && !searchQueryParam.isBlank()) ? searchQueryParam : q;
        String sortParam = (sortBy != null && !sortBy.isBlank()) ? sortBy : sort;

        if (tenantQueryScope.isDeptManager()) {
            departmentId = tenantQueryScope.getDepartmentId();
        } else if (tenantQueryScope.isStaff()) {
            Long persId = tenantQueryScope.getPersonnelId();
            if (persId != null) {
                try {
                    Personnel pers = service.findById(persId);
                    return PageResponse.of(List.of(pers), 1, 0, size);
                } catch (Exception e) {
                    return PageResponse.of(List.of(), 0, 0, size);
                }
            } else {
                return PageResponse.of(List.of(), 0, 0, size);
            }
        }
        return service.findPage(departmentId, roomId, searchQuery, isActive, sortParam, page, size);
    }

    @GetMapping("/{id}")
    public Personnel getById(@PathVariable Long id) {
        Personnel p = service.findById(id);
        if (tenantQueryScope.isDeptManager()) {
            Long userDeptId = tenantQueryScope.getDepartmentId();
            if (userDeptId == null || !userDeptId.equals(p.departmentId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Başka bir müdürlüğün personel kaydına erişilemez.");
            }
        } else if (tenantQueryScope.isStaff()) {
            Long userPersId = tenantQueryScope.getPersonnelId();
            if (userPersId == null || !userPersId.equals(id)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Yalnızca kendi personel kaydınıza erişebilirsiniz.");
            }
        }
        return p;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Personnel create(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody PersonnelRequest request,
            HttpServletRequest httpServletRequest
    ) {
        UserSession session = authService.requireWriteAccess(token);
        if ("DEPT_MANAGER".equalsIgnoreCase(session.role())) {
            Long userDeptId = session.departmentId();
            if (userDeptId == null || !userDeptId.equals(request.departmentId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Müdürlük yöneticisi yalnızca kendi müdürlüğüne personel ekleyebilir.");
            }
        }
        Personnel created = service.create(request);
        auditService.logAction(
                "PERSONNEL_CREATE", "PERSONNEL", String.valueOf(created.id()),
                session.username(), session.fullName(), httpServletRequest.getRemoteAddr(),
                "Yeni personel kaydı oluşturuldu: " + created.fullName() + " (" + created.registrationNumber() + ")"
        );
        return created;
    }

    @PutMapping("/{id}")
    public Personnel update(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody PersonnelRequest request,
            HttpServletRequest httpServletRequest
    ) {
        UserSession session = authService.requireWriteAccess(token);
        Personnel existing = service.findById(id);
        if ("DEPT_MANAGER".equalsIgnoreCase(session.role())) {
            Long userDeptId = session.departmentId();
            if (userDeptId == null || !userDeptId.equals(existing.departmentId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Başka bir müdürlüğün personeli güncellenemez.");
            }
            if (request.departmentId() != null && !request.departmentId().equals(userDeptId)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Personel başka bir müdürlüğe transfer edilemez.");
            }
        }
        Personnel updated = service.update(id, request);
        auditService.logAction(
                "PERSONNEL_UPDATE", "PERSONNEL", String.valueOf(id),
                session.username(), session.fullName(), httpServletRequest.getRemoteAddr(),
                "Personel bilgileri güncellendi: " + updated.fullName()
        );
        return updated;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletRequest httpServletRequest
    ) {
        UserSession session = authService.requireWriteAccess(token);
        Personnel existing = service.findById(id);
        if ("DEPT_MANAGER".equalsIgnoreCase(session.role())) {
            Long userDeptId = session.departmentId();
            if (userDeptId == null || !userDeptId.equals(existing.departmentId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Başka bir müdürlüğün personeli pasife alınamaz.");
            }
        }
        service.delete(id);
        auditService.logAction(
                "PERSONNEL_DEACTIVATE", "PERSONNEL", String.valueOf(id),
                session.username(), session.fullName(), httpServletRequest.getRemoteAddr(),
                "Personel pasife alındı (arşivlendi): " + existing.fullName()
        );
    }
}
