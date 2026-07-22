# Blu Style Guide v1.0

## 🎨 Color System Architecture

### Theme Structure

- **Dual Theme Support:** Light/Dark modes with smooth transitions
- **Semantic Tokens:** Colors named by function, not appearance
- **Transitions:** Smooth 0.3s cross-fade for all themed properties

### Complete Color Token Reference

#### Backgrounds

| Token                      | Light Mode | Dark Mode | Usage                 |
| -------------------------- | ---------- | --------- | --------------------- |
| `--color-canvas`           | `#F8FAFC`  | `#0A0A0F` | Main page background  |
| `--color-surface`          | `#FFFFFF`  | `#15171F` | Cards, modals, panels |
| `--color-surface-elevated` | `#FAFAFA`  | `#1A1C26` | Dropdowns, tooltips   |
| `--color-card`             | `#FFFFFF`  | `#15171F` | Dashboard cards       |

#### Borders

| Token                    | Light Mode | Dark Mode | Usage             |
| ------------------------ | ---------- | --------- | ----------------- |
| `--color-border-light`   | `#E2E8F0`  | `#1E202A` | Subtle separators |
| `--color-border-default` | `#CBD5E1`  | `#292C38` | Standard borders  |
| `--color-border-heavy`   | `#94A3B8`  | `#373A48` | Focus states      |

#### Text

| Token                    | Light Mode | Dark Mode | Usage                |
| ------------------------ | ---------- | --------- | -------------------- |
| `--color-text-primary`   | `#0F172A`  | `#F1F5F9` | Headlines, body text |
| `--color-text-secondary` | `#334155`  | `#CBD5E1` | Labels, subtitles    |
| `--color-text-tertiary`  | `#64748B`  | `#94A3B8` | Hints, placeholders  |
| `--color-text-disabled`  | `#94A3B8`  | `#475569` | Disabled state text  |

#### Brand Colors (Indigo)

| Token                 | Light Mode | Dark Mode |
| --------------------- | ---------- | --------- |
| `--color-primary-400` | `#818CF8`  | `#A5B4FC` |
| `--color-primary-500` | `#6366F1`  | `#818CF8` |
| `--color-primary-600` | `#4F46E5`  | `#6366F1` |

#### Chart Colors (Color-blind friendly) [citation:4]

| Token             | Light Mode | Dark Mode | Data Role           |
| ----------------- | ---------- | --------- | ------------------- |
| `--color-chart-1` | `#6366F1`  | `#818CF8` | Primary data series |
| `--color-chart-2` | `#8B5CF6`  | `#A78BFA` | Secondary series    |
| `--color-chart-3` | `#EC4899`  | `#F472B6` | Tertiary series     |
| `--color-chart-4` | `#F59E0B`  | `#FBBF24` | Highlight series    |
| `--color-chart-5` | `#10B981`  | `#34D399` | Positive trends     |
| `--color-chart-6` | `#0EA5E9`  | `#38BDF8` | Comparison data     |

#### Shadows

| Token         | Value | Usage                     |
| ------------- | ----- | ------------------------- |
| `--shadow-sm` | ...   | Subtle elevation          |
| `--shadow-md` | ...   | Card elevation            |
| `--shadow-lg` | ...   | Modal, dropdown elevation |

#### Semantic Colors

| Token             | Color     | Usage                               |
| ----------------- | --------- | ----------------------------------- |
| `--color-success` | `#22C55E` | Positive metrics, completed actions |
| `--color-warning` | `#F59E0B` | Attention needed, thresholds        |
| `--color-error`   | `#EF4444` | Negative metrics, failures          |
| `--color-info`    | `#3B82F6` | Neutral information                 |

## 📝 Typography

### Primary Font: **Inter Variable**

- **Font Family:** `'Inter var', 'Inter', system-ui, sans-serif`
- **Variable Support:** All weights 100-900 via single file
- **OpenType Features:** Tabular numbers, slashed zero, contextual alternates

### Font Usage Guidelines

```css
/* Weight scale */
text-xs  → 12px / 400 (Regular)
text-sm  → 14px / 400 (Regular)
text-base→ 16px / 400 (Regular)
text-lg  → 18px / 500 (Medium)
text-xl  → 20px / 600 (Semi-bold)
text-2xl → 24px / 600 (Semi-bold)
text-3xl → 30px / 700 (Bold)

/* Chart numbers require tabular-nums class */
.chart-value {
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
}
```
