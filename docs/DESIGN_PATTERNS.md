# Design Patterns (from Admin Dashboard)

This document captures the typography and color patterns that make the Admin dashboard effective, for consistency across the site.

## Typography Hierarchy

| Element | Classes | Usage |
|---------|---------|--------|
| Page title | `text-5xl md:text-7xl font-light tracking-tight` | Main page heading |
| Subtitle | `text-base text-gray-600 dark:text-gray-400` | One-line description below title |
| Section header | `text-2xl font-semibold mb-6` or `mb-8` | Card/section titles |
| Stat label | `text-sm text-gray-500 dark:text-gray-400` | Small muted label above value |
| Stat value | `text-3xl font-semibold` | Prominent number or key metric |
| Primary content | `font-medium` or `font-semibold` | Names, titles |
| Secondary content | `text-sm text-gray-600 dark:text-gray-400` | Descriptions, metadata |
| Meta/Muted | `text-xs text-gray-500 dark:text-gray-500` | Dates, fine print |

## Pastel Color System

### Stat Cards
- **Peach**: `bg-peach/10 dark:bg-peach/10`, `border-peach/20`, icon in `bg-peach/20 dark:bg-peach/30`
- **Lavender**: `bg-lavender/10`, `border-lavender/20`, icon in `bg-lavender/20 dark:bg-lavender/30`
- **Mint**: `bg-mint/10`, `border-mint/20`, icon in `bg-mint/20 dark:bg-mint/30`

### Action Buttons
- Edit/Primary: `bg-peach/20 hover:bg-peach/30`
- Secondary: `bg-lavender/20 hover:bg-lavender/30`
- Tertiary: `bg-mint/20 hover:bg-mint/30`
- Destructive: `bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50`

### Icon Boxes
- `p-3 rounded-lg bg-{pastel}/20 dark:bg-{pastel}/30`
- Icon color: `text-gray-700 dark:text-{pastel}` for accent

## Card Structure

- Base: `rounded-xl p-6 md:p-8 backdrop-blur-md border`
- Light: `bg-white/40 border-gray-200/50`
- Dark: `dark:bg-gray-800/60 dark:border-gray-700/50`
- Hover: `hover:bg-white/60 dark:hover:bg-gray-700/80`

## Spacing

- Page header margin: `mb-12` (not mb-20)
- Section margin: `mb-6` or `mb-8`
- Stat card grid: `gap-6 mb-12`

## Button Transitions

- `transition-all duration-300 transform-gpu hover:scale-105 active:scale-95`
- Focus: `focus:outline-none focus:ring-2 focus:ring-peach/50`
