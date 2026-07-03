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
import { uploadImage, imageMarkdown } from "@/lib/adminUpload";
import {
  useUploadToast,
  getImageFileFromDataTransfer,
  hasImageInDataTransfer,
} from "./Toast";

/**
 * Milkdown Crepe 富文本编辑器 —— 所见即所得，输入输出 Markdown。
 *
 * Crepe 开箱即用：内置 nord 主题、工具栏、top-bar、斜杠命令、表格、
 * 代码块（CodeMirror）、LaTeX、图片块、占位符、链接 tooltip。
 *
 * 与父组件双向：
 *   - initial 注入为 defaultValue（仅首次挂载）
 *   - 内容变化通过 addEventListener('docChanged') 回调 onMarkdownChange
 *   - 外部切换模式回来时用 key 重新挂载（由父控制 key）以注入新值
 *
 * 自定义 MDX 组件（Scene/Video 等）在富文本里直接当文本显示——
 * 建议作者用源码模式写这些块，富文本模式主要写正文。
 *
 * 图片拖拽/粘贴上传：在 host 上监听 drop/paste，preventDefault 后调
 * uploadImage，成功后把图片 markdown 追加到当前 md 末尾（用
 * currentMdRef 跟最新值，避免闭包陈旧），失败 toast 报错。
 * 追加而非光标处插入——Crepe 没暴露稳定的 setMarkdown/replaceSelection
 * 公共 API，追加最稳；用户可在富文本里手动拖动图片块到合适位置。
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
  // 跟踪最新 markdown：onMarkdownChange 闭包会旧，drop/paste 时用 ref 取最新值
  const currentMdRef = useRef<string>(initial);
  // onMarkdownChange 也用 ref，避免 effect 依赖它导致 crepe 重建
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  onMarkdownChangeRef.current = onMarkdownChange;

  const { toastEl, show } = useUploadToast();

  useEffect(() => {
    if (!rootRef.current) return;
    const crepe = new Crepe({
      root: rootRef.current,
      defaultValue: initial,
      features: {
        // 用默认特性集合，禁掉不需要的（如编辑器内的块拖拽手柄可选）
      },
      featureConfigs: {
        placeholder: { text: "开始写作… / 斜杠命令插入块" },
      },
    });

    // 监听文档变化，输出 Markdown（Crepe 用 .on(listener)API）
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, md) => {
        currentMdRef.current = md;
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

  // 图片上传 + 追加 markdown 的共用处理
  const handleImageFile = async (file: File) => {
    show(`上传中：${file.name || "图片"}…`, "info");
    const { url, error } = await uploadImage(file);
    if (error || !url) {
      show(error ?? "上传失败", "error", 3000);
      return;
    }
    const md = imageMarkdown(url, file.name || "");
    // 追加到当前 markdown 末尾（Crepe 无稳定 setMarkdown 公共 API，
    // 直接调 onMarkdownChange 让父组件回传会触发 Crepe 重新解析——
    // 但这里我们没把新 md 注回 Crepe（Crepe 是非受控的 defaultValue 初值）。
    // 做法：通过 onMarkdownChange 把新 md 传上去，父组件 setContentMd 后，
    // 由于 RichEditor 是非受控（key 不变不会重建），Crepe 内部状态不变。
    // 所以更可靠的是：直接在 Crepe 里插入。用 crepe.editor.action + insert 命令。
    const crepe = crepeRef.current;
    if (crepe) {
      try {
        // @milkdown/kit/utils re-export 了 @milkdown/utils 的 insert 命令：
        // insert(markdown) 返回 (ctx) => void，交给 crepe.editor.action 执行，
        // 会在当前选区处把 markdown 解析为对应节点并插入。
        const { insert } = await import("@milkdown/kit/utils");
        crepe.editor.action(insert(md));
        show("图片已插入", "success", 1500);
        return;
      } catch (e) {
        console.warn("Crepe insert failed, fallback to append", e);
      }
    }
    // 退化：追加到末尾（会丢失光标位置，但保证内容进去）
    const next = currentMdRef.current + "\n\n" + md;
    currentMdRef.current = next;
    onMarkdownChangeRef.current(next);
    show("图片已追加到末尾", "success", 1500);
  };

  useEffect(() => {
    const host = rootRef.current;
    if (!host) return;

    const onDrop = (e: DragEvent) => {
      if (!hasImageInDataTransfer(e.dataTransfer)) return;
      e.preventDefault();
      const file = getImageFileFromDataTransfer(e.dataTransfer);
      if (!file) return;
      void handleImageFile(file);
    };

    const onPaste = (e: ClipboardEvent) => {
      if (!hasImageInDataTransfer(e.clipboardData)) return;
      e.preventDefault();
      const file = getImageFileFromDataTransfer(e.clipboardData);
      if (!file) return;
      void handleImageFile(file);
    };

    // capture 阶段拦截：Crepe/ProseMirror 内部会在冒泡阶段处理 drop/paste，
    // 用 capture=true 确保我们先拿到事件并 preventDefault，避免编辑器
    // 把图片文件当成文本/外链插入。
    host.addEventListener("drop", onDrop as EventListener, true);
    host.addEventListener("paste", onPaste as EventListener, true);
    return () => {
      host.removeEventListener("drop", onDrop as EventListener, true);
      host.removeEventListener("paste", onPaste as EventListener, true);
    };
    // handleImageFile 用到的 show/crepeRef 都是稳定 ref，无需进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        ref={rootRef}
        className="crepe-host h-full min-h-[500px]"
        style={{ ["--crepe-bg" as string]: "var(--surface)" }}
      />
      {toastEl}
    </>
  );
}
