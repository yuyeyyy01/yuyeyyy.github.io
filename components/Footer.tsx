"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";

/**
 * 页脚 —— 苹果风。
 * 上边框 + 充足 padding，文字小，客户端动态取年份避免构建时固定。
 * 用 mounted 守卫避免水合不匹配。
 * 滚动到底部时用 fadeUp 柔和淡入上移。
 */
export default function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <motion.footer
      {...whileInViewConfig}
      variants={fadeUp}
      className="border-t border-[var(--border)] py-10"
    >
      <div className="container-page text-xs text-[var(--foreground-muted)]">
        <p>
          © {year ?? ""} Yuyeyyy · 用 Unity 渲染与 Shader 折腾的笔记
        </p>
      </div>
    </motion.footer>
  );
}
