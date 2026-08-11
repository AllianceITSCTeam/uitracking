import ts from "typescript";
import type { LocatorsFile } from "./config.js";
import { LOCATOR_STRATEGIES, type Locator, type RegistryControl } from "./registry.js";

export type TsLocatorImportSkip = { name: string; reason: string };

export type TsLocatorImportResult = {
  file: LocatorsFile;
  skipped: TsLocatorImportSkip[];
};

const NON_CSS_STRATEGIES = LOCATOR_STRATEGIES.filter((s) => s !== "css");

type ChainStep = { method: string; args: readonly ts.Expression[] };

/**
 * Parse file Page-Object Playwright (.ts) — chỉ convert getter/method zero-arg trả về 1 locator
 * call bắt đầu từ `this.page`. Pattern khác (tham số, chain trộn strategy, regex name phức tạp)
 * bị đẩy vào `skipped` kèm lý do — không được âm thầm bỏ qua (bất biến #1 CLAUDE.md).
 */
export function parseTsLocatorFile(source: string, screenId: string): TsLocatorImportResult {
  const sourceFile = ts.createSourceFile("locators.ts", source, ts.ScriptTarget.Latest, true);
  const controls: RegistryControl[] = [];
  const skipped: TsLocatorImportSkip[] = [];

  const classMembers: ts.ClassElement[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node)) {
      classMembers.push(...node.members);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  for (const member of classMembers) {
    const parsed = parseMember(member);
    if (!parsed) continue;
    const { name, paramCount, returnExpr } = parsed;

    if (paramCount > 0) {
      skipped.push({ name, reason: "Có tham số, không convert được sang giá trị tĩnh" });
      continue;
    }
    if (!returnExpr) {
      skipped.push({ name, reason: "Không tìm thấy return đơn giản trả về locator" });
      continue;
    }

    const chain = unwindChain(returnExpr);
    if (!chain || chain.base !== "page") {
      skipped.push({ name, reason: "Locator không bắt đầu trực tiếp từ this.page" });
      continue;
    }

    const control = convertChain(name, chain.steps);
    if (typeof control === "string") {
      skipped.push({ name, reason: control });
      continue;
    }
    controls.push(control);
  }

  return { file: { screen: screenId, controls }, skipped };
}

function parseMember(
  member: ts.ClassElement,
): { name: string; paramCount: number; returnExpr: ts.Expression | null } | null {
  let name: string | null = null;
  let params: ts.NodeArray<ts.ParameterDeclaration> | undefined;
  let body: ts.Block | undefined;

  if (ts.isGetAccessorDeclaration(member)) {
    name = memberName(member.name);
    params = member.parameters;
    body = member.body;
  } else if (ts.isMethodDeclaration(member)) {
    name = memberName(member.name);
    params = member.parameters;
    body = member.body;
  } else {
    return null;
  }

  if (name === null) return null;

  return { name, paramCount: params?.length ?? 0, returnExpr: body ? extractSingleReturn(body) : null };
}

function memberName(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) ? name.text : null;
}

function extractSingleReturn(body: ts.Block): ts.Expression | null {
  if (body.statements.length !== 1) return null;
  const stmt = body.statements[0];
  if (!stmt || !ts.isReturnStatement(stmt) || !stmt.expression) return null;
  return stmt.expression;
}

function unwindChain(expr: ts.Expression): { base: string; steps: ChainStep[] } | null {
  const steps: ChainStep[] = [];
  let current: ts.Expression = expr;
  while (ts.isCallExpression(current)) {
    const callee = current.expression;
    if (!ts.isPropertyAccessExpression(callee)) return null;
    steps.unshift({ method: callee.name.text, args: current.arguments });
    current = callee.expression;
  }
  if (ts.isPropertyAccessExpression(current) && current.expression.kind === ts.SyntaxKind.ThisKeyword) {
    return { base: current.name.text, steps };
  }
  return null;
}

function convertChain(name: string, steps: ChainStep[]): RegistryControl | string {
  if (steps.length === 0) return "Không nhận diện được locator call";

  if (steps.length === 1) {
    const step = steps[0]!;

    if (step.method === "locator") {
      const value = stringLiteralValue(step.args[0]);
      if (value === null) return "Giá trị locator không phải chuỗi literal";
      return { key: name, locator: { strategy: "css", value } };
    }

    if ((NON_CSS_STRATEGIES as readonly string[]).includes(step.method)) {
      const value = stringLiteralValue(step.args[0]);
      if (value === null) return "Giá trị locator không phải chuỗi literal";

      const optionsResult = extractOptions(step.args[1]);
      if ("error" in optionsResult) return optionsResult.error;

      const locator: Locator = { strategy: step.method as Locator["strategy"], value };
      if (optionsResult.options) locator.options = optionsResult.options;
      return { key: name, locator };
    }

    return `Method "${step.method}" không phải locator strategy được hỗ trợ`;
  }

  const cssValues: string[] = [];
  for (const step of steps) {
    if (step.method !== "locator") {
      return "Chain locator trộn nhiều strategy, không tự convert được";
    }
    const value = stringLiteralValue(step.args[0]);
    if (value === null) return "Giá trị locator không phải chuỗi literal";
    cssValues.push(value);
  }
  return { key: name, locator: { strategy: "css", value: cssValues.join(" ") } };
}

function stringLiteralValue(arg: ts.Expression | undefined): string | null {
  if (arg && ts.isStringLiteralLike(arg)) return arg.text;
  return null;
}

function extractOptions(
  arg: ts.Expression | undefined,
): { options?: Record<string, unknown> } | { error: string } {
  if (arg === undefined) return {};
  if (!ts.isObjectLiteralExpression(arg)) return { error: "Tham số thứ 2 không phải object literal" };

  const nameProp = arg.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "name",
  );
  const otherProps = arg.properties.filter((p) => p !== nameProp);
  if (otherProps.length > 0) {
    return { error: "options chứa field không hỗ trợ (chỉ hỗ trợ name)" };
  }
  if (!nameProp) return {};

  const nameResult = extractNameOption(nameProp.initializer);
  if ("error" in nameResult) return nameResult;
  return { options: { name: nameResult.value } };
}

function extractNameOption(expr: ts.Expression): { value: string } | { error: string } {
  if (ts.isStringLiteralLike(expr)) {
    return { value: expr.text };
  }
  if (ts.isRegularExpressionLiteral(expr)) {
    return stripSimpleRegex(expr.text);
  }
  return { error: "name không phải chuỗi hoặc regex đơn giản" };
}

function stripSimpleRegex(text: string): { value: string } | { error: string } {
  const lastSlash = text.lastIndexOf("/");
  const body = text.slice(1, lastSlash).replace(/^\^/, "").replace(/\$$/, "");
  if (/[.*+?^${}()|[\]\\]/.test(body)) {
    return { error: "name là regex phức tạp, không tự convert được" };
  }
  return { value: body };
}
