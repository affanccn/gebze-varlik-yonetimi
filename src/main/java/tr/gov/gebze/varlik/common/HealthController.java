package tr.gov.gebze.varlik.common;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private static final Logger logger = LoggerFactory.getLogger(HealthController.class);

    private final JdbcClient jdbcClient;

    public HealthController(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        try {
            String currentSchema = jdbcClient
                    .sql("SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') FROM dual")
                    .query(String.class)
                    .single();
            body.put("status", "ok");
            body.put("database", "UP");
            body.put("schema", currentSchema);
            body.put("timestamp", Instant.now().toString());
            return ResponseEntity.ok(body);
        } catch (Exception ex) {
            logger.error("[SAĞLIK KONTROLÜ HATASI] Oracle veritabanı bağlantısı kurulamadı: {}", ex.getMessage());
            body.put("status", "error");
            body.put("database", "DOWN");
            body.put("message", "Oracle veritabanı bağlantısı kurulamadı. Lütfen DB_URL, kullanıcı adı/şifre, güvenlik duvarı (port 1521) ve servis adını kontrol ediniz.");
            body.put("timestamp", Instant.now().toString());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
        }
    }
}
