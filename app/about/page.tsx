import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我",
};

export default function AboutPage() {
  return (
    <main className="container-page mx-auto max-w-2xl py-24 md:py-32">
      <header className="mb-12">
        <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
          About
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
          关于我
        </h1>
      </header>

      <section className="prose">
        <p>
          嗨，我是{" "}
          <span className="font-semibold text-[var(--foreground)]">yuyeyyy</span>
          ，一个喜欢折腾 Unity 图形 / Shader / 渲染管线的人。
        </p>

        <h2>主要兴趣</h2>
        <ul>
          <li>Unity URP / 自定义渲染管线</li>
          <li>PBR 材质、头发渲染（Kajiya-Kay / Marschner）</li>
          <li>皮肤 SSS、厚度图、预积分 LUT</li>
          <li>体积光、Skybox、Portal、水体、草地交互等效果</li>
          <li>偶尔写一点 C / C# / 数学 / 数据分析相关内容</li>
        </ul>

        <h2>这个博客会用来</h2>
        <ul>
          <li>记录图形学 / Shader 学习笔记</li>
          <li>整理面试问答和项目总结</li>
          <li>
            分享一些踩坑记录（比如 URP 各种 NullReference、集合修改异常之类的…）
          </li>
        </ul>

        <p>
          如果你也在做实时渲染相关的东西，欢迎来交流。
        </p>
      </section>
    </main>
  );
}
