package tr.gov.gebze.varlik.enterprise;

public record AuditScanResult(
        String status,
        String matchStatus,
        Long scanId,
        String assetCode,
        String assetName,
        String expectedLocation,
        String scannedLocation,
        String message
) {}

