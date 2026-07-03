"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 编辑器图片上传用的轻量 toast + 数据提取辅助。
 *
 * - useUploadToast()：返回 { toastEl, show, dismiss }，toastEl 是 fixed 底部居中的小气泡，
 *   show(text, kind, autoDismissMs?) 控制显示；error/info 带 autoDismiss 时到点自动消失。
 * - getImageFileFromDataTransfer(dt)：从 drop/paste 的 DataTransfer 中提取第一个图片文件。
 * - hasImageInDataTransfer(dt)：判断 DataTransfer 是否含图片文件（用于决定是否拦截默认行为）。
 *
 * 故意不引入第三方 toast 库——编辑器场景只需一个极简气泡，随编辑器挂载/卸载。
 */

export type ToastKind = "info" | "error" | "success";

interface ToastState {
  text: string;
  kind: ToastKind;
  id: number;
}

export function useUploadToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理定时器，避免 setState on unmounted
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const show = useCallback(
    (text: string, kind: ToastKind = "info", autoDismissMs?: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const id = Date.now() + Math.random();
      setToast({ text, kind, id });
      if (autoDismissMs && autoDismissMs > 0) {
        timerRef.current = setTimeout(() => {
          setToast((t) => (t && t.id === id ? null : t));
        }, autoDismissMs);
      }
    },
    [],
  );

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const toastEl = toast ? (
    <div
      role="status"
      aria-live="polite"
      className={
        "pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full px-4 py-2 text-xs shadow-lg backdrop-blur " +
        (toast.kind === "error"
          ? "bg-red-500/90 text-white"
          : toast.kind === "success"
            ? "bg-[var(--accent,#10b981)]/90 text-white"
            : "border border-[var(--border,#e5e7eb)] bg-[var(--surface-2,#1f2937)]/90 text-[var(--foreground,#111)]")
      }
    >
      {toast.text}
    </div>
  ) : null;

  return { toastEl, show, dismiss };
}

/**
 * 从 DataTransfer（drop/paste 事件）中提取第一个图片文件。
 * 优先用 items API（能拿到异步生成的截图文件），退化到 files 列表。
 */
export function getImageFileFromDataTransfer(
  dt: DataTransfer | null,
): File | null {
  if (!dt) return null;
  const items = Array.from(dt.items || []);
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  const files = Array.from(dt.files || []);
  return files.find((f) => f.type.startsWith("image/")) ?? null;
}

/** 判断 DataTransfer 是否包含图片文件（用于决定是否拦截默认 drop/paste） */
export function hasImageInDataTransfer(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return (
    Array.from(dt.items || []).some(
      (it) => it.kind === "file" && it.type.startsWith("image/"),
    ) ||
    Array.from(dt.files || []).some((f) => f.type.startsWith("image/"))
  );
}
