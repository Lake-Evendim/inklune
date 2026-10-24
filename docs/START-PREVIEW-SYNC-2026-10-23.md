# 八套开始方案预览同步

当前正式构建：`index-C4yqqZaJ.js` / `index-DC7CTKeC.css`。

八套开始页均由 `StartPage` 渲染同一个 `CrispWordmark`。放大、重播和材质/过渡预览共用最新高清覆盖、点写、交叉归属、单画布结束衔接与 k 弧长配速，没有独立的旧 logo 实现。

发现的遗漏是比较列表的静态缩略图：32 张仍来自 10 月 22 日。已从当前正式页面重新捕获八套 × 桌面/手机 × 日间/夜间，使用 DPR2 实际绘制后高质量缩小并保存 WebP。`public/start-previews` 与 `dist/start-previews` 的全部文件哈希一致。

列表图片加入 `v=logo-20261023-arc`，避免沿用旧缓存。默认方案选择、原有各方案风格保留。

验证：32 个独立页面全部使用连续画布、面积平均覆盖和当前 k 配速；此前八套放大检查也通过。更新构建后的八套实际 gallery iframe 再次逐套检查，全部加载 `index-C4yqqZaJ.js`，交叉段约 17.15ms，与相邻竖笔等速，完成时间 2310ms。八张当前列表图片均加载成功并携带新版本标记。TypeScript 与正式构建通过。日夜总览图已查看。

复验工具：`tools/refresh-start-previews.py`（捕获并核验）、`--gallery-only`（只检查当前比较页）。证据：`docs/inklune-verification/start-preview-sync-20261023/`。
