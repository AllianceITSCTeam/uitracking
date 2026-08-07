import { z } from "zod";
import { LOCATOR_STRATEGIES, TRACK_FIELDS } from "./registry.js";

const LocatorSchema = z
  .object({
    strategy: z.enum(LOCATOR_STRATEGIES),
    value: z.string().min(1),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const RegistryControlSchema = z
  .object({
    key: z.string().min(1),
    locator: LocatorSchema,
    track: z.array(z.enum(TRACK_FIELDS)).optional(),
  })
  .strict();

/** `locators/<screen-id>.locators.yaml` — xem UI-TRACKING-TOOL-PLAN.md §4.2. */
export const LocatorsFileSchema = z
  .object({
    screen: z.string().min(1),
    controls: z.array(RegistryControlSchema),
  })
  .strict();

export type LocatorsFile = z.infer<typeof LocatorsFileSchema>;

const AuthStepSchema = z.union([
  z.object({ fill: z.string().min(1), value: z.string() }).strict(),
  z.object({ click: z.string().min(1) }).strict(),
  z.object({ waitFor: z.string().min(1) }).strict(),
]);

const AuthConfigSchema = z
  .object({
    type: z.literal("form"),
    loginUrl: z.string().min(1),
    steps: z.array(AuthStepSchema),
    reuseSession: z.boolean().optional(),
  })
  .strict();

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

const LocaleSwitchSchema = z
  .object({
    strategy: z.enum(["url", "cookie", "ui-action"]),
    pattern: z.string().min(1),
  })
  .strict();

export type LocaleSwitch = z.infer<typeof LocaleSwitchSchema>;

const ScenarioStepSchema = z.union([
  z.object({ click: z.string().min(1) }).strict(),
  z.object({ waitFor: z.string().min(1) }).strict(),
]);

const IgnoreRuleSchema = z.union([
  z.object({ selector: z.string().min(1) }).strict(),
  z.object({ maskPattern: z.string().min(1) }).strict(),
]);

const ScreenConfigSchema = z
  .object({
    id: z.string().min(1),
    url: z.string().min(1),
    waitFor: z.string().min(1).optional(),
    scenario: z.array(ScenarioStepSchema).optional(),
    track: z.array(z.enum(TRACK_FIELDS)),
    tableContent: z.enum(["structure-only", "structure+content"]).optional(),
    ignore: z.array(IgnoreRuleSchema).optional(),
  })
  .strict();

export type ScreenConfig = z.infer<typeof ScreenConfigSchema>;

/** `screens.config.yaml` — xem UI-TRACKING-TOOL-PLAN.md §5. */
export const ScreensConfigSchema = z
  .object({
    baseUrl: z.string().url(),
    auth: AuthConfigSchema.optional(),
    locales: z.array(z.string().min(1)).min(1),
    localeSwitch: LocaleSwitchSchema.optional(),
    screens: z.array(ScreenConfigSchema).min(1),
  })
  .strict();

export type ScreensConfig = z.infer<typeof ScreensConfigSchema>;

const ProjectEntrySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    config: z.string().min(1),
  })
  .strict();

/** `workspace/projects.yaml` — xem UI-TRACKING-TOOL-PLAN.md §5.2. */
export const ProjectsFileSchema = z
  .object({
    projects: z.array(ProjectEntrySchema).min(1),
  })
  .strict();

export type ProjectsFile = z.infer<typeof ProjectsFileSchema>;
