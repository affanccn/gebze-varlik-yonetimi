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
        String fullName = req.firstName().trim() + " " + req.lastName().trim();
        Personnel p = new Personnel(
                null,
                reg.trim(),
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

