/**
 * vanilla WebGL2 mesh 渲染器（替代 react-three-fiber 的 <Scene>）。
 *
 * 导出 renderSceneHTML(opts) 返回一段自包含的 HTML 字符串，内含 <script> IIFE：
 *   - 手写最简 mat4 矩阵库（不引 gl-matrix / three.js）
 *   - Blinn-Phong（view space）顶点 + 片段着色器（GLSL ES 3.0）
 *   - 八面体 / 二十面体几何（顶点法线 = 归一化顶点位置）
 *   - 球坐标轨道相机：拖拽旋转、滚轮缩放、可选自动旋转
 *   - dpr 限制、ResizeObserver、IntersectionObserver、reduced-motion
 *
 * 约定：
 *   - 模块顶层不调用任何浏览器 API
 *   - renderSceneHTML 函数体纯字符串拼接，不调用任何浏览器 API
 *   - 所有 document / WebGL / ResizeObserver / IntersectionObserver 调用都在
 *     返回字符串里的 <script> IIFE 内执行
 *   - 字符串中 </script> 写成 <\/script>，避免外层 HTML 解析误判
 */

export interface RenderSceneHTMLOpts {
  /** canvas 元素的 id */
  canvasId: string;
  /** 容器高度（px），默认 320 */
  height?: number;
  /** 是否自动旋转，默认 false */
  autoRotate?: boolean;
  /** 几何类型，默认 'octahedron' */
  mesh?: 'octahedron' | 'icosahedron';
}

/**
 * 返回一段 HTML 字符串，插入页面后即可渲染可交互的 mesh 场景。
 * 失败时（如 WebGL2 不可用）IIFE 内部 console.warn 不抛错。
 */
export function renderSceneHTML(opts: RenderSceneHTMLOpts): string {
  const height = opts.height ?? 320;
  const autoRotate = opts.autoRotate ?? false;
  const mesh = opts.mesh ?? 'octahedron';
  const canvasId = opts.canvasId;

  // 下方所有 JS 都嵌入返回字符串的 IIFE 里运行，这里只做字符串拼接
  const script = `(function(){
  var canvasId = ${JSON.stringify(canvasId)};
  var autoRotate = ${JSON.stringify(autoRotate)};
  var meshKind = ${JSON.stringify(mesh)};

  try {
    var canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn('scene mesh: canvas not found', canvasId); return; }
    var gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) { console.warn('scene mesh: webgl2 not supported'); return; }

    // ---- mat4 库（最简，column-major，不依赖 gl-matrix） ----
    function m4Identity(){
      return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    }
    function m4Perspective(fovy, aspect, near, far){
      var f = 1.0 / Math.tan(fovy / 2);
      var nf = 1.0 / (near - far);
      var o = new Float32Array(16);
      o[0] = f / aspect;
      o[5] = f;
      o[10] = (far + near) * nf;
      o[11] = -1;
      o[14] = 2 * far * near * nf;
      return o;
    }
    function m4LookAt(eye, center, up){
      // z = normalize(eye - center)
      var z0 = eye[0]-center[0], z1 = eye[1]-center[1], z2 = eye[2]-center[2];
      var zl = Math.hypot(z0,z1,z2) || 1; z0/=zl; z1/=zl; z2/=zl;
      // x = normalize(up × z)
      var x0 = up[1]*z2 - up[2]*z1;
      var x1 = up[2]*z0 - up[0]*z2;
      var x2 = up[0]*z1 - up[1]*z0;
      var xl = Math.hypot(x0,x1,x2) || 1; x0/=xl; x1/=xl; x2/=xl;
      // y = z × x
      var y0 = z1*x2 - z2*x1;
      var y1 = z2*x0 - z0*x2;
      var y2 = z0*x1 - z1*x0;
      var o = new Float32Array(16);
      o[0]=x0; o[1]=y0; o[2]=z0; o[3]=0;
      o[4]=x1; o[5]=y1; o[6]=z1; o[7]=0;
      o[8]=x2; o[9]=y2; o[10]=z2; o[11]=0;
      o[12]=-(x0*eye[0]+x1*eye[1]+x2*eye[2]);
      o[13]=-(y0*eye[0]+y1*eye[1]+y2*eye[2]);
      o[14]=-(z0*eye[0]+z1*eye[1]+z2*eye[2]);
      o[15]=1;
      return o;
    }
    function m4Mul(a, b){
      // C = A * B，column-major：out[col*4+row] = sum_k a[k*4+row] * b[col*4+k]
      var o = new Float32Array(16);
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          var s = 0;
          for (var k = 0; k < 4; k++) s += a[k*4+j] * b[i*4+k];
          o[i*4+j] = s;
        }
      }
      return o;
    }
    function m4RotY(r){
      var c = Math.cos(r), s = Math.sin(r);
      return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
    }
    function m4RotX(r){
      var c = Math.cos(r), s = Math.sin(r);
      return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
    }

    // ---- 几何：顶点交错 pos.xyz + normal.xyz，法线 = normalize(position) ----
    function octahedronGeo(){
      // 6 顶点：±X、±Y、±Z 单位向量
      var positions = [
        1,0,0,  -1,0,0,  0,1,0,  0,-1,0,  0,0,1,  0,0,-1
      ];
      // 8 个三角面（禁用背面剔除，顺序无要求）
      var indices = [
        0,2,4,  0,4,3,  0,3,5,  0,5,2,
        1,4,2,  1,3,4,  1,5,3,  1,2,5
      ];
      var verts = new Float32Array(6 * 6);
      for (var i = 0; i < 6; i++) {
        var px = positions[i*3], py = positions[i*3+1], pz = positions[i*3+2];
        // 顶点已在单位球上，法线 = 位置
        verts[i*6+0]=px; verts[i*6+1]=py; verts[i*6+2]=pz;
        verts[i*6+3]=px; verts[i*6+4]=py; verts[i*6+5]=pz;
      }
      return { verts: verts, indices: new Uint16Array(indices) };
    }

    function icosahedronGeo(){
      // 黄金比例
      var t = (1 + Math.sqrt(5)) / 2;
      // 12 顶点：(±1,±t,0), (0,±1,±t), (±t,0,±1)
      var positions = [
        -1, t, 0,    1, t, 0,    -1, -t, 0,   1, -t, 0,
         0, -1, t,   0, 1, t,    0, -1, -t,   0, 1, -t,
         t, 0, -1,   t, 0, 1,    -t, 0, -1,   -t, 0, 1
      ];
      // 20 个三角面（标准 icosahedron 拓扑）
      var indices = [
        0,11,5,   0,5,1,    0,1,7,    0,7,10,   0,10,11,
        1,5,9,    5,11,4,   11,10,2,  10,7,6,   7,1,8,
        3,9,4,    3,4,2,    3,2,6,    3,6,8,    3,8,9,
        4,9,5,    2,4,11,   6,2,10,   8,6,7,    9,8,1
      ];
      var verts = new Float32Array(12 * 6);
      for (var i = 0; i < 12; i++) {
        var px = positions[i*3], py = positions[i*3+1], pz = positions[i*3+2];
        var l = Math.hypot(px, py, pz) || 1;
        verts[i*6+0]=px; verts[i*6+1]=py; verts[i*6+2]=pz;
        // 法线 = 归一化位置（球状对称几何）
        verts[i*6+3]=px/l; verts[i*6+4]=py/l; verts[i*6+5]=pz/l;
      }
      return { verts: verts, indices: new Uint16Array(indices) };
    }

    var geo = meshKind === 'icosahedron' ? icosahedronGeo() : octahedronGeo();

    // ---- 着色器源码（GLSL ES 3.0）----
    var VS = [
      '#version 300 es',
      'in vec3 a_pos;',
      'in vec3 a_normal;',
      'uniform mat4 uModel;',
      'uniform mat4 uView;',
      'uniform mat4 uProj;',
      'out vec3 vNormal;',
      'out vec3 vPos;',
      'void main(){',
      '  vec4 wp = uModel * vec4(a_pos,1.0);',
      '  vPos = (uView * wp).xyz;',
      '  vNormal = mat3(uModel) * a_normal;',
      '  gl_Position = uProj * uView * wp;',
      '}'
    ].join('\\n');

    var FS = [
      '#version 300 es',
      'precision highp float;',
      'in vec3 vNormal;',
      'in vec3 vPos;',
      'out vec4 fragColor;',
      'uniform vec3 uLightDir1;',
      'uniform vec3 uLightColor1;',
      'uniform vec3 uLightDir2;',
      'uniform vec3 uLightColor2;',
      'uniform vec3 uAlbedo;',
      'void main(){',
      '  vec3 n = normalize(vNormal);',
      '  vec3 v = normalize(-vPos);',
      '  vec3 col = uAlbedo * 0.6;',
      '  vec3 l1 = normalize(uLightDir1);',
      '  float d1 = max(dot(n,l1),0.0);',
      '  vec3 h1 = normalize(l1+v);',
      '  float s1 = pow(max(dot(n,h1),0.0), 32.0);',
      '  col += uAlbedo * uLightColor1 * d1 * 0.7 + uLightColor1 * s1 * 0.5;',
      '  vec3 l2 = normalize(uLightDir2);',
      '  float d2 = max(dot(n,l2),0.0);',
      '  col += uLightColor2 * d2 * 0.35;',
      '  fragColor = vec4(col, 1.0);',
      '}'
    ].join('\\n');

    function compile(type, src){
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('shader compile: ' + log);
      }
      return sh;
    }
    var vs = compile(gl.VERTEX_SHADER, VS);
    var fs = compile(gl.FRAGMENT_SHADER, FS);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(prog);
      throw new Error('program link: ' + log);
    }

    // attribute / uniform 位置
    var aPos = gl.getAttribLocation(prog, 'a_pos');
    var aNormal = gl.getAttribLocation(prog, 'a_normal');
    var uModel = gl.getUniformLocation(prog, 'uModel');
    var uView = gl.getUniformLocation(prog, 'uView');
    var uProj = gl.getUniformLocation(prog, 'uProj');
    var uLightDir1 = gl.getUniformLocation(prog, 'uLightDir1');
    var uLightColor1 = gl.getUniformLocation(prog, 'uLightColor1');
    var uLightDir2 = gl.getUniformLocation(prog, 'uLightDir2');
    var uLightColor2 = gl.getUniformLocation(prog, 'uLightColor2');
    var uAlbedo = gl.getUniformLocation(prog, 'uAlbedo');

    // VBO / IBO
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.verts, gl.STATIC_DRAW);
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

    // VAO
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bindVertexArray(null);

    // ---- 轨道相机（球坐标） ----
    var radius = 5.0;
    var theta = 0.6;
    var phi = 0.5;
    var dragging = false, lastX = 0, lastY = 0;

    canvas.addEventListener('pointerdown', function(e){
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch(_) {} }
    });
    canvas.addEventListener('pointermove', function(e){
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      theta += dx * 0.01;
      phi += dy * 0.01;
      if (phi < 0.1) phi = 0.1;
      if (phi > 1.5) phi = 1.5;
    });
    function endDrag(){ dragging = false; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);
    canvas.addEventListener('wheel', function(e){
      e.preventDefault();
      if (e.deltaY > 0) radius *= 1.1; else radius /= 1.1;
      if (radius < 2.5) radius = 2.5;
      if (radius > 12) radius = 12;
    }, { passive: false });

    // ---- 尺寸 / dpr ----
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize(){
      var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      var cw = Math.max(1, Math.floor(w * dpr));
      var ch = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw; canvas.height = ch;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    var ro = new ResizeObserver(function(){ resize(); frame(); });
    ro.observe(canvas);
    resize();

    // ---- reduced-motion ----
    var reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
    var shouldLoop = autoRotate && !reduced;

    // ---- model 矩阵：rotateX(0.4) ∘ rotateY(0.6) 作为初始姿态 ----
    var baseModel = m4Mul(m4RotX(0.4), m4RotY(0.6));

    function eyePos(){
      return [
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        radius * Math.cos(theta) * Math.cos(phi)
      ];
    }

    // ---- 单帧渲染 ----
    function frame(){
      if (autoRotate && !reduced) theta += 0.005;
      var aspect = canvas.width / Math.max(1, canvas.height);
      var proj = m4Perspective(50 * Math.PI / 180, aspect, 0.1, 100);
      var eye = eyePos();
      var view = m4LookAt(eye, [0,0,0], [0,1,0]);

      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniformMatrix4fv(uModel, false, baseModel);
      gl.uniformMatrix4fv(uView, false, view);
      gl.uniformMatrix4fv(uProj, false, proj);
      gl.uniform3f(uLightDir1, 0.6, 0.7, 0.5);
      gl.uniform3f(uLightColor1, 1.0, 0.95, 0.85);
      gl.uniform3f(uLightDir2, -0.5, -0.3, -0.6);
      gl.uniform3f(uLightColor2, 0.27, 0.4, 0.85);
      gl.uniform3f(uAlbedo, 1.0, 0.624, 0.039);

      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0.03, 0.03, 0.035, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, geo.indices.length, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);
    }

    // ---- 渲染循环 ----
    var rafId = null;
    function loop(){
      frame();
      if (shouldLoop) rafId = requestAnimationFrame(loop);
      else rafId = null;
    }

    // IntersectionObserver：视口外暂停 / 进入恢复
    var io = new IntersectionObserver(function(entries){
      var e = entries[0];
      if (e.isIntersecting) {
        if (rafId === null && shouldLoop) {
          rafId = requestAnimationFrame(loop);
        }
      } else {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    });
    io.observe(canvas);

    // 启动
    if (shouldLoop) {
      rafId = requestAnimationFrame(loop);
    } else {
      // 只渲染一帧（autoRotate=false 或 reduced-motion）
      frame();
    }

  } catch (err) {
    // 编译失败或 WebGL 不可用：不抛错，仅 console.warn
    console.warn('scene mesh error:', err);
  }
})();`;

  // 拼接最终 HTML：容器 div + canvas + § scene 标签 + IIFE script
  // 注意：<\/script> 写法避免外层 HTML 解析提前结束
  return `<div class="webgl-scene" style="position:relative;width:100%;height:${height}px;border-radius:var(--radius-xl, 1rem);border:1px solid var(--border);background:var(--background-soft);overflow:hidden;">
  <canvas id="${canvasId}" style="width:100%;height:100%;display:block;"></canvas>
  <span class="webgl-scene-label" style="position:absolute;left:12px;top:10px;font-family:var(--font-mono, ui-monospace, SFMono-Regular, monospace);font-size:11px;letter-spacing:0.08em;color:var(--muted-foreground, #888);pointer-events:none;user-select:none;">§ scene</span>
  <script>${script}<\/script>
</div>`;
}
