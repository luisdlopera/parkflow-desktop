import { useCallback, useState } from 'react';

export interface UseTableSelectionProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  onSelectAll?: (keys: Set<string>) => void;
}

export function useTableSelection<T>({
  items,
  getKey,
  selectedKeys: controlledKeys,
  onSelectionChange,
  onSelectAll,
}: UseTableSelectionProps<T>) {
  const [uncontrolledKeys, setUncontrolledKeys] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const selectedKeys = controlledKeys ?? uncontrolledKeys;

  const handleSelectionChange = useCallback((newKeys: Set<string>) => {
    if (!controlledKeys) {
      setUncontrolledKeys(newKeys);
    }
    onSelectionChange?.(newKeys);
  }, [controlledKeys, onSelectionChange]);

  const toggleRow = useCallback((index: number, isShiftPressed: boolean) => {
    const newKeys = new Set(selectedKeys);
    const item = items[index];
    if (!item) return;
    
    const key = getKey(item, index);

    if (isShiftPressed && lastSelectedIndex !== null && lastSelectedIndex < items.length) {
      // Shift+Click logic: range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      
      // Determine if we are selecting or deselecting based on the target row's previous state
      const isSelecting = !selectedKeys.has(key);

      for (let i = start; i <= end; i++) {
        const iKey = getKey(items[i], i);
        if (isSelecting) {
          newKeys.add(iKey);
        } else {
          newKeys.delete(iKey);
        }
      }
    } else {
      // Normal click logic
      if (newKeys.has(key)) {
        newKeys.delete(key);
      } else {
        newKeys.add(key);
      }
      setLastSelectedIndex(index);
    }

    handleSelectionChange(newKeys);
  }, [items, selectedKeys, getKey, lastSelectedIndex, handleSelectionChange]);

  const toggleAll = useCallback(() => {
    const visibleKeys = items.map((item, i) => getKey(item, i));
    const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every(k => selectedKeys.has(k));
    
    const newKeys = new Set(selectedKeys);
    
    if (allVisibleSelected) {
      // Deselect all visible
      visibleKeys.forEach(k => newKeys.delete(k));
    } else {
      // Select all visible
      visibleKeys.forEach(k => newKeys.add(k));
    }
    
    handleSelectionChange(newKeys);
    onSelectAll?.(newKeys);
    setLastSelectedIndex(null);
  }, [items, selectedKeys, getKey, handleSelectionChange, onSelectAll]);

  // Derived state
  const visibleKeysCount = items.length;
  const selectedVisibleKeysCount = items.filter((item, i) => selectedKeys.has(getKey(item, i))).length;

  const isAllVisibleSelected = visibleKeysCount > 0 && selectedVisibleKeysCount === visibleKeysCount;
  const isIndeterminate = selectedVisibleKeysCount > 0 && selectedVisibleKeysCount < visibleKeysCount;

  return {
    selectedKeys,
    toggleRow,
    toggleAll,
    isAllVisibleSelected,
    isIndeterminate,
    selectionCount: selectedKeys.size,
  };
}
