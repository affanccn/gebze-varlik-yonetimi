package tr.gov.gebze.varlik.common;

import java.time.Instant;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of(
                "error", ex.getMessage(),
                "status", ex.getStatus().value(),
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", ex.getMessage() != null ? ex.getMessage() : "Bu işlem için yetkiniz bulunmamaktadır.",
                "status", HttpStatus.FORBIDDEN.value(),
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage().toUpperCase() : "";
        String userFriendlyError = resolveConstraintErrorMessage(msg);

        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", userFriendlyError,
                "status", HttpStatus.CONFLICT.value(),
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", ex.getMessage(),
                "status", HttpStatus.BAD_REQUEST.value(),
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Yüklenen dosya boyutu 5 MB sınırını aşamaz. Lütfen daha küçük bir dosya yükleyiniz.",
                "status", HttpStatus.BAD_REQUEST.value(),
                "timestamp", Instant.now().toString()
        ));
    }

    private String resolveConstraintErrorMessage(String msg) {
        if (msg.contains("UK_ASSETS_ACTIVE_CODE") || msg.contains("UK_ASSETS_CODE")) {
            return "Bu varlık kodu sistemde zaten aktif bir demirbaşta kullanılmaktadır.";
        }
        if (msg.contains("UK_ASSETS_ACTIVE_BARCODE")) {
            return "Bu barkod numarası sistemde kayıtlı başka bir varlığa aittir.";
        }
        if (msg.contains("UK_PERSONNEL_ACTIVE_REG") || msg.contains("UK_PERSONNEL_REG")) {
            return "Bu personel sicil numarası aktif bir personele aittir.";
        }
        if (msg.contains("UK_FLEET_ACTIVE_PLATE") || msg.contains("UK_FLEET_PLATE")) {
            return "Bu araç plakası filoda zaten kayıtlıdır.";
        }
        if (msg.contains("UK_FLEET_ACTIVE_CODE") || msg.contains("UK_FLEET_CODE")) {
            return "Bu araç envanter kodu sistemde zaten mevcuttur.";
        }
        if (msg.contains("UK_STOCK_ITEMS_ACTIVE_CODE") || msg.contains("UK_STOCK_ITEMS_CODE")) {
            return "Bu stok malzeme kodu zaten kullanılmaktadır.";
        }
        if (msg.contains("UK_USERS_USERNAME")) {
            return "Bu kullanıcı adı sistemde zaten kullanılmaktadır.";
        }
        if (msg.contains("UK_DEPARTMENTS_CODE")) {
            return "Bu müdürlük kodu sistemde zaten mevcuttur.";
        }
        if (msg.contains("UK_DEPARTMENTS_NAME")) {
            return "Bu müdürlük adı sistemde zaten mevcuttur.";
        }
        if (msg.contains("UK_ROOMS_QR")) {
            return "Bu odaya ait QR kod başka bir fiziksel mekanda tanımlıdır.";
        }
        return "Kayıt sırasında tekil alan kuralı ihlal edildi. Lütfen bilgilerinizi kontrol ediniz.";
    }
}
