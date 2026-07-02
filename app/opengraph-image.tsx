import { ImageResponse } from "next/og";

export const alt = "Yuyeyyy — 图形与渲染";

export const dynamic = "force-static";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: "sans-serif",
          letterSpacing: -2,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          Yuyeyyy
        </div>
        <div
          style={{
            fontSize: 36,
            opacity: 0.6,
            marginTop: 24,
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          Graphics · Rendering · Shader
        </div>
      </div>
    ),
    { ...size }
  );
}
