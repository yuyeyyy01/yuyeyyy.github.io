/**
 * 新增文件的独立语法 / JSX 校验 —— 不依赖 next 包是否完整。
 * 用 TypeScript 编译器 API 单文件解析，只关心：
 * 语法错误、JSX 结构错误、未闭合标签、非法表达式。
 * 类型解析（import 'next' 等）刻意跳过，那是环境问题不是代码问题。
 */
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = [
  "components/about/AboutBackdrop.tsx",
  "components/about/CareerTimeline.tsx",
  "components/about/about-backdrop-shader.ts",
  "lib/about-data.ts",
  "app/about/page.tsx",
];

let failed = false;

for (const rel of targets) {
  const file = path.join(root, rel);
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  // parseDiagnostics 是内部字段，含纯语法错误
  const diags = sf.parseDiagnostics || [];
  if (diags.length) {
    failed = true;
    console.error(`FAIL ${rel}`);
    for (const d of diags) {
      const { line, character } = sf.getLineAndCharacterOfPosition(d.start);
      console.error(
        `  ${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
      );
    }
  } else {
    // 统计一些结构信息，便于人工核对
    let jsxOpen = 0;
    let exports = [];
    const visit = (node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) jsxOpen++;
      if (
        (ts.isVariableStatement(node) ||
          ts.isFunctionDeclaration(node) ||
          ts.isInterfaceDeclaration(node)) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        if (ts.isFunctionDeclaration(node) && node.name)
          exports.push(node.name.text);
        else if (ts.isInterfaceDeclaration(node)) exports.push(node.name.text);
        else if (ts.isVariableStatement(node))
          node.declarationList.declarations.forEach((d) =>
            exports.push(d.name.getText(sf)),
          );
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    console.log(
      `PASS ${rel}  (jsx nodes: ${jsxOpen}, exports: ${exports.join(", ") || "default only"})`,
    );
  }
}

process.exit(failed ? 1 : 0);
