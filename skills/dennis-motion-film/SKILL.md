---
name: dennis-motion-film
description: 为品牌、软件产品或服务制作可编辑的动态宣传片。适用于要求沿用 LHH 宣传片做法、按音乐卡点编排分镜、从镜头库选用动效，或交付逐帧渲染的 MP4 和工程源码。
---

# Dennis 动态宣传片

## 从业务故事出发

从用户资料里找出观众、一个具体问题、能在画面里展示的解决过程，以及结尾希望观众做的事。用一句话串起它们。沿用 LHH 做法时，可以把「问题 → 输入 → 找到依据 → 得出结果 → 采取行动」换成新产品自己的流程。片长、品牌调性、语言和画幅以当前简报为准。

先把分镜写成「起止帧 / 观众看到什么 / 状态怎样变化 / 对应音乐点」。用一个可追踪的对象连接镜头，例如前一镜输入的问题成为下一镜检索的标题。LHH 的 [13 段分镜](assets/lhh-film/analysis/timeline.md) 和 [公开示例 MP4](assets/examples/lhh-demo.mp4) 可用于校准节奏。

## 选用镜头

按每镜的动作找参考。先看 [可离线打开的镜头库](assets/video-shotcraft/gallery/index.html)，或按名称、中文用途搜索 [124 张镜头卡索引](references/shots.md)。卡片说明与 TSX 源码保留上游目录。只读本次选中的卡与实现。LHH 中实际采用的四种手法及对应源码见 [镜头对照](references/production.md#四种动效的原版与改编)。

卡片提供动作和时序。把槽位文字、图层、资料流和确认反馈替换成当前产品真实可解释的对象。例如一份咨询摘要需要三种材料，就让三条有标签的线分别带着材料进入同一张摘要卡。

## 建工程并渲染

在用户工作区执行下列命令。若直接使用仓库，将 SKILL_DIR 设为当前 SKILL.md 所在目录。

```sh
SKILL_DIR="$HOME/.codex/skills/dennis-motion-film"
python3 "$SKILL_DIR/scripts/new-film.py" ./my-brand-film
cd my-brand-film
npm ci
npm run previews
```

`new-film.py` 以 LHH 公开示例建立独立工程。横屏示例使用 Node.js 22.12+、Python 3.9+ 和 Chrome / Chromium；FFmpeg 随 npm 依赖安装。可从任意工作目录用脚本的绝对路径指定项目位置。编辑 `brand.json` 更换片头片尾字标、片尾标语、动效文字和主强调色。业务界面、案例和按钮文案在对应场景中，详见 [修改位置与改片方法](references/production.md)。

换曲时先剪出最终音乐段，再分析起音、重排切点和提示音。相邻动词或大字各占独立帧区间，避免吸附到同一拍后跳字。30 fps 配 48 kHz 音频时，每帧对应 1,600 个采样；让提交、落位、生成结果等关键动作与提示音共用一个帧号。节拍数据、配乐和修改入口见 [音乐处理](references/production.md#更换音乐)。

```sh
npm run render
```

交付 `output/film.mp4`，按用户要求附上可编辑工程或离线播放页。播放页入口是工程根目录生成的 `index.html`。检查 `output/quality-report.json`、`previews/final-contact.jpg`，再播放成片核对文字可读时长、声画落点和尾音。新片改了时长、镜数或画幅时，按新分镜同步调整合成和抽帧检查。
