# k 书写与结束衔接修复

正式构建：`index-Bp8CpUMd.js`、`index-DC7CTKeC.css`，已通过 5174 的实际页面复验。Borel 的小写 `inklune` 轮廓、220ms 点写与 2310ms 整词时长保留。

## 修复结果

**k 持续推进。** 新渲染器根据笔势和交叉区归属预计算每个墨迹像素的出现时间，再按照 k 的可见墨迹重新分配 730–1140ms 的时间。竖杆内回拉和重叠路程不再占用可见书写的时间，轮廓保持原字形。

**完成与书写共用一个时钟。** 画布和揭示进度准备好后才启动浏览器 Animation 时钟，绘制直接读取它的 currentTime，完成状态依赖真实 finish 事件。删除了从组件挂载开始的 2380ms 固定计时器。主题切换和尺寸变化保留同一时钟及当前进度。

**写完后不更换图像层。** 高清画布从落笔一直绘制到完成，使用同一组按物理像素计算的墨迹覆盖；完成只改变状态标记，不再从遮罩 SVG 硬切到另一张静态图。4 倍源采样与面积平均仍用于最终轮廓。

**进入书写的快照保持当前墨迹。** signature 和 gates 过渡复制当前画布像素。复制画布与源画布使用相同的读取模式，避免 GPU/CPU 转换造成 1 个通道值的差异；双门方案清理克隆得到的空画布。

主要文件：`src/CrispWordmark.tsx`、`src/wordmarkReveal.ts`、`src/Wordmark.tsx`、`src/room-theme.css`、`src/motionSnapshot.ts`、`src/useRoomTransition.ts`。

## 当前正式构建的验证

- `npm test`：18 项既有测试通过；TypeScript 与正式构建通过。
- `tools/verify-logo-writing.py`：15 项实际浏览器检查通过。
- 整词每 5ms 检查一次，共 463 个采样：没有倒退或断笔；k 在开始之前没有提前出现。
- k 中段 79 个采样区间，每 5ms 最少增加约 161.53 个等效墨迹像素，原来的两段停滞消失。
- 2310ms 的末帧与 finish 事件后的画布像素完全一致；实际屏幕比较的变化像素数为 **0**。
- 三次自然播放均在画布时钟到达 **2310ms**、动画状态为 finished 后才标记完成，没有提前补显整词。
- 日夜切换、DPR 改变时保留暂停在 960ms 的同一时钟与墨迹进度。
- signature 与 gates 快照的 RGBA 通道最大差均为 **0**，过渡结束后清理完成。
- `tools/verify-logo-rendering.py`：16 项实际浏览器检查通过，覆盖桌面 DPR1/1.25/1.5/2、手机 DPR3、日夜、减少动态效果与缩放预览。
- 弯转直轮廓继续通过 32 倍采样参考比较：边缘 alpha 平均误差 1.527、最大误差 6、曲率覆盖差 0.01961，清晰度没有因修复而回退。
- 本轮实际浏览器检查没有页面异常。

浏览器为独立 Chrome 147 配置；实际截图已经查看。逐帧截图、最后完成前后截图与日夜截图不是 DOM 外框测量的替代品，本轮分别核验了像素和几何。

证据保存在 `docs/inklune-verification/k-handoff-fix-20261023/`：

- `k-fixed-actual-contact.png`：当前实际书写中间帧，按整数倍放大检查。
- `before-finish.png`、`after-finish.png`：完成事件前后的实际屏幕。
- `writing-completed-native.png`：完成画布的原始像素。
- `writing-checks.json`、`writing-frames.json`、`natural-0.json` 至 `natural-2.json`：本轮结果与真实时钟记录。
- `snapshot-signature-source.png` / `snapshot-signature-copy.png`、gates 对应文件：快照复制验证。
- `logo-fix-checks.json`、桌面及手机日夜截图：密度、像素覆盖与预览缩放检查。

此前诊断见 `LOGO-K-HANDOFF-DIAGNOSIS-2026-10-23.md`。本报告记录已实现、已验证的修复。
