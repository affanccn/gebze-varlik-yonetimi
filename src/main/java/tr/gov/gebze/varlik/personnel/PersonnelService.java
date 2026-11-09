package tr.gov.gebze.varlik.personnel;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.common.PageResponse;

@Service
public class PersonnelService {

    private final PersonnelRepository repository;
    private final JdbcClient jdbcClient;

    public PersonnelService(PersonnelRepository repository, JdbcClient jdbcClient) {
        this.repository = repository;
        this.jdbcClient = jdbcClient;
    }

    public PageResponse<Personnel> findPage(Long departmentId, Long roomId, String query, Boolean isActive, String sortBy, int page, int size) {
        return repository.findPage(departmentId, roomId, query, isActive, sortBy, page, size);
    }

    public List<Personnel> findAll(Long departmentId, Long roomId, String query) {
        return repository.findAll(departmentId, roomId, query);
    }

    public Personnel findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Personel kaydı bulunamadı: ID=" + id));
    }

    @Transactional
    public Personnel create(PersonnelRequest req) {
        if (req.firstName() == null || req.firstName().isBlank() ||
            req.lastName() == null || req.lastName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Personel adı ve soyadı zorunludur.");
        }
        String reg = req.registrationNumber();
        if (reg == null || reg.isBlank()) {
            reg = "SCL-" + (1000 + (int)(Math.random() * 9000));
        }
        reg = reg.trim();
        String fullName = req.firstName().trim() + " " + req.lastName().trim();
        String title = req.title() == null || req.title().isBlank() ? "Personel" : req.title().trim();

        var existingOpt = jdbcClient.sql("SELECT id, is_active, is_deleted FROM personnel WHERE registration_number = :reg ORDER BY id DESC FETCH FIRST 1 ROWS ONLY")
                .param("reg", reg)
                .query((rs, r) -> new long[]{rs.getLong("id"), rs.getInt("is_active"), rs.getInt("is_deleted")})
                .optional();

        if (existingOpt.isPresent()) {
            long[] existing = existingOpt.get();
            long existingId = existing[0];
            jdbcClient.sql("""
                UPDATE personnel SET
                    first_name = :fname,
                    last_name = :lname,
                    full_name = :fullname,
                    title = :title,
                    department_id = :deptId,
                    sub_unit_id = :subId,
                    room_id = :roomId,
                    phone = :phone,
                    email = :email,
                    is_active = 1,
                    is_deleted = 0,
                    deleted_at = NULL,
                    deleted_by = NULL
                WHERE id = :id
            """)
            .param("fname", req.firstName().trim())
            .param("lname", req.lastName().trim())
            .param("fullname", fullName)
            .param("title", title)
            .param("deptId", req.departmentId())
            .param("subId", req.subUnitId())
            .param("roomId", req.roomId())
            .param("phone", req.phone())
            .param("email", req.email())
            .param("id", existingId)
            .update();
            return findById(existingId);
        }

        Personnel p = new Personnel(
                null,
                reg,
                req.firstName().trim(),
                req.lastName().trim(),
                fullName,
                title,
                req.departmentId(),
                null,
                req.subUnitId(),
                null,
                req.roomId(),
                null,
                null,
                req.phone(),
                req.email(),
                1
        );
        Long id = repository.save(p);
        return findById(id);
    }

    @Transactional
    public Personnel update(Long id, PersonnelRequest req) {
        findById(id);
        String fullName = req.firstName().trim() + " " + req.lastName().trim();
        Personnel p = new Personnel(
                id,
                req.registrationNumber(),
                req.firstName().trim(),
                req.lastName().trim(),
                fullName,
                req.title() == null || req.title().isBlank() ? "Personel" : req.title().trim(),
                req.departmentId(),
                null,
                req.subUnitId(),
                null,
                req.roomId(),
                null,
                null,
                req.phone(),
                req.email(),
                1
        );
        repository.update(id, p);
        return findById(id);
    }

    @Transactional
    public void delete(Long id) {
        Personnel existing = findById(id);

        // Aktif zimmet kontrolü (409 Conflict)
        Integer activeCount = jdbcClient.sql("""
            SELECT COUNT(*) FROM asset_assignments aa
            WHERE aa.status = 'AKTIF'
              AND (aa.personnel_id = :id OR (aa.personnel_id IS NULL AND aa.assignee_name = :fullName))
        """)
        .param("id", id)
        .param("fullName", existing.fullName())
        .query(Integer.class)
        .single();

        if (activeCount != null && activeCount > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                "Üzerinde " + activeCount + " adet aktif zimmet bulunan personel pasife alınamaz. Önce zimmetli demirbaşları iade alınız.");
        }

        repository.delete(id);

        // Bağlı kullanıcı hesabı varsa onu da pasife al
        jdbcClient.sql("UPDATE system_users SET is_active = 0 WHERE personnel_id = :id")
                .param("id", id)
                .update();
    }
}

