import { getAllLabs } from "@/lib/lab";
import LabCard from "@/components/lab/LabCard";
import LabListHeader from "@/components/lab/LabListHeader";

export const dynamic = "force-static";

export const metadata = {
  title: "渲染实验室 — Yuyeyyy",
  description: "WebGL2 实时着色器 demo：体积光、SDF 流体、屏幕空间反射、卡通分级着色。",
};

export default function LabListPage() {
  const demos = getAllLabs();

  return (
    <main className="container-page mx-auto py-24">
      <LabListHeader />

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {demos.map((d) => (
          <LabCard key={d.slug} demo={d} />
        ))}
      </div>
    </main>
  );
}
