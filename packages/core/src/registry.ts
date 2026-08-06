/** Thứ tự ưu tiên strategy — xem UI-TRACKING-TOOL-PLAN.md §4.1 (bất biến số 1). */
export const LOCATOR_STRATEGIES = [
  "getByTestId",
  "getByRole",
  "getByLabel",
  "getByPlaceholder",
  "getByText",
  "css",
] as const;

export type LocatorStrategy = (typeof LOCATOR_STRATEGIES)[number];

export type Locator = {
  strategy: LocatorStrategy;
  value: string;
  options?: Record<string, unknown>;
};

export const TRACK_FIELDS = ["text", "type", "options", "style", "structure"] as const;

export type TrackField = (typeof TRACK_FIELDS)[number];

export type RegistryControl = {
  key: string;
  locator: Locator;
  track?: TrackField[];
};
