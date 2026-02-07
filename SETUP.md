# Portfolio Setup Guide

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Start Development Server**
   ```bash
   pnpm dev
   ```

3. **Build for Production**
   ```bash
   pnpm build
   ```

## 📦 Key Dependencies

- **Vue 3** - Composition API with `<script setup>`
- **TresJS** - Declarative Three.js for Vue
- **GSAP** - Professional animation library with ScrollTrigger
- **VueUse** - Collection of Vue composition utilities
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide Vue** - Beautiful icon library

## 🎨 Features Implemented

### ✨ Hero Section
- Interactive 3D particle system using TresJS
- Mouse-reactive particle movement
- Smooth animations and rotations

### 🧭 Magnetic Dock Navigation
- Mac-style dock at the bottom
- Magnetic hover effects with spring physics
- Smooth scaling animations

### 🎴 Bento Grid Projects
- CSS Grid layout with featured cards
- 3D tilt effect on hover
- Cursor-following spotlight gradient
- Scroll-triggered animations

### 🎭 Hacker Mode Toggle
- Instant theme switch to terminal aesthetic
- Matrix green color scheme
- Monospace typography
- Removes glassmorphism effects

### 📜 Scroll-Linked Animations
- GSAP ScrollTrigger integration
- Staggered card animations
- Smooth scroll progress tracking

## 🎯 Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme:
- `deep-space`: Main background color
- `aurora-purple`, `aurora-teal`, `aurora-blue`: Accent colors

### Projects
Edit `src/components/WorkSection.vue` to add/modify projects in the `projects` array.

### 3D Scene
Modify `src/components/HeroScene.vue` to adjust:
- Particle count
- Colors and materials
- Animation speed
- Mouse sensitivity

## 🏗️ Project Structure

```
src/
├── components/
│   ├── HeroScene.vue      # 3D TresJS scene
│   ├── MagneticDock.vue   # Bottom navigation dock
│   ├── ProjectCard.vue    # Individual project card
│   ├── WorkSection.vue    # Projects grid section
│   └── ClientOnly.vue    # SSR wrapper
├── composables/
│   ├── useTheme.ts       # Theme management
│   └── useMouse.ts       # Mouse tracking
├── utils/
│   └── cn.ts             # Class name utility
├── App.vue               # Main app component
├── main.ts               # Entry point
└── style.css             # Global styles
```

## 🎨 Design System

### Typography
- **Sans**: Inter (tight tracking)
- **Mono**: JetBrains Mono (for hacker mode)

### Theme Modes
1. **Glassmorphism** (default)
   - Deep space background (#030014)
   - Aurora gradients
   - Backdrop blur effects
   - Transparent borders

2. **Hacker Mode**
   - Pure black background
   - Matrix green accents (#00ff00)
   - Monospace typography
   - No blur effects

## 🚀 Performance Optimizations

- ClientOnly wrapper for 3D components (prevents SSR issues)
- GPU-accelerated transforms (`transform-gpu`)
- Optimized particle count (150 particles)
- Lazy-loaded animations with ScrollTrigger

## 📝 Notes

- The site is fully responsive
- All animations respect `prefers-reduced-motion`
- TypeScript strict mode enabled
- ESLint + Prettier configured
