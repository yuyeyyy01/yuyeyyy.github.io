"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { languages } from "@codemirror/language-data";

/**
 * CodeMirror MDX 源码编辑器 —— 富文本模式的源码对照。
 *
 * 用于写富文本不方便的内容：自定义 MDX 组件（<Scene> <Video>）、
 * 复杂表格、需要精确控制的 Markdown。
 *
 * 双向：value 受控，onChange 回写父组件；父切换模式时用新 value 重建。
 *
 * 工具栏插入：监听 window 的 "editor-insert" CustomEvent（Toolbar 源码模式按钮
 * dispatch），在光标处插入对应 markdown 文本。
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

    return () => {
      window.removeEventListener("editor-insert", onInsert as EventListener);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="codemirror-host h-full min-h-[500px]" />;
}
