package tr.gov.gebze.varlik.hierarchy;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.asset.Asset;

@RestController
@RequestMapping("/api")
public class HierarchyController {

    private final HierarchyService hierarchyService;

    public HierarchyController(HierarchyService hierarchyService) {
        this.hierarchyService = hierarchyService;
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
    public Department createDepartment(@RequestBody Department department) {
        return hierarchyService.createDepartment(department);
    }

    @PutMapping("/departments/{id}")
    public Department updateDepartment(@PathVariable Long id, @RequestBody Department department) {
        return hierarchyService.updateDepartment(id, department);
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
    public SubUnit createSubUnit(@RequestBody SubUnit subUnit) {
        return hierarchyService.createSubUnit(subUnit);
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
    public Building createBuilding(@RequestBody Building building) {
        return hierarchyService.createBuilding(building);
    }

    // ==========================================
    // KATLAR
    // ==========================================

    @GetMapping("/floors")
    public List<Floor> getFloors(@RequestParam(required = false) Long buildingId) {
        return hierarchyService.getFloors(buildingId);
    }

    @PostMapping("/floors")
    public Floor createFloor(@RequestBody Floor floor) {
        return hierarchyService.createFloor(floor);
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
        return hierarchyService.getAssetsInRoom(id);
    }

    @PostMapping("/rooms")
    public Room createRoom(@RequestBody Room room) {
        return hierarchyService.createRoom(room);
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
        if ("corporate".equalsIgnoreCase(mode)) {
            return hierarchyService.getCorporateHierarchyTree();
        }
        return hierarchyService.getFullPhysicalHierarchyTree();
    }
}

