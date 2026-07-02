"use client";

import { useEffect } from "react";

/**
 * CodeBlockEnhancer
 * 在客户端给 rehype-pretty-code 渲染出的 `pre[data-language]` 增加：
 *  - 复制按钮（右上角）
 *  - 语言标签胶囊（左上角）
 *  - 行号列（每行前置 inline 行号 span）
 *  - diff 语言块：+/- 行背景高亮
 *
 * 全部通过 DOM 操作完成，不改动 pre 原有样式；增强元素绝对定位在
 * 外层 wrapper 上，wrapper 顶部留出空间放标签与按钮，避免遮挡首行代码。
 * 行号用真实 DOM span（而非 CSS counter），无需注入任何 CSS 文件。
 */

const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

const LN_CLASS = "cbe-ln";
const LINE_CLASS = "cbe-line";
const ENHANCED_ATTR = "data-cbe-enhanced";
const WRAPPER_ATTR = "data-cbe-wrapper";

/**
 * 把 code 元素的内容按行重新包成 `<span class="cbe-line">…</span>`，
 * 每行前置一个 `<span class="cbe-ln">N</span>` 行号 span。
 * 保留高亮 span（rehype-pretty-code 的着色 span 不跨行，cloneNode 即可）。
 */
function wrapLines(code: HTMLElement, language: string): void {
  const lines: HTMLSpanElement[] = [];
  let current = createLineSpan(1);
  lines.push(current);
  let lineNo = 1;

  const pushNewLine = () => {
    lineNo += 1;
    current = createLineSpan(lineNo);
    lines.push(current);
  };

  code.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const parts = text.split("\n");
      parts.forEach((part, i) => {
        if (i > 0) pushNewLine();
        if (part) current.appendChild(document.createTextNode(part));
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 高亮 span：假设不跨行，整颗 cloneNode 挂到当前行
      current.appendChild(node.cloneNode(true));
    }
  });

  // 清空并回填
  code.replaceChildren(...lines);

  // diff 语言块：按行首 +/- 加背景
  if (language === "diff") {
    lines.forEach((line) => {
      const text = line.textContent ?? "";
      const trimmed = text.replace(/^\s*/, "");
      if (trimmed.startsWith("+")) {
        line.style.backgroundColor = "rgba(80,200,120,0.12)";
      } else if (trimmed.startsWith("-")) {
        line.style.backgroundColor = "rgba(255,85,85,0.12)";
      }
    });
  }
}

function createLineSpan(lineNo: number): HTMLSpanElement {
  const line = document.createElement("span");
  line.className = LINE_CLASS;
  line.style.display = "block";
  line.style.minHeight = "1.6em";

  const ln = document.createElement("span");
  ln.className = LN_CLASS;
  ln.textContent = String(lineNo);
  Object.assign(ln.style, {
    display: "inline-block",
    width: "2rem",
    marginRight: "0.75rem",
    textAlign: "right",
    color: "var(--foreground-muted)",
    opacity: "0.55",
    userSelect: "none",
    fontVariantNumeric: "tabular-nums",
  } as CSSStyleDeclaration);

  line.appendChild(ln);
  return line;
}

/** 复制时取纯代码文本（剔除行号 span） */
function getCodeText(pre: HTMLPreElement): string {
  const lines = pre.querySelectorAll(`.${LINE_CLASS}`);
  if (lines.length === 0) return pre.textContent ?? "";
  const out: string[] = [];
  lines.forEach((line) => {
    const clone = line.cloneNode(true) as HTMLElement;
    const ln = clone.querySelector(`.${LN_CLASS}`);
    if (ln) ln.remove();
    out.push(clone.textContent ?? "");
  });
  return out.join("\n").replace(/\n+$/, "");
}

function buildLangLabel(lang: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.textContent = lang;
  Object.assign(el.style, {
    position: "absolute",
    top: "0.5rem",
    left: "0.75rem",
    zIndex: "2",
    fontSize: "11px",
    lineHeight: "1",
    padding: "0.25rem 0.5rem",
    borderRadius: "9999px",
    color: "var(--foreground-muted)",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    userSelect: "none",
    pointerEvents: "none",
    fontFamily: "var(--font-mono)",
  } as CSSStyleDeclaration);
  return el;
}

function buildCopyButton(pre: HTMLPreElement): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "复制代码");
  btn.innerHTML = COPY_SVG;
  Object.assign(btn.style, {
    position: "absolute",
    top: "0.5rem",
    right: "0.5rem",
    zIndex: "2",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.75rem",
    height: "1.75rem",
    padding: "0",
    borderRadius: "8px",
    color: "var(--foreground-muted)",
    background: "transparent",
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "color 0.2s, background 0.2s, border-color 0.2s",
  } as CSSStyleDeclaration);

  const enter = () => {
    btn.style.color = "var(--foreground)";
    btn.style.background = "var(--surface-2)";
    btn.style.borderColor = "var(--border)";
  };
  const leave = () => {
    btn.style.color = "var(--foreground-muted)";
    btn.style.background = "transparent";
    btn.style.borderColor = "transparent";
  };
  btn.addEventListener("mouseenter", enter);
  btn.addEventListener("mouseleave", leave);

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const text = getCodeText(pre);
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = CHECK_SVG;
      btn.style.color = "var(--accent)";
    } catch {
      btn.innerHTML = CHECK_SVG;
    }
    window.setTimeout(() => {
      btn.innerHTML = COPY_SVG;
      btn.style.color = "var(--foreground-muted)";
    }, 2000);
  });

  return btn;
}

function enhance(pre: HTMLPreElement): void {
  if (pre.getAttribute(ENHANCED_ATTR) === "true") return;
  // 只处理带 data-language 的 pre（rehype-pretty-code 输出）
  const language = pre.dataset.language ?? "";
  if (!language && !pre.querySelector("code")) return;

  const code = pre.querySelector("code");
  // 拆行 + 行号 + diff（仅当存在 code 元素）
  if (code instanceof HTMLElement) {
    wrapLines(code, language);
  }

  // 包一层 wrapper，把标签和按钮放进去
  const parent = pre.parentNode;
  if (!parent) return;
  const wrapper = document.createElement("div");
  wrapper.setAttribute(WRAPPER_ATTR, "");
  Object.assign(wrapper.style, {
    position: "relative",
    paddingTop: "2.25rem",
  } as CSSStyleDeclaration);
  parent.replaceChild(wrapper, pre);
  wrapper.appendChild(pre);

  if (language) wrapper.appendChild(buildLangLabel(language));
  wrapper.appendChild(buildCopyButton(pre));

  pre.setAttribute(ENHANCED_ATTR, "true");
}

function enhanceAll(root: ParentNode): void {
  const pres = root.querySelectorAll<HTMLPreElement>("pre[data-language]");
  pres.forEach((pre) => {
    if (pre.getAttribute(ENHANCED_ATTR) !== "true") enhance(pre);
  });
}

export default function CodeBlockEnhancer() {
  useEffect(() => {
    enhanceAll(document);

    const observer = new MutationObserver((mutations) => {
      let touched = false;
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            touched = true;
          }
        });
      }
      if (touched) enhanceAll(document);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
