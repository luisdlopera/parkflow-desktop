import { Table } from '@tanstack/react-table';
import { Pagination, ListBox } from '@heroui/react';
import { Select } from '@/components/bridge/Select';
import { useMemo } from 'react';

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

  const handlePageChange = (page: number) => {
    table.setPageIndex(page - 1); // HeroUI Pagination is 1-indexed, TanStack is 0-indexed
  };

  const handlePageSizeChange = (size: number) => {
    table.setPageSize(size);
  };

  const currentMax = useMemo(() => {
    return Math.min((pageIndex + 1) * pageSize, rowCount);
  }, [pageIndex, pageSize, rowCount]);

  const currentMin = useMemo(() => {
    return rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  }, [pageIndex, pageSize, rowCount]);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex-1 text-sm text-default-500">
        Mostrando {currentMin} a {currentMax} de {rowCount} resultados
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-default-500">Filas por página</p>
          <Select
            size="sm"
            selectedKeys={[pageSize.toString()]}
            onChange={(e: unknown) => {
              const evt = e as { target?: { value?: string }, values?: Iterable<string> };
              const val = evt.target?.value ?? (evt.values ? Array.from(evt.values)[0] : String(e));
              if (val) handlePageSizeChange(Number(val));
            }}
            className="w-[80px]"
            aria-label="Filas por página"
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {[10, 20, 50, 100, 1000].map((size) => (
                  <ListBox.Item key={size.toString()} id={size.toString()} textValue={size.toString()}>
                    {size}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          Página {pageIndex + 1} de {pageCount || 1}
        </div>
        <Pagination size="sm">
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={pageIndex === 0}
                onPress={() => handlePageChange(pageIndex)}
              >
                <Pagination.PreviousIcon />
              </Pagination.Previous>
            </Pagination.Item>
            
            {Array.from({ length: pageCount || 1 }, (_, i) => i + 1).map((p) => (
              <Pagination.Item key={p}>
                <Pagination.Link
                  isActive={p === pageIndex + 1}
                  onPress={() => handlePageChange(p)}
                >
                  {p}
                </Pagination.Link>
              </Pagination.Item>
            ))}

            <Pagination.Item>
              <Pagination.Next
                isDisabled={pageIndex + 1 >= (pageCount || 1)}
                onPress={() => handlePageChange(pageIndex + 2)}
              >
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      </div>
    </div>
  );
}
