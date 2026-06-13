/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTableSelection } from '../useTableSelection';

describe('useTableSelection', () => {
  const items = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
  const getKey = (item: any) => item.id;

  it('should initialize with empty selection', () => {
    const { result } = renderHook(() =>
      useTableSelection({ items, getKey })
    );

    expect(result.current.selectedKeys.size).toBe(0);
    expect(result.current.isAllVisibleSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it('should toggle a single row', () => {
    const { result } = renderHook(() =>
      useTableSelection({ items, getKey })
    );

    act(() => {
      result.current.toggleRow(0, false);
    });

    expect(result.current.selectedKeys.has('1')).toBe(true);
    expect(result.current.selectedKeys.size).toBe(1);
    expect(result.current.isIndeterminate).toBe(true);
  });

  it('should support shift+click range selection', () => {
    const { result } = renderHook(() =>
      useTableSelection({ items, getKey })
    );

    act(() => {
      // Click first item normally
      result.current.toggleRow(0, false);
    });

    expect(result.current.selectedKeys.has('1')).toBe(true);

    act(() => {
      // Shift+Click third item
      result.current.toggleRow(2, true);
    });

    expect(result.current.selectedKeys.size).toBe(3);
    expect(result.current.selectedKeys.has('1')).toBe(true);
    expect(result.current.selectedKeys.has('2')).toBe(true);
    expect(result.current.selectedKeys.has('3')).toBe(true);
    expect(result.current.selectedKeys.has('4')).toBe(false);
  });

  it('should toggle all visible rows', () => {
    const { result } = renderHook(() =>
      useTableSelection({ items, getKey })
    );

    act(() => {
      result.current.toggleAll();
    });

    expect(result.current.selectedKeys.size).toBe(4);
    expect(result.current.isAllVisibleSelected).toBe(true);
    expect(result.current.isIndeterminate).toBe(false);

    act(() => {
      result.current.toggleAll();
    });

    expect(result.current.selectedKeys.size).toBe(0);
    expect(result.current.isAllVisibleSelected).toBe(false);
  });

  it('should keep externally selected keys when using toggleAll if they are not visible', () => {
    // Let's say item '5' is selected from another page but not visible
    const initialKeys = new Set(['5']);
    const onSelectionChange = vi.fn();

    const { result } = renderHook(() =>
      useTableSelection({ 
        items, 
        getKey, 
        selectedKeys: initialKeys,
        onSelectionChange 
      })
    );

    act(() => {
      result.current.toggleAll(); // Selects 1, 2, 3, 4
    });

    // onSelectionChange should have been called with 1, 2, 3, 4, AND 5
    const calledSet = onSelectionChange.mock.calls[0][0];
    expect(calledSet.has('5')).toBe(true);
    expect(calledSet.has('1')).toBe(true);
    expect(calledSet.size).toBe(5);
  });
});
