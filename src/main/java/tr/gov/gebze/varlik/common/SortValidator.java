package tr.gov.gebze.varlik.common;

import org.springframework.http.HttpStatus;

import java.util.Map;

public final class SortValidator {

    public static final Map<String, String> ASSET_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "a.id"),
            Map.entry("code", "a.code"),
            Map.entry("name", "a.name"),
            Map.entry("estimatedValue", "a.estimated_value"),
            Map.entry("acquisitionDate", "a.acquisition_date"),
            Map.entry("warrantyEndDate", "a.warranty_end_date"),
            Map.entry("status", "a.status"),
            Map.entry("lifecycleStatus", "a.lifecycle_status"),
            Map.entry("condition", "a.condition_status"),
            Map.entry("conditionStatus", "a.condition_status"),
            Map.entry("category", "c.name"),
            Map.entry("department", "d.name"),
            Map.entry("barcode", "a.barcode"),
            Map.entry("brandModel", "a.brand_model"),
            Map.entry("createdAt", "a.created_at"),
            Map.entry("updatedAt", "a.updated_at")
    );

    public static final Map<String, String> PERSONNEL_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "p.id"),
            Map.entry("registrationNumber", "p.registration_number"),
            Map.entry("firstName", "p.first_name"),
            Map.entry("lastName", "p.last_name"),
            Map.entry("fullName", "p.full_name"),
            Map.entry("title", "p.title"),
            Map.entry("departmentId", "p.department_id"),
            Map.entry("department", "d.name"),
            Map.entry("deptName", "d.name"),
            Map.entry("phone", "p.phone"),
            Map.entry("email", "p.email")
    );

    private SortValidator() {
    }

    public static void validatePagination(int page, int size) {
        if (page < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sayfa numarası negatif olamaz.");
        }
        if (size <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sayfa boyutu 0'dan büyük olmalıdır.");
        }
        if (size > 200) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sayfa boyutu en fazla 200 olabilir.");
        }
        if ((long) page * size > 100000L) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sayfalama derinlik sınırı aşıldı (maksimum 100.000).");
        }
    }

    public static String buildOrderBy(String sortParam, Map<String, String> allowedFields, String defaultSort, String tieBreaker) {
        if (sortParam == null || sortParam.isBlank()) {
            return defaultSort + (defaultSort.contains(tieBreaker) ? "" : ", " + tieBreaker);
        }

        String cleaned = sortParam.trim();
        String[] parts = cleaned.split("[,\\s]+");
        String field = parts[0].trim();
        String direction = "ASC";
        if (parts.length > 1) {
            String dir = parts[1].trim().toUpperCase();
            if ("DESC".equals(dir) || "ASC".equals(dir)) {
                direction = dir;
            } else {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz sıralama yönü: " + parts[1]);
            }
        }

        if (!allowedFields.containsKey(field)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz sıralama alanı: " + field);
        }

        String sqlColumn = allowedFields.get(field);
        String mainSort = sqlColumn + " " + direction;
        if (mainSort.contains(tieBreaker)) {
            return mainSort;
        }
        return mainSort + ", " + tieBreaker;
    }
}
