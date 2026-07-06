/**
 * controls-html —— 生成滑块/颜色控件的 HTML 字符串。
 * 纯字符串拼接函数，模块顶层不调用任何浏览器 API。
 * 事件绑定的 IIFE 写在返回字符串的 <script> 里，由浏览器执行。
 *
 * 视觉风格照搬 components/lab/LabControls.tsx：
 *   - mono 字体 / 0.75rem
 *   - 滑块 accent-color: var(--accent)
 *   - 颜色控件 1px var(--border) + 4px 圆角
 *   - 容器 column flex，gap 0.5rem，padding 0.75rem 1rem，border-top
 */

import type { UniformDef } from './shaders';

/** [r,g,b] 0..1 → #rrggbb（与 LabControls.rgbToHex 同逻辑） */
function rgbToHex(rgb: [number, number, number]): string {
  const to255 = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  const h = (n: number) => to255(n).toString(16).padStart(2, '0');
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

/**
 * 生成控件 HTML：
 * <div class="demo-controls" style="...">
 *   {每个 uniform 一行控件}
 *   <script>(function(){ 事件绑定 })();<\/script>
 * </div>
 *
 * float 控件：range input + 数值 span，input 事件触发 'uniform-change' CustomEvent。
 * color 控件：color input，hex → [r,g,b] 0..1 触发 'uniform-change' CustomEvent。
 */
export function renderControlsHTML(opts: { canvasId: string; uniforms: UniformDef[] }): string {
  const { canvasId, uniforms } = opts;

  // 行 / 标签 / 数值 span 的内联样式，对齐 LabControls 视觉
  const rowStyle =
    'display:flex;align-items:center;gap:0.75rem;font-family:var(--font-mono),monospace;font-size:0.75rem;';
  const labelStyle = 'color:var(--foreground-soft);min-width:64px;';
  const valueStyle = 'color:var(--foreground-muted);min-width:40px;text-align:right;';

  const rows: string[] = [];
  for (const u of uniforms) {
    const label = u.label ?? u.name;

    if (u.kind === 'color') {
      const def = u.default as [number, number, number];
      const hex = rgbToHex(def);
      rows.push(
        '<label class="control-row" style="' + rowStyle + '">' +
          '<span class="control-label" style="' + labelStyle + '">' + label + '</span>' +
          '<input type="color" value="' + hex + '" data-uniform="' + u.name +
          '" data-canvas="' + canvasId + '" class="control-color" ' +
          'style="width:32px;height:24px;border:1px solid var(--border);border-radius:4px;background:transparent;cursor:pointer;" />' +
          '</label>'
      );
    } else {
      const min = u.min ?? 0;
      const max = u.max ?? 1;
      const step = u.step ?? 0.01;
      const def = u.default as number;
      rows.push(
        '<label class="control-row" style="' + rowStyle + '">' +
          '<span class="control-label" style="' + labelStyle + '">' + label + '</span>' +
          '<input type="range" min="' + min + '" max="' + max + '" step="' + step +
          '" value="' + def + '" data-uniform="' + u.name + '" data-canvas="' + canvasId +
          '" class="control-slider" style="flex:1;accent-color:var(--accent);" />' +
          '<span class="control-value" data-value-for="' + u.name + '" style="' + valueStyle + '">' +
          def + '</span>' +
          '</label>'
      );
    }
  }

  // 容器样式：参考 LabControls 的 flex column + gap + padding + border-top
  const containerStyle =
    'display:flex;flex-direction:column;gap:0.5rem;padding:0.75rem 1rem;' +
    'border-top:1px solid var(--border);background:var(--background);';

  // 事件绑定 IIFE：在浏览器执行，监听 input 事件并 dispatch 'uniform-change' CustomEvent
  // 注意：<\/script> 在 TS 字符串中求值为 </script>，源码层面避免字面 </script> 触发某些工具误判
  const script = `<script>(function(){
var canvasId="${canvasId}";
var canvas=document.getElementById(canvasId);
if(!canvas)return;
document.querySelectorAll('[data-canvas="'+canvasId+'"]').forEach(function(input){
input.addEventListener('input',function(){
var name=input.getAttribute('data-uniform');
var value;
if(input.type==='color'){
var hex=input.value.replace('#','');
var r=parseInt(hex.substring(0,2),16)/255;
var g=parseInt(hex.substring(2,4),16)/255;
var b=parseInt(hex.substring(4,6),16)/255;
value=[r,g,b];
}else{
value=parseFloat(input.value);
var valSpan=document.querySelector('[data-value-for="'+name+'"]');
if(valSpan)valSpan.textContent=value.toFixed(2);
}
canvas.dispatchEvent(new CustomEvent('uniform-change',{detail:{name:name,value:value}}));
});
});
})();<\/script>`;

  return (
    '<div class="demo-controls" style="' + containerStyle + '">' +
    rows.join('') +
    script +
    '</div>'
  );
}
