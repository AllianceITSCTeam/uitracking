import { describe, expect, it } from "vitest";
import { buildQuery, parseQuery } from "./use-query-params.js";

describe("parseQuery", () => {
  it("parses key=value pairs from a query string", () => {
    expect(parseQuery("?project=fixture-app&run=run-1")).toEqual({
      project: "fixture-app",
      run: "run-1",
    });
  });

  it("returns an empty object for an empty query string", () => {
    expect(parseQuery("")).toEqual({});
  });
});

describe("buildQuery", () => {
  it("builds a query string from defined params", () => {
    expect(buildQuery({ project: "fixture-app", run: "run-1" })).toBe("?project=fixture-app&run=run-1");
  });

  it("omits undefined params", () => {
    expect(buildQuery({ project: "fixture-app", run: undefined })).toBe("?project=fixture-app");
  });

  it("returns an empty string when no params are set", () => {
    expect(buildQuery({ project: undefined })).toBe("");
  });
});
