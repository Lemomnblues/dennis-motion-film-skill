# 从 LHH 工程改一支新片

此处路径相对于新建的影片工程。公开示例保留第七版的 13 镜、1,985 帧和五个声画确认点。音乐按原分镜拍点重新合成，团队展示使用四张编号卡。查看 [示例视频](../assets/examples/lhh-demo.mp4) 或 [全片分镜接触表](../assets/examples/lhh-contact.jpg)。

## 修改位置

| 想改什么 | 文件与做法 |
|---|---|
| 品牌 | `brand.json` 控制字标、合作品牌、产品英文名、主强调色、八个动态文案槽位和片尾标语。长字标先检查开场与定版静帧。其他材质色在 `src/graphic.mjs`、`src/closing.mjs`、`src/worlds.js`。 |
| 产品故事 | 片头和终端在 `src/scenes.mjs`。把提问、检索项、材料名称、答案和行动按钮串成同一案例。三组场景在 `src/employment.mjs`，相应抽帧与期望文案在 `scripts/verify-employment.mjs`。 |
| 团队 | `assets/team.json` 的四个槽位可填写姓名、职务、颜色和可选照片。将图片放到 `assets/team/`，把该项的 `image` 写成 `team/文件名.jpg`。无照片时保留编号卡。 |
| 产品操作 | `src/consult-cards.mjs` 绘制操作卡、按钮和提交状态。卡片落下时投影缩回，按钮按下时界面应进入可辨识的新状态。 |
| 章节 / 时长 | `analysis/render-plan.json` 记录章节和内容，`analysis/beats.json` 提供实际切点，`analysis/ending.json` 给出时长、帧数与片尾稳定时刻。播放页使用实际切点和章节标题。 |
| 画幅 / 镜数 | 示例按 1920×1080、30 fps 和 13 镜布置。短片可摘用场景函数，传入新片的本地时间；同步调整 `src/compositor.mjs` 的场景映射、固定动作帧、编码尺寸和抽帧核验。竖屏需重新安排主体与字幕。 |

### 四种动效的原版与改编

| 想表达的动作 | 参考实现 | LHH 的处理 |
|---|---|---|
| 多项状态在一个位置轮换 | [GlitchCycle](../assets/video-shotcraft/demos/typography/glitch-cycle/GlitchCycle.tsx) | `src/inquiry-signal.mjs` 在字槽切换时短暂错位；录用条件、考核记录等关键词在停留段清晰可读。 |
| 三类材料朝同一目标前进 | [DatavizLandscapeOpen](../assets/video-shotcraft/demos/opening/dataviz-landscape-open/DatavizLandscapeOpen.tsx) | `src/evidence-flow.mjs` 用低机位和透视支流交代来源与方向。 |
| 汇入一个结果 | [BezierSourceConvergeMerge](../assets/video-shotcraft/demos/ui-entrance/bezier-source-converge-merge/BezierSourceConvergeMerge.tsx) | 同一文件按曲线弧长推进数据点，抵达时展开摘要卡。 |
| 逐步引导操作 | [ContactShadowLift](../assets/video-shotcraft/demos/ui-entrance/element-body-moves/ContactShadowLift.tsx) | `src/consult-cards.mjs` 用卡身离桌高度和双层投影标记当前步骤。 |

早期版本的 [六种 three.js 场景](../assets/three-studies) 包含玻璃图层、多面线框、银河、天平、铬字和粒子球，附对应 PNG。要试用，将该目录的 `worlds.js` 复制到**工作副本**的 `src/`，在 `scripts/render3d.mjs` 的 `available` 中加入 `poly`、`galaxy`、`justice`、`chrome` 或 `orb`，生成后在合成器对应镜头调用 `world(id, time)`。逐帧缓存按场景名存放，改材质、镜头或模型后强制刷新。

## 更换音乐

示例不需另找配乐。`npm run render` 在首次运行时通过 `scripts/demo-score.mjs` 按分镜帧号合成鼓点和低音，然后由 `scripts/mix-cues.py` 生成五次提示音。已有 `assets/soundtrack.wav` 时会使用该文件。

替换配乐时，将已剪好的音乐导出为 48 kHz、双声道、16-bit PCM WAV，放入 `assets/soundtrack.wav`。时长须与 `analysis/ending.json` 对齐。保留原速时，先选可用小节，再选同拍位置衔接尾奏。固定片长与完整小节有冲突时，按简报对音乐速度和尾段做取舍。

当前模板时长下，已安装 NumPy 的 Python 可运行以下命令分析新曲，先输出候选拍点供审听。

```sh
python3 scripts/analyze.py --output analysis/candidate-beats.json
```

按实际节拍核对候选 BPM、切点和重音，再用候选文件更新 `analysis/beats.json`。更新 `analysis/progress-cues.json` 里五个动作的帧号，并检查场景中引用的拍点索引。检测器按原示例的 13 镜布置；改变结构时一并调整 `scripts/analyze.py` 的 `DESIGN_STARTS` 和时长约束。没有稳定鼓点的音乐可手工标出切点。原片的 40 毫秒同拍换接方法和 32 小节表见 [分镜记录](../assets/lhh-film/analysis/timeline.md)。

## 预览和成片

```sh
node scripts/render.mjs --still 38.4 --out preview.png
npm run previews
npm run render
npm run verify
```

静帧与接触表可直接使用随包的三维参考帧。完整渲染会生成真实的三维帧序列。Chrome 位于自定义位置时设置 `CHROME_PATH`；改三维场景后运行 `npm run render -- --force-three`。交付时保留字体与第三方归属。离线播放器需要 `index.html`、`output/film.mp4` 和 `previews/final-encoded/02-3.4.png` 按原相对位置存放。
