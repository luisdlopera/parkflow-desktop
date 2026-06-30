import { AuthProvider } from "../core/AuthProvider";
import { WebAuthProvider } from "../providers/web/WebAuthProvider";

let cachedProvider: AuthProvider | null = null;

export async function createAuthProvider(): Promise<AuthProvider> {
  cachedProvider ??= new WebAuthProvider();
  return cachedProvider;
}
