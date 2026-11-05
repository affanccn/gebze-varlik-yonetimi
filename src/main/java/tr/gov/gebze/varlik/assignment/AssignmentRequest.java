package tr.gov.gebze.varlik.assignment;

public record AssignmentRequest(
        Long assetId,
        Long personnelId,
        String assigneeName,
        String assigneeTitle,
        String unit,
        String location,
        String note
) {
    public AssignmentRequest(Long assetId, String assigneeName, String assigneeTitle, String unit, String location, String note) {
        this(assetId, null, assigneeName, assigneeTitle, unit, location, note);
    }
}

