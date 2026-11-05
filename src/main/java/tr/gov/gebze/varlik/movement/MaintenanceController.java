package tr.gov.gebze.varlik.movement;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api/maintenances")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;
    private final AuthService authService;
    private final TenantQueryScope tenantQueryScope;

    public MaintenanceController(MaintenanceService maintenanceService, AuthService authService, TenantQueryScope tenantQueryScope) {
        this.maintenanceService = maintenanceService;
        this.authService = authService;
        this.tenantQueryScope = tenantQueryScope;
    }

    @GetMapping
    public PageResponse<MaintenanceRecord> listMaintenances(
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String maintenanceType,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String searchQuery = (query != null && !query.isBlank()) ? query : q;
        String sortParam = (sortBy != null && !sortBy.isBlank()) ? sortBy : sort;
        return maintenanceService.findPage(assetId, status, maintenanceType, searchQuery, sortParam, page, size);
    }

    @PostMapping
    public MaintenanceRecord createMaintenance(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody MaintenanceRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        if (request != null && request.assetId() != null) {
            tenantQueryScope.validateAssetWriteAccess(request.assetId(), null);
        }
        return maintenanceService.createMaintenance(request, session.fullName());
    }

    @PostMapping("/{id}/complete")
    public MaintenanceRecord completeMaintenance(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id,
            @RequestBody(required = false) MaintenanceCompleteRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        MaintenanceRecord rec = maintenanceService.findById(id);
        tenantQueryScope.validateAssetWriteAccess(rec.assetId(), null);
        return maintenanceService.completeMaintenance(id, request, session.fullName());
    }
}

