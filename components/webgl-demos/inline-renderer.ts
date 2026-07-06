/**
 * inline-renderer：返回 vanilla WebGL2 全屏 triangle 渲染器的 HTML 字符串。
 *
 * 用途：
 * - 给 Cloudflare Functions 拼进 SSR HTML（无需 React 运行时）。
 * - 给 React 外壳直接 dangerouslySetInnerHTML 复用同一份渲染逻辑。
 *
 * 关键约束：
 * - renderShaderHTML 函数体是纯字符串拼接，绝不调用任何浏览器 API。
 *   浏览器 API 只存在于返回字符串里的 <script> IIFE 里。
 *   原因：Functions V8 会执行这个函数体拿字符串，此时没有 DOM。
 * - script 里所有 </script> 写成 <\/script> 避免提前闭合。
 *
 * 设计纪律（与 MiniShader.tsx 一致）：
 * - 全屏 triangle：顶点 [-1,-1, 3,-1, -1,3]。
 * - dpr = min(devicePixelRatio, 2)，ResizeObserver 调 canvas.width/height + gl.viewport。
 * - reduced-motion：只画首帧静态，不开 raf。
 * - IntersectionObserver：视口外 cancelAnimationFrame，进入恢复（重置 t0 避免时间跳变）。
 * - uniform-change CustomEvent：外部控件改 uniform 时实时下发到 shader。
 *
 * 所有代码与注释使用简体中文。
 */

import { DEMOS } from "./shaders";

export interface RenderShaderHTMLOpts {
  demoId: string;
  canvasId: string;
  height?: number;
}

/**
 * 生成一个 webgl-demo 容器（div + canvas + § label + 自执行 IIFE script）的 HTML 字符串。
 * 函数体纯字符串拼接，不调用任何浏览器 API。
 */
export function renderShaderHTML(opts: RenderShaderHTMLOpts): string {
  const { demoId, canvasId, height } = opts;
  const h = height ?? 320;
  const demo = DEMOS[demoId];
  if (!demo) {
    // 未知 demoId：返回空容器，避免脚本崩溃
    return (
      '<div class="webgl-demo" style="position:relative;width:100%;height:' +
      h +
      'px;border-radius:1rem;border:1px solid var(--border);background:var(--background-soft);overflow:hidden;"></div>'
    );
  }

  // 把 uniforms 的默认值序列化成 JS 字面量，注入 IIFE 闭包。
  // 注意：JSON.stringify 输出的数字字面量直接可被 JS 求值；数组也兼容。
  const uniformsLiteral = JSON.stringify(demo.uniforms);

  // IIFE 里所有逻辑：编译 shader、设置 uniform、跑 raf、监听事件。
  // 注意 </script> 写成 <\/script>，模板字符串里也要转义反斜杠。
  // 缩进保持可读，但用普通字符串拼接避免模板字符串的 ${} 干扰。
  const script =
    "(function(){" +
    // --- 闭包变量（从外层注入 demoId / canvasId / uniforms 默认值）---
    "var CANVAS_ID=" + JSON.stringify(canvasId) + ";" +
    "var DEMO_ID=" + JSON.stringify(demoId) + ";" +
    "var UNIFORM_DEFS=" + uniformsLiteral + ";" +
    "var LABEL=" + JSON.stringify(demo.label) + ";" +
    // --- 拿 canvas / 上下文 ---
    "var canvas=document.getElementById(CANVAS_ID);" +
    "if(!canvas){return;}" +
    // reduced-motion 首帧静态判断
    "var mql=window.matchMedia('(prefers-reduced-motion: reduce)');" +
    "var reduced=mql.matches;" +
    "var glCtx=canvas.getContext('webgl2',{antialias:false,alpha:true,premultipliedAlpha:true,powerPreference:'low-power'});" +
    "if(!glCtx){return;}" +
    "var gl=glCtx;" +
    // --- shader 源码（与 MiniShader 一致的 prelude）---
    "var VERT='#version 300 es\\nin vec2 a_pos;\\nvoid main(){gl_Position=vec4(a_pos,0.0,1.0);}';" +
    "var FRAG_PRELUDE='#version 300 es\\nprecision highp float;\\nuniform float iTime;\\nuniform vec2 iResolution;\\nout vec4 fragColor;\\n#define uv (gl_FragCoord.xy/iResolution.xy)\\n';" +
    // fragment 从 <script type='webgl-fragment'> 标签里取，避免字符串转义爆炸
    "var fragNode=document.getElementById(CANVAS_ID+'-frag');" +
    "var FRAG=fragNode?fragNode.textContent:'';" +
    "function compile(type,src){" +
    "var sh=gl.createShader(type);" +
    "gl.shaderSource(sh,src);" +
    "gl.compileShader(sh);" +
    "if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){" +
    "console.warn('shader compile error ['+DEMO_ID+']:',gl.getShaderInfoLog(sh));" +
    "gl.deleteShader(sh);" +
    "return null;" +
    "}" +
    "return sh;" +
    "}" +
    "var vs=compile(gl.VERTEX_SHADER,VERT);" +
    "var fs=compile(gl.FRAGMENT_SHADER,FRAG_PRELUDE+FRAG);" +
    "if(!vs||!fs){return;}" +
    "var prog=gl.createProgram();" +
    "gl.attachShader(prog,vs);" +
    "gl.attachShader(prog,fs);" +
    "gl.linkProgram(prog);" +
    "if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){" +
    "console.warn('program link error ['+DEMO_ID+']:',gl.getProgramInfoLog(prog));" +
    "return;" +
    "}" +
    "gl.useProgram(prog);" +
    // 全屏 triangle
    "var buf=gl.createBuffer();" +
    "gl.bindBuffer(gl.ARRAY_BUFFER,buf);" +
    "gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);" +
    "var aPos=gl.getAttribLocation(prog,'a_pos');" +
    "gl.enableVertexAttribArray(aPos);" +
    "gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);" +
    // 内置 uniform location
    "var uTime=gl.getUniformLocation(prog,'iTime');" +
    "var uRes=gl.getUniformLocation(prog,'iResolution');" +
    // 用户自定义 uniform：建 name->location 映射 + 当前值
    "var userLocs={};" +
    "var userVals={};" +
    "for(var i=0;i<UNIFORM_DEFS.length;i++){" +
    "var u=UNIFORM_DEFS[i];" +
    "userLocs[u.name]=gl.getUniformLocation(prog,u.name);" +
    // default: float 是 number，color 是 [r,g,b]
    "userVals[u.name]=u.default;" +
    "}" +
    // 应用一次默认值（创建 program 后立即 setUniform）
    "function applyUniform(name){" +
    "var loc=userLocs[name];" +
    "if(loc===null){return;}" +
    "var v=userVals[name];" +
    "if(typeof v==='number'){" +
    "gl.uniform1f(loc,v);" +
    "}else if(Array.isArray(v)){" +
    "gl.uniform3f(loc,v[0],v[1],v[2]);" +
    "}" +
    "}" +
    "for(var j=0;j<UNIFORM_DEFS.length;j++){" +
    "applyUniform(UNIFORM_DEFS[j].name);" +
    "}" +
    // 监听 canvas 上的 uniform-change CustomEvent
    "function onUniformChange(e){" +
    "var d=e.detail||{};" +
    "var name=d.name,value=d.value;" +
    "if(!(name in userVals)){return;}" +
    "userVals[name]=value;" +
    "applyUniform(name);" +
    // 视口外没在跑 raf 时也要立刻重画一帧，让控件反馈即时
    "if(!raf){" +
    "gl.uniform1f(uTime,0);" +
    "gl.uniform2f(uRes,canvas.width,canvas.height);" +
    "gl.clearColor(0,0,0,0);" +
    "gl.clear(gl.COLOR_BUFFER_BIT);" +
    "gl.drawArrays(gl.TRIANGLES,0,3);" +
    "}" +
    "}" +
    "canvas.addEventListener('uniform-change',onUniformChange);" +
    // --- resize ---
    "function resize(){" +
    "var dpr=Math.min(window.devicePixelRatio||1,2);" +
    "var w=Math.max(1,Math.floor(canvas.clientWidth*dpr));" +
    "var h=Math.max(1,Math.floor(canvas.clientHeight*dpr));" +
    "if(canvas.width!==w||canvas.height!==h){" +
    "canvas.width=w;canvas.height=h;" +
    "}" +
    "gl.viewport(0,0,w,h);" +
    "}" +
    "resize();" +
    "var ro=new ResizeObserver(resize);" +
    "ro.observe(canvas);" +
    // --- 渲染循环 ---
    "var raf=0;" +
    "var disposed=false;" +
    "var t0=performance.now();" +
    "function frame(){" +
    "if(disposed){return;}" +
    "raf=requestAnimationFrame(frame);" +
    "var t=(performance.now()-t0)/1000;" +
    "gl.uniform1f(uTime,t);" +
    "gl.uniform2f(uRes,canvas.width,canvas.height);" +
    "gl.clearColor(0,0,0,0);" +
    "gl.clear(gl.COLOR_BUFFER_BIT);" +
    "gl.drawArrays(gl.TRIANGLES,0,3);" +
    "}" +
    // 先画一帧（reduced-motion 下是唯一一帧）
    "gl.uniform1f(uTime,0);" +
    "gl.uniform2f(uRes,canvas.width,canvas.height);" +
    "gl.clearColor(0,0,0,0);" +
    "gl.clear(gl.COLOR_BUFFER_BIT);" +
    "gl.drawArrays(gl.TRIANGLES,0,3);" +
    // reduced-motion：不开 raf；视口外暂停，进入恢复（重置 t0）
    "var io=null;" +
    "if(!reduced){" +
    "io=new IntersectionObserver(function(entries){" +
    "if(disposed){return;}" +
    "var inView=entries[0].isIntersecting;" +
    "if(inView){" +
    "if(!raf){t0=performance.now();frame();}" +
    "}else{" +
    "if(raf){cancelAnimationFrame(raf);raf=0;}" +
    "}" +
    "},{threshold:0});" +
    "io.observe(canvas);" +
    "}" +
    // --- 清理：页面卸载时浏览器自动回收，这里不挂 unload； disposed 防止 raf 残留 ---
    "})();";

  // 把 fragment GLSL 放进 <script type='webgl-fragment'> 节点，IIFE 用 textContent 取出。
  // 这样 GLSL 里的特殊字符不需要转义，浏览器不会执行这个 script（type 不是 JS）。
  const fragScript =
    '<script type="text/webgl-fragment" id="' +
    canvasId +
    '-frag">' +
    demo.fragment +
    "<\/script>";

  // § label：mono 小字，左上角 absolute，混合 difference 让深浅背景都可见
  const labelHtml =
    '<span class="webgl-demo-label" style="pointer-events:none;position:absolute;left:0.5rem;top:0.375rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.6rem;line-height:1;letter-spacing:0.02em;color:var(--foreground-muted);mix-blend-difference;">§ ' +
    demo.label +
    "</span>";

  return (
    '<div class="webgl-demo" style="position:relative;width:100%;height:' +
    h +
    "px;border-radius:var(--radius-xl,1rem);border:1px solid var(--border);background:var(--background-soft);overflow:hidden;\">" +
    '<canvas id="' +
    canvasId +
    '" style="width:100%;height:100%;display:block;"></canvas>' +
    labelHtml +
    fragScript +
    "<script>" +
    script +
    "<\/script>" +
    "</div>"
  );
}
