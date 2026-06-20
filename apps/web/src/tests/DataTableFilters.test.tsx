import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataTableFilters } from '../components/data-table/DataTableFilters';
import { FilterDefinition, FilterState } from '../components/data-table/types';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock the bridge components to simplify testing
vi.mock('@/components/bridge/Input', () => ({
  Input: ({ onValueChange, placeholder, 'aria-label': ariaLabel, value }: any) => (
    <input 
      placeholder={placeholder} 
      aria-label={ariaLabel}
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="mock-input"
    />
  )
}));

vi.mock('@/components/bridge/Checkbox', () => ({
  Checkbox: ({ isSelected, onChange, children }: any) => (
    <label>
      <input 
        type="checkbox" 
        checked={isSelected || false} 
        onChange={(e) => onChange(e.target.checked)}
        data-testid="mock-checkbox"
      />
      {children}
    </label>
  )
}));

// Mock HeroUI components
vi.mock('@heroui/react', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    Autocomplete: ({ children, onSelectionChange, 'aria-label': ariaLabel }: any) => (
      <div data-testid="mock-autocomplete" aria-label={ariaLabel}>
        <select onChange={(e) => onSelectionChange(e.target.value)} data-testid="mock-autocomplete-select">
          <option value="">Select...</option>
          {children}
        </select>
      </div>
    ),
    AutocompleteItem: ({ textValue, children, value }: any) => (
      <option value={value}>{textValue || children}</option>
    ),
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <div>{children}</div>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
  };
});

describe('DataTableFilters', () => {
  const mockDefinitions: FilterDefinition[] = [
    { id: 'search', label: 'Buscar', type: 'text' },
    { id: 'status', label: 'Estado', type: 'select', options: [{ label: 'Activo', value: 'active' }, { label: 'Inactivo', value: 'inactive' }] },
    { id: 'isPaid', label: 'Pagado', type: 'boolean' }
  ];

  it('renders filter buttons correctly', () => {
    const mockOnChange = vi.fn();
    render(<DataTableFilters definitions={mockDefinitions} filters={[]} onChange={mockOnChange} />);
    
    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('handles text filter changes correctly', async () => {
    const mockOnChange = vi.fn();
    render(<DataTableFilters definitions={mockDefinitions} filters={[]} onChange={mockOnChange} />);
    
    // Simulate clicking the filter button and applying a text filter
    const input = screen.getByTestId('mock-input');
    await userEvent.type(input, 'test');
    
    // Check if the change handler was called
    expect(mockOnChange).toHaveBeenCalledWith([{ id: 'search', value: 't' }]);
  });

  it('handles boolean filter changes correctly', async () => {
    const mockOnChange = vi.fn();
    render(<DataTableFilters definitions={mockDefinitions} filters={[]} onChange={mockOnChange} />);
    
    const checkbox = screen.getByTestId('mock-checkbox');
    fireEvent.click(checkbox);
    
    expect(mockOnChange).toHaveBeenCalledWith([{ id: 'isPaid', value: true }]);
  });

  it('clears all filters when the clear button is clicked', async () => {
    const mockOnChange = vi.fn();
    const activeFilters: FilterState[] = [{ id: 'search', value: 'test' }];
    
    render(<DataTableFilters definitions={mockDefinitions} filters={activeFilters} onChange={mockOnChange} />);
    
    // Clear filters button should be visible
    const clearButton = screen.getByText('Limpiar');
    expect(clearButton).toBeInTheDocument();
    
    fireEvent.click(clearButton);
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});
