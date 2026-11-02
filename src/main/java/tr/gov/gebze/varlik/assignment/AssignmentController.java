package tr.gov.gebze.varlik.assignment;

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
@RequestMapping("/api/assignments")
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final AuthService authService;

    public AssignmentController(AssignmentService assignmentService, AuthService authService) {
        this.assignmentService = assignmentService;
        this.authService = authService;
    }

    @GetMapping
    public List<AssetAssignment> listAssignments(
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String status
    ) {
        return assignmentService.findAll(assetId, status);
    }

    @PostMapping
    public AssetAssignment createAssignment(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody AssignmentRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        return assignmentService.assignAsset(request, session.fullName());
    }

    @PostMapping("/{id}/return")
    public AssetAssignment returnAssignment(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @PathVariable Long id,
            @RequestBody(required = false) AssignmentReturnRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        return assignmentService.returnAssignment(id, request, session.fullName());
    }
}

