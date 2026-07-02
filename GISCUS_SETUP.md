# 开启博客评论（Giscus）配置说明 —— 给 yuyeyyy01

博客文章底部已接入 Giscus 评论系统，但要让它真正显示，需要仓库 owner（yuyeyyy01）做以下三步。约 3 分钟。

## 第 1 步：开启 Discussions

1. 打开 https://github.com/yuyeyyy01/yuyeyyy.github.io/settings
2. 滚到 "Features" 区域
3. 勾选 **Discussions**
4. 保存

## 第 2 步：安装 Giscus App 到仓库

1. 打开 https://github.com/apps/giscus
2. 点 **Install**
3. 选择 `yuyeyyy01` 账户
4. 选 **Only select repositories** → 勾选 `yuyeyyy.github.io`
5. 点 **Install**

## 第 3 步：获取 ID

1. 打开 https://giscus.app
2. "仓库" 填入：`yuyeyyy01/yuyeyyy.github.io`
3. "页面映射方式" 选 `pathname`
4. "Discussion 分类" 选一个（建议选 `Announcements`，或默认 `General`）
   - 如果没有可选分类，先去仓库 Discussions 建一个分类
5. 页面下方会生成一段 `<script>` 代码，找到这两行：
   ```html
   data-repo-id="R_xxxxxxx"
   data-category-id="DIC_xxxxxxx"
   ```
6. 把这两个 ID 发回来（或自己改 `components/Comments.tsx` 里的 `repoId` 和 `categoryId`）

## 完成后

把两个 ID 告诉维护者，填进 `components/Comments.tsx` 推上去，评论就能正常显示了。

> 说明：评论数据存在 GitHub Discussions 里，无需数据库，完全免费。
