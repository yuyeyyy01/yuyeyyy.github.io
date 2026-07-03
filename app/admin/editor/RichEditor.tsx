"use client";

import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/feature/toolbar";
import "@milkdown/crepe/feature/top-bar";
import "@milkdown/crepe/feature/placeholder";
import "@milkdown/crepe/feature/link-tooltip";
import "@milkdown/crepe/feature/list-item";
import "@milkdown/crepe/feature/table";
import "@milkdown/crepe/feature/code-mirror";
import "@milkdown/crepe/feature/latex";
import "@milkdown/crepe/feature/image-block";
import "@milkdown/crepe/feature/block-edit";
import "@milkdown/crepe/feature/cursor";
import "@milkdown/crepe/theme/nord.css";
import { useEffect, useRef } from "react";

/**
 * Milkdown Crepe 富文本编辑器 —— 所见即所得，输入输出 Markdown。
 *
 * Crepe 开箱即用：内置 nord 主题、工具栏、top-bar、斜杠命令、表格、
 * 代码块（CodeMirror）、LaTeX、图片块、占位符、链接 tooltip。
 *
 * 与父组件双向：
 *   - initial 注入为 defaultValue（仅首次挂载）
 *   - 内容变化通过 .on(listener) markdownUpdated 回调 onMarkdownChange
 *   - 外部切换模式回来时用 key 重新挂载（由父控制 key）以注入新值
 *
 * 自定义 MDX 组件（Scene/Video 等）在富文本里直接当文本显示——
 * 建议作者用源码模式写这些块，富文本模式主要写正文。
 */

export default function RichEditor({
  initial,
  onMarkdownChange,
}: {
  initial: string;
  onMarkdownChange: (md: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  // onMarkdownChange 用 ref，避免 effect 依赖它导致 crepe 重建
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  onMarkdownChangeRef.current = onMarkdownChange;

  useEffect(() => {
    if (!rootRef.current) return;
    const crepe = new Crepe({
      root: rootRef.current,
      defaultValue: initial,
      features: {
        // 用默认特性集合
      },
      featureConfigs: {
        placeholder: { text: "开始写作… / 斜杠命令插入块" },
      },
    });

    // 监听文档变化，输出 Markdown（Crepe 用 .on(listener) API）
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, md) => {
        onMarkdownChangeRef.current(md);
      });
    });

    crepe
      .create()
      .then(() => {
        crepeRef.current = crepe;
      })
      .catch((e) => console.error("Crepe init failed", e));

    return () => {
      crepe.destroy?.();
      crepeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      className="crepe-host h-full min-h-[500px]"
      style={{ ["--crepe-bg" as string]: "var(--surface)" }}
    />
  );
}
