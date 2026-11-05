package tr.gov.gebze.varlik.hierarchy;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.AuthService;
import tr.gov.gebze.varlik.common.UserSession;
import tr.gov.gebze.varlik.security.SecurityAuditService;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@RestController
@RequestMapping("/api")
public class HierarchyController {

    private final HierarchyService hierarchyService;
    private final TenantQueryScope tenantQueryScope;
    private final AuthService authService;
    private final SecurityAuditService auditService;

    public HierarchyController(
            HierarchyService hierarchyService,
            TenantQueryScope tenantQueryScope,
            AuthService authService,
            SecurityAuditService auditService
    ) {
        this.hierarchyService = hierarchyService;
        this.tenantQueryScope = tenantQueryScope;
        this.authService = authService;
        this.auditService = auditService;
    }

    // ==========================================
    // MÜDÜRLÜKLER (30 MÜDÜRLÜK)
    // ==========================================

    @GetMapping("/departments")
    public List<Department> getAllDepartments() {
        return hierarchyService.getAllDepartments();
    }

    @GetMapping("/departments/{id}")
    public Department getDepartmentById(@PathVariable Long id) {
        return hierarchyService.getDepartmentById(id);
    }

    @PostMapping("/departments")
    public Department createDepartment(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Department department,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Department created = hierarchyService.createDepartment(department);
        auditService.logAction(
                "HIERARCHY_DEPARTMENT_CREATE", "DEPARTMENT", String.valueOf(created.id()),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Yeni müdürlük eklendi: " + created.name()
        );
        return created;
    }

    @PutMapping("/departments/{id}")
    public Department updateDepartment(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Department department,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Department updated = hierarchyService.updateDepartment(id, department);
        auditService.logAction(
                "HIERARCHY_DEPARTMENT_UPDATE", "DEPARTMENT", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Müdürlük güncellendi: " + updated.name()
        );
        return updated;
    }

    @DeleteMapping("/departments/{id}")
    public void deleteDepartment(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Department existing = hierarchyService.getDepartmentById(id);
        hierarchyService.deleteDepartment(id);
        auditService.logAction(
                "HIERARCHY_DEPARTMENT_DELETE", "DEPARTMENT", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Müdürlük silindi/pasife alındı: " + (existing != null ? existing.name() : id)
        );
    }

    // ==========================================
    // ALT BİRİMLER & ŞEFLİKLER
    // ==========================================

    @GetMapping("/sub-units")
    public List<SubUnit> getSubUnits(@RequestParam(required = false) Long departmentId) {
        return hierarchyService.getSubUnits(departmentId);
    }

    @GetMapping("/sub-units/{id}")
    public SubUnit getSubUnitById(@PathVariable Long id) {
        return hierarchyService.getSubUnitById(id);
    }

    @PostMapping("/sub-units")
    public SubUnit createSubUnit(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody SubUnit subUnit,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        SubUnit created = hierarchyService.createSubUnit(subUnit);
        auditService.logAction(
                "HIERARCHY_SUBUNIT_CREATE", "SUB_UNIT", String.valueOf(created.id()),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Yeni alt birim eklendi: " + created.name()
        );
        return created;
    }

    @PutMapping("/sub-units/{id}")
    public SubUnit updateSubUnit(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody SubUnit subUnit,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        SubUnit updated = hierarchyService.updateSubUnit(id, subUnit);
        auditService.logAction(
                "HIERARCHY_SUBUNIT_UPDATE", "SUB_UNIT", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Alt birim güncellendi: " + updated.name()
        );
        return updated;
    }

    @DeleteMapping("/sub-units/{id}")
    public void deleteSubUnit(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        SubUnit existing = hierarchyService.getSubUnitById(id);
        hierarchyService.deleteSubUnit(id);
        auditService.logAction(
                "HIERARCHY_SUBUNIT_DELETE", "SUB_UNIT", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Alt birim silindi: " + (existing != null ? existing.name() : id)
        );
    }

    // ==========================================
    // BİNALAR & YERLEŞKELER
    // ==========================================

    @GetMapping("/buildings")
    public List<Building> getAllBuildings() {
        return hierarchyService.getAllBuildings();
    }

    @GetMapping("/buildings/{id}")
    public Building getBuildingById(@PathVariable Long id) {
        return hierarchyService.getBuildingById(id);
    }

    @PostMapping("/buildings")
    public Building createBuilding(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Building building,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Building created = hierarchyService.createBuilding(building);
        auditService.logAction(
                "HIERARCHY_BUILDING_CREATE", "BUILDING", String.valueOf(created.id()),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Yeni bina tanımlandı: " + created.name()
        );
        return created;
    }

    @PutMapping("/buildings/{id}")
    public Building updateBuilding(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Building building,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Building updated = hierarchyService.updateBuilding(id, building);
        auditService.logAction(
                "HIERARCHY_BUILDING_UPDATE", "BUILDING", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Bina güncellendi: " + updated.name()
        );
        return updated;
    }

    @DeleteMapping("/buildings/{id}")
    public void deleteBuilding(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Building existing = hierarchyService.getBuildingById(id);
        hierarchyService.deleteBuilding(id);
        auditService.logAction(
                "HIERARCHY_BUILDING_DELETE", "BUILDING", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Bina silindi: " + (existing != null ? existing.name() : id)
        );
    }

    // ==========================================
    // KATLAR
    // ==========================================

    @GetMapping("/floors")
    public List<Floor> getFloors(@RequestParam(required = false) Long buildingId) {
        return hierarchyService.getFloors(buildingId);
    }

    @GetMapping("/floors/{id}")
    public Floor getFloorById(@PathVariable Long id) {
        return hierarchyService.getFloorById(id);
    }

    @PostMapping("/floors")
    public Floor createFloor(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Floor floor,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Floor created = hierarchyService.createFloor(floor);
        auditService.logAction(
                "HIERARCHY_FLOOR_CREATE", "FLOOR", String.valueOf(created.id()),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Yeni kat tanımlandı: " + created.floorName()
        );
        return created;
    }

    @PutMapping("/floors/{id}")
    public Floor updateFloor(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Floor floor,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Floor updated = hierarchyService.updateFloor(id, floor);
        auditService.logAction(
                "HIERARCHY_FLOOR_UPDATE", "FLOOR", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Kat güncellendi: " + updated.floorName()
        );
        return updated;
    }

    @DeleteMapping("/floors/{id}")
    public void deleteFloor(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Floor existing = hierarchyService.getFloorById(id);
        hierarchyService.deleteFloor(id);
        auditService.logAction(
                "HIERARCHY_FLOOR_DELETE", "FLOOR", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Kat silindi: " + (existing != null ? existing.floorName() : id)
        );
    }

    // ==========================================
    // ODALAR & DEPOLAR
    // ==========================================

    @GetMapping("/rooms")
    public List<Room> getRooms(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) Long floorId,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String roomType
    ) {
        return hierarchyService.getRooms(buildingId, floorId, departmentId, roomType);
    }

    @GetMapping("/rooms/{id}")
    public Room getRoomById(@PathVariable Long id) {
        return hierarchyService.getRoomById(id);
    }

    @GetMapping("/rooms/qr/{qrCode}")
    public Room getRoomByQr(@PathVariable String qrCode) {
        return hierarchyService.getRoomByQr(qrCode);
    }

    @GetMapping("/rooms/{id}/assets")
    public List<Asset> getAssetsInRoom(@PathVariable Long id) {
        tenantQueryScope.enforceStaffModuleRestriction("rooms/assets");
        Room room = hierarchyService.getRoomById(id);
        if (tenantQueryScope.isDeptManager()) {
            Long userDeptId = tenantQueryScope.getDepartmentId();
            if (userDeptId != null && room.departmentId() != null && !userDeptId.equals(room.departmentId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Başka bir müdürlüğün odasına ait varlık listesi görüntülenemez.");
            }
        }
        return hierarchyService.getAssetsInRoom(id);
    }

    @PostMapping("/rooms")
    public Room createRoom(
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Room room,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireWriteAccess(token);
        if ("DEPT_MANAGER".equalsIgnoreCase(session.role())) {
            Long userDeptId = session.departmentId();
            if (userDeptId == null || !userDeptId.equals(room.departmentId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Müdürlük yöneticisi yalnızca kendi müdürlüğüne oda/ambar tanımlayabilir.");
            }
        }
        Room created = hierarchyService.createRoom(room);
        auditService.logAction(
                "HIERARCHY_ROOM_CREATE", "ROOM", String.valueOf(created.id()),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Yeni oda tanımlandı: " + created.name() + " (" + created.roomNumber() + ")"
        );
        return created;
    }

    @PutMapping("/rooms/{id}")
    public Room updateRoom(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            @RequestBody Room room,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Room updated = hierarchyService.updateRoom(id, room);
        auditService.logAction(
                "HIERARCHY_ROOM_UPDATE", "ROOM", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Oda güncellendi: " + updated.name()
        );
        return updated;
    }

    @DeleteMapping("/rooms/{id}")
    public void deleteRoom(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token,
            HttpServletRequest request
    ) {
        UserSession session = authService.requireAdmin(token);
        Room existing = hierarchyService.getRoomById(id);
        hierarchyService.deleteRoom(id);
        auditService.logAction(
                "HIERARCHY_ROOM_DELETE", "ROOM", String.valueOf(id),
                session.username(), session.fullName(), request.getRemoteAddr(),
                "Oda silindi: " + (existing != null ? existing.name() : id)
        );
    }

    // ==========================================
    // KATEGORİLER
    // ==========================================

    @GetMapping("/categories")
    public List<AssetCategory> getAllCategories() {
        return hierarchyService.getAllCategories();
    }

    // ==========================================
    // AĞAÇ GÖRÜNÜMÜ (TREE VIEW)
    // ==========================================

    @GetMapping("/hierarchy/tree")
    public HierarchyTreeNode getTree(@RequestParam(defaultValue = "physical") String mode) {
        tenantQueryScope.enforceStaffModuleRestriction("hierarchy/tree");
        if ("corporate".equalsIgnoreCase(mode)) {
            return hierarchyService.getCorporateHierarchyTree();
        }
        return hierarchyService.getFullPhysicalHierarchyTree();
    }
}
