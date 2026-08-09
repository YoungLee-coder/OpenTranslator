# OpenTranslator 设计风格与色彩体系

> OpenTranslator 的视觉语言：**DeepL 风格的自托管 AI 翻译器**，气质接近「编辑级期刊」——暖中性纸感、墨蓝强调、衬线标题、发丝线分隔，克制而不冷淡。

**文档导航：** [README.md](./README.md) · [api-reference.md](./api-reference.md)

---

## 设计风格

### 定位与气质

| 维度 | 特征 |
|---|---|
| 气质 | 精装期刊 / 编辑排版，可读优先 |
| 色彩 | 暖米灰底 + 墨蓝单一强调 |
| 字体 | 无衬线 UI + 衬线展示与译文 |
| 形状 | 小圆角、轻边框、药丸形导航元素 |
| 密度 | 留白充足，正文约 14px |
| 动效 | 轻 rise / fade，流式场景用细光标闪烁 |

**不属于本品牌语言的视觉：** 高饱和渐变、重阴影、玻璃拟态泛滥、Inter/Roboto 默认 AI 风、过多 emoji。

### 字体

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
--font-serif: "Source Serif 4 Variable", "Source Serif 4", "Iowan Old Style",
  "Source Serif Pro", "Georgia", "Songti SC", "Noto Serif SC", serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", monospace;
```

| 用途 | 字体族 |
|---|---|
| UI、按钮、标签、输入 | `--font-sans` |
| 页面标题、展示标题 | `--font-serif`（`.font-display`：`font-weight: 600`，`letter-spacing: -0.012em`） |
| 译文正文 | `--font-serif` |
| 栏目标识（`.eyebrow`） | `--font-sans`，0.7rem，字距 0.16em，大写 |

正文行高约 1.625（`leading-relaxed`）。

### 圆角

| Token | 值 |
|---|---|
| `--radius` / `--radius-md` | `0.5rem` |
| `--radius-sm` | `0.375rem` |
| `--radius-lg` | `0.625rem` |
| `--radius-xl` | `0.875rem` |
| 药丸形 | `999px`（`rounded-full`） |

### 标志性视觉元素

- **签名线：** 面板顶部 1px 渐变线，`from-transparent via-primary/50 to-transparent`，类似印刷记号。
- **发丝分隔线：** `--rule` 比 `--border` 更淡，用于编辑级内部分隔。
- **纸感底色（浅色）：** 极淡径向渐变，墨蓝约 4% 透明度。

### 品牌资产

Logo 源文件：主仓库 `docs/images/icon.svg`。

---

## 色彩体系

颜色使用 **OKLCH**，以获得感知均匀的明度阶梯。语义色通过 CSS 变量定义，浅色与深色模式各自一套。

### 浅色模式 `:root`

```css
:root {
  --radius: 0.5rem;

  --background: oklch(0.985 0.003 80);
  --foreground: oklch(0.22 0.012 260);
  --card: oklch(1 0.002 80);
  --card-foreground: oklch(0.22 0.012 260);
  --popover: oklch(1 0.002 80);
  --popover-foreground: oklch(0.22 0.012 260);

  --primary: oklch(0.32 0.08 255);
  --primary-foreground: oklch(0.985 0.003 80);

  --secondary: oklch(0.96 0.003 80);
  --secondary-foreground: oklch(0.28 0.01 260);

  --muted: oklch(0.96 0.003 80);
  --muted-foreground: oklch(0.5 0.012 260);

  --accent: oklch(0.94 0.025 255);
  --accent-foreground: oklch(0.32 0.08 255);

  --destructive: oklch(0.5 0.18 25);
  --destructive-foreground: oklch(0.985 0 0);

  --success: oklch(0.5 0.12 160);
  --success-foreground: oklch(0.985 0 0);

  --warning: oklch(0.68 0.14 75);
  --warning-foreground: oklch(0.25 0.05 75);

  --border: oklch(0.9 0.004 80);
  --input: oklch(0.9 0.004 80);
  --ring: oklch(0.32 0.08 255);

  --sidebar: oklch(0.985 0.003 80);
  --sidebar-foreground: oklch(0.28 0.01 260);
  --sidebar-border: oklch(0.9 0.004 80);

  --rule: oklch(0.86 0.004 80);
}
```

### 深色模式 `.dark`

```css
.dark {
  --background: oklch(0.17 0.006 260);
  --foreground: oklch(0.96 0.003 80);
  --card: oklch(0.20 0.006 260);
  --card-foreground: oklch(0.96 0.003 80);
  --popover: oklch(0.22 0.006 260);
  --popover-foreground: oklch(0.96 0.003 80);

  --primary: oklch(0.72 0.10 255);
  --primary-foreground: oklch(0.17 0.006 260);

  --secondary: oklch(0.26 0.006 260);
  --secondary-foreground: oklch(0.96 0.003 80);

  --muted: oklch(0.25 0.005 260);
  --muted-foreground: oklch(0.68 0.01 260);

  --accent: oklch(0.28 0.04 255);
  --accent-foreground: oklch(0.78 0.10 255);

  --destructive: oklch(0.68 0.18 25);
  --destructive-foreground: oklch(0.96 0.003 80);

  --success: oklch(0.68 0.12 160);
  --success-foreground: oklch(0.17 0.006 260);

  --warning: oklch(0.78 0.14 75);
  --warning-foreground: oklch(0.17 0.006 260);

  --border: oklch(0.28 0.006 260);
  --input: oklch(0.30 0.006 260);
  --ring: oklch(0.72 0.10 255);

  --sidebar: oklch(0.17 0.006 260);
  --sidebar-foreground: oklch(0.96 0.003 80);
  --sidebar-border: oklch(0.28 0.006 260);

  --rule: oklch(0.32 0.006 260);
}
```

### 语义色说明

| Token | 含义 |
|---|---|
| `background` | 页面底色（暖米白 / 深墨灰） |
| `foreground` | 主文字色 |
| `card` | 面板、卡片表面 |
| `primary` | 墨蓝强调色（按钮、链接、焦点环、签名线） |
| `muted` / `muted-foreground` | 次要背景与次要文字（占位符、说明） |
| `accent` | 悬停、选中等轻强调 |
| `destructive` | 错误、危险操作 |
| `success` | 成功状态 |
| `warning` | 警告状态 |
| `border` / `input` | 边框与输入框描边 |
| `ring` | 焦点环 |
| `rule` | 发丝分隔线 |

深色模式下 `primary` 提亮，以保证对比度；其余 token 随背景整体降明度、略偏冷灰。

### 液态玻璃（导航专用）

主站导航使用从上述 token 派生的玻璃质感变量（`--glass-bg`、`--glass-sheen`、`--glass-edge`、`--glass-shadow` 及对应的 `--glass-chip-*`）。完整定义见主仓库 `web/src/index.css`。

---

*色彩 token 以主仓库 `web/src/index.css` 为准；本文摘录供插件侧引用品牌色，不涉及页面布局。*
