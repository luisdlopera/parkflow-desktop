import { useState } from 'react';
import { 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  ListBox
} from '@heroui/react';
import { Select } from '@/components/bridge/Select';
import { Button } from '@/components/bridge/Button';
import { Input } from '@/components/bridge/Input';
import { Checkbox } from '@/components/bridge/Checkbox';
import { Filter, X } from 'lucide-react';
import { FilterDefinition, FilterState } from './types';

interface DataTableFiltersProps {
  definitions: FilterDefinition[];
  filters: FilterState[];
  onChange: (filters: FilterState[]) => void;
}

export function DataTableFilters({ definitions, filters, onChange }: DataTableFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getFilterValue = (id: string) => {
    return filters.find(f => f.id === id)?.value;
  };

  const setFilterValue = (id: string, value: string | boolean | undefined | null) => {
    const newFilters = [...filters];
    const existingIndex = newFilters.findIndex(f => f.id === id);
    
    if (value === undefined || value === null || value === '') {
      if (existingIndex >= 0) newFilters.splice(existingIndex, 1);
    } else {
      if (existingIndex >= 0) {
        newFilters[existingIndex].value = value;
      } else {
        newFilters.push({ id, value });
      }
    }
    
    onChange(newFilters);
  };

  const activeCount = filters.length;

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button 
          variant={activeCount > 0 ? "solid" : "flat"}
          color={activeCount > 0 ? "primary" : "default"}
          startContent={<Filter size={16} />}
        >
          Filtros {activeCount > 0 && `(${activeCount})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex justify-between items-center pb-2 border-b border-divider">
            <h3 className="text-sm font-medium">Filtros Avanzados</h3>
            {activeCount > 0 && (
              <Button 
                size="sm" 
                variant="light" 
                color="danger" 
                onClick={() => onChange([])}
                startContent={<X size={14} />}
              >
                Limpiar
              </Button>
            )}
          </div>
          
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {definitions.map((def) => {
              const value = getFilterValue(def.id);
              
              return (
                <div key={def.id} className="flex flex-col gap-1">
                  <label className="text-xs text-default-500 font-medium">{def.label}</label>
                  
                  {def.type === 'text' && (
                    <Input 
                      size="sm"
                      placeholder={`Filtrar ${def.label.toLowerCase()}...`}
                      value={(value as string) || ''}
                      aria-label={`Filtrar por ${def.label}`}
                      onValueChange={(val) => setFilterValue(def.id, val)}
                    />
                  )}
                  
                  {def.type === 'select' && def.options && (
                    <Select
                      size="sm"
                      placeholder={`Seleccionar ${def.label.toLowerCase()}`}
                      selectedKeys={value !== undefined ? [String(value)] : []}
                      onChange={(e: unknown) => {
                        const evt = e as { target?: { value?: string }, values?: Iterable<string> };
                        const val = evt.target?.value ?? (evt.values ? Array.from(evt.values)[0] : String(e));
                        setFilterValue(def.id, val);
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {def.options.map(opt => (
                            <ListBox.Item key={String(opt.value)} id={String(opt.value)} textValue={opt.label}>
                              {opt.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  
                  {def.type === 'boolean' && (
                    <Checkbox
                      isSelected={value as boolean}
                      onChange={(val: boolean) => setFilterValue(def.id, val)}
                      size="sm"
                    >
                      {def.label}
                    </Checkbox>
                  )}
                  
                  {/* Agrega más tipos de filtros como date, dateRange, multiSelect según necesidad */}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
