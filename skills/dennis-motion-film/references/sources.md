# 参考资源与归属

## LHH 影片工程

公开示例来自 LHH FESCO《让用工问题，有据可循》第七版制作工程。随包保留 13 段分镜、逐帧拍点、五个操作提示音、Canvas 场景、three.js 图层、字体和编码检查。样片沿用项目提供的《Vibe知识大赏》及原片提示音，团队镜头使用可编辑的编号卡。工程自带的配乐生成器可以用于新片。早期版本额外提供六组三维场景的代码与静帧。LHH FESCO 品牌及标识归各自权利人所有。

示例字体为 Noto Sans CJK SC、Space Grotesk、Barlow Condensed 和 IBM Plex Mono。字体文件及各自的 SIL Open Font License 位于 [工程字体目录](../assets/lhh-film/assets/fonts/)。片中的三处改编代码与上游关系见 [工程归属说明](../assets/lhh-film/THIRD-PARTY.md)。

## Video Shotcraft

镜头库来自 Wei Yihao 的 [Video Shotcraft 固定版本](https://github.com/Vincentwei1021/video-shotcraft/tree/1266a3ec4831289c4d893d42dd5102723658039a)。代码与文档保留 [Apache-2.0 全文](../assets/video-shotcraft/LICENSE) 和 [上游研究来源记录](../assets/video-shotcraft/references/shots/ATTRIBUTION.md)。

| 随包资源 | 内容 |
|---|---|
| [镜头卡](../assets/video-shotcraft/references/shots/) 和 [源码](../assets/video-shotcraft/demos/) | 10 类、124 张现行镜头卡。随附 TSX 实现、共享组件与截图纹理。`_legacy` 为上游旧项目兼容素材。 |
| [离线镜头库](../assets/video-shotcraft/gallery/index.html) | 150 个可播放的动态预览。按上游 gallery 索引匹配 [官方演示媒体](https://github.com/Vincentwei1021/video-shotcraft/releases/tag/gallery-media)，重编码为宽 480 像素的静音 H.264，另附本地首图。 |
| [调校笔记](../assets/video-shotcraft/shot-polish/final-notes/) | 150 份定稿记录，可按组件名查找设计取舍。 |
| [制作参考](../assets/video-shotcraft/references/)、[通用组件](../assets/video-shotcraft/assets/lib/) | 编排、音乐卡点、音效、动效审查和可复用的画面组件。 |
| [Remotion 示例源码](../assets/video-shotcraft/template/) | 页面纹理、主题、镜头实现与参考工程结构。复刻其有声版本时需自行提供音轨。LHH 主工程使用 Canvas / three.js。 |

上游 Mixkit BGM 与历史音效保留 [BGM 出处](../assets/video-shotcraft/assets/audio/ATTRIBUTION.md) 和 [音效出处](../assets/video-shotcraft/template/public/audio/ATTRIBUTION.md)。如需这些录音，可按记录逐项取用；来源未确认的条目可换成自己的声音。新建工程的默认节奏音轨可用随包脚本重建。
