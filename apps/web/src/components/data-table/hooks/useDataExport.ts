import { useState, useCallback } from 'react';
import { ExportConfig } from '../types';

export function useDataExport(config?: ExportConfig) {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(async (format: 'csv' | 'excel' | 'pdf') => {
    if (!config?.onExport) return;
    
    setIsExporting(true);
    try {
      await config.onExport(format);
      // Opcional: mostrar notificación de éxito usando Sonner / React Hot Toast
    } catch (error) {
      console.error(`Error exporting data as ${format}:`, error);
      // Opcional: mostrar notificación de error
    } finally {
      setIsExporting(false);
    }
  }, [config]);

  return {
    isExporting,
    exportData,
    supportedFormats: config?.supportedFormats || ['csv', 'excel']
  };
}
