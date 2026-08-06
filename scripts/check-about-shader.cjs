/**
 * shader 语法自检 —— 不依赖浏览器。
 * 用 headless GL 不现实（无 GPU），改为做结构化静态检查：
 * 1. 括号/花括号配平
 * 2. uniform 声明必须在任何函数体之外
 * 3. main 存在且写了 fragColor
 * 4. 所有被调用的自定义函数都有定义
 * 5. GLSL ES 3.0 禁忌：uniform 数组下标必须常量表达式索引时用循环变量需 const 上界
 */
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "..", "components", "about", "about-backdrop-shader.ts"),
  "utf8",
);
const m = src.match(/ABOUT_BACKDROP_FRAG = `([\s\S]*?)`;/);
if (!m) {
  console.error("FAIL: 未能从 ts 文件中提取 shader 字符串");
  process.exit(1);
}
const PRELUDE = `#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;
#define uv (gl_FragCoord.xy / iResolution.xy)
`;
const glsl = PRELUDE + m[1];

// 剥离注释后的版本，用于符号分析 —— 否则注释里的 O(1)、f(x) 等
// 会被误判成函数调用
const code = glsl
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

const errors = [];

// 1. 配平
const pairs = [
  ["{", "}"],
  ["(", ")"],
  ["[", "]"],
];
for (const [o, c] of pairs) {
  const no = (glsl.match(new RegExp("\\" + o, "g")) || []).length;
  const nc = (glsl.match(new RegExp("\\" + c, "g")) || []).length;
  if (no !== nc) errors.push(`括号不配平 ${o}${c}: ${no} vs ${nc}`);
}

// 2. uniform 必须在顶层（花括号深度 0）
let depth = 0;
const lines = glsl.split("\n");
lines.forEach((ln, i) => {
  const stripped = ln.replace(/\/\/.*$/, "");
  if (/^\s*uniform\s/.test(stripped) && depth !== 0) {
    errors.push(`第 ${i + 1} 行 uniform 出现在函数体内（depth=${depth}）: ${ln.trim()}`);
  }
  for (const ch of stripped) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
});
if (depth !== 0) errors.push(`花括号最终深度非 0：${depth}`);

// 3. main + fragColor
if (!/void\s+main\s*\(\s*\)\s*\{/.test(glsl)) errors.push("缺少 void main()");
if (!/fragColor\s*=/.test(glsl)) errors.push("main 未写入 fragColor");

// 4. 自定义函数定义 vs 调用
const defined = new Set();
const defRe = /^\s*(?:float|vec2|vec3|vec4|mat2|void|int)\s+([A-Za-z_]\w*)\s*\(/gm;
let dm;
while ((dm = defRe.exec(code))) defined.add(dm[1]);

// #define 出来的宏也算已定义符号
const macroRe = /^\s*#define\s+([A-Za-z_]\w*)/gm;
let mm;
while ((mm = macroRe.exec(glsl))) defined.add(mm[1]);

const builtins = new Set([
  "main", "sin", "cos", "tan", "abs", "floor", "fract", "mix", "smoothstep",
  "clamp", "length", "dot", "normalize", "exp", "pow", "sqrt", "max", "min",
  "radians", "mat2", "vec2", "vec3", "vec4", "step", "atan", "mod", "sign",
  "cross", "reflect", "texture", "distance", "for", "if", "while", "return",
]);
const callRe = /([A-Za-z_]\w*)\s*\(/g;
let cm;
const missing = new Set();
while ((cm = callRe.exec(code))) {
  const name = cm[1];
  if (!defined.has(name) && !builtins.has(name)) missing.add(name);
}
if (missing.size) errors.push(`调用了未定义的函数: ${[...missing].join(", ")}`);

// 5. uniform 数组必须有常量上界
const arrRe = /uniform\s+\w+\s+(\w+)\s*\[\s*([^\]]+)\s*\]/g;
let am;
while ((am = arrRe.exec(code))) {
  const bound = am[2].trim();
  const isNum = /^\d+$/.test(bound);
  const isConst = new RegExp(`const\\s+int\\s+${bound}\\s*=`).test(glsl);
  if (!isNum && !isConst) {
    errors.push(`uniform 数组 ${am[1]} 的上界 "${bound}" 不是常量`);
  }
}

// 6. 检查 uniform 名单，供 JS 侧核对
const uniforms = [...glsl.matchAll(/^\s*uniform\s+(\w+)\s+(\w+)/gm)].map(
  (u) => `${u[1]} ${u[2]}`,
);

if (errors.length) {
  console.error("FAIL:");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("PASS: shader 静态检查通过");
console.log("行数:", lines.length);
console.log("uniforms:", uniforms.join(" | "));
console.log("自定义函数:", [...defined].join(", "));
