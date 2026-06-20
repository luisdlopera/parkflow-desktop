export const serializeUrlState = (key: string, value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error(`Failed to serialize URL state for key ${key}`, error);
    return '';
  }
};

export const deserializeUrlState = <T>(value: string | null, defaultValue: T): T => {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch {
    // If parsing fails, it might be just a plain string.
    return value as unknown as T;
  }
};
