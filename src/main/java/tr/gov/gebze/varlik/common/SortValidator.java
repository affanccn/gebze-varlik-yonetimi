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

    public static final Map<String, String> ASSIGNMENT_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "aa.id"),
            Map.entry("documentNo", "aa.document_no"),
            Map.entry("assetId", "aa.asset_id"),
            Map.entry("assetCode", "a.code"),
            Map.entry("assetName", "a.name"),
            Map.entry("assigneeName", "aa.assignee_name"),
            Map.entry("unitName", "aa.unit_name"),
            Map.entry("status", "aa.status"),
            Map.entry("assignedAt", "aa.assigned_at"),
            Map.entry("returnedAt", "aa.returned_at")
    );

    public static final Map<String, String> MAINTENANCE_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "m.id"),
            Map.entry("orderNo", "m.order_no"),
            Map.entry("assetId", "m.asset_id"),
            Map.entry("assetCode", "a.code"),
            Map.entry("assetName", "a.name"),
            Map.entry("maintenanceType", "m.maintenance_type"),
            Map.entry("priority", "m.priority"),
            Map.entry("vendorOrTechnician", "m.vendor_or_technician"),
            Map.entry("status", "m.status"),
            Map.entry("cost", "m.cost"),
            Map.entry("startedAt", "m.started_at"),
            Map.entry("completedAt", "m.completed_at")
    );

    public static final Map<String, String> STOCK_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "id"),
            Map.entry("itemCode", "item_code"),
            Map.entry("itemName", "item_name"),
            Map.entry("category", "category"),
            Map.entry("warehouseName", "warehouse_name"),
            Map.entry("currentQuantity", "current_quantity"),
            Map.entry("unitPrice", "unit_price"),
            Map.entry("status", "status"),
            Map.entry("lastRestockedAt", "last_restocked_at")
    );

    public static final Map<String, String> FLEET_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "id"),
            Map.entry("plateNumber", "plate_number"),
            Map.entry("vehicleCode", "vehicle_code"),
            Map.entry("vehicleType", "vehicle_type"),
            Map.entry("brandModel", "brand_model"),
            Map.entry("modelYear", "model_year"),
            Map.entry("currentKm", "current_km"),
            Map.entry("status", "status"),
            Map.entry("updatedAt", "updated_at")
    );

    public static final Map<String, String> PROCUREMENT_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "id"),
            Map.entry("orderNo", "order_no"),
            Map.entry("title", "title"),
            Map.entry("supplierName", "supplier_name"),
            Map.entry("estimatedBudget", "estimated_budget"),
            Map.entry("finalAmount", "final_amount"),
            Map.entry("status", "status"),
            Map.entry("orderDate", "order_date"),
            Map.entry("deliveryDate", "delivery_date")
    );

    public static final Map<String, String> DOCUMENT_SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "d.id"),
            Map.entry("docCode", "d.doc_code"),
            Map.entry("assetName", "d.asset_name"),
            Map.entry("documentType", "d.document_type"),
            Map.entry("title", "d.title"),
            Map.entry("documentNo", "d.document_no"),
            Map.entry("fileSizeKb", "d.file_size_kb"),
            Map.entry("validUntil", "d.valid_until"),
            Map.entry("createdAt", "d.created_at")
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

    public static Long validateCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        try {
            long val = Long.parseLong(cursor.trim());
            if (val <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz imleç (cursor) değeri: " + cursor);
            }
            return val;
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz imleç (cursor) formatı: " + cursor);
        }
    }

    public static void validateCursorPagination(int size) {
        if (size <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sayfa boyutu 0'dan büyük olmalıdır.");
        }
        if (size > 200) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sayfa boyutu en fazla 200 olabilir.");
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
