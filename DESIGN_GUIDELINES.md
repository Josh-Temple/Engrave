# ZenCards UI & Design Guidelines

This document outlines the core design principles, UI patterns, and aesthetic direction for the application.

## 1. Core Philosophy
- **Minimalist & Zen:** The interface should be distraction-free. Remove unnecessary borders, heavy backgrounds, and visual noise so the user can focus entirely on memorization.
- **Mobile-First Ergonomics:** Designed primarily for mobile usage. Actions should be easily reachable by the thumb (bottom-heavy layouts), and touch targets must be large and forgiving.
- **Content is King:** The text to be memorized is the most important element. UI chrome (headers, buttons) should recede into the background when not actively used.

## 2. Color System
We use a highly constrained, grayscale-dominant palette to maintain a calm atmosphere, using colors only for semantic meaning.

- **Backgrounds:** `gray-50` for the app background to reduce eye strain, `white` for cards and elevated surfaces.
- **Primary Text & Actions:** `gray-900` (near black). Provides high contrast for readability but is softer than pure `#000000`.
- **Secondary Text:** `gray-400` for metadata, labels, and placeholders.
- **Semantic Colors:**
  - **Success / Pass:** `green-500` (with `green-50` backgrounds for soft buttons).
  - **Fail / Destructive:** `red-500` (with `red-50` backgrounds).
  - **Special Modes (Practice):** `indigo-600` (with `indigo-50` backgrounds) to distinguish from standard SRS review.

## 3. Typography
- **Font Family:** Clean, modern sans-serif (system defaults via Tailwind `font-sans`). Monospace (`font-mono`) is strictly reserved for code/JSON input.
- **Hierarchy:** 
  - Headings are large and tightly tracked (`text-3xl tracking-tight font-medium`).
  - Flashcard text is large and readable (`text-xl` or `text-2xl`, `leading-relaxed`).
  - Metadata (like "Source" or "Level") uses small, uppercase, bold text with wide tracking for a technical, organized feel (`text-xs font-bold uppercase tracking-wider`).

## 4. Shapes & Depth
- **Border Radius:** We use unusually large border radii (`rounded-2xl`, `rounded-[2rem]`, `rounded-full`) to make the app feel friendly, modern, and tactile (like physical cards).
- **Shadows:** Very subtle, diffuse shadows (`shadow-[0_8px_30px_rgb(0,0,0,0.06)]`) are used to lift cards off the background. Avoid harsh, dark drop shadows.
- **Borders:** Extremely thin and light (`border-gray-100`) just to define edges on white-on-white surfaces.

## 5. Animation & Interaction (Framer Motion)
Animations should feel physical and responsive, never sluggish.
- **Card Flip:** Uses spring physics (`type: 'spring', stiffness: 260, damping: 20`) to feel snappy and realistic.
- **Transitions:** Entering/exiting elements use subtle vertical slides (`y: 20` to `y: 0`) combined with opacity fades.
- **Feedback:** Buttons should scale down slightly or change background opacity on press/hover to provide immediate tactile feedback.

## 6. Layout Patterns
- **Container:** The app is constrained to a mobile width (`max-w-md mx-auto`) even on desktop, ensuring line lengths remain readable and the UI doesn't stretch awkwardly.
- **Action Placement:** 
  - Primary navigation (Back) is top-left.
  - Primary creation (Add) is a Floating Action Button (FAB) at the bottom right.
  - Review actions (Pass/Fail, Finish) are anchored to the bottom of the screen (`h-32` container) with large, `h-16` buttons for easy tapping.

## 7. Data Representation
- **Cloze (Blanks):** Represented by full-width underscores (`＿`) to maintain consistent line heights and prevent layout shifts when switching between ruby text and blanks.
- **Progress:** Visualized using simple dot indicators rather than complex progress bars or percentages.
