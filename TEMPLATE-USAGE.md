# Framed Layout Template — Quick Start Guide

## What Is It?

A reusable CSS + HTML template for creating:
- **Outer margins** with light gray background (always visible on wide screens)
- **Inner content area** with theme-aware background (toggles light/dark)
- **Responsive layout** with proper spacing and flexbox

Perfect for game boards, dashboards, or any project needing a polished frame effect.

---

## Quick Copy-Paste Setup

### Step 1: Copy CSS
Copy `TEMPLATE-LAYOUT.css` to your project:
```bash
cp TEMPLATE-LAYOUT.css your-project/styles/layout.css
```

### Step 2: Import in HTML
```html
<head>
  <link rel="stylesheet" href="styles/layout.css">
</head>
```

### Step 3: Wrap Content
```html
<body>
  <div class="app-container">
    <header>Your Header</header>
    <main>Your Content</main>
    <footer>Your Footer</footer>
  </div>
</body>
```

### Step 4: Add Theme Toggle (Optional)
```html
<html data-theme="dark">
  <!-- Change to data-theme="light" for light mode -->
</html>
```

---

## CSS Variables — Easy to Customize

Edit these in your CSS:

```css
:root, [data-theme="dark"] {
  --bg-outer: #e8e8e8;        /* Outer frame color */
  --bg-inner-dark: #1a1a2e;   /* Dark theme content bg */
  --text-dark: #e0e0e0;       /* Dark theme text */
}

[data-theme="light"] {
  --bg-inner-light: #f5f5f5;  /* Light theme content bg */
  --text-light: #1a1a1a;      /* Light theme text */
}
```

---

## Layout Breakdown

```
┌─────────────────────────────────────┐
│     Light Gray Margin (--bg-outer)  │
│  ┌───────────────────────────────┐  │
│  │  Content Area (app-container) │  │
│  │  ├─ Header                    │  │
│  │  ├─ Main (flex: 1)            │  │
│  │  └─ Footer (margin-top: auto) │  │
│  └───────────────────────────────┘  │
│                                      │
└─────────────────────────────────────┘
```

---

## Features

✅ **Responsive** — Works on mobile, tablet, desktop  
✅ **Theme-aware** — Automatic light/dark toggle  
✅ **Flexbox layout** — Footer always at bottom  
✅ **Customizable** — Easy CSS variable override  
✅ **Minimal** — ~100 lines of CSS  
✅ **No dependencies** — Pure CSS, no libraries needed

---

## Example: Xiangqi Game Board

```html
<!DOCTYPE html>
<html data-theme="dark">
<head>
  <link rel="stylesheet" href="layout.css">
  <link rel="stylesheet" href="game.css">
</head>
<body>
  <div class="app-container">
    <header>
      <h1>Xiangqi</h1>
      <nav>...</nav>
    </header>
    
    <main>
      <div class="board-container">
        <!-- Game board here -->
      </div>
    </main>
    
    <footer>
      <p>Built with Framed Layout</p>
    </footer>
  </div>
</body>
</html>
```

---

## Theme Toggle JavaScript

```javascript
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Load saved theme
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
});
```

---

## Customization Examples

### Change outer margin color:
```css
:root {
  --bg-outer: #f0f0f0;  /* Lighter gray */
}
```

### Change inner dark background:
```css
:root, [data-theme="dark"] {
  --bg-inner-dark: #0a0a0a;  /* Darker */
}
```

### Adjust padding:
```css
.app-container {
  padding: 20px 30px 50px;  /* Change as needed */
}
```

---

## Browser Support

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers  

---

## That's It!

Copy → Import → Wrap → Done! 🎉

Questions? Check the `TEMPLATE-INDEX.html` for a complete working example.
