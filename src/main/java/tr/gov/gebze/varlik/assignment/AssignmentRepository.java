package tr.gov.gebze.varlik.assignment;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tr.gov.gebze.varlik.common.PageResponse;
import tr.gov.gebze.varlik.common.SortValidator;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Repository
public class AssignmentRepository {

    private final JdbcClient jdbcClient;
    private final TenantQueryScope tenantQueryScope;

    public AssignmentRepository(JdbcClient jdbcClient, TenantQueryScope tenantQueryScope) {
        this.jdbcClient = jdbcClient;
        this.tenantQueryScope = tenantQueryScope;
    }

    public PageResponse<AssetAssignment> findPage(Long assetId, Long personnelId, String status, String q, String sort, int page, int size) {
        SortValidator.validatePagination(page, size);

        StringBuilder where = new StringBuilder(" WHERE a.is_deleted = 0");
        where.append(" AND ").append(tenantQueryScope.getAssetFilterClause("a"));

        List<Object> params = new ArrayList<>();

        if (assetId != null) {
            where.append(" AND aa.asset_id = ?");
            params.add(assetId);
        }

        if (personnelId != null) {
            where.append(" AND (aa.personnel_id = ? OR (aa.personnel_id IS NULL AND LOWER(TRIM(aa.assignee_name)) = (SELECT LOWER(TRIM(p.full_name)) FROM personnel p WHERE p.id = ?)))");
            params.add(personnelId);
            params.add(personnelId);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            where.append(" AND aa.status = ?");
            params.add(status.trim());
        }

        if (q != null && !q.isBlank()) {
            where.append(" AND (LOWER(a.code) LIKE LOWER(?) OR LOWER(a.name) LIKE LOWER(?) OR LOWER(aa.assignee_name) LIKE LOWER(?) OR LOWER(aa.document_no) LIKE LOWER(?))");
            String term = "%" + q.trim() + "%";
            params.add(term);
            params.add(term);
            params.add(term);
            params.add(term);
        }

        String countSql = "SELECT COUNT(*) FROM (SELECT aa.id FROM asset_assignments aa JOIN assets a ON aa.asset_id = a.id " + where + " FETCH FIRST 10001 ROWS ONLY)";
        var countSpec = jdbcClient.sql(countSql);
        for (int i = 0; i < params.size(); i++) {
            countSpec = countSpec.param(i + 1, params.get(i));
        }
        long total = countSpec.query(Long.class).single();

        String orderBy = SortValidator.buildOrderBy(sort, SortValidator.ASSIGNMENT_SORT_FIELDS, "aa.id DESC", "aa.id DESC");

        String dataSql = """
            SELECT aa.id, aa.document_no, aa.asset_id, a.code AS asset_code, a.name AS asset_name,
                   aa.personnel_id,
                   aa.assignee_name, aa.assignee_title, aa.unit_name, aa.location_info, aa.status,
                   aa.assigned_by,
                   TO_CHAR(aa.assigned_at, 'YYYY-MM-DD HH24:MI') AS assigned_at_str,
                   TO_CHAR(aa.returned_at, 'YYYY-MM-DD HH24:MI') AS returned_at_str,
                   aa.return_note, aa.note
            FROM asset_assignments aa
            JOIN assets a ON aa.asset_id = a.id
        """ + where + " ORDER BY " + orderBy + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

        var dataSpec = jdbcClient.sql(dataSql);
        int idx = 1;
        for (Object p : params) {
            dataSpec = dataSpec.param(idx++, p);
        }
        dataSpec = dataSpec.param(idx++, (long) page * size);
        dataSpec = dataSpec.param(idx, size);

        List<AssetAssignment> items = dataSpec.query(this::mapAssignment).list();
        return PageResponse.of(items, total, page, size);
    }

    public PageResponse<AssetAssignment> findPage(Long assetId, String status, String q, String sort, int page, int size) {
        return findPage(assetId, null, status, q, sort, page, size);
    }

    public List<AssetAssignment> findAll(Long assetId, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT aa.id, aa.document_no, aa.asset_id, a.code AS asset_code, a.name AS asset_name,
                   aa.personnel_id,
                   aa.assignee_name, aa.assignee_title, aa.unit_name, aa.location_info, aa.status,
                   aa.assigned_by,
                   TO_CHAR(aa.assigned_at, 'YYYY-MM-DD HH24:MI') AS assigned_at_str,
                   TO_CHAR(aa.returned_at, 'YYYY-MM-DD HH24:MI') AS returned_at_str,
                   aa.return_note, aa.note
            FROM asset_assignments aa
            JOIN assets a ON aa.asset_id = a.id
            WHERE a.is_deleted = 0
        """);

        sql.append(" AND ").append(tenantQueryScope.getAssetFilterClause("a"));

        List<Object> params = new ArrayList<>();

        if (assetId != null) {
            sql.append(" AND aa.asset_id = ?");
            params.add(assetId);
        }

        if (status != null && !status.isBlank() && !"Tümü".equalsIgnoreCase(status)) {
            sql.append(" AND aa.status = ?");
            params.add(status.trim());
        }

        sql.append(" ORDER BY aa.id DESC");

        var spec = jdbcClient.sql(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            spec = spec.param(params.get(i));
        }

        return spec.query(this::mapAssignment).list();
    }

    public Optional<AssetAssignment> findById(Long id) {
        String sql = """
            SELECT aa.id, aa.document_no, aa.asset_id, a.code AS asset_code, a.name AS asset_name,
                   aa.personnel_id,
                   aa.assignee_name, aa.assignee_title, aa.unit_name, aa.location_info, aa.status,
                   aa.assigned_by,
                   TO_CHAR(aa.assigned_at, 'YYYY-MM-DD HH24:MI') AS assigned_at_str,
                   TO_CHAR(aa.returned_at, 'YYYY-MM-DD HH24:MI') AS returned_at_str,
                   aa.return_note, aa.note
            FROM asset_assignments aa
            JOIN assets a ON aa.asset_id = a.id
            WHERE aa.id = :id
        """;
        return jdbcClient.sql(sql).param("id", id).query(this::mapAssignment).optional();
    }

    public void save(AssetAssignment a) {
        String sql = """
            INSERT INTO asset_assignments (
                document_no, asset_id, personnel_id, assignee_name, assignee_title, unit_name, location_info,
                status, assigned_by, assigned_at, note
            ) VALUES (
                :docNo, :assetId, :personnelId, :name, :title, :unit, :loc, :status, :assignedBy, CURRENT_TIMESTAMP, :note
            )
        """;
        jdbcClient.sql(sql)
                .param("docNo", a.documentNo())
                .param("assetId", a.assetId())
                .param("personnelId", a.personnelId())
                .param("name", a.assigneeName())
                .param("title", a.assigneeTitle())
                .param("unit", a.unit())
                .param("loc", a.location())
                .param("status", a.status() == null ? "AKTIF" : a.status())
                .param("assignedBy", a.assignedBy())
                .param("note", a.note())
                .update();
    }

    public void returnAssignment(Long id, String returnNote) {
        String sql = """
            UPDATE asset_assignments SET
                status = 'IADE_EDILDI',
                returned_at = CURRENT_TIMESTAMP,
                return_note = :note
            WHERE id = :id
        """;
        jdbcClient.sql(sql).param("note", returnNote).param("id", id).update();
    }

    private AssetAssignment mapAssignment(ResultSet rs, int rowNum) throws SQLException {
        return new AssetAssignment(
                rs.getLong("id"),
                rs.getString("document_no"),
                rs.getLong("asset_id"),
                rs.getString("asset_code"),
                rs.getString("asset_name"),
                rs.getObject("personnel_id") == null ? null : rs.getLong("personnel_id"),
                rs.getString("assignee_name"),
                rs.getString("assignee_title"),
                rs.getString("unit_name"),
                rs.getString("location_info"),
                rs.getString("status"),
                rs.getString("assigned_by"),
                rs.getString("assigned_at_str"),
                rs.getString("returned_at_str"),
                rs.getString("return_note"),
                rs.getString("note")
        );
    }
}

