import { Table } from '@tanstack/react-table';
import { Pagination, ListBox } from '@heroui/react';
import { Select } from '@/components/bridge/Select';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  rowCount: number;
}

export function DataTablePagination<TData>({
  table,
  rowCount,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const [jumpToPage, setJumpToPage] = useState('');

  const handlePageChange = (page: number) => {
    table.setPageIndex(Math.max(0, Math.min(page - 1, (pageCount || 1) - 1)));
  };

  const handlePageSizeChange = (size: number) => {
    table.setPageSize(size);
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage, 10);
    if (pageNum > 0 && pageNum <= (pageCount || 1)) {
      handlePageChange(pageNum);
      setJumpToPage('');
    }
  };

  const currentMax = useMemo(() => {
    return Math.min((pageIndex + 1) * pageSize, rowCount);
  }, [pageIndex, pageSize, rowCount]);

  const currentMin = useMemo(() => {
    return rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  }, [pageIndex, pageSize, rowCount]);

  // Show max 5 page buttons, centered around current page
  const getVisiblePages = () => {
    const totalPages = pageCount || 1;
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const currentPage = pageIndex + 1;
    const pages: number[] = [];
    const range = 2;

    // Always show first page
    pages.push(1);

    // Show pages around current
    for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    // Always show last page
    if (!pages.includes(totalPages)) pages.push(totalPages);

    // Fill gaps with ellipsis by sorting
    return pages.sort((a, b) => a - b);
  };

  const visiblePages = getVisiblePages();
  const maxPages = pageCount || 1;

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      {/* Summary Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-default-500">
          Mostrando <span className="font-semibold text-default-700">{currentMin}</span>
          {' '}a{' '}
          <span className="font-semibold text-default-700">{currentMax}</span>
          {' '}de{' '}
          <span className="font-semibold text-default-700">{rowCount}</span>
          {' '}registros
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <p className="text-sm text-default-500">Filas por página:</p>
          <Select
            size="sm"
            selectedKeys={[pageSize.toString()]}
            onChange={(e: unknown) => {
              const evt = e as { target?: { value?: string }; values?: Iterable<string> };
              const val = evt.target?.value ?? (evt.values ? Array.from(evt.values)[0] : String(e));
              if (val) handlePageSizeChange(Number(val));
            }}
            className="w-20"
            aria-label="Filas por página"
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {[10, 20, 50, 100].map((size) => (
                  <ListBox.Item key={size.toString()} id={size.toString()} textValue={size.toString()}>
                    {size}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      {/* Pagination Controls Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Previous Button */}
        <button
          onClick={() => handlePageChange(pageIndex)}
          disabled={pageIndex === 0}
          className="p-2 hover:bg-default-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={18} className="text-default-600" />
        </button>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, idx) => {
            const prevPage = visiblePages[idx - 1];
            const showEllipsis = prevPage && page - prevPage > 1;

            return (
              <div key={page} className="flex items-center gap-1">
                {showEllipsis && <span className="text-default-300 px-1">...</span>}
                <button
                  onClick={() => handlePageChange(page)}
                  className={`min-w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                    page === pageIndex + 1
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-default-100 text-default-600'
                  }`}
                  aria-current={page === pageIndex + 1 ? 'page' : undefined}
                >
                  {page}
                </button>
              </div>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => handlePageChange(pageIndex + 2)}
          disabled={pageIndex + 1 >= maxPages}
          className="p-2 hover:bg-default-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={18} className="text-default-600" />
        </button>

        {/* Jump to Page */}
        {maxPages > 5 && (
          <div className="flex items-center gap-1">
            <label htmlFor="jump-to-page" className="text-xs text-default-500">
              Ir a:
            </label>
            <input
              id="jump-to-page"
              type="number"
              min="1"
              max={maxPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJumpToPage();
              }}
              onBlur={handleJumpToPage}
              placeholder="..."
              className="w-12 h-8 px-2 text-xs text-center border border-default-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Jump to page"
            />
          </div>
        )}

        {/* Page Info */}
        <div className="text-xs text-default-500">
          Página <span className="font-semibold">{pageIndex + 1}</span> de{' '}
          <span className="font-semibold">{maxPages}</span>
        </div>
      </div>
    </div>
  );
}
