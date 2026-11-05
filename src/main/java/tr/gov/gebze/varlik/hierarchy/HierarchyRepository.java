package tr.gov.gebze.varlik.hierarchy;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Repository
public class HierarchyRepository {

    private final JdbcClient jdbcClient;
    private final TenantQueryScope tenantQueryScope;

    public HierarchyRepository(JdbcClient jdbcClient, TenantQueryScope tenantQueryScope) {
        this.jdbcClient = jdbcClient;
        this.tenantQueryScope = tenantQueryScope;
    }

    // ==========================================
    // 1. MÜDÜRLÜKLER (DEPARTMENTS)
    // ==========================================

    public List<Department> findAllDepartments() {
        String assetFilter = tenantQueryScope.getAssetFilterClause("a");
        String sql = """
            SELECT d.id, d.code, d.name,
                   COALESCE(
                       (SELECT p.full_name FROM personnel p WHERE p.department_id = d.id AND p.is_deleted = 0 AND (LOWER(p.title) LIKE '%müdür%' OR LOWER(p.title) LIKE '%mudur%' OR LOWER(p.title) LIKE '%başkan%' OR LOWER(p.title) LIKE '%müşavir%') ORDER BY p.id FETCH FIRST 1 ROWS ONLY),
                       (SELECT p.full_name FROM personnel p WHERE p.department_id = d.id AND p.is_deleted = 0 AND (LOWER(p.title) LIKE '%amir%' OR LOWER(p.title) LIKE '%şef%') ORDER BY p.id FETCH FIRST 1 ROWS ONLY),
                       d.manager_name
                   ) AS manager_name,
                   d.phone, d.email, d.display_order, d.is_active,
                   COUNT(a.id) AS asset_count
            FROM departments d
            LEFT JOIN assets a ON a.department_id = d.id AND a.is_active = 1 AND a.is_deleted = 0 AND """ + assetFilter + """
            GROUP BY d.id, d.code, d.name, d.manager_name, d.phone, d.email, d.display_order, d.is_active
            ORDER BY d.display_order ASC, d.id ASC
            """;
        return jdbcClient.sql(sql).query(this::mapDepartment).list();
    }

    public Optional<Department> findDepartmentById(Long id) {
        String sql = """
            SELECT d.id, d.code, d.name,
                   COALESCE(
                       (SELECT p.full_name FROM personnel p WHERE p.department_id = d.id AND p.is_deleted = 0 AND (LOWER(p.title) LIKE '%müdür%' OR LOWER(p.title) LIKE '%mudur%' OR LOWER(p.title) LIKE '%başkan%' OR LOWER(p.title) LIKE '%müşavir%') ORDER BY p.id FETCH FIRST 1 ROWS ONLY),
                       (SELECT p.full_name FROM personnel p WHERE p.department_id = d.id AND p.is_deleted = 0 AND (LOWER(p.title) LIKE '%amir%' OR LOWER(p.title) LIKE '%şef%') ORDER BY p.id FETCH FIRST 1 ROWS ONLY),
                       d.manager_name
                   ) AS manager_name,
                   d.phone, d.email, d.display_order, d.is_active,
                   COUNT(a.id) AS asset_count
            FROM departments d
            LEFT JOIN assets a ON a.department_id = d.id AND a.is_active = 1
            WHERE d.id = :id
            GROUP BY d.id, d.code, d.name, d.manager_name, d.phone, d.email, d.display_order, d.is_active
            """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapDepartment).optional();
    }

    public Long saveDepartment(Department d) {
        String sql = """
            INSERT INTO departments (code, name, manager_name, phone, email, display_order, is_active)
            VALUES (:code, :name, :managerName, :phone, :email, :displayOrder, :isActive)
            """;
        jdbcClient.sql(sql)
                .param("code", d.code())
                .param("name", d.name())
                .param("managerName", d.managerName())
                .param("phone", d.phone())
                .param("email", d.email())
                .param("displayOrder", d.displayOrder() == null ? 0 : d.displayOrder())
                .param("isActive", d.isActive() == null ? 1 : d.isActive())
                .update();
        return jdbcClient.sql("SELECT id FROM departments WHERE code = :code")
                .param("code", d.code())
                .query(Long.class).single();
    }

    public void updateDepartment(Department d) {
        String sql = """
            UPDATE departments SET
                name = :name,
                manager_name = :managerName,
                phone = :phone,
                email = :email,
                display_order = :displayOrder,
                is_active = :isActive
            WHERE id = :id
            """;
        jdbcClient.sql(sql)
                .param("name", d.name())
                .param("managerName", d.managerName())
                .param("phone", d.phone())
                .param("email", d.email())
                .param("displayOrder", d.displayOrder() == null ? 0 : d.displayOrder())
                .param("isActive", d.isActive() == null ? 1 : d.isActive())
                .param("id", d.id())
                .update();
    }

    public void deleteDepartment(Long id) {
        jdbcClient.sql("UPDATE departments SET is_active = 0 WHERE id = :id").param("id", id).update();
    }

    // ==========================================
    // 2. ALT BİRİMLER (SUB_UNITS)
    // ==========================================

    public List<SubUnit> findAllSubUnits(Long departmentId) {
        String assetFilter = tenantQueryScope.getAssetFilterClause("a");
        String sql = """
            SELECT s.id, s.department_id, d.name AS dept_name, s.parent_unit_id, s.code, s.name,
                   s.unit_type, s.manager_name, s.phone, s.description, s.is_active,
                   COUNT(a.id) AS asset_count
            FROM sub_units s
            JOIN departments d ON s.department_id = d.id
            LEFT JOIN assets a ON a.sub_unit_id = s.id AND a.is_active = 1 AND a.is_deleted = 0 AND """ + assetFilter + """
            WHERE (:deptId IS NULL OR s.department_id = :deptId)
            GROUP BY s.id, s.department_id, d.name, s.parent_unit_id, s.code, s.name,
                     s.unit_type, s.manager_name, s.phone, s.description, s.is_active
            ORDER BY s.department_id ASC, s.name ASC
            """;
        return jdbcClient.sql(sql)
                .param("deptId", departmentId)
                .query(this::mapSubUnit)
                .list();
    }

    public Optional<SubUnit> findSubUnitById(Long id) {
        String sql = """
            SELECT s.id, s.department_id, d.name AS dept_name, s.parent_unit_id, s.code, s.name,
                   s.unit_type, s.manager_name, s.phone, s.description, s.is_active,
                   COUNT(a.id) AS asset_count
            FROM sub_units s
            JOIN departments d ON s.department_id = d.id
            LEFT JOIN assets a ON a.sub_unit_id = s.id AND a.is_active = 1
            WHERE s.id = :id
            GROUP BY s.id, s.department_id, d.name, s.parent_unit_id, s.code, s.name,
                     s.unit_type, s.manager_name, s.phone, s.description, s.is_active
            """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapSubUnit).optional();
    }

    public Long saveSubUnit(SubUnit s) {
        String sql = """
            INSERT INTO sub_units (department_id, parent_unit_id, code, name, unit_type, manager_name, phone, description, is_active)
            VALUES (:deptId, :parentId, :code, :name, :unitType, :managerName, :phone, :description, :isActive)
            """;
        jdbcClient.sql(sql)
                .param("deptId", s.departmentId())
                .param("parentId", s.parentUnitId())
                .param("code", s.code())
                .param("name", s.name())
                .param("unitType", s.unitType() == null ? "Birim" : s.unitType())
                .param("managerName", s.managerName())
                .param("phone", s.phone())
                .param("description", s.description())
                .param("isActive", s.isActive() == null ? 1 : s.isActive())
                .update();
        return jdbcClient.sql("SELECT id FROM sub_units WHERE code = :code").param("code", s.code()).query(Long.class).single();
    }

    public void updateSubUnit(SubUnit s) {
        String sql = """
            UPDATE sub_units SET
                department_id = :deptId,
                parent_unit_id = :parentId,
                name = :name,
                unit_type = :unitType,
                manager_name = :managerName,
                phone = :phone,
                description = :description,
                is_active = :isActive
            WHERE id = :id
            """;
        jdbcClient.sql(sql)
                .param("deptId", s.departmentId())
                .param("parentId", s.parentUnitId())
                .param("name", s.name())
                .param("unitType", s.unitType() == null ? "Birim" : s.unitType())
                .param("managerName", s.managerName())
                .param("phone", s.phone())
                .param("description", s.description())
                .param("isActive", s.isActive() == null ? 1 : s.isActive())
                .param("id", s.id())
                .update();
    }

    public void deleteSubUnit(Long id) {
        jdbcClient.sql("UPDATE sub_units SET is_active = 0 WHERE id = :id").param("id", id).update();
    }

    // ==========================================
    // 3. BİNALAR (BUILDINGS)
    // ==========================================

    public List<Building> findAllBuildings() {
        String assetFilter = tenantQueryScope.getAssetFilterClause("a");
        String sql = """
            SELECT b.id, b.code, b.name, b.building_type, b.address, b.phone, b.total_floors,
                   b.description, b.is_active,
                   COUNT(DISTINCT a.id) AS asset_count,
                   COUNT(DISTINCT r.id) AS room_count
            FROM buildings b
            LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = 1
            LEFT JOIN assets a ON a.building_id = b.id AND a.is_active = 1 AND a.is_deleted = 0 AND """ + assetFilter + """
            GROUP BY b.id, b.code, b.name, b.building_type, b.address, b.phone, b.total_floors, b.description, b.is_active
            ORDER BY b.id ASC
            """;
        return jdbcClient.sql(sql).query(this::mapBuilding).list();
    }

    public Optional<Building> findBuildingById(Long id) {
        String sql = """
            SELECT b.id, b.code, b.name, b.building_type, b.address, b.phone, b.total_floors,
                   b.description, b.is_active,
                   COUNT(DISTINCT a.id) AS asset_count,
                   COUNT(DISTINCT r.id) AS room_count
            FROM buildings b
            LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = 1
            LEFT JOIN assets a ON a.building_id = b.id AND a.is_active = 1
            WHERE b.id = :id
            GROUP BY b.id, b.code, b.name, b.building_type, b.address, b.phone, b.total_floors, b.description, b.is_active
            """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapBuilding).optional();
    }

    public Long saveBuilding(Building b) {
        String sql = """
            INSERT INTO buildings (code, name, building_type, address, phone, total_floors, description, is_active)
            VALUES (:code, :name, :type, :address, :phone, :floors, :description, :isActive)
            """;
        jdbcClient.sql(sql)
                .param("code", b.code())
                .param("name", b.name())
                .param("type", b.buildingType() == null ? "Hizmet Binası" : b.buildingType())
                .param("address", b.address())
                .param("phone", b.phone())
                .param("floors", b.totalFloors() == null ? 1 : b.totalFloors())
                .param("description", b.description())
                .param("isActive", b.isActive() == null ? 1 : b.isActive())
                .update();
        return jdbcClient.sql("SELECT id FROM buildings WHERE code = :code").param("code", b.code()).query(Long.class).single();
    }

    public void updateBuilding(Building b) {
        String sql = """
            UPDATE buildings SET
                name = :name,
                building_type = :type,
                address = :address,
                phone = :phone,
                total_floors = :floors,
                description = :description,
                is_active = :isActive
            WHERE id = :id
            """;
        jdbcClient.sql(sql)
                .param("name", b.name())
                .param("type", b.buildingType() == null ? "Hizmet Binası" : b.buildingType())
                .param("address", b.address())
                .param("phone", b.phone())
                .param("floors", b.totalFloors() == null ? 1 : b.totalFloors())
                .param("description", b.description())
                .param("isActive", b.isActive() == null ? 1 : b.isActive())
                .param("id", b.id())
                .update();
    }

    public void deleteBuilding(Long id) {
        jdbcClient.sql("UPDATE buildings SET is_active = 0 WHERE id = :id").param("id", id).update();
    }

    // ==========================================
    // 4. KATLAR (FLOORS)
    // ==========================================

    public List<Floor> findFloorsByBuilding(Long buildingId) {
        String assetFilter = tenantQueryScope.getAssetFilterClause("a");
        String sql = """
            SELECT f.id, f.building_id, b.name AS bld_name, f.floor_code, f.floor_name,
                   f.floor_order, f.description, f.is_active,
                   COUNT(DISTINCT r.id) AS room_count,
                   COUNT(DISTINCT a.id) AS asset_count
            FROM floors f
            JOIN buildings b ON f.building_id = b.id
            LEFT JOIN rooms r ON r.floor_id = f.id AND r.is_active = 1
            LEFT JOIN assets a ON a.floor_id = f.id AND a.is_active = 1 AND a.is_deleted = 0 AND """ + assetFilter + """
            WHERE (:bldId IS NULL OR f.building_id = :bldId)
            GROUP BY f.id, f.building_id, b.name, f.floor_code, f.floor_name, f.floor_order, f.description, f.is_active
            ORDER BY f.floor_order ASC, f.id ASC
            """;
        return jdbcClient.sql(sql)
                .param("bldId", buildingId)
                .query(this::mapFloor)
                .list();
    }

    public Long saveFloor(Floor f) {
        String sql = """
            INSERT INTO floors (building_id, floor_code, floor_name, floor_order, description, is_active)
            VALUES (:bldId, :code, :name, :orderNum, :description, :isActive)
            """;
        jdbcClient.sql(sql)
                .param("bldId", f.buildingId())
                .param("code", f.floorCode())
                .param("name", f.floorName())
                .param("orderNum", f.floorOrder() == null ? 0 : f.floorOrder())
                .param("description", f.description())
                .param("isActive", f.isActive() == null ? 1 : f.isActive())
                .update();
        return jdbcClient.sql("SELECT id FROM floors WHERE building_id = :bldId AND floor_code = :code")
                .param("bldId", f.buildingId())
                .param("code", f.floorCode())
                .query(Long.class).single();
    }

    public Optional<Floor> findFloorById(Long id) {
        String sql = """
            SELECT f.id, f.building_id, b.name AS bld_name, f.floor_code, f.floor_name,
                   f.floor_order, f.description, f.is_active,
                   COUNT(DISTINCT r.id) AS room_count,
                   COUNT(DISTINCT a.id) AS asset_count
            FROM floors f
            JOIN buildings b ON f.building_id = b.id
            LEFT JOIN rooms r ON r.floor_id = f.id AND r.is_active = 1
            LEFT JOIN assets a ON a.floor_id = f.id AND a.is_active = 1
            WHERE f.id = :id
            GROUP BY f.id, f.building_id, b.name, f.floor_code, f.floor_name, f.floor_order, f.description, f.is_active
            """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapFloor).optional();
    }

    public void updateFloor(Floor f) {
        String sql = """
            UPDATE floors SET
                floor_code = :code,
                floor_name = :name,
                floor_order = :orderNum,
                description = :description,
                is_active = :isActive
            WHERE id = :id
            """;
        jdbcClient.sql(sql)
                .param("code", f.floorCode())
                .param("name", f.floorName())
                .param("orderNum", f.floorOrder() == null ? 0 : f.floorOrder())
                .param("description", f.description())
                .param("isActive", f.isActive() == null ? 1 : f.isActive())
                .param("id", f.id())
                .update();
    }

    public void deleteFloor(Long id) {
        jdbcClient.sql("UPDATE floors SET is_active = 0 WHERE id = :id").param("id", id).update();
    }

    // ==========================================
    // 5. ODALAR (ROOMS)
    // ==========================================

    public List<Room> findAllRooms(Long buildingId, Long floorId, Long departmentId, String roomType) {
        String assetFilter = tenantQueryScope.getAssetFilterClause("a");
        String sql = """
            SELECT r.id, r.building_id, b.name AS bld_name, r.floor_id, f.floor_name,
                   r.room_number, r.name, r.room_type, r.department_id, d.name AS dept_name,
                   r.sub_unit_id, s.name AS sub_name, r.responsible_person, r.capacity,
                   r.qr_code, r.description, r.is_active,
                   COUNT(a.id) AS asset_count
            FROM rooms r
            JOIN buildings b ON r.building_id = b.id
            JOIN floors f ON r.floor_id = f.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN sub_units s ON r.sub_unit_id = s.id
            LEFT JOIN assets a ON a.room_id = r.id AND a.is_active = 1 AND a.is_deleted = 0 AND """ + assetFilter + """
            WHERE (:bldId IS NULL OR r.building_id = :bldId)
              AND (:flrId IS NULL OR r.floor_id = :flrId)
              AND (:deptId IS NULL OR r.department_id = :deptId)
              AND (:rType IS NULL OR r.room_type = :rType)
            GROUP BY r.id, r.building_id, b.id, b.name, r.floor_id, f.floor_name, f.floor_order,
                     r.room_number, r.name, r.room_type, r.department_id, d.name,
                     r.sub_unit_id, s.name, r.responsible_person, r.capacity,
                     r.qr_code, r.description, r.is_active
            ORDER BY b.id ASC, f.floor_order ASC, r.room_number ASC
            """;
        return jdbcClient.sql(sql)
                .param("bldId", buildingId)
                .param("flrId", floorId)
                .param("deptId", departmentId)
                .param("rType", (roomType == null || roomType.isBlank()) ? null : roomType)
                .query(this::mapRoom)
                .list();
    }

    public Optional<Room> findRoomById(Long id) {
        String sql = """
            SELECT r.id, r.building_id, b.name AS bld_name, r.floor_id, f.floor_name,
                   r.room_number, r.name, r.room_type, r.department_id, d.name AS dept_name,
                   r.sub_unit_id, s.name AS sub_name, r.responsible_person, r.capacity,
                   r.qr_code, r.description, r.is_active,
                   COUNT(a.id) AS asset_count
            FROM rooms r
            JOIN buildings b ON r.building_id = b.id
            JOIN floors f ON r.floor_id = f.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN sub_units s ON r.sub_unit_id = s.id
            LEFT JOIN assets a ON a.room_id = r.id AND a.is_active = 1
            WHERE r.id = :id
            GROUP BY r.id, r.building_id, b.name, r.floor_id, f.floor_name,
                     r.room_number, r.name, r.room_type, r.department_id, d.name,
                     r.sub_unit_id, s.name, r.responsible_person, r.capacity,
                     r.qr_code, r.description, r.is_active
            """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapRoom).optional();
    }

    public Optional<Room> findRoomByQr(String qrCode) {
        String sql = """
            SELECT r.id, r.building_id, b.name AS bld_name, r.floor_id, f.floor_name,
                   r.room_number, r.name, r.room_type, r.department_id, d.name AS dept_name,
                   r.sub_unit_id, s.name AS sub_name, r.responsible_person, r.capacity,
                   r.qr_code, r.description, r.is_active,
                   COUNT(a.id) AS asset_count
            FROM rooms r
            JOIN buildings b ON r.building_id = b.id
            JOIN floors f ON r.floor_id = f.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN sub_units s ON r.sub_unit_id = s.id
            LEFT JOIN assets a ON a.room_id = r.id AND a.is_active = 1
            WHERE r.qr_code = :qr
            GROUP BY r.id, r.building_id, b.name, r.floor_id, f.floor_name,
                     r.room_number, r.name, r.room_type, r.department_id, d.name,
                     r.sub_unit_id, s.name, r.responsible_person, r.capacity,
                     r.qr_code, r.description, r.is_active
            """;
        return jdbcClient.sql(sql).param("qr", qrCode).query(this::mapRoom).optional();
    }

    public Long saveRoom(Room r) {
        String sql = """
            INSERT INTO rooms (building_id, floor_id, room_number, name, room_type, department_id, sub_unit_id,
                               responsible_person, capacity, qr_code, description, is_active)
            VALUES (:bldId, :flrId, :num, :name, :type, :deptId, :subId, :resp, :cap, :qr, :desc, :isActive)
            """;
        jdbcClient.sql(sql)
                .param("bldId", r.buildingId())
                .param("flrId", r.floorId())
                .param("num", r.roomNumber())
                .param("name", r.name())
                .param("type", r.roomType() == null ? "Personel Ofisi" : r.roomType())
                .param("deptId", r.departmentId())
                .param("subId", r.subUnitId())
                .param("resp", r.responsiblePerson())
                .param("cap", r.capacity() == null ? 4 : r.capacity())
                .param("qr", r.qrCode())
                .param("desc", r.description())
                .param("isActive", r.isActive() == null ? 1 : r.isActive())
                .update();
        return jdbcClient.sql("SELECT id FROM rooms WHERE qr_code = :qr").param("qr", r.qrCode()).query(Long.class).single();
    }

    public void updateRoom(Room r) {
        String sql = """
            UPDATE rooms SET
                building_id = :bldId,
                floor_id = :flrId,
                room_number = :num,
                name = :name,
                room_type = :type,
                department_id = :deptId,
                sub_unit_id = :subId,
                responsible_person = :resp,
                capacity = :cap,
                description = :desc,
                is_active = :isActive
            WHERE id = :id
            """;
        jdbcClient.sql(sql)
                .param("bldId", r.buildingId())
                .param("flrId", r.floorId())
                .param("num", r.roomNumber())
                .param("name", r.name())
                .param("type", r.roomType() == null ? "Personel Ofisi" : r.roomType())
                .param("deptId", r.departmentId())
                .param("subId", r.subUnitId())
                .param("resp", r.responsiblePerson())
                .param("cap", r.capacity() == null ? 4 : r.capacity())
                .param("desc", r.description())
                .param("isActive", r.isActive() == null ? 1 : r.isActive())
                .param("id", r.id())
                .update();
    }

    public void deleteRoom(Long id) {
        jdbcClient.sql("UPDATE rooms SET is_active = 0 WHERE id = :id").param("id", id).update();
    }

    // ==========================================
    // 6. KATEGORİLER (ASSET_CATEGORIES)
    // ==========================================

    public List<AssetCategory> findAllCategories() {
        String sql = """
            SELECT c.id, c.parent_id, c.code, c.name, c.icon, c.description, c.is_active,
                   COUNT(a.id) AS asset_count
            FROM asset_categories c
            LEFT JOIN assets a ON a.category_id = c.id AND a.is_active = 1
            GROUP BY c.id, c.parent_id, c.code, c.name, c.icon, c.description, c.is_active
            ORDER BY c.code ASC
            """;
        return jdbcClient.sql(sql).query(this::mapCategory).list();
    }

    // ==========================================
    // MAPPER HELPER METHODS
    // ==========================================

    private Department mapDepartment(ResultSet rs, int rowNum) throws SQLException {
        return new Department(
                rs.getLong("id"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("manager_name"),
                rs.getString("phone"),
                rs.getString("email"),
                rs.getInt("display_order"),
                rs.getInt("is_active"),
                rs.getLong("asset_count")
        );
    }

    private SubUnit mapSubUnit(ResultSet rs, int rowNum) throws SQLException {
        return new SubUnit(
                rs.getLong("id"),
                rs.getLong("department_id"),
                rs.getString("dept_name"),
                rs.getObject("parent_unit_id") == null ? null : rs.getLong("parent_unit_id"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("unit_type"),
                rs.getString("manager_name"),
                rs.getString("phone"),
                rs.getString("description"),
                rs.getInt("is_active"),
                rs.getLong("asset_count")
        );
    }

    private Building mapBuilding(ResultSet rs, int rowNum) throws SQLException {
        return new Building(
                rs.getLong("id"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("building_type"),
                rs.getString("address"),
                rs.getString("phone"),
                rs.getInt("total_floors"),
                rs.getString("description"),
                rs.getInt("is_active"),
                rs.getLong("asset_count"),
                rs.getLong("room_count")
        );
    }

    private Floor mapFloor(ResultSet rs, int rowNum) throws SQLException {
        return new Floor(
                rs.getLong("id"),
                rs.getLong("building_id"),
                rs.getString("bld_name"),
                rs.getString("floor_code"),
                rs.getString("floor_name"),
                rs.getInt("floor_order"),
                rs.getString("description"),
                rs.getInt("is_active"),
                rs.getLong("room_count"),
                rs.getLong("asset_count")
        );
    }

    private Room mapRoom(ResultSet rs, int rowNum) throws SQLException {
        return new Room(
                rs.getLong("id"),
                rs.getLong("building_id"),
                rs.getString("bld_name"),
                rs.getLong("floor_id"),
                rs.getString("floor_name"),
                rs.getString("room_number"),
                rs.getString("name"),
                rs.getString("room_type"),
                rs.getObject("department_id") == null ? null : rs.getLong("department_id"),
                rs.getString("dept_name"),
                rs.getObject("sub_unit_id") == null ? null : rs.getLong("sub_unit_id"),
                rs.getString("sub_name"),
                rs.getString("responsible_person"),
                rs.getInt("capacity"),
                rs.getString("qr_code"),
                rs.getString("description"),
                rs.getInt("is_active"),
                rs.getLong("asset_count")
        );
    }

    private AssetCategory mapCategory(ResultSet rs, int rowNum) throws SQLException {
        return new AssetCategory(
                rs.getLong("id"),
                rs.getObject("parent_id") == null ? null : rs.getLong("parent_id"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("icon"),
                rs.getString("description"),
                rs.getInt("is_active"),
                rs.getLong("asset_count")
        );
    }
}

