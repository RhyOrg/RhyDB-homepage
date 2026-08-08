export const RESULTS_PAGE_SIZE = 200;

export type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

export type PageWindow = {
    pageIndex: number;
    pageCount: number;
    start: number;
    end: number;
};

export function getPageWindow(rowCount: number, pageIndex: number, pageSize = RESULTS_PAGE_SIZE): PageWindow {
    const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
    const safePageIndex = Math.min(Math.max(0, pageIndex), pageCount - 1);
    const start = safePageIndex * pageSize;

    return {
        pageIndex: safePageIndex,
        pageCount,
        start,
        end: Math.min(start + pageSize, rowCount),
    };
}

export function getPaginationItems(pageIndex: number, pageCount: number): PaginationItem[] {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

    const currentPage = Math.min(Math.max(0, pageIndex), pageCount - 1) + 1;
    if (currentPage <= 4) return [1, 2, 3, 4, 5, 'end-ellipsis', pageCount];
    if (currentPage >= pageCount - 3) {
        return [1, 'start-ellipsis', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
    }
    return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', pageCount];
}
