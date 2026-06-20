import { Table } from '@tanstack/react-table';
import { Button } from '@/components/bridge/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useState } from 'react';
import { BulkAction } from './types';
import { useDialogStore } from '@/components/ui/dialog-store';

interface DataTableBulkActionsProps<TData> {
  table: Table<TData>;
  bulkActions?: BulkAction<TData>[];
  isAllSelected: boolean;
  onSelectAllAcrossPages: () => void;
  rowCount: number;
}

export function DataTableBulkActions<TData>({
  table,
  bulkActions,
  isAllSelected,
  onSelectAllAcrossPages,
  rowCount,
}: DataTableBulkActionsProps<TData>) {
  const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
  const selectedCount = isAllSelected ? rowCount : selectedRows.length;
  const isPageFullySelected = table.getIsAllPageRowsSelected();
  const [isProcessing, setIsProcessing] = useState(false);

  const { confirm } = useDialogStore();

  const handleBulkAction = useCallback(
    async (action: BulkAction<TData>) => {
      // If action requires confirmation, show dialog
      if (action.requiresConfirmation) {
        const confirmed = await confirm(
          `¿Estás seguro de que deseas ejecutar "${action.label}" en ${selectedCount} fila(s)?`,
          {
            title: 'Confirmar acción',
            confirmLabel: 'Ejecutar',
            cancelLabel: 'Cancelar',
            status: action.color === 'danger' ? 'danger' : 'warning',
          }
        );
        if (!confirmed) return;
      }

      setIsProcessing(true);
      try {
        await action.onClick(selectedRows, isAllSelected);
        // Clear selection after successful action
        table.toggleAllRowsSelected(false);
      } catch (error) {
        console.error('Error executing bulk action:', error);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedRows, isAllSelected, selectedCount, confirm, table]
  );

  if (!bulkActions || bulkActions.length === 0) return null;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-content1 border-2 border-primary-500 rounded-full shadow-lg"
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {selectedCount} fila(s) seleccionada(s)
            </span>
            {isPageFullySelected && !isAllSelected && rowCount > selectedCount && (
              <button
                className="text-xs text-primary hover:underline text-left mt-0.5 transition-colors"
                onClick={onSelectAllAcrossPages}
                disabled={isProcessing}
              >
                Seleccionar todos los {rowCount} resultados
              </button>
            )}
            {isAllSelected && (
              <span className="text-xs text-success mt-0.5">
                Todos los {rowCount} resultados seleccionados
              </span>
            )}
          </div>

          <div className="w-px h-6 bg-divider mx-2" />

          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                color={action.color}
                variant={action.variant || "flat"}
                startContent={action.icon}
                onPress={() => handleBulkAction(action)}
                isLoading={isProcessing}
                isDisabled={isProcessing}
              >
                {action.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="light"
              onPress={() => table.toggleAllRowsSelected(false)}
              isDisabled={isProcessing}
            >
              Cancelar
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
