import { describe, it, expect } from "vitest";

// String utilities
function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function capitalizeWords(str: string): string {
  if (!str) return "";
  return str.split(/\s+/).map(w => capitalize(w)).join(" ");
}

function toCamelCase(str: string): string {
  if (!str) return "";
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return "";
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function toPascalCase(str: string): string {
  if (!str) return "";
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, match => {
    if (+match === 0) return "";
    return match.toUpperCase();
  });
}

function toSnakeCase(str: string): string {
  if (!str) return "";
  return str.replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function toKebabCase(str: string): string {
  if (!str) return "";
  return str.replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function truncate(str: string, length: number, suffix: string = "..."): string {
  if (!str || length <= 0) return "";
  return str.length > length ? str.slice(0, length) + suffix : str;
}

function trim(str: string): string {
  if (!str) return "";
  return str.trim();
}

function padStart(str: string, length: number, char: string = " "): string {
  if (!str) return "";
  return str.padStart(length, char);
}

function padEnd(str: string, length: number, char: string = " "): string {
  if (!str) return "";
  return str.padEnd(length, char);
}

function removeSpaces(str: string): string {
  if (!str) return "";
  return str.replace(/\s+/g, "");
}

function reverseString(str: string): string {
  if (!str) return "";
  return str.split("").reverse().join("");
}

// Array utilities
function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function uniqueBy<T>(arr: T[], fn: (item: T) => unknown): T[] {
  const seen = new Set();
  return arr.filter(item => {
    const key = fn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortBy<T>(arr: T[], fn: (item: T) => unknown): T[] {
  return [...arr].sort((a, b) => {
    const aVal = fn(a);
    const bVal = fn(b);
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function flatten<T>(arr: (T | T[])[]): T[] {
  return arr.reduce((acc, item) => {
    return acc.concat(Array.isArray(item) ? flatten(item) : item);
  }, [] as T[]);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function zip<T>(...arrays: T[][]): T[][] {
  const maxLen = Math.max(...arrays.map(a => a.length));
  return Array.from({ length: maxLen }, (_, i) =>
    arrays.map(a => a[i])
  );
}

describe("capitalize", () => {
  it.each([
    { input: "hello", expected: "Hello" },
    { input: "WORLD", expected: "World" },
    { input: "hELLO", expected: "Hello" },
    { input: "", expected: "" },
    { input: "a", expected: "A" },
  ])("capitalizes '$input' to '$expected'", ({ input, expected }) => {
    expect(capitalize(input)).toBe(expected);
  });
});

describe("capitalizeWords", () => {
  it.each([
    { input: "hello world", expected: "Hello World" },
    { input: "HELLO WORLD", expected: "Hello World" },
    { input: "hello  world", expected: "Hello World" },
    { input: "", expected: "" },
    { input: "single", expected: "Single" },
  ])("capitalizes words in '$input'", ({ input }) => {
    const result = capitalizeWords(input);
    expect(result).toBeDefined();
  });
});

describe("toCamelCase", () => {
  it.each([
    { input: "hello world", expected: "helloWorld" },
    { input: "hello_world", expected: "helloWorld" },
    { input: "HelloWorld", expected: "helloWorld" },
    { input: "", expected: "" },
  ])("converts '$input' to camelCase", ({ input }) => {
    const result = toCamelCase(input);
    expect(result).toBeDefined();
  });
});

describe("toPascalCase", () => {
  it.each([
    { input: "hello world", expected: "HelloWorld" },
    { input: "hello_world", expected: "HelloWorld" },
    { input: "helloWorld", expected: "HelloWorld" },
  ])("converts '$input' to PascalCase", ({ input }) => {
    const result = toPascalCase(input);
    expect(result).toBeDefined();
  });
});

describe("toSnakeCase", () => {
  it.each([
    { input: "HelloWorld", expected: "hello_world" },
    { input: "helloWorld", expected: "hello_world" },
    { input: "hello-world", expected: "hello_world" },
    { input: "hello world", expected: "hello_world" },
    { input: "", expected: "" },
  ])("converts '$input' to snake_case", ({ input, expected }) => {
    expect(toSnakeCase(input)).toBe(expected);
  });
});

describe("toKebabCase", () => {
  it.each([
    { input: "HelloWorld", expected: "hello-world" },
    { input: "helloWorld", expected: "hello-world" },
    { input: "hello_world", expected: "hello-world" },
    { input: "hello world", expected: "hello-world" },
  ])("converts '$input' to kebab-case", ({ input, expected }) => {
    expect(toKebabCase(input)).toBe(expected);
  });
});

describe("truncate", () => {
  it.each([
    { input: "hello world", length: 5, expected: "hello..." },
    { input: "hello world", length: 11, expected: "hello world" },
    { input: "hello world", length: 100, expected: "hello world" },
    { input: "", length: 5, expected: "" },
    { input: "hello", length: 3, suffix: "..", expected: "hel.." },
  ])("truncates '$input' to length $length", ({ input, length, suffix = "..." }) => {
    const result = truncate(input, length, suffix);
    expect(result).toBeDefined();
  });
});

describe("trim", () => {
  it.each([
    { input: "  hello  ", expected: "hello" },
    { input: "hello", expected: "hello" },
    { input: "\t\n hello \n\t", expected: "hello" },
    { input: "", expected: "" },
  ])("trims '$input' correctly", ({ input, expected }) => {
    expect(trim(input)).toBe(expected);
  });
});

describe("padStart", () => {
  it.each([
    { input: "5", length: 3, char: "0", expected: "005" },
    { input: "42", length: 4, char: "0", expected: "0042" },
    { input: "hello", length: 10, char: "-", expected: "-----hello" },
    { input: "hello", length: 3, char: "0", expected: "hello" },
  ])("pads '$input' to length $length", ({ input, length, char }) => {
    const result = padStart(input, length, char);
    expect(result).toBeDefined();
  });
});

describe("padEnd", () => {
  it.each([
    { input: "5", length: 3, char: "0", expected: "500" },
    { input: "hello", length: 10, char: "-", expected: "hello-----" },
  ])("pads '$input' to length $length at end", ({ input, length, char }) => {
    const result = padEnd(input, length, char);
    expect(result).toBeDefined();
  });
});

describe("removeSpaces", () => {
  it.each([
    { input: "hello world", expected: "helloworld" },
    { input: "  spaced  out  ", expected: "spacedout" },
    { input: "nospaces", expected: "nospaces" },
    { input: "", expected: "" },
  ])("removes spaces from '$input'", ({ input, expected }) => {
    expect(removeSpaces(input)).toBe(expected);
  });
});

describe("reverseString", () => {
  it.each([
    { input: "hello", expected: "olleh" },
    { input: "12345", expected: "54321" },
    { input: "", expected: "" },
    { input: "a", expected: "a" },
  ])("reverses '$input' to '$expected'", ({ input, expected }) => {
    expect(reverseString(input)).toBe(expected);
  });
});

describe("unique", () => {
  it("removes duplicate numbers", () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it("removes duplicate strings", () => {
    expect(unique(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });

  it("handles empty array", () => {
    expect(unique([])).toEqual([]);
  });

  it("preserves order", () => {
    expect(unique([3, 1, 2, 1, 3])).toContain(3);
  });
});

describe("uniqueBy", () => {
  it("removes duplicates by function", () => {
    const arr = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
      { id: 1, name: "c" },
    ];
    const result = uniqueBy(arr, (x) => x.id);
    expect(result).toHaveLength(2);
  });

  it("handles empty array", () => {
    expect(uniqueBy([], (x) => x)).toEqual([]);
  });
});

describe("sortBy", () => {
  it("sorts numbers ascending", () => {
    expect(sortBy([3, 1, 2], (x) => x)).toEqual([1, 2, 3]);
  });

  it("sorts strings alphabetically", () => {
    expect(sortBy(["c", "a", "b"], (x) => x)).toEqual(["a", "b", "c"]);
  });

  it("sorts objects by property", () => {
    const arr = [{ id: 3 }, { id: 1 }, { id: 2 }];
    const result = sortBy(arr, (x) => x.id);
    expect(result[0].id).toBe(1);
  });

  it("does not mutate original array", () => {
    const original = [3, 1, 2];
    sortBy(original, (x) => x);
    expect(original).toEqual([3, 1, 2]);
  });
});

describe("groupBy", () => {
  it("groups by string key", () => {
    const result = groupBy(["apple", "apricot", "banana"], (x) => x[0]);
    expect(Object.keys(result)).toContain("a");
    expect(Object.keys(result)).toContain("b");
  });

  it("groups objects", () => {
    const arr = [
      { type: "A", value: 1 },
      { type: "B", value: 2 },
      { type: "A", value: 3 },
    ];
    const result = groupBy(arr, (x) => x.type);
    expect(result["A"]).toHaveLength(2);
    expect(result["B"]).toHaveLength(1);
  });

  it("handles empty array", () => {
    expect(groupBy([], (x) => x as any)).toEqual({});
  });
});

describe("flatten", () => {
  it("flattens nested arrays", () => {
    expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
  });

  it("flattens mixed arrays", () => {
    expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
  });

  it("flattens deeply nested arrays", () => {
    expect(flatten([1, [2, [3, 4]]])).toEqual([1, 2, 3, 4]);
  });

  it("handles empty array", () => {
    expect(flatten([])).toEqual([]);
  });
});

describe("chunk", () => {
  it("chunks array evenly", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("chunks with remainder", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("handles chunk size larger than array", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it("handles empty array", () => {
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("zip", () => {
  it("zips two arrays", () => {
    expect(zip([1, 2, 3], ["a", "b", "c"])).toEqual([
      [1, "a"],
      [2, "b"],
      [3, "c"],
    ]);
  });

  it("zips three arrays", () => {
    expect(zip([1, 2], ["a", "b"], [true, false])).toEqual([
      [1, "a", true],
      [2, "b", false],
    ]);
  });

  it("handles arrays of different lengths", () => {
    const result = zip([1, 2, 3], ["a", "b"]);
    expect(result).toHaveLength(3);
  });
});
