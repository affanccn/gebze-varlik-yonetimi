package tr.gov.gebze.varlik.enterprise;

public record DepreciationReportItem(
        Long assetId,
        String assetCode,
        String assetName,
        String category,
        String departmentName,
        String acquisitionDate,
        Double originalValue,
        Integer usefulLifeYears,
        Double annualDepreciationRate,
        Double accumulatedDepreciation,
        Double currentBookValue,
        String status
) {}

