package tr.gov.gebze.varlik.enterprise;

public record DisposalReportItem(
        String assetCode,
        String assetName,
        String category,
        String departmentName,
        String lifecycleStatus,
        Double originalValue,
        String acquisitionDate,
        String disposalDate,
        String disposalReason
) {}

