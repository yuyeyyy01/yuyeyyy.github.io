/**
 * 生成关于页背景 + 工作经历的自包含预览页。
 *
 * 目的：项目 node_modules 半损坏跑不了 next build，
 * 但 shader 是否能在 GPU 上编译通过、涟漪交互手感对不对，
 * 必须真机验证。这里把真实 shader 源码 + 真实交互逻辑
 * 内联进一个 HTML，浏览器直接打开即可验收。
 *
 * 注意：预览页只用于验证视觉与交互，不是站点产物。
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const shaderTs = fs.readFileSync(
  path.join(root, "components/about/about-backdrop-shader.ts"),
  "utf8",
);
const frag = shaderTs.match(/ABOUT_BACKDROP_FRAG = `([\s\S]*?)`;/)[1];

// 从真实数据文件里抽 CAREER_ITEMS，保证预览和站点同源
const dataTs = fs.readFileSync(path.join(root, "lib/about-data.ts"), "utf8");
const careerBlock = dataTs.match(
  /export const CAREER_ITEMS: CareerItem\[\] = (\[[\s\S]*?\n\]);/,
)[1];
// 去掉 TS 特有语法后用 Function 求值（纯数据字面量，安全）
const CAREER_ITEMS = new Function("return " + careerBlock)();

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>关于页背景 + 工作经历 · 预览</title>
<style>
:root, [data-theme="dark"] {
  --background: #070708; --surface: #0e0f11; --surface-2: #141518;
  --foreground: #e8eaed; --foreground-soft: #a7adb5; --foreground-muted: #6c727a;
  --border: rgba(255,255,255,.07); --border-strong: rgba(255,255,255,.13);
  --accent: #4fd2c6; --accent-warm: #e8b04b;
}
[data-theme="light"] {
  --background: #f6f6f4; --surface: #ffffff; --surface-2: #f1f0ec;
  --foreground: #14161a; --foreground-soft: #4a4f57; --foreground-muted: #868c96;
  --border: rgba(0,0,0,.09); --border-strong: rgba(0,0,0,.16);
  --accent: #0e8c82; --accent-warm: #b8841f;
}
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; position: relative;
  background: var(--background); color: var(--foreground);
  font-family: "PingFang SC","Noto Sans SC",-apple-system,"Segoe UI",sans-serif;
  line-height: 1.47; -webkit-font-smoothing: antialiased;
  transition: background-color .3s ease, color .3s ease;
}
.about-backdrop { position: fixed; inset: 0; z-index: -2; pointer-events: none; background: var(--background); }
.about-backdrop canvas { display: block; width: 100%; height: 100%; }
.about-page { position: relative; z-index: 0; }
.container-page { max-width: 1080px; margin: 0 auto; padding: 0 1.5rem; }
@media (min-width: 768px) { .container-page { padding: 0 2rem; } }
section { padding: 5rem 0; }
.section-rule {
  display: flex; align-items: center; gap: .75rem;
  font-family: "JetBrains Mono",ui-monospace,monospace;
  font-size: .72rem; letter-spacing: .08em; color: var(--foreground-muted);
}
.section-rule::after { content: ""; flex: 1; height: 1px; background: var(--border-strong); }
h1,h2,h3,header p,.section-rule {
  text-shadow: 0 0 12px color-mix(in srgb, var(--background) 82%, transparent),
               0 0 4px color-mix(in srgb, var(--background) 70%, transparent);
}
h2 { font-family: "Source Han Serif SC","Songti SC",serif; font-size: 2.25rem; margin: 1.25rem 0 0; letter-spacing: -.02em; }
header p { margin: 1rem 0 0; max-width: 42rem; color: var(--foreground-soft); }
.card {
  background: color-mix(in srgb, var(--surface) 62%, transparent);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--border-strong); border-radius: .625rem;
  padding: 1.25rem;
}
[data-theme="light"] .card { background: color-mix(in srgb, var(--surface) 72%, transparent); }
ol.career { list-style: none; padding: 0; margin: 2.5rem 0 0; }
ol.career > li { position: relative; }
.row { display: grid; grid-template-columns: 1fr; gap: 0 1.5rem; }
@media (min-width: 768px) { .row { grid-template-columns: 132px 1fr; } }
.when { padding-bottom: .75rem; }
@media (min-width: 768px) { .when { text-align: right; padding: 1.25rem 0 0; } }
.mono { font-family: "JetBrains Mono",ui-monospace,monospace; }
.when time { display: block; font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: var(--foreground-soft); }
.when span { display: block; margin-top: .25rem; font-size: .66rem; text-transform: uppercase; letter-spacing: .08em; color: var(--foreground-muted); }
.track { position: relative; padding-left: 1.5rem; border-left: 2px solid var(--border); padding-bottom: 2rem; }
.track.last { border-left: 0; }
.track.last .stub { position: absolute; left: 0; top: 0; width: 2px; height: 1.75rem; background: var(--border); }
.node { position: absolute; left: -7px; top: 1.25rem; width: 12px; height: 12px; border-radius: 999px; border: 2px solid var(--accent); background: var(--background); }
.node.on { background: var(--accent); }
.pulse { position: absolute; left: -13px; top: 14px; width: 24px; height: 24px; border-radius: 999px; border: 1px solid var(--accent); animation: career-pulse 2.8s ease-out infinite; }
@keyframes career-pulse { 0% { transform: scale(.55); opacity: .85; } 70%,100% { transform: scale(1.15); opacity: 0; } }
.rolerow { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.rolerow h3 { font-family: "Source Han Serif SC","Songti SC",serif; font-size: 1.125rem; margin: 0; }
.badge { border: 1px solid var(--accent); color: var(--accent); border-radius: 3px; padding: .1rem .375rem; font-size: .6rem; text-transform: uppercase; letter-spacing: .08em; }
.idx { margin-left: auto; font-size: .66rem; color: var(--foreground-muted); font-variant-numeric: tabular-nums; }
.company { margin: .25rem 0 0; font-size: .78rem; color: var(--accent); }
.summary { margin: .75rem 0 0; font-size: .875rem; color: var(--foreground-soft); }
ul.hl { list-style: none; margin: 1rem 0 0; padding: 1rem 0 0; border-top: 1px solid var(--border); }
ul.hl li { display: flex; gap: .625rem; margin-bottom: .625rem; }
ul.hl li::before { content: ""; flex: 0 0 auto; width: 4px; height: 4px; border-radius: 999px; background: var(--accent-warm); margin-top: .42rem; }
ul.hl span { font-size: .875rem; color: var(--foreground-soft); }
ul.stack { list-style: none; display: flex; flex-wrap: wrap; gap: .375rem; margin: 1rem 0 0; padding: 0; }
ul.stack li { border: 1px solid var(--border); background: color-mix(in srgb, var(--surface-2) 66%, transparent); border-radius: 4px; padding: .1rem .5rem; font-size: .68rem; color: var(--foreground-soft); }
.panel { position: fixed; right: 1rem; top: 1rem; z-index: 10; display: flex; gap: .5rem; }
.panel button { font-family: "JetBrains Mono",monospace; font-size: .7rem; padding: .4rem .7rem; border-radius: 6px; border: 1px solid var(--border-strong); background: color-mix(in srgb, var(--surface) 80%, transparent); color: var(--foreground); cursor: pointer; backdrop-filter: blur(10px); }
.hint { position: fixed; left: 1rem; bottom: 1rem; z-index: 10; font-family: "JetBrains Mono",monospace; font-size: .7rem; color: var(--foreground-muted); }
#glerr { position: fixed; left: 1rem; top: 1rem; z-index: 20; max-width: 60ch; font-family: monospace; font-size: .7rem; color: #ff8080; white-space: pre-wrap; }
</style>
</head>
<body>
<div class="about-backdrop" aria-hidden><canvas id="bg"></canvas></div>
<div id="glerr"></div>
<div class="panel">
  <button id="theme">切换主题</button>
</div>
<div class="hint">移动鼠标产生涟漪 · 点击产生单次强涟漪</div>

<main class="about-page">
  <section class="container-page">
    <div class="section-rule"><span>§ About</span></div>
    <h2 style="font-size:3rem">关于我</h2>
    <header><p>这是背景交互与工作经历板块的预览页。背景参考 leyangzhang.cargo.site 的 legacy/ripple：鼠标划过留下扩散涟漪，底图沿 352° 方向缓慢漂移。</p></header>
  </section>

  <section class="container-page">
    <div class="section-rule"><span>§ Career</span></div>
    <h2>工作经历</h2>
    <header><p>按职业阶段倒序排列。每段列出实际负责的系统与产出，<span class="mono" style="color:var(--accent)">§ active</span> 标记当前在职。</p></header>
    <ol class="career">
${CAREER_ITEMS.map((it, i) => {
  const last = i === CAREER_ITEMS.length - 1;
  return `      <li>
        <div class="row">
          <div class="when mono"><time>${it.period}</time><span>${it.location}</span></div>
          <div class="track${last ? " last" : ""}">
            ${last ? '<span class="stub"></span>' : ""}
            <span class="node${it.current ? " on" : ""}"></span>
            ${it.current ? '<span class="pulse"></span>' : ""}
            <article class="card">
              <div class="rolerow">
                <h3>${it.role}</h3>
                ${it.current ? '<span class="badge mono">§ active</span>' : ""}
                <span class="idx mono">${String(CAREER_ITEMS.length - i).padStart(2, "0")}</span>
              </div>
              <p class="company mono">${it.company}</p>
              <p class="summary">${it.summary}</p>
              <ul class="hl">${it.highlights.map((h) => `<li><span>${h}</span></li>`).join("")}</ul>
              <ul class="stack mono">${it.stack.map((s) => `<li>${s}</li>`).join("")}</ul>
            </article>
          </div>
        </div>
      </li>`;
}).join("\n")}
    </ol>
  </section>
</main>

<script type="text/plain" id="frag">${frag}</script>
<script>
const RIPPLE_COUNT = 8;
const VERT = \`#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }\`;
const PRELUDE = \`#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;
#define uv (gl_FragCoord.xy / iResolution.xy)
\`;
const FRAG = PRELUDE + document.getElementById('frag').textContent;
const errBox = document.getElementById('glerr');

const canvas = document.getElementById('bg');
const gl = canvas.getContext('webgl2', { antialias:false, alpha:false, powerPreference:'low-power' });
if (!gl) { errBox.textContent = 'WebGL2 不可用'; }

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    errBox.textContent = 'SHADER 编译失败:\\n' + gl.getShaderInfoLog(sh);
    return null;
  }
  return sh;
}
const vs = compile(gl.VERTEX_SHADER, VERT);
const fs = compile(gl.FRAGMENT_SHADER, FRAG);
let prog = null;
if (vs && fs) {
  prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    errBox.textContent = 'LINK 失败:\\n' + gl.getProgramInfoLog(prog);
    prog = null;
  }
}

if (prog) {
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'iTime');
  const uRes = gl.getUniformLocation(prog, 'iResolution');
  const uRip = gl.getUniformLocation(prog, 'uRipples[0]');
  const uTheme = gl.getUniformLocation(prog, 'uTheme');
  const uFade = gl.getUniformLocation(prog, 'uPointerFade');
  errBox.textContent = 'shader OK · uniforms: ' +
    [uTime,uRes,uRip,uTheme,uFade].map((u,i)=>['iTime','iResolution','uRipples','uTheme','uPointerFade'][i]+(u?'✓':'✗')).join(' ');
  setTimeout(()=>{ errBox.textContent=''; }, 3000);

  const ripples = new Float32Array(RIPPLE_COUNT * 3);
  let cursor = 0, lastDrop = null;
  let fade = 0, fadeTarget = 0;
  let themeCur = 1, themeTarget = 1;
  let t0 = performance.now(), lastT = 0;

  function resize() {
    const s = matchMedia('(max-width:768px)').matches ? 0.6 : 0.5;
    const w = Math.max(1, Math.floor(canvas.clientWidth * s));
    const h = Math.max(1, Math.floor(canvas.clientHeight * s));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0,0,w,h);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  function toShader(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const a = r.width / Math.max(r.height,1);
    const nx = (cx - r.left)/Math.max(r.width,1);
    const ny = 1 - (cy - r.top)/Math.max(r.height,1);
    return [(nx-0.5)*a, ny-0.5];
  }
  function drop(cx, cy) {
    const [x,y] = toShader(cx, cy);
    if (lastDrop) {
      const dx=x-lastDrop[0], dy=y-lastDrop[1];
      if (dx*dx+dy*dy < 0.0024) return;
    }
    lastDrop=[x,y];
    const t=(performance.now()-t0)/1000;
    const i=cursor*3;
    ripples[i]=x; ripples[i+1]=y; ripples[i+2]=t;
    cursor=(cursor+1)%RIPPLE_COUNT;
  }
  addEventListener('pointermove', e => { fadeTarget=1; drop(e.clientX,e.clientY); }, {passive:true});
  addEventListener('pointerdown', e => { fadeTarget=1; lastDrop=null; drop(e.clientX,e.clientY); }, {passive:true});
  document.addEventListener('pointerleave', () => { fadeTarget=0; lastDrop=null; });

  function frame() {
    requestAnimationFrame(frame);
    const t=(performance.now()-t0)/1000;
    const dt=Math.min(t-lastT, 0.05); lastT=t;
    fade += (fadeTarget-fade)*(1-Math.exp(-dt*3.2));
    themeCur += (themeTarget-themeCur)*(1-Math.exp(-dt*5.0));
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform3fv(uRip, ripples);
    gl.uniform1f(uTheme, themeCur);
    gl.uniform1f(uFade, fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  frame();

  document.getElementById('theme').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    themeTarget = next === 'light' ? 0 : 1;
  };
} else {
  document.getElementById('theme').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'light' ? 'dark' : 'light');
  };
}
</script>
</body>
</html>`;

const outDir = path.join(root, ".workbuddy", "preview");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "about-preview.html");
// Windows 上若文件被静态服务器占用会 EPERM，先写临时文件再原子替换
const tmp = out + ".tmp";
fs.writeFileSync(tmp, html, "utf8");
try {
  fs.renameSync(tmp, out);
} catch {
  // 替换失败则退回带序号的新文件，保证总能产出可看的结果
  const alt = path.join(outDir, "about-preview-2.html");
  fs.renameSync(tmp, alt);
  console.log("主文件被占用，已输出:", alt);
  console.log("career 条目数:", CAREER_ITEMS.length);
  process.exit(0);
}
console.log("生成:", out);
console.log("career 条目数:", CAREER_ITEMS.length);
