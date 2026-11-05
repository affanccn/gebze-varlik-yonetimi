package tr.gov.gebze.varlik.assignment;

public record AssetAssignment(
        Long id,
        String documentNo,
        Long assetId,
        String assetCode,
        String assetName,
        Long personnelId,
        String assigneeName,
        String assigneeTitle,
        String unit,
        String location,
        String status,
        String assignedBy,
        String assignedAt,
        String returnedAt,
        String returnNote,
        String note
) {
    public AssetAssignment(
            Long id,
            String documentNo,
            Long assetId,
            String assetCode,
            String assetName,
            String assigneeName,
            String assigneeTitle,
            String unit,
            String location,
            String status,
            String assignedBy,
            String assignedAt,
            String returnedAt,
            String returnNote,
            String note
    ) {
        this(id, documentNo, assetId, assetCode, assetName, null, assigneeName, assigneeTitle, unit, location, status, assignedBy, assignedAt, returnedAt, returnNote, note);
    }
}

