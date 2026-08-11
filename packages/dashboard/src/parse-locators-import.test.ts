import { describe, expect, it } from "vitest";
import { LocatorsImportError, parseLocatorsImportFile } from "./parse-locators-import.js";

describe("parseLocatorsImportFile", () => {
  it("parses a valid locators YAML file", () => {
    const text = `
screen: home
controls:
  - key: btn.login
    locator:
      strategy: getByRole
      value: button
      options:
        name: Login
    track: [text]
`;
    const result = parseLocatorsImportFile(text);
    expect(result).toEqual({
      screen: "home",
      controls: [
        {
          key: "btn.login",
          locator: { strategy: "getByRole", value: "button", options: { name: "Login" } },
          track: ["text"],
        },
      ],
    });
  });

  it("throws LocatorsImportError for invalid YAML syntax", () => {
    expect(() => parseLocatorsImportFile("controls: [unterminated")).toThrow(LocatorsImportError);
  });

  it("throws LocatorsImportError when a control's strategy is not a known locator strategy", () => {
    const text = `
screen: home
controls:
  - key: btn.login
    locator:
      strategy: getByMagic
      value: button
`;
    expect(() => parseLocatorsImportFile(text)).toThrow(LocatorsImportError);
  });
});
