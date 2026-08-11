import { describe, expect, it } from "vitest";
import { buildStep, stepAction, stepSelector } from "./auth-step-helpers.js";

describe("stepAction", () => {
  it("returns fill for a fill step", () => {
    expect(stepAction({ fill: "#username", value: "admin" })).toBe("fill");
  });

  it("returns click for a click step", () => {
    expect(stepAction({ click: "#submit" })).toBe("click");
  });

  it("returns waitFor for a waitFor step", () => {
    expect(stepAction({ waitFor: "#dashboard" })).toBe("waitFor");
  });
});

describe("stepSelector", () => {
  it("returns the fill selector", () => {
    expect(stepSelector({ fill: "#username", value: "admin" })).toBe("#username");
  });

  it("returns the click selector", () => {
    expect(stepSelector({ click: "#submit" })).toBe("#submit");
  });

  it("returns the waitFor selector", () => {
    expect(stepSelector({ waitFor: "#dashboard" })).toBe("#dashboard");
  });
});

describe("buildStep", () => {
  it("keeps the selector when switching action", () => {
    expect(buildStep("click", "#submit")).toEqual({ click: "#submit" });
  });

  it("defaults value to empty string when switching to fill", () => {
    expect(buildStep("fill", "#username")).toEqual({ fill: "#username", value: "" });
  });

  it("drops value when switching from fill to click", () => {
    expect(buildStep("click", "#username", "admin")).toEqual({ click: "#username" });
  });

  it("drops value when switching from fill to waitFor", () => {
    expect(buildStep("waitFor", "#dashboard", "admin")).toEqual({ waitFor: "#dashboard" });
  });
});
