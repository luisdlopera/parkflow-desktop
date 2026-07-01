import type { CursorPaginatedResponse, PaginatedResponse } from "@/lib/types/api.types";

type CursorMetaLike = CursorPaginatedResponse<unknown>["meta"];

type CursorPayload<T> =
  | CursorPaginatedResponse<T>
  | T[]
  | {
      data?: T[];
      meta?: Partial<CursorMetaLike>;
    }
  | {
      content?: T[];
      totalElements?: number;
      totalPages?: number;
      page?: number;
      size?: number;
      number?: number;
    }
  | null
  | undefined;

type PagePayload<T> =
  | PaginatedResponse<T>
  | T[]
  | {
      content?: T[];
      totalElements?: number;
      totalPages?: number;
      page?: number;
      size?: number;
      number?: number;
    }
  | null
  | undefined;

export function normalizeCursorPage<T>(payload: CursorPayload<T>): CursorPaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      meta: {
        total: payload.length,
        page: 1,
        limit: payload.length,
        totalPages: payload.length > 0 ? 1 : 0,
      },
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 0,
      },
    };
  }

  if ("data" in payload && Array.isArray(payload.data)) {
    const meta = (payload as { meta?: Partial<CursorMetaLike> }).meta;
    return {
      data: payload.data,
      meta: {
        total: meta?.total ?? payload.data.length,
        page: meta?.page ?? 1,
        limit: meta?.limit ?? payload.data.length,
        totalPages: meta?.totalPages ?? (payload.data.length > 0 ? 1 : 0),
      },
    };
  }

  if ("content" in payload && Array.isArray(payload.content)) {
    return {
      data: payload.content,
      meta: {
        total: payload.totalElements ?? payload.content.length,
        page: payload.page ?? payload.number ?? 1,
        limit: payload.size ?? payload.content.length,
        totalPages: payload.totalPages ?? (payload.content.length > 0 ? 1 : 0),
      },
    };
  }

  return {
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 0,
      totalPages: 0,
    },
  };
}

export function normalizePageResponse<T>(payload: PagePayload<T>): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return {
      content: payload,
      totalElements: payload.length,
      totalPages: payload.length > 0 ? 1 : 0,
      page: 0,
      size: payload.length,
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 0,
    };
  }

  if ("content" in payload && Array.isArray(payload.content)) {
    return {
      content: payload.content,
      totalElements: payload.totalElements ?? payload.content.length,
      totalPages: payload.totalPages ?? (payload.content.length > 0 ? 1 : 0),
      page: payload.page ?? payload.number ?? 0,
      size: payload.size ?? payload.content.length,
      number: payload.number,
    };
  }

  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 0,
  };
}
