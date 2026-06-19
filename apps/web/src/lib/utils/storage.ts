export const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      console.warn(`[Storage] Failed to read ${key} from localStorage:`, err);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[Storage] Failed to write ${key} to localStorage:`, err);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[Storage] Failed to remove ${key} from localStorage:`, err);
    }
  },
};
