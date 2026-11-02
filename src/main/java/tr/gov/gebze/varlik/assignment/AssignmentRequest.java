package tr.gov.gebze.varlik.assignment;

public record AssignmentRequest(
        Long assetId,
        String assigneeName,
        String assigneeTitle,
        String unit,
        String location,
        String note
) {
}

