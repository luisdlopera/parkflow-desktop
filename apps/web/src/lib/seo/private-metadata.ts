import type { Metadata } from "next";

/** Metadata for authenticated or operational routes that must not be indexed. */
export const privateRouteMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
