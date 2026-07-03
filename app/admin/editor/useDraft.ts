"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 自动保存草稿 hook —— 编辑时定时存 localStorage，防意外丢失。
 *
 * - 每 DEBOUNCE_MS 把 state 存 localStorage（key 含 slug）
 * - 提供 hasDraft（是否有本地草稿）+ restoreDraft（恢复）+ clearDraft（保存成功后清）
 * - 跟踪 dirty（有未保存修改）+ beforeunload 提示
 *
 * 仅用于"防丢"：真正保存是显式调 PUT/POST，保存成功后 clearDraft。
 */

const DEBOUNCE_MS = 3000;

/** 草稿 key：有 slug 用 slug，新建文章统一用 "new-post" 避免空字符串冲突 */
function key(slug: string) {
  return `draft:${slug || "new-post"}`;
}

export interface DraftData {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  tags: string;
  content_md: string;
  published: boolean;
  /** 草稿保存时间戳，用于判断是否比服务器新 */
  ts: number;
}

export function useDraft(slug: string, initial?: Partial<DraftData>) {
  const [hasDraft, setHasDraft] = useState(false);
  const [savedDraft, setSavedDraft] = useState<DraftData | null>(null);
  const [dirty, setDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<DraftData | null>(null);

  // 初始检测是否有本地草稿（在加载服务器数据之前）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(slug));
      if (raw) {
        const d = JSON.parse(raw) as DraftData;
        setSavedDraft(d);
        setHasDraft(true);
      }
    } catch {
      /* 忽略损坏的草稿 */
    }
  }, [slug]);

  /** 定时把当前编辑内容存草稿 */
  const saveDraft = useCallback((data: Omit<DraftData, "ts">) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const full: DraftData = { ...data, ts: Date.now() };
      latest.current = full;
      try {
        // 新建文章（hook slug 为空）统一存 "new-post"；已存在文章用其 slug。
        // 避免用户输入新 slug 时存到不同 key，导致 clearDraft（用 hook slug）清不到。
        localStorage.setItem(key(slug), JSON.stringify(full));
      } catch {
        /* localStorage 满/禁用，静默 */
      }
    }, DEBOUNCE_MS);
    setDirty(true);
  }, [slug]);

  /** 恢复草稿内容到编辑器（由调用方 set 各字段） */
  const restoreDraft = useCallback((): DraftData | null => {
    const d = savedDraft;
    if (d) {
      setHasDraft(false);
    }
    return d;
  }, [savedDraft]);

  /** 保存到服务器成功后清掉草稿 */
  const clearDraft = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    try {
      localStorage.removeItem(key(slug));
    } catch {}
    setDirty(false);
    setHasDraft(false);
    setSavedDraft(null);
  }, [slug]);

  // 离开页面提示（有未保存修改时）
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return { hasDraft, savedDraft, dirty, saveDraft, restoreDraft, clearDraft };
}
