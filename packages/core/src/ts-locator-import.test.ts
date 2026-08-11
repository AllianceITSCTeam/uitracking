import { describe, expect, it } from "vitest";
import { parseTsLocatorFile } from "./ts-locator-import.js";

describe("parseTsLocatorFile", () => {
  it("converts single-strategy getters (getByTestId/getByRole+options/getByLabel/getByPlaceholder/getByText)", () => {
    const source = `
      export class Locators {
        constructor(private page: Page) {}
        get loginButton(): Locator {
          return this.page.getByTestId('btn-login');
        }
        get saveButton(): Locator {
          return this.page.getByRole('button', { name: 'Save' });
        }
        get emailLabel(): Locator {
          return this.page.getByLabel('Email');
        }
        get noteInput(): Locator {
          return this.page.getByPlaceholder('Enter note');
        }
        get heading(): Locator {
          return this.page.getByText('Welcome');
        }
      }
    `;
    const result = parseTsLocatorFile(source, "home");
    expect(result.skipped).toEqual([]);
    expect(result.file).toEqual({
      screen: "home",
      controls: [
        { key: "loginButton", locator: { strategy: "getByTestId", value: "btn-login" } },
        { key: "saveButton", locator: { strategy: "getByRole", value: "button", options: { name: "Save" } } },
        { key: "emailLabel", locator: { strategy: "getByLabel", value: "Email" } },
        { key: "noteInput", locator: { strategy: "getByPlaceholder", value: "Enter note" } },
        { key: "heading", locator: { strategy: "getByText", value: "Welcome" } },
      ],
    });
  });

  it("strips a simple regex name (with anchors) into a plain string", () => {
    const source = `
      export class Locators {
        get saveForLaterButton(): Locator {
          return this.page.getByRole('button', { name: /save for later/i });
        }
        get continueButton(): Locator {
          return this.page.getByRole('button', { name: /^continue$/i });
        }
      }
    `;
    const result = parseTsLocatorFile(source, "home");
    expect(result.skipped).toEqual([]);
    expect(result.file.controls).toEqual([
      { key: "saveForLaterButton", locator: { strategy: "getByRole", value: "button", options: { name: "save for later" } } },
      { key: "continueButton", locator: { strategy: "getByRole", value: "button", options: { name: "continue" } } },
    ]);
  });

  it("skips a getByRole with a complex regex name", () => {
    const source = `
      export class Locators {
        get amountLabel(): Locator {
          return this.page.getByRole('cell', { name: /\\$[0-9]+/ });
        }
      }
    `;
    const result = parseTsLocatorFile(source, "home");
    expect(result.file.controls).toEqual([]);
    expect(result.skipped).toEqual([
      { name: "amountLabel", reason: "name là regex phức tạp, không tự convert được" },
    ]);
  });

  it("converts a single .locator(css) call to a css strategy", () => {
    const source = `
      export class Locators {
        get currentBalanceInput(): Locator {
          return this.page.locator('.modal.show #mfc-CurrentBalance');
        }
      }
    `;
    const result = parseTsLocatorFile(source, "home");
    expect(result.skipped).toEqual([]);
    expect(result.file.controls).toEqual([
      { key: "currentBalanceInput", locator: { strategy: "css", value: ".modal.show #mfc-CurrentBalance" } },
    ]);
  });

  it("collapses a pure .locator().locator() chain into one css control", () => {
    const source = `
      export class Locators {
        get nestedField(): Locator {
          return this.page.locator('.modal.show').locator('#field');
        }
      }
    `;
    const result = parseTsLocatorFile(source, "home");
    expect(result.skipped).toEqual([]);
    expect(result.file.controls).toEqual([
      { key: "nestedField", locator: { strategy: "css", value: ".modal.show #field" } },
    ]);
  });

  it("skips a chain that mixes css with another strategy", () => {
    const source = `
      export class Locators {
        get modalAddButton(): Locator {
          return this.page.locator('.modal.show').getByRole('button', { name: /add assets/i });
        }
      }
    `;
    const result = parseTsLocatorFile(source, "home");
    expect(result.file.controls).toEqual([]);
    expect(result.skipped).toEqual([
      { name: "modalAddButton", reason: "Chain locator trộn nhiều strategy, không tự convert được" },
    ]);
  });

  it("skips a getter/method with parameters", () => {
    const source = `
      export class Locators {
        assetTypeCard(label: string): Locator {
          return this.assetsGroup.locator('.option-table').filter({ hasText: label });
        }
      }
    `;
    const result = parseTsLocatorFile(source, "home");
    expect(result.file.controls).toEqual([]);
    expect(result.skipped).toEqual([
      { name: "assetTypeCard", reason: "Có tham số, không convert được sang giá trị tĩnh" },
    ]);
  });

  it("converts a representative extract from a real assets.locators.ts fixture", () => {
    const source = `
      import { Page, Locator } from '@playwright/test';

      export class AssetsLocators {
        constructor(private page: Page) {}

        get assetsGroup(): Locator {
          return this.page.locator('[data-field="Assets"]');
        }

        assetTypeCard(label: string): Locator {
          return this.assetsGroup.locator('.option-table').filter({ hasText: label });
        }

        get brokerNotesTextarea(): Locator {
          return this.page.getByPlaceholder('Enter broker note');
        }

        get saveForLaterButton(): Locator {
          return this.page.getByRole('button', { name: /save for later/i });
        }

        get modalAddButton(): Locator {
          return this.page.locator('.modal.show').getByRole('button', { name: /add assets/i });
        }

        get currentBalanceInput(): Locator {
          return this.page.locator('.modal.show #mfc-CurrentBalance');
        }
      }

      export function createAssetsLocators(page: Page): AssetsLocators {
        return new AssetsLocators(page);
      }
    `;
    const result = parseTsLocatorFile(source, "assets");
    expect(result.file.controls).toEqual([
      { key: "assetsGroup", locator: { strategy: "css", value: '[data-field="Assets"]' } },
      { key: "brokerNotesTextarea", locator: { strategy: "getByPlaceholder", value: "Enter broker note" } },
      {
        key: "saveForLaterButton",
        locator: { strategy: "getByRole", value: "button", options: { name: "save for later" } },
      },
      { key: "currentBalanceInput", locator: { strategy: "css", value: ".modal.show #mfc-CurrentBalance" } },
    ]);
    expect(result.skipped).toEqual([
      { name: "assetTypeCard", reason: "Có tham số, không convert được sang giá trị tĩnh" },
      { name: "modalAddButton", reason: "Chain locator trộn nhiều strategy, không tự convert được" },
    ]);
  });
});
