package tr.gov.gebze.varlik.enterprise;

public record InventoryAudit(
        Long id,
        String auditCode,
        String title,
        Long buildingId,
        Long departmentId,
        String scopeDescription,
        Integer totalExpected,
        Integer totalScanned,
        Integer totalMissing,
        Integer totalExcess,
        String status,
        String startedAt,
        String completedAt,
        String leadAuditor,
        String notes
) {}

