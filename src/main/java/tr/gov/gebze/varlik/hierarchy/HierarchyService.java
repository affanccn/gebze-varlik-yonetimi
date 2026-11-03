package tr.gov.gebze.varlik.hierarchy;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetRepository;
import tr.gov.gebze.varlik.common.ApiException;

@Service
public class HierarchyService {

    private final HierarchyRepository hierarchyRepository;
    private final AssetRepository assetRepository;

    public HierarchyService(HierarchyRepository hierarchyRepository, AssetRepository assetRepository) {
        this.hierarchyRepository = hierarchyRepository;
        this.assetRepository = assetRepository;
    }

    // ==========================================
    // DEPARTMENTS (30 MÜDÜRLÜK)
    // ==========================================

    public List<Department> getAllDepartments() {
        return hierarchyRepository.findAllDepartments();
    }

    public Department getDepartmentById(Long id) {
        return hierarchyRepository.findDepartmentById(id)
                .orElseThrow(() -> new ApiException("Müdürlük bulunamadı: " + id));
    }

    @Transactional
    public Department createDepartment(Department department) {
        if (department.name() == null || department.name().isBlank()) {
            throw new ApiException("Müdürlük adı zorunludur.");
        }
        String code = department.code();
        if (code == null || code.isBlank()) {
            code = "DEPT-" + System.currentTimeMillis() % 10000;
        }
        Department toSave = new Department(
                null,
                code.trim().toUpperCase(),
                department.name().trim(),
                department.managerName(),
                department.phone(),
                department.email(),
                department.displayOrder() == null ? 0 : department.displayOrder(),
                1,
                0L
        );
        Long id = hierarchyRepository.saveDepartment(toSave);
        return getDepartmentById(id);
    }

    @Transactional
    public Department updateDepartment(Long id, Department update) {
        Department existing = getDepartmentById(id);
        Department updated = new Department(
                existing.id(),
                existing.code(),
                update.name() != null ? update.name().trim() : existing.name(),
                update.managerName() != null ? update.managerName().trim() : existing.managerName(),
                update.phone() != null ? update.phone().trim() : existing.phone(),
                update.email() != null ? update.email().trim() : existing.email(),
                update.displayOrder() != null ? update.displayOrder() : existing.displayOrder(),
                update.isActive() != null ? update.isActive() : existing.isActive(),
                existing.assetCount()
        );
        hierarchyRepository.updateDepartment(updated);
        return getDepartmentById(id);
    }

    // ==========================================
    // SUB_UNITS (ALT BİRİMLER & ŞEFLİKLER)
    // ==========================================

    public List<SubUnit> getSubUnits(Long departmentId) {
        return hierarchyRepository.findAllSubUnits(departmentId);
    }

    public SubUnit getSubUnitById(Long id) {
        return hierarchyRepository.findSubUnitById(id)
                .orElseThrow(() -> new ApiException("Alt birim bulunamadı: " + id));
    }

    @Transactional
    public SubUnit createSubUnit(SubUnit subUnit) {
        if (subUnit.name() == null || subUnit.name().isBlank()) {
            throw new ApiException("Alt birim adı zorunludur.");
        }
        if (subUnit.departmentId() == null) {
            throw new ApiException("Bağlı bulunulan müdürlük seçilmelidir.");
        }
        String code = subUnit.code();
        if (code == null || code.isBlank()) {
            code = "SUB-" + System.currentTimeMillis() % 100000;
        }
        SubUnit toSave = new SubUnit(
                null,
                subUnit.departmentId(),
                null,
                subUnit.parentUnitId(),
                code.trim().toUpperCase(),
                subUnit.name().trim(),
                subUnit.unitType() == null ? "Birim" : subUnit.unitType(),
                subUnit.managerName(),
                subUnit.phone(),
                subUnit.description(),
                1,
                0L
        );
        Long id = hierarchyRepository.saveSubUnit(toSave);
        return getSubUnitById(id);
    }

    // ==========================================
    // BUILDINGS (HİZMET BİNALARI)
    // ==========================================

    public List<Building> getAllBuildings() {
        return hierarchyRepository.findAllBuildings();
    }

    public Building getBuildingById(Long id) {
        return hierarchyRepository.findBuildingById(id)
                .orElseThrow(() -> new ApiException("Bina bulunamadı: " + id));
    }

    @Transactional
    public Building createBuilding(Building building) {
        if (building.name() == null || building.name().isBlank()) {
            throw new ApiException("Bina adı zorunludur.");
        }
        String code = building.code();
        if (code == null || code.isBlank()) {
            code = "BLD-" + System.currentTimeMillis() % 10000;
        }
        Building toSave = new Building(
                null,
                code.trim().toUpperCase(),
                building.name().trim(),
                building.buildingType() == null ? "Hizmet Binası" : building.buildingType(),
                building.address(),
                building.phone(),
                building.totalFloors() == null ? 1 : building.totalFloors(),
                building.description(),
                1,
                0L,
                0L
        );
        Long id = hierarchyRepository.saveBuilding(toSave);
        return getBuildingById(id);
    }

    // ==========================================
    // FLOORS (BİNA KATLARI)
    // ==========================================

    public List<Floor> getFloors(Long buildingId) {
        return hierarchyRepository.findFloorsByBuilding(buildingId);
    }

    @Transactional
    public Floor createFloor(Floor floor) {
        if (floor.buildingId() == null) {
            throw new ApiException("Bina seçilmelidir.");
        }
        if (floor.floorName() == null || floor.floorName().isBlank()) {
            throw new ApiException("Kat adı zorunludur.");
        }
        String code = floor.floorCode();
        if (code == null || code.isBlank()) {
            code = "FLR-" + System.currentTimeMillis() % 10000;
        }
        Floor toSave = new Floor(
                null,
                floor.buildingId(),
                null,
                code.trim().toUpperCase(),
                floor.floorName().trim(),
                floor.floorOrder() == null ? 0 : floor.floorOrder(),
                floor.description(),
                1,
                0L,
                0L
        );
        Long id = hierarchyRepository.saveFloor(toSave);
        return hierarchyRepository.findFloorsByBuilding(floor.buildingId()).stream()
                .filter(f -> f.id().equals(id))
                .findFirst()
                .orElse(toSave);
    }

    // ==========================================
    // ROOMS (ODALAR, OFİSLER, AMBARLAR)
    // ==========================================

    public List<Room> getRooms(Long buildingId, Long floorId, Long departmentId, String roomType) {
        return hierarchyRepository.findAllRooms(buildingId, floorId, departmentId, roomType);
    }

    public Room getRoomById(Long id) {
        return hierarchyRepository.findRoomById(id)
                .orElseThrow(() -> new ApiException("Oda bulunamadı: " + id));
    }

    public Room getRoomByQr(String qrCode) {
        return hierarchyRepository.findRoomByQr(qrCode)
                .orElseThrow(() -> new ApiException("Bu QR koda ait oda bulunamadı: " + qrCode));
    }

    public List<Asset> getAssetsInRoom(Long roomId) {
        getRoomById(roomId); // doğrula
        return assetRepository.findByRoomId(roomId);
    }

    @Transactional
    public Room createRoom(Room room) {
        if (room.buildingId() == null || room.floorId() == null) {
            throw new ApiException("Bina ve kat seçimi zorunludur.");
        }
        if (room.roomNumber() == null || room.roomNumber().isBlank()) {
            throw new ApiException("Oda numarası zorunludur.");
        }
        if (room.name() == null || room.name().isBlank()) {
            throw new ApiException("Oda adı zorunludur.");
        }
        String qr = room.qrCode();
        if (qr == null || qr.isBlank()) {
            qr = "GBZ-ROOM-" + room.buildingId() + "-K" + room.floorId() + "-" + room.roomNumber().trim().replaceAll("\\s+", "-");
        }
        Room toSave = new Room(
                null,
                room.buildingId(),
                null,
                room.floorId(),
                null,
                room.roomNumber().trim(),
                room.name().trim(),
                room.roomType() == null ? "Personel Ofisi" : room.roomType(),
                room.departmentId(),
                null,
                room.subUnitId(),
                null,
                room.responsiblePerson(),
                room.capacity() == null ? 4 : room.capacity(),
                qr.trim().toUpperCase(),
                room.description(),
                1,
                0L
        );
        Long id = hierarchyRepository.saveRoom(toSave);
        return getRoomById(id);
    }

    // ==========================================
    // CATEGORIES (16 ANA KATEGORİ)
    // ==========================================

    public List<AssetCategory> getAllCategories() {
        return hierarchyRepository.findAllCategories();
    }

    // ==========================================
    // HİEYERARŞİK AĞAÇ GÖRÜNÜMÜ (TREE VIEW)
    // ==========================================

    public HierarchyTreeNode getFullPhysicalHierarchyTree() {
        List<Building> buildings = hierarchyRepository.findAllBuildings();
        List<Room> allRooms = hierarchyRepository.findAllRooms(null, null, null, null);

        List<HierarchyTreeNode> buildingNodes = new ArrayList<>();
        long grandTotalAssets = 0;

        for (Building b : buildings) {
            List<Floor> floors = hierarchyRepository.findFloorsByBuilding(b.id());
            List<HierarchyTreeNode> floorNodes = new ArrayList<>();

            for (Floor f : floors) {
                List<Room> floorRooms = allRooms.stream()
                        .filter(r -> java.util.Objects.equals(r.floorId(), f.id()))
                        .toList();

                List<HierarchyTreeNode> roomNodes = new ArrayList<>();
                for (Room r : floorRooms) {
                    Map<String, Object> meta = new LinkedHashMap<>();
                    meta.put("roomId", r.id());
                    meta.put("buildingId", r.buildingId());
                    meta.put("floorId", r.floorId());
                    meta.put("roomNumber", r.roomNumber());
                    meta.put("roomType", r.roomType());
                    meta.put("departmentName", r.departmentName());
                    meta.put("subUnitName", r.subUnitName());
                    meta.put("responsiblePerson", r.responsiblePerson());
                    meta.put("capacity", r.capacity());
                    meta.put("qrCode", r.qrCode());
                    meta.put("assetCount", r.assetCount() != null ? r.assetCount() : 0L);

                    roomNodes.add(new HierarchyTreeNode(
                            "room-" + r.id(),
                            "Oda " + r.roomNumber() + " – " + r.name() + (r.departmentName() != null ? " (" + r.departmentName() + ")" : ""),
                            "ROOM",
                            r.qrCode(),
                            r.roomType(),
                            getRoomIcon(r.roomType()),
                            r.assetCount() != null ? r.assetCount() : 0L,
                            meta,
                            List.of()
                    ));
                }

                Map<String, Object> floorMeta = new LinkedHashMap<>();
                floorMeta.put("floorId", f.id());
                floorMeta.put("buildingId", b.id());
                floorMeta.put("buildingName", b.name());
                floorMeta.put("floorCode", f.floorCode());
                floorMeta.put("floorName", f.floorName());
                floorMeta.put("description", f.description());
                floorMeta.put("roomCount", (long) floorRooms.size());
                floorMeta.put("assetCount", f.assetCount() != null ? f.assetCount() : 0L);

                floorNodes.add(new HierarchyTreeNode(
                        "floor-" + f.id(),
                        f.floorName() + " (" + floorRooms.size() + " Oda, " + (f.assetCount() != null ? f.assetCount() : 0L) + " Demirbaş)",
                        "FLOOR",
                        f.floorCode(),
                        f.description(),
                        "layers",
                        f.assetCount() != null ? f.assetCount() : 0L,
                        floorMeta,
                        roomNodes
                ));
            }

            Map<String, Object> bldMeta = new LinkedHashMap<>();
            bldMeta.put("buildingId", b.id());
            bldMeta.put("code", b.code());
            bldMeta.put("name", b.name());
            bldMeta.put("buildingType", b.buildingType());
            bldMeta.put("address", b.address());
            bldMeta.put("phone", b.phone());
            bldMeta.put("totalFloors", b.totalFloors());
            bldMeta.put("roomCount", b.roomCount() != null ? b.roomCount() : 0L);
            bldMeta.put("assetCount", b.assetCount() != null ? b.assetCount() : 0L);

            grandTotalAssets += (b.assetCount() != null ? b.assetCount() : 0L);

            buildingNodes.add(new HierarchyTreeNode(
                    "bld-" + b.id(),
                    b.name() + " (" + b.buildingType() + ")",
                    "BUILDING",
                    b.code(),
                    b.address(),
                    getBuildingIcon(b.buildingType()),
                    b.assetCount() != null ? b.assetCount() : 0L,
                    bldMeta,
                    floorNodes
            ));
        }

        Map<String, Object> rootMeta = new LinkedHashMap<>();
        rootMeta.put("totalBuildings", (long) buildings.size());
        rootMeta.put("totalAssets", grandTotalAssets);

        return new HierarchyTreeNode(
                "root-gebze",
                "Gebze Belediyesi Kurumsal Yerleşkeleri (" + buildings.size() + " Tesis/Bina, " + grandTotalAssets + " Demirbaş)",
                "MUNICIPALITY",
                "GBZ-MUNICIPALITY",
                "Gebze Belediyesi Binaları, Katları, Odaları ve Ambarları",
                "account_balance",
                grandTotalAssets,
                rootMeta,
                buildingNodes
        );
    }

    public HierarchyTreeNode getCorporateHierarchyTree() {
        List<Department> departments = hierarchyRepository.findAllDepartments();
        List<Room> allRooms = hierarchyRepository.findAllRooms(null, null, null, null);
        List<HierarchyTreeNode> deptNodes = new ArrayList<>();
        long grandTotalAssets = 0;

        for (Department d : departments) {
            List<SubUnit> subUnits = hierarchyRepository.findAllSubUnits(d.id());
            List<HierarchyTreeNode> deptChildren = new ArrayList<>();

            for (SubUnit s : subUnits) {
                List<Room> subRooms = allRooms.stream()
                        .filter(r -> java.util.Objects.equals(r.subUnitId(), s.id()))
                        .toList();

                List<HierarchyTreeNode> roomNodes = new ArrayList<>();
                for (Room r : subRooms) {
                    Map<String, Object> meta = new LinkedHashMap<>();
                    meta.put("roomId", r.id());
                    meta.put("buildingId", r.buildingId());
                    meta.put("buildingName", r.buildingName());
                    meta.put("floorId", r.floorId());
                    meta.put("floorName", r.floorName());
                    meta.put("roomNumber", r.roomNumber());
                    meta.put("name", r.name());
                    meta.put("roomType", r.roomType());
                    meta.put("departmentId", d.id());
                    meta.put("departmentName", d.name());
                    meta.put("subUnitId", s.id());
                    meta.put("subUnitName", s.name());
                    meta.put("responsiblePerson", r.responsiblePerson());
                    meta.put("capacity", r.capacity());
                    meta.put("qrCode", r.qrCode());
                    meta.put("assetCount", r.assetCount() != null ? r.assetCount() : 0L);

                    roomNodes.add(new HierarchyTreeNode(
                            "room-" + r.id(),
                            "Oda " + r.roomNumber() + " – " + r.name() + (r.buildingName() != null ? " (" + r.buildingName() + ")" : ""),
                            "ROOM",
                            r.qrCode(),
                            r.roomType(),
                            getRoomIcon(r.roomType()),
                            r.assetCount() != null ? r.assetCount() : 0L,
                            meta,
                            List.of()
                    ));
                }

                Map<String, Object> subMeta = new LinkedHashMap<>();
                subMeta.put("subUnitId", s.id());
                subMeta.put("deptId", d.id());
                subMeta.put("deptName", d.name());
                subMeta.put("name", s.name());
                subMeta.put("unitType", s.unitType());
                subMeta.put("managerName", s.managerName());
                subMeta.put("phone", s.phone());
                subMeta.put("assetCount", s.assetCount() != null ? s.assetCount() : 0L);

                deptChildren.add(new HierarchyTreeNode(
                        "sub-" + s.id(),
                        s.name() + " (" + s.unitType() + ")",
                        "SUB_UNIT",
                        s.code(),
                        s.managerName() != null ? "Sorumlu: " + s.managerName() : "",
                        "subdirectory_arrow_right",
                        s.assetCount() != null ? s.assetCount() : 0L,
                        subMeta,
                        roomNodes
                ));
            }

            // Doğrudan müdürlüğe bağlı odalar (alt birimsiz)
            List<Room> directDeptRooms = allRooms.stream()
                    .filter(r -> java.util.Objects.equals(r.departmentId(), d.id()) && r.subUnitId() == null)
                    .toList();

            for (Room r : directDeptRooms) {
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("roomId", r.id());
                meta.put("buildingId", r.buildingId());
                meta.put("buildingName", r.buildingName());
                meta.put("floorId", r.floorId());
                meta.put("floorName", r.floorName());
                meta.put("roomNumber", r.roomNumber());
                meta.put("name", r.name());
                meta.put("roomType", r.roomType());
                meta.put("departmentId", d.id());
                meta.put("departmentName", d.name());
                meta.put("responsiblePerson", r.responsiblePerson());
                meta.put("capacity", r.capacity());
                meta.put("qrCode", r.qrCode());
                meta.put("assetCount", r.assetCount() != null ? r.assetCount() : 0L);

                deptChildren.add(new HierarchyTreeNode(
                        "room-" + r.id(),
                        "Oda " + r.roomNumber() + " – " + r.name() + (r.buildingName() != null ? " (" + r.buildingName() + ")" : ""),
                        "ROOM",
                        r.qrCode(),
                        r.roomType(),
                        getRoomIcon(r.roomType()),
                        r.assetCount() != null ? r.assetCount() : 0L,
                        meta,
                        List.of()
                ));
            }

            grandTotalAssets += (d.assetCount() != null ? d.assetCount() : 0L);

            Map<String, Object> deptMeta = new LinkedHashMap<>();
            deptMeta.put("deptId", d.id());
            deptMeta.put("code", d.code());
            deptMeta.put("name", d.name());
            deptMeta.put("managerName", d.managerName());
            deptMeta.put("phone", d.phone());
            deptMeta.put("email", d.email());
            deptMeta.put("assetCount", d.assetCount() != null ? d.assetCount() : 0L);

            deptNodes.add(new HierarchyTreeNode(
                    "dept-" + d.id(),
                    d.name(),
                    "DEPARTMENT",
                    d.code(),
                    d.managerName() != null ? "Müdür: " + d.managerName() : "",
                    "business",
                    d.assetCount() != null ? d.assetCount() : 0L,
                    deptMeta,
                    deptChildren
            ));
        }

        Map<String, Object> rootCorpMeta = new LinkedHashMap<>();
        rootCorpMeta.put("totalDepartments", (long) departments.size());
        rootCorpMeta.put("totalAssets", grandTotalAssets);

        return new HierarchyTreeNode(
                "root-corporate",
                "Gebze Belediyesi Müdürlükleri (30 Müdürlük, " + grandTotalAssets + " Demirbaş)",
                "MUNICIPALITY",
                "GBZ-DEPARTMENTS",
                "Gebze Belediyesi 30 Kurumsal Müdürlüğü, Şeflikleri ve Odaları",
                "domain",
                grandTotalAssets,
                rootCorpMeta,
                deptNodes
        );
    }

    private String getRoomIcon(String roomType) {
        if (roomType == null) return "meeting_room";
        return switch (roomType.toLowerCase()) {
            case "müdür odası" -> "person_pin";
            case "personel ofisi" -> "badge";
            case "toplantı odası" -> "groups";
            case "arşiv" -> "inventory_2";
            case "depo / ambar", "depo" -> "warehouse";
            case "sistem odası" -> "dns";
            case "teknik oda" -> "build";
            default -> "meeting_room";
        };
    }

    private String getBuildingIcon(String buildingType) {
        if (buildingType == null) return "domain";
        return switch (buildingType.toLowerCase()) {
            case "şantiye" -> "engineering";
            case "garaj" -> "local_shipping";
            case "bakımevi / klinik", "klinik" -> "pets";
            case "kültür merkezi" -> "theater_comedy";
            case "spor tesisi" -> "fitness_center";
            case "sosyal tesis" -> "restaurant";
            case "depo ve ambar" -> "warehouse";
            case "zabıta noktası" -> "local_police";
            default -> "domain";
        };
    }
}

