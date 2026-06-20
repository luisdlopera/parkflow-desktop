import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Button } from '@/components/bridge/Button';
import { Download } from 'lucide-react';
import { useDataExport } from './hooks/useDataExport';
import { ExportConfig } from './types';

interface DataTableExportProps {
  config?: ExportConfig;
}

export function DataTableExport({ config }: DataTableExportProps) {
  const { isExporting, exportData, supportedFormats } = useDataExport(config);

  if (!config) return null;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button 
          variant="ghost" 
          startContent={<Download size={16} />}
          isLoading={isExporting}
        >
          Exportar
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Export options"
        onAction={(key) => exportData(key as any)}
      >
        {supportedFormats.includes('csv') && <DropdownItem key="csv">Exportar como CSV</DropdownItem>}
        {supportedFormats.includes('excel') && <DropdownItem key="excel">Exportar como Excel</DropdownItem>}
        {supportedFormats.includes('pdf') && <DropdownItem key="pdf">Exportar como PDF</DropdownItem>}
      </DropdownMenu>
    </Dropdown>
  );
}
