package tr.gov.gebze.varlik.movement;

public record MaintenanceRecord(
        Long id,
        String orderNo,
        Long assetId,
        String assetCode,
        String assetName,
        String maintenanceType,
        String priority,
        String vendorOrTechnician,
        String issueDescription,
        String resolutionNote,
        Double cost,
        String status,
        String startedAt,
        String completedAt,
        String createdBy
) {
}

