package tr.gov.gebze.varlik.movement;

public record MaintenanceRequest(
        Long assetId,
        String maintenanceType,
        String priority,
        String vendorOrTechnician,
        String issueDescription,
        Double estimatedCost
) {
}

