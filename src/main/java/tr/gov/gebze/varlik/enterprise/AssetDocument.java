package tr.gov.gebze.varlik.enterprise;

public record AssetDocument(
        Long id,
        String docCode,
        Long assetId,
        String assetName,
        String documentType,
        String title,
        String documentNo,
        String fileName,
        Integer fileSizeKb,
        String issuedBy,
        String validUntil,
        String notes,
        String createdAt
) {}

