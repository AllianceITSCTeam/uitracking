import { afterAll, describe, expect, it } from "vitest";
import { closeBrowser, getBrowser, withContext } from "./browser.js";

afterAll(async () => {
  await closeBrowser();
});

describe("getBrowser", () => {
  it(
    "reuses the same browser instance across calls",
    async () => {
      const first = await getBrowser();
      const second = await getBrowser();

      expect(second).toBe(first);
    },
    20_000,
  );
});

describe("withContext", () => {
  it("closes the context after fn resolves", async () => {
    const browser = await getBrowser();

    await withContext(browser, {}, async (context) => {
      expect(browser.contexts()).toContain(context);
    });

    expect(browser.contexts()).toHaveLength(0);
  });

  it("closes the context even when fn throws", async () => {
    const browser = await getBrowser();

    await expect(
      withContext(browser, {}, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(browser.contexts()).toHaveLength(0);
  });
});
