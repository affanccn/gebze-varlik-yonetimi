package tr.gov.gebze.varlik.movement;

public record MaintenanceWorkOrder(
        Long id,
        String orderNo,
        Long assetId,
        String assetCode,
        String assetName,
        String barcode,
        String serialNumber,
        String categoryName,
        String departmentName,
        String location,
        String roomNumber,
        String maintenanceType,
        String priority,
        String technicianName,
        String issueDescription,
        String resolutionNote,
        Double estimatedCost,
        Double finalCost,
        String status,
        String startedAt,
        String completedAt,
        String createdBy,
        String municipalHeader,
        String workUnit,
        String printedAt
) {}

