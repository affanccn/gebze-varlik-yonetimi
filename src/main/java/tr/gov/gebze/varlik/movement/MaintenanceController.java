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
import tr.gov.gebze.varlik.common.UserSession;

@RestController
@RequestMapping("/api/maintenances")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;
    private final AuthService authService;

    public MaintenanceController(MaintenanceService maintenanceService, AuthService authService) {
        this.maintenanceService = maintenanceService;
        this.authService = authService;
    }

    @GetMapping
    public List<MaintenanceRecord> listMaintenances(
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String status
    ) {
        return maintenanceService.findAll(assetId, status);
    }

    @PostMapping
    public MaintenanceRecord createMaintenance(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody MaintenanceRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        return maintenanceService.createMaintenance(request, session.fullName());
    }

    @PostMapping("/{id}/complete")
    public MaintenanceRecord completeMaintenance(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id,
            @RequestBody(required = false) MaintenanceCompleteRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        return maintenanceService.completeMaintenance(id, request, session.fullName());
    }
}

