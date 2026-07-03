"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { languages } from "@codemirror/language-data";
import { uploadImage, imageMarkdown } from "@/lib/adminUpload";
import {
  useUploadToast,
  getImageFileFromDataTransfer,
  hasImageInDataTransfer,
} from "./Toast";

/**
 * CodeMirror MDX 源码编辑器 —— 富文本模式的源码对照。
 *
 * 用于写富文本不方便的内容：自定义 MDX 组件（<Scene> <Video>）、
 * 复杂表格、需要精确控制的 Markdown。
 *
 * 双向：value 受控，onChange 回写父组件；父切换模式时用新 value 重建。
 *
 * 图片拖拽/粘贴上传：在 host 上监听 drop/paste，preventDefault 后调
 * uploadImage，成功后用 view.dispatch 在光标处插入图片 markdown（
 * 光标处插入，选中区域会被替换）。
 */

export default function SourceEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { toastEl, show } = useUploadToast();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const updateListener = EditorView.updateListener.of((vu) => {
      if (vu.docChanged) {
        onChangeRef.current(vu.state.doc.toString());
      }
    });
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        lineNumbers(),
        oneDark,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        updateListener,
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "13px",
            backgroundColor: "var(--surface-2)",
          },
          ".cm-scroller": { fontFamily: "var(--font-mono, monospace)" },
          ".cm-gutters": { backgroundColor: "var(--surface)" },
        }),
      ],
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;

    // 监听工具栏的插入事件（源码模式下从外部 Toolbar 注入文本）
    const onInsert = (e: Event) => {
      const { text, wrap } = (e as CustomEvent).detail as {
        text: string;
        wrap: [string, string] | null;
      };
      const s = view.state;
      const sel = s.selection.main;
      const selected = s.sliceDoc(sel.from, sel.to).toString();
      let insertText: string;
      let insertFrom: number;
      if (wrap) {
        // 包裹选区：[before, after]
        insertText = wrap[0] + (selected || "") + wrap[1];
        insertFrom = sel.from;
      } else {
        // 纯文本插入（带行前缀对齐：如 "# " 在行首插入）
        insertText = text;
        insertFrom = sel.from;
      }
      view.dispatch({
        changes: { from: insertFrom, to: sel.to, insert: insertText },
        selection: {
          anchor: insertFrom + insertText.length,
          head: insertFrom + insertText.length,
        },
      });
      view.focus();
    };
    window.addEventListener("editor-insert", onInsert as EventListener);

    // 图片上传 + 光标处插入 markdown 的共用处理
    const handleImageFile = async (file: File) => {
      show(`上传中：${file.name || "图片"}…`, "info");
      const { url, error } = await uploadImage(file);
      if (error || !url) {
        show(error ?? "上传失败", "error", 3000);
        return;
      }
      const md = imageMarkdown(url, file.name || "");
      const v = viewRef.current;
      if (!v) {
        show("编辑器未就绪", "error", 3000);
        return;
      }
      const s = v.state;
      const sel = s.selection.main;
      v.dispatch({
        changes: { from: sel.from, to: sel.to, insert: md },
        selection: { anchor: sel.from + md.length, head: sel.from + md.length },
      });
      v.focus();
      show("图片已插入", "success", 1500);
    };

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

    // capture 阶段拦截：CodeMirror 对 drop/paste 有自己的处理（会插入文件名/文本），
    // 用 capture=true 确保我们先拿到事件并 preventDefault。
    host.addEventListener("drop", onDrop as EventListener, true);
    host.addEventListener("paste", onPaste as EventListener, true);

    return () => {
      window.removeEventListener("editor-insert", onInsert as EventListener);
      host.removeEventListener("drop", onDrop as EventListener, true);
      host.removeEventListener("paste", onPaste as EventListener, true);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={hostRef} className="codemirror-host h-full min-h-[500px]" />
      {toastEl}
    </>
  );
}
