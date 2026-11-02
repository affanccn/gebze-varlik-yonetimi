package tr.gov.gebze.varlik.movement;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.UserSession;

@RestController
@RequestMapping("/api/movements")
public class MovementController {

    private final MovementService movementService;
    private final AuthService authService;

    public MovementController(MovementService movementService, AuthService authService) {
        this.movementService = movementService;
        this.authService = authService;
    }

    @GetMapping
    public List<AssetMovement> listMovements(
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String type
    ) {
        return movementService.findAll(assetId, type);
    }

    @PostMapping
    public AssetMovement createMovement(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody MovementRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        return movementService.createOperationalMovement(request, session.fullName());
    }
}

