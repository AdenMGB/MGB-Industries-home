# AdenMGB Website — Aesthetic Guide

A technical breakdown of how the colouring, typography, and unique design choices create the site's cohesive aesthetic.

---

## 1. Colour System

### Custom Pastel Palette

The site uses a curated pastel palette defined in `tailwind.config.js` instead of generic Tailwind colours:

| Token           | Hex            | Usage                                         |
| --------------- | -------------- | --------------------------------------------- |
| **peach**       | `#FFB5A7`      | Primary accent, CTAs, active states, timeline |
| **coral**       | `#FF8C94`      | Hover states, links, emphasis                 |
| **lavender**    | `#C8A8E9`      | Secondary accent, Admin, dev tools            |
| **mint**        | `#A8E6CF`      | Success, actions, tags, developer tools       |
| **soft-yellow** | `#FFD3A5`      | Warm highlights, formatters                   |
| **warm-pink**   | `#FFB6C1`      | Generators, UUID                              |
| **cream**       | `#FFF8E7`      | Light mode background                         |
| **soft-blue**   | `#B5E5E8`      | Cool accent, Git tools, URL/HTML              |
| **gray**        | `950: #0a0a0f` | Dark mode background                          |

### Semantic Accent Mapping

Each tool category or section has its own accent:

- **Peach** — Primary nav, sign-up, timeline, featured projects
- **Lavender** — Admin dashboard, secondary navigation
- **Mint** — Success actions, tags, conversion trainer
- **Coral** — Hover, destructive emphasis, links
- **Soft-blue** — Git tools, URL/HTML encode
- **Soft-yellow** — JSON, JWT
- **Warm-pink** — UUID, case converter
- **Coral** — Hash, color converter

### Dark Mode

- **Light:** `bg-cream` background, `text-gray-800` body
- **Dark:** `bg-gray-950` background, `text-gray-100` body
- Theme via `dark:` classes and `useTheme` composable
- Persisted in `localStorage`

### Transparency & Glass

- Cards: `bg-white/40 dark:bg-gray-800/80 backdrop-blur-md`
- Borders: `border-gray-200/50 dark:border-gray-700/50`
- Accent tints: `bg-peach/20`, `bg-peach/20 dark:bg-peach/30`
- Hover: `hover:bg-white/60 dark:hover:bg-gray-700/80`

---

## 2. Typography

### Font Stack

```css
font-family: 'Inter', system-ui, sans-serif; /* Body, headings */
font-family: 'JetBrains Mono', monospace; /* Code, numbers */
```

### Font Loading

- **Inter:** `300, 400, 500, 600, 700` (Google Fonts)
- **JetBrains Mono:** `400, 500, 600, 700` (Google Fonts)
- Loaded in `App.vue` via `@import`

### Hierarchy

| Element       | Classes                                                      | Notes               |
| ------------- | ------------------------------------------------------------ | ------------------- |
| Page title    | `text-5xl md:text-7xl font-light tracking-tight`             | Large, light, tight |
| Section title | `text-2xl font-semibold`                                     | Clear hierarchy     |
| Card title    | `text-xl font-semibold`                                      | Emphasis            |
| Body          | `text-base text-gray-600 dark:text-gray-300 leading-relaxed` | Readable            |
| Labels        | `text-xs font-medium uppercase tracking-wide`                | Small caps          |
| Captions      | `text-sm text-gray-500 dark:text-gray-400 italic`            | Optional            |

### Letter Spacing

- `tracking-tight` / `-0.02em` for large headings
- `tracking-tighter` / `-0.04em` for hero text
- `tracking-wide` for labels

---

## 3. Layout & Spacing

### Consistent Patterns

- **Padding:** `p-4 md:p-8`, `p-6 md:p-8`, `p-8 md:p-12`
- **Gaps:** `gap-4`, `gap-6`, `gap-6`, `gap-12`
- **Radius:** `rounded-lg`, `rounded-xl`, `rounded-2xl`
- **Max width:** `max-w-4xl`, `max-w-6xl`, `max-w-7xl mx-auto`

### Asymmetric Grids

- **Projects:** Masonry-style with `md:col-span-7 md:row-span-2` for featured, `md:col-span-5` for others
- **Hero:** 7:5 grid (`md:col-span-7` / `md:col-span-5`)

---

## 4. Motion & Animation

### Timing

- **Ease:** `cubic-bezier(0.4, 0, 0.2, 1)` (custom)
- **Duration:** `duration-200`–`duration-300`

### GSAP

- **Hero:** `fromTo` with opacity, y, scale, blur, rotationX
- **Cards:** Staggered `fromTo` with `scrollTrigger`
- **Nav:** Slide + scale for mobile menu

### Hover & Interaction

- **Scale:** `hover:scale-105`, `hover:scale-[1.02]`, `active:scale-95`
- **Transitions:** `transition-all duration-300 transform-gpu`
- **GPU:** `transform-gpu` for performance

### Global Transitions

- `style.css` applies `transition-property: background-color, border-color, color, fill, stroke` with `300ms` duration

---

## 5. Unique Elements

### Background

- **Subtle:** `opacity-[0.02]` blurred circles (`bg-peach/20`, `bg-lavender/10`)
- **GSAP:** `yoyo` float animation on `.bg-element`

### Custom Scrollbar

- Light: peach-tinted thumb on cream track
- Dark: gray thumb on dark track

### Hacker Mode

- `.hacker-mode` switches to JetBrains Mono + green text glow

### Cards

- Glass effect: `backdrop-blur-md` + semi-transparent backgrounds
- Soft borders: `border-gray-200/50 dark:border-gray-700/50`
- Accent borders on hover: `hover:border-peach/30`, etc.

### Focus Rings

- `focus:ring-2 focus:ring-{accent}/50 focus:ring-offset-2` for accessibility

---

## 6. Implementation Summary

| Layer          | Implementation                                                |
| -------------- | ------------------------------------------------------------- |
| **Colours**    | `tailwind.config.js` → `theme.extend.colors`                  |
| **Fonts**      | `App.vue` → Google Fonts; `tailwind.config.js` → `fontFamily` |
| **Theme**      | `useTheme` composable + `dark` class on `<html>`              |
| **Base**       | `style.css` → body, `*` transitions                           |
| **Animations** | GSAP + Tailwind `animate-*`                                   |
| **Layout**     | Tailwind utilities + `cn()` for conditional classes           |

---

## 7. Quick Reference

| Use Case         | Class Pattern                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Page title       | `text-5xl md:text-7xl font-light tracking-tight text-gray-800 dark:text-white`                                  |
| Card             | `bg-white/40 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl` |
| Button (primary) | `bg-peach hover:bg-peach/90 text-white px-6 py-3 rounded-lg transition-all duration-300`                        |
| Accent icon      | `text-peach` or `text-lavender`, `text-mint`                                                                    |
| Hover scale      | `hover:scale-105 active:scale-95 transition-all duration-300 transform-gpu`                                     |
