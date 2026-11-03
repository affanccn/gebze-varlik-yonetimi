package tr.gov.gebze.varlik.enterprise;

public record StockTransaction(
        Long id,
        String transactionCode,
        Long stockItemId,
        String itemName,
        String txType,
        Double quantity,
        String unit,
        Long departmentId,
        String departmentName,
        String recipientName,
        String performedBy,
        String notes,
        String txDate
) {}

