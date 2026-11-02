package tr.gov.gebze.varlik.movement;

public record MaintenanceCompleteRequest(
        String targetStatus,
        String targetCondition,
        String returnLocation,
        Double finalCost,
        String resolutionNote
) {
}

