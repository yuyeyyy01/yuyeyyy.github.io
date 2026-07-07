/**
 * mountHTMLString —— 把 HTML 字符串挂进容器，并手动激活其中的 <script>。
 * React 的 dangerouslySetInnerHTML 和原生 innerHTML 都不会执行注入的 <script>，
 * 所以设容器 innerHTML 后，要把 <script> 元素取出来重新创建（replaceWith 新 script 会执行）。
 *
 * 复制原 script 的所有 attribute（type / id 等）：
 * - type：renderShaderHTML 注入的 <script type="text/webgl-fragment"> 是 GLSL 源码节点
 *   （IIFE 用 textContent 取出），绝不能被当 JS 执行，否则会以 SyntaxError 失败。
 * - id：fragment script 的 id 是 `${canvasId}-frag`，IIFE 用 getElementById 取 fragment
 *   源码，丢了 id 会让 IIFE 拿到空 FRAG，shader 编译报 Missing main()。
 */
export function mountHTMLString(html: string, container: HTMLElement) {
  container.innerHTML = html;
  container.querySelectorAll("script").forEach((old) => {
    const s = document.createElement("script");
    // 复制所有 attribute（type、id 等），保证 IIFE 能 getElementById 找到 fragment 节点
    for (const attr of Array.from(old.attributes)) {
      s.setAttribute(attr.name, attr.value);
    }
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}
