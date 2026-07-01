import { describe, it, expect } from "vitest";
import { normalizeCursorPage, normalizePageResponse } from "../pagination";

describe("pagination helpers", () => {
  it("normalizes cursor arrays", () => {
    const result = normalizeCursorPage([{ id: "a" }]);
    expect(result).toEqual({
      data: [{ id: "a" }],
      meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
    });
  });

  it("normalizes cursor data payloads without meta", () => {
    const result = normalizeCursorPage({ data: [{ id: "a" }] });
    expect(result).toEqual({
      data: [{ id: "a" }],
      meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
    });
  });

  it("normalizes page arrays", () => {
    const result = normalizePageResponse([{ id: "a" }]);
    expect(result).toEqual({
      content: [{ id: "a" }],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 1,
    });
  });

  it("normalizes page content payloads", () => {
    const result = normalizePageResponse({
      content: [{ id: "a" }],
      totalElements: 4,
      totalPages: 2,
      page: 1,
      size: 2,
    });
    expect(result).toEqual({
      content: [{ id: "a" }],
      totalElements: 4,
      totalPages: 2,
      page: 1,
      size: 2,
      number: undefined,
    });
  });
});
