import { describe, expect, it } from "vitest";
import { LocatorsFileSchema, ProjectsFileSchema, ScreensConfigSchema } from "./config.js";

describe("LocatorsFileSchema", () => {
  it("parses a valid locators file", () => {
    const result = LocatorsFileSchema.safeParse({
      screen: "customer-edit",
      controls: [
        {
          key: "field.email",
          locator: { strategy: "getByTestId", value: "customer-email" },
          track: ["text", "type", "style"],
        },
        {
          key: "btn.submit",
          locator: { strategy: "getByRole", value: "button", options: { name: "Lưu" } },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.controls).toHaveLength(2);
    expect(result.data.controls[0]?.track).toEqual(["text", "type", "style"]);
  });

  it("rejects an unknown top-level key", () => {
    const result = LocatorsFileSchema.safeParse({
      screen: "customer-edit",
      controls: [],
      extra: "not-allowed",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a locator strategy outside the declared priority list", () => {
    const result = LocatorsFileSchema.safeParse({
      screen: "customer-edit",
      controls: [
        { key: "field.email", locator: { strategy: "getByXPath", value: "//input" } },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("ScreensConfigSchema", () => {
  const validConfig = {
    baseUrl: "https://app.example.com",
    auth: {
      type: "form",
      loginUrl: "/login",
      steps: [
        { fill: "#username", value: "${QA_USER}" },
        { fill: "#password", value: "${QA_PASS}" },
        { click: "button[type=submit]" },
        { waitFor: ".dashboard" },
      ],
      reuseSession: true,
    },
    locales: ["vi", "en"],
    localeSwitch: { strategy: "url", pattern: "?lang={locale}" },
    screens: [
      {
        id: "customer-list",
        url: "/customers",
        waitFor: "table.customer-table",
        track: ["text", "structure", "style", "options"],
        tableContent: "structure-only",
        ignore: [{ selector: ".timestamp" }, { maskPattern: "\\d{2}/\\d{2}/\\d{4}" }],
      },
      {
        id: "customer-edit",
        url: "/customers/1/edit",
        scenario: [{ click: "#tab-address" }, { waitFor: "#address-form" }],
        track: ["text", "structure", "style", "options"],
      },
    ],
  };

  it("parses a valid screens.config.yaml shape", () => {
    const result = ScreensConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.screens).toHaveLength(2);
    expect(result.data.auth?.steps).toHaveLength(4);
  });

  it("rejects an unknown key inside a screen entry", () => {
    const invalid = {
      ...validConfig,
      screens: [{ ...validConfig.screens[0], unexpectedField: true }],
    };

    const result = ScreensConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid baseUrl", () => {
    const invalid = { ...validConfig, baseUrl: "not-a-url" };

    const result = ScreensConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an empty screens array", () => {
    const invalid = { ...validConfig, screens: [] };

    const result = ScreensConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("ProjectsFileSchema", () => {
  it("parses a valid projects.yaml catalog", () => {
    const result = ProjectsFileSchema.safeParse({
      projects: [
        { id: "myapp-staging", name: "MyApp — Staging", config: "projects/myapp-staging/screens.config.yaml" },
        { id: "myapp-prod", name: "MyApp — Prod", config: "projects/myapp-prod/screens.config.yaml" },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.projects).toHaveLength(2);
  });

  it("rejects a project entry missing a required field", () => {
    const result = ProjectsFileSchema.safeParse({
      projects: [{ id: "myapp-staging", config: "projects/myapp-staging/screens.config.yaml" }],
    });

    expect(result.success).toBe(false);
  });
});
