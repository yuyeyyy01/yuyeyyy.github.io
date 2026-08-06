/**
 * GLSL ES 3.0 语义校验 —— 覆盖 GPU 编译器最常拒绝的几类问题。
 * 静态括号检查过不了的东西：类型不匹配、swizzle 越界、
 * 循环内 continue 前的资源、uniform 数组访问方式、隐式类型转换。
 */
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "..", "components", "about", "about-backdrop-shader.ts"),
  "utf8",
);
const glsl = src.match(/ABOUT_BACKDROP_FRAG = `([\s\S]*?)`;/)[1];
const lines = glsl.split("\n");
const errors = [];
const warns = [];

// --- 1. swizzle 合法性：对已知类型的变量检查分量数 ---
// 收集局部声明的类型
const varTypes = new Map();
const declRe = /\b(float|vec2|vec3|vec4|mat2|int)\s+([A-Za-z_]\w*)\s*(?:=|;|,|\))/g;
let dm;
while ((dm = declRe.exec(glsl))) varTypes.set(dm[2], dm[1]);
// uniform 也算
const uniRe = /uniform\s+(\w+)\s+(\w+)/g;
while ((dm = uniRe.exec(glsl))) varTypes.set(dm[2], dm[1]);

const widthOf = { float: 1, int: 1, vec2: 2, vec3: 3, vec4: 4 };
const swizRe = /\b([A-Za-z_]\w*)\.([xyzwrgbastpq]{1,4})\b/g;
let sm;
while ((sm = swizRe.exec(glsl))) {
  const [, name, comps] = sm;
  const ty = varTypes.get(name);
  if (!ty || !(ty in widthOf)) continue;
  const w = widthOf[ty];
  const order = "xyzw";
  for (const c of comps) {
    const idx = order.indexOf(c);
    if (idx >= 0 && idx >= w) {
      const ln = glsl.slice(0, sm.index).split("\n").length;
      errors.push(`第 ${ln} 行 swizzle 越界: ${name}(${ty}).${comps} —— .${c} 超出 ${w} 分量`);
    }
  }
}

// --- 2. uniform 数组下标：GLSL ES 3.0 允许循环变量索引 uniform 数组，
//     但数组必须是显式常量大小；同时检查未声明 RIPPLE_COUNT 却使用的情况 ---
if (/uniform\s+vec3\s+uRipples\s*\[\s*RIPPLE_COUNT\s*\]/.test(glsl)) {
  if (!/const\s+int\s+RIPPLE_COUNT\s*=\s*\d+/.test(glsl)) {
    errors.push("uRipples 用 RIPPLE_COUNT 作上界，但缺少 const int RIPPLE_COUNT 声明");
  }
}

// --- 3. 整数/浮点混用：GLSL ES 严格，1 和 1.0 不能混 ---
lines.forEach((ln, i) => {
  const s = ln.replace(/\/\/.*$/, "").trim();
  if (!s || s.startsWith("#")) return;
  // float 变量赋整数字面量，如 float x = 1;  (排除 for 里的 int i = 0)
  const m = s.match(/\bfloat\s+\w+\s*=\s*(-?\d+)\s*[;,)]/);
  if (m) errors.push(`第 ${i + 1} 行 float 赋整数字面量（需写 ${m[1]}.0）: ${s}`);
  // vec 构造里出现纯整数
  const vm = s.match(/\bvec[234]\s*\(([^)]*)\)/g);
  if (vm) {
    for (const call of vm) {
      const args = call.slice(call.indexOf("(") + 1, -1).split(",");
      for (const a of args) {
        const t = a.trim();
        if (/^-?\d+$/.test(t)) {
          errors.push(`第 ${i + 1} 行 vec 构造含整数字面量 "${t}"（需写 ${t}.0）: ${s}`);
        }
      }
    }
  }
});

// --- 4. 函数返回类型一致性：声明 vec3 的函数必须 return vec3 ---
const fnRe = /\b(float|vec2|vec3|vec4|mat2)\s+(\w+)\s*\([^)]*\)\s*\{/g;
let fm;
while ((fm = fnRe.exec(glsl))) {
  const [, retTy, name] = fm;
  // 截取函数体
  let depth = 0, i = glsl.indexOf("{", fm.index), start = i;
  do {
    if (glsl[i] === "{") depth++;
    else if (glsl[i] === "}") depth--;
    i++;
  } while (depth > 0 && i < glsl.length);
  const body = glsl.slice(start, i);
  const rets = [...body.matchAll(/return\s+([^;]+);/g)].map((r) => r[1].trim());
  if (rets.length === 0) {
    errors.push(`函数 ${name} 声明返回 ${retTy} 但没有 return`);
    continue;
  }
  for (const r of rets) {
    // 检查明显的类型不符：返回 vec3(...) 而声明 float 之类
    const ctor = r.match(/^(vec[234]|float)\s*\(/);
    if (ctor && ctor[1] !== retTy && !(retTy === "float" && ctor[1] === "float")) {
      if (widthOf[ctor[1]] !== widthOf[retTy]) {
        errors.push(`函数 ${name} 声明 ${retTy}，却 return ${ctor[1]}(...)`);
      }
    }
  }
}

// --- 5. 主函数必须给 fragColor 赋 vec4 ---
const fcm = glsl.match(/fragColor\s*=\s*([^;]+);/);
if (fcm && !/^vec4\s*\(/.test(fcm[1].trim())) {
  warns.push(`fragColor 赋值不是显式 vec4(...)：${fcm[1].trim()}`);
}

// --- 6. 检查 continue 在 for 循环内（GLSL ES 3.0 支持，但确认没在非循环处）---
lines.forEach((ln, i) => {
  if (/\bcontinue\b/.test(ln)) {
    const before = lines.slice(0, i).join("\n");
    const forCount = (before.match(/\bfor\s*\(/g) || []).length;
    if (forCount === 0) errors.push(`第 ${i + 1} 行 continue 不在循环内`);
  }
});

console.log("=== GLSL ES 3.0 语义校验 ===");
if (warns.length) {
  console.log("警告:");
  warns.forEach((w) => console.log("  ! " + w));
}
if (errors.length) {
  console.error("错误:");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("PASS: 无语义错误");
console.log(`已知变量类型 ${varTypes.size} 个，检查行数 ${lines.length}`);
