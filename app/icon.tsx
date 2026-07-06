import { ImageResponse } from "next/og";

/**
 * 站点 favicon（app/icon.tsx 约定，Next 自动注入 <link rel="icon">）。
 * framegraph 视觉：黑底 + 青绿 § 符号 + 琥珀角点。
 * ImageResponse 用 Satori 渲染，仅支持 flex 布局 + 内联 style。
 */

export const dynamic = "force-static";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#070708",
          fontSize: 26,
          fontWeight: 700,
          color: "#4fd2c6",
          fontFamily: "monospace",
          letterSpacing: -1,
        }}
      >
        §
      </div>
    ),
    { ...size }
  );
}
