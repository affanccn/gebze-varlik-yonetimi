package tr.gov.gebze.varlik.common;

import java.util.List;

public record CursorResponse<T>(
        List<T> items,
        String nextCursor,
        boolean hasMore,
        int size
) {
    public static <T> CursorResponse<T> of(List<T> items, String nextCursor, boolean hasMore, int size) {
        return new CursorResponse<>(items, nextCursor, hasMore, size);
    }
}
