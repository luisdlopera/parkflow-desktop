/**
 * Unified Storage API for ParkFlow Desktop.
 * 
 * Automatically selects the best storage backend:
 * - When running in Tauri Desktop: Uses SQLite via Rust (TauriStorage)
 * - When running in browser: Uses IndexedDB (IndexedDBStorage)
 * 
 * This provides a single consistent API regardless of the runtime environment.
 */

import type { StorageBackend } from "./types";
import { isTauri } from "./types";
import { TauriStorage } from "./tauri-storage";
import { IndexedDBStorage } from "./indexeddb-storage";

// Singleton instances
let storageInstance: StorageBackend | null = null;

/**
 * Get the appropriate storage backend for the current environment.
 * Returns a singleton instance.
 */
export function getStorage(): StorageBackend {
  if (!storageInstance) {
    storageInstance = isTauri() ? new TauriStorage() : new IndexedDBStorage();
  }
  return storageInstance;
}

/**
 * Reset the storage instance (useful for testing).
 */
export function resetStorage(): void {
  storageInstance = null;
}

// Re-export types
export type {
  StorageBackend,
  OutboxItem,
  OutboxEventType,
  PrintJob,
  OutboxStats
} from "./types";

export { isTauri } from "./types";

// Re-export implementations for advanced use
export { TauriStorage } from "./tauri-storage";
export { IndexedDBStorage } from "./indexeddb-storage";
