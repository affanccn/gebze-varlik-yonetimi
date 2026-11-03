package tr.gov.gebze.varlik.personnel;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelController {

    private final PersonnelService service;
    private final TenantQueryScope tenantQueryScope;

    public PersonnelController(PersonnelService service, TenantQueryScope tenantQueryScope) {
        this.service = service;
        this.tenantQueryScope = tenantQueryScope;
    }

    @GetMapping
    public List<Personnel> getAll(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) String query
    ) {
        if (tenantQueryScope.isDeptManager()) {
            departmentId = tenantQueryScope.getDepartmentId();
        } else if (tenantQueryScope.isStaff()) {
            Long persId = tenantQueryScope.getPersonnelId();
            if (persId != null) {
                return List.of(service.findById(persId));
            } else {
                return List.of();
            }
        }
        return service.findAll(departmentId, roomId, query);
    }

    @GetMapping("/{id}")
    public Personnel getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Personnel create(@RequestBody PersonnelRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public Personnel update(@PathVariable Long id, @RequestBody PersonnelRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}

