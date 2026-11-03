package tr.gov.gebze.varlik.enterprise;

public record AuditScan(
        Long id,
        Long auditId,
        Long assetId,
        String assetCode,
        String assetName,
        String expectedLocation,
        String scannedLocation,
        String matchStatus,
        String scannedAt,
        String scannedBy,
        String notes
) {}

