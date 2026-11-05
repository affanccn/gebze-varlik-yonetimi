package tr.gov.gebze.varlik.common;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        long total,
        int page,
        int size,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
) {
    public static <T> PageResponse<T> of(List<T> items, long total, int page, int size) {
        int safeSize = size > 0 ? size : 20;
        int totalPages = safeSize > 0 ? (int) Math.ceil((double) total / safeSize) : 0;
        boolean hasNext = (page + 1) * safeSize < total;
        boolean hasPrevious = page > 0;
        return new PageResponse<>(items, total, page, safeSize, totalPages, hasNext, hasPrevious);
    }
}
