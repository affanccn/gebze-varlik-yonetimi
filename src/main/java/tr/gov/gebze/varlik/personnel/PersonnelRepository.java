package tr.gov.gebze.varlik.personnel;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.common.SortValidator;

@Repository
public class PersonnelRepository {

    private final JdbcClient jdbcClient;

    public PersonnelRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public PageResponse<Personnel> findPage(
            Long departmentId,
            Long roomId,
            String query,
            Boolean isActive,
            String sortBy,
            int page,
            int size
    ) {
        SortValidator.validatePagination(page, size);

        StringBuilder whereClause = new StringBuilder(" WHERE p.is_deleted = 0");
        List<Object> params = new ArrayList<>();

        if (isActive != null) {
            whereClause.append(" AND p.is_active = ?");
            params.add(isActive ? 1 : 0);
        } else {
            whereClause.append(" AND p.is_active = 1");
        }

        if (departmentId != null) {
            whereClause.append(" AND p.department_id = ?");
            params.add(departmentId);
        }

        if (roomId != null) {
            whereClause.append(" AND p.room_id = ?");
            params.add(roomId);
        }

        if (query != null && !query.isBlank()) {
            String q = "%" + query.trim() + "%";
            whereClause.append(" AND (p.full_name LIKE ? OR p.registration_number LIKE ? OR p.title LIKE ?)");
            params.add(q);
            params.add(q);
            params.add(q);
        }

        String fromClause = """
            FROM personnel p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sub_units s ON p.sub_unit_id = s.id
            LEFT JOIN rooms r ON p.room_id = r.id
        """;

        // Total count query (capped at 10001)
        String countSql = "SELECT COUNT(*) FROM (SELECT 1 " + fromClause + whereClause.toString() + " FETCH FIRST 10001 ROWS ONLY)";
        var countSpec = jdbcClient.sql(countSql);
        for (int i = 0; i < params.size(); i++) {
            countSpec = countSpec.param(i + 1, params.get(i));
        }
        Long totalCount = countSpec.query(Long.class).single();
        long total = totalCount != null ? totalCount : 0L;

        // Data query
        String orderBy = SortValidator.buildOrderBy(sortBy, SortValidator.PERSONNEL_SORT_FIELDS, "p.department_id ASC, p.full_name ASC", "p.id DESC");
        String dataSql = """
            SELECT p.id, p.registration_number, p.first_name, p.last_name, p.full_name, p.title,
                   p.department_id, d.name AS dept_name,
                   p.sub_unit_id, s.name AS sub_name,
                   p.room_id, r.room_number, r.name AS room_name,
                   p.phone, p.email, p.is_active
        """ + fromClause + whereClause.toString() + " ORDER BY " + orderBy + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add((long) page * size);
        dataParams.add(size);

        var dataSpec = jdbcClient.sql(dataSql);
        for (int i = 0; i < dataParams.size(); i++) {
            dataSpec = dataSpec.param(i + 1, dataParams.get(i));
        }
        List<Personnel> items = dataSpec.query(this::mapPersonnel).list();

        return PageResponse.of(items, total, page, size);
    }

    public List<Personnel> findAll(Long departmentId, Long roomId, String query) {
        StringBuilder sql = new StringBuilder("""
            SELECT p.id, p.registration_number, p.first_name, p.last_name, p.full_name, p.title,
                   p.department_id, d.name AS dept_name,
                   p.sub_unit_id, s.name AS sub_name,
                   p.room_id, r.room_number, r.name AS room_name,
                   p.phone, p.email, p.is_active
            FROM personnel p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sub_units s ON p.sub_unit_id = s.id
            LEFT JOIN rooms r ON p.room_id = r.id
            WHERE p.is_active = 1 AND p.is_deleted = 0
        """);

        List<Object> params = new ArrayList<>();
        if (departmentId != null) {
            sql.append(" AND p.department_id = ?");
            params.add(departmentId);
        }
        if (roomId != null) {
            sql.append(" AND p.room_id = ?");
            params.add(roomId);
        }
        if (query != null && !query.isBlank()) {
            sql.append(" AND (LOWER(p.full_name) LIKE LOWER(?) OR LOWER(p.registration_number) LIKE LOWER(?) OR LOWER(p.title) LIKE LOWER(?))");
            String q = "%" + query.trim() + "%";
            params.add(q);
            params.add(q);
            params.add(q);
        }
        sql.append(" ORDER BY p.department_id ASC, p.full_name ASC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(i + 1, params.get(i));
        }
        return spec.query(this::mapPersonnel).list();
    }

    public Optional<Personnel> findById(Long id) {
        String sql = """
            SELECT p.id, p.registration_number, p.first_name, p.last_name, p.full_name, p.title,
                   p.department_id, d.name AS dept_name,
                   p.sub_unit_id, s.name AS sub_name,
                   p.room_id, r.room_number, r.name AS room_name,
                   p.phone, p.email, p.is_active
            FROM personnel p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sub_units s ON p.sub_unit_id = s.id
            LEFT JOIN rooms r ON p.room_id = r.id
            WHERE p.id = :id
        """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapPersonnel).optional();
    }

    public Long save(Personnel p) {
        String sql = """
            INSERT INTO personnel (registration_number, first_name, last_name, full_name, title,
                                   department_id, sub_unit_id, room_id, phone, email, is_active)
            VALUES (:reg, :fname, :lname, :fullname, :title, :deptId, :subId, :roomId, :phone, :email, 1)
        """;
        jdbcClient.sql(sql)
                .param("reg", p.registrationNumber())
                .param("fname", p.firstName())
                .param("lname", p.lastName())
                .param("fullname", p.fullName())
                .param("title", p.title())
                .param("deptId", p.departmentId())
                .param("subId", p.subUnitId())
                .param("roomId", p.roomId())
                .param("phone", p.phone())
                .param("email", p.email())
                .update();
        return jdbcClient.sql("SELECT id FROM personnel WHERE registration_number = :reg ORDER BY id DESC FETCH FIRST 1 ROWS ONLY")
                .param("reg", p.registrationNumber())
                .query(Long.class).single();
    }

    public void update(Long id, Personnel p) {
        String sql = """
            UPDATE personnel SET
                registration_number = :reg,
                first_name = :fname,
                last_name = :lname,
                full_name = :fullname,
                title = :title,
                department_id = :deptId,
                sub_unit_id = :subId,
                room_id = :roomId,
                phone = :phone,
                email = :email
            WHERE id = :id
        """;
        jdbcClient.sql(sql)
                .param("reg", p.registrationNumber())
                .param("fname", p.firstName())
                .param("lname", p.lastName())
                .param("fullname", p.fullName())
                .param("title", p.title())
                .param("deptId", p.departmentId())
                .param("subId", p.subUnitId())
                .param("roomId", p.roomId())
                .param("phone", p.phone())
                .param("email", p.email())
                .param("id", id)
                .update();
    }

    public void delete(Long id) {
        jdbcClient.sql("UPDATE personnel SET is_active = 0 WHERE id = :id")
                .param("id", id)
                .update();
    }

    private Personnel mapPersonnel(ResultSet rs, int rowNum) throws SQLException {
        return new Personnel(
                rs.getLong("id"),
                rs.getString("registration_number"),
                rs.getString("first_name"),
                rs.getString("last_name"),
                rs.getString("full_name"),
                rs.getString("title"),
                rs.getObject("department_id") == null ? null : rs.getLong("department_id"),
                rs.getString("dept_name"),
                rs.getObject("sub_unit_id") == null ? null : rs.getLong("sub_unit_id"),
                rs.getString("sub_name"),
                rs.getObject("room_id") == null ? null : rs.getLong("room_id"),
                rs.getString("room_number"),
                rs.getString("room_name"),
                rs.getString("phone"),
                rs.getString("email"),
                rs.getInt("is_active")
        );
    }
}

