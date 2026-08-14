import LabListHeader from "@/components/lab/LabListHeader";
import GallerySection from "@/components/lab/GallerySection";
import { PORTFOLIO_ITEMS, EXERCISE_ITEMS } from "@/lib/lab-gallery";

export const dynamic = "force-static";

export const metadata = {
  title: "作品集与渲染练习 — Yuyeyyy",
  description:
    "作品集展示（视频）与渲染练习（图片）：2.5D 室内光照预渲染、自定义 PBR、皮肤 SSS、头发高光。双击卡片查看对应技术笔记。",
};

export default function LabListPage() {
  return (
    <main className="container-page mx-auto py-24">
      <LabListHeader />

      <GallerySection
        label="§ Portfolio"
        title="作品集展示"
        description="完整落地的渲染项目，附效果视频。双击卡片进入对应的技术笔记，看具体是怎么做的。"
        items={PORTFOLIO_ITEMS}
        columns={2}
      />

      <GallerySection
        label="§ Exercises"
        title="渲染练习"
        description="按渲染方向做的专项练习，每项都有对应的实现笔记与踩坑记录。双击卡片查看。"
        items={EXERCISE_ITEMS}
        columns={3}
      />
    </main>
  );
}
