package tr.gov.gebze.varlik.enterprise;

public record ProcurementOrder(
        Long id,
        String orderNo,
        String title,
        Long departmentId,
        String departmentName,
        String procurementType,
        String supplierName,
        Double estimatedBudget,
        Double finalAmount,
        String status,
        String requestedBy,
        String orderDate,
        String deliveryDate,
        String description
) {}

