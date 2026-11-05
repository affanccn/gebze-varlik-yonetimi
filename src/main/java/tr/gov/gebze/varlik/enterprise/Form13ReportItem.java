package tr.gov.gebze.varlik.enterprise;

public record Form13ReportItem(
        String accountCode,
        String assetCode,
        String assetName,
        String category,
        String departmentName,
        String location,
        int quantity,
        String unit,
        Double unitPrice,
        Double totalPrice,
        String status,
        String conditionStatus
) {}

