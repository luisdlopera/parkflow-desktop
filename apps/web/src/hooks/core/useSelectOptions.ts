import { useMemo } from 'react';

export interface SelectOption<T> {
  value: string | number;
  label: string;
}

/**
 * Hook to convert array of items to Select component options.
 * Replaces the 50+ instances of:
 *   useMemo(() => items.map(i => ({ value: i.id, label: i.name })), [items])
 */
export function useSelectOptions<T extends { id?: string; code?: string; name?: string }>(
  items: T[],
  keyFn?: (item: T) => string | number,
  labelFn?: (item: T) => string,
): SelectOption<typeof keyFn>[] {
  return useMemo(() => {
    return items.map((item) => ({
      value: keyFn ? keyFn(item) : (item.id || item.code || ''),
      label: labelFn ? labelFn(item) : (item.name || ''),
    }));
  }, [items, keyFn, labelFn]);
}
