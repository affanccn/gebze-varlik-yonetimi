package tr.gov.gebze.varlik.personnel;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tr.gov.gebze.varlik.common.PageResponse;
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
    public PageResponse<Personnel> getAll(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String searchQuery = (query != null && !query.isBlank()) ? query : q;
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

