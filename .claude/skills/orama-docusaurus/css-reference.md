# Orama CSS Custom Properties Reference

The Orama UI components (`OramaSearchBox`, `OramaSearchButton`) use **Shadow DOM**, which means standard CSS selectors applied from outside the component have no effect. All visual customization must go through **CSS custom properties (variables)**, which are inherited through Shadow DOM boundaries.

## How to Apply Variables

### Method 1: `themeConfig` in `docusaurus.config.js` (recommended)

```js
// docusaurus.config.js
searchbox: {
  themeConfig: {
    colors: {
      light: { '--background-color-primary': '#ffffff' },
      dark:  { '--background-color-primary': '#0d1117' },
    },
    typography: { '--font-primary': '"Inter", sans-serif' },
    radius: { '--radius-m': '6px' },
  },
}
```

Supports independent light/dark values. Applied as inline styles — highest specificity.

### Method 2: CSS custom properties in `custom.css`

```css
/* website/src/css/custom.css */

/* Light theme (default) */
[id^="orama-ui"] {
  --background-color-primary: #ffffff;
}

/* Dark theme — use .theme-dark, NOT [data-theme="dark"] */
[id^="orama-ui"].theme-dark {
  --background-color-primary: #0d1117;
}
```

### What DOES NOT WORK (fails silently)

```css
/* These have zero effect inside Shadow DOM */
.orama-search-box { background: red; }
[id^=orama-ui] button { color: blue; }
[id^=orama-ui] input { font-size: 16px; }

/* WRONG prefix — these variables do not exist */
--orama-background-color-primary: #fff;
--orama-text-color: #111;
```

---

## Color Variables

| Variable | Description |
|---|---|
| `--background-color-primary` | Main background color |
| `--background-color-secondary` | Secondary/panel background |
| `--background-color-accent` | Accent/highlight background |
| `--text-color-primary` | Primary text |
| `--text-color-secondary` | Secondary/muted text |
| `--button-background-color-primary` | Primary button background |
| `--button-background-color-secondary` | Secondary button background |
| `--border-color-accent` | Accent border color |
| `--border-color-primary` | Primary border color |

## Typography Variables

| Variable | Description |
|---|---|
| `--font-primary` | Main font family (e.g. `"Inter", sans-serif`) |
| `--orama-base-font-size` | Base font size divisor for rem calculations (default: `16`). This is the ONE variable with the `--orama-` prefix. Scale all component sizes proportionally by changing this. |

## Border Radius Variables

| Variable | Description |
|---|---|
| `--radius-xs` | Extra-small radius |
| `--radius-s` | Small radius |
| `--radius-m` | Medium radius |
| `--radius-l` | Large radius |
| `--radius-3xl` | Extra-large radius (modal corners, etc.) |
| `--textarea-radius` | Textarea / chat input border radius |

## Shadow Variables

| Variable | Description |
|---|---|
| `--textarea-shadow` | Box shadow for textarea / chat input (e.g. `0px 2px 12px 0px rgba(0,0,0,0.1)`) |

---

## Primitive Palette Tokens

You can override the underlying design token palette to remap the entire token system:

```js
themeConfig: {
  colors: {
    purple700: '#1a73e8',  // maps to deep-purple accent in light mode
    purple500: '#4285f4',  // maps to medium-purple accent in dark mode
  },
}
```

---

## Dark Mode Mechanism

| System | Dark mode selector |
|---|---|
| Docusaurus | `html[data-theme="dark"]` |
| Orama | `.theme-dark` class on the `[id^="orama-ui"]` host element |

The Docusaurus plugin bridges them automatically — no configuration required. The `colorScheme` prop is set to `'light'` or `'dark'` based on the active Docusaurus color mode. It also accepts `'system'` (follows `prefers-color-scheme`).

```css
/* CORRECT dark mode targeting */
[id^="orama-ui"].theme-dark {
  --background-color-primary: #0d1117;
  --text-color-primary: #e6edf3;
}

/* WRONG — this selector has no effect on Orama components */
[data-theme="dark"] [id^="orama-ui"] {
  --background-color-primary: #0d1117;
}
```

---

## SearchButton (Outside Shadow DOM)

`OramaSearchButton` receives `className="DocSearch-Button"` so it can be styled with normal CSS:

```css
.DocSearch-Button { user-select: none; }
.DocSearch-Button kbd {
  border: 0;
  box-shadow: none;
  font-size: .8rem !important;
  padding: 0 !important;
}
```

---

## Complete Example

```css
/* website/src/css/custom.css */

[id^="orama-ui"] {
  /* Colors — light */
  --background-color-primary:        #ffffff;
  --background-color-secondary:      #f8f8f8;
  --background-color-accent:         #1a73e8;
  --button-background-color-primary: #1a73e8;
  --text-color-primary:              #111111;
  --text-color-secondary:            #555555;
  --border-color-accent:             #1a73e8;

  /* Typography */
  --font-primary: "Inter", sans-serif;

  /* Border radius */
  --radius-m:        6px;
  --radius-l:        8px;
  --radius-3xl:      20px;
  --textarea-radius: 12px;

  /* Shadows */
  --textarea-shadow: 0px 2px 12px 0px rgba(0, 0, 0, 0.1);

  /* Uncomment to scale all sizes up */
  /* --orama-base-font-size: 18; */
}

[id^="orama-ui"].theme-dark {
  --background-color-primary:        #0d1117;
  --background-color-secondary:      #161b22;
  --background-color-accent:         #4285f4;
  --button-background-color-primary: #4285f4;
  --text-color-primary:              #e6edf3;
  --text-color-secondary:            #8b949e;
}
```
