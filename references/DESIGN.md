---
name: Sugar & Spice
colors:
  surface: '#faf0ed'
  surface-dim: '#e9d6d2'
  surface-bright: '#faf0ed'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ee'
  surface-container: '#f1dfdb'
  surface-container-high: '#e8d5d1'
  surface-container-highest: '#e8d5d1'
  on-surface: '#4a2b23'
  on-surface-variant: '#8c6b65'
  inverse-surface: '#392e2b'
  inverse-on-surface: '#ffede9'
  outline: '#89726d'
  outline-variant: '#d2b7b0'
  surface-tint: '#e87a8c'
  primary: '#e87a8c'
  on-primary: '#ffffff'
  primary-container: '#f8b8c4'
  on-primary-container: '#4a0b16'
  inverse-primary: '#ffb4a5'
  secondary: '#4a2b23'
  on-secondary: '#ffffff'
  secondary-container: '#d2b7b0'
  on-secondary-container: '#2c140d'
  tertiary: '#6e5d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c1ab47'
  on-tertiary-container: '#4b3f00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a5'
  on-primary-fixed: '#3e0500'
  on-primary-fixed-variant: '#802918'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ecbda4'
  on-secondary-fixed: '#2e1506'
  on-secondary-fixed-variant: '#603f2d'
  tertiary-fixed: '#fbe278'
  tertiary-fixed-dim: '#dec65f'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#534600'
  background: '#faf0ed'
  on-background: '#4a2b23'
  surface-variant: '#e8d5d1'
typography:
  display-lg:
    fontFamily: Comfortaa
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Comfortaa
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Comfortaa
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Comfortaa
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Comfortaa
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Comfortaa
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Comfortaa
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Comfortaa
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style

This design system is built to evoke a sense of nostalgic wonder, reminiscent of a premium candy shop. The brand personality is cheerful, welcoming, and high-spirited, specifically catering to child-friendly experiences or lifestyle products that value playfulness over corporate rigidity.

The aesthetic combines **Minimalism** with **Tactile / Skeuomorphic** elements. While the layouts remain clean and functional, the UI components take on a "candy-like" physical quality. By utilizing organic shapes, blob-based backgrounds, and high-depth shadows, the interface feels like a collection of stickers and sweets. Every interaction should feel soft and bouncy, encouraging exploration through a delightful, tactile visual language.

## Colors

The palette centers on a cheerful, sweet foundation of Warm Pink and Dark Chocolate Brown, drawing direct inspiration from the "Docepreço" logo. This provides a soft, sophisticated backdrop that feels grounded yet playful. To inject energy and playfulness, a vibrant Sunny Yellow acts as the primary action accent, while a Soft Mint provides a cooling contrast for secondary highlights and success states.

The background is a creamy off-white (`#FAF0ED`) to maintain the "premium" feel while avoiding the harshness of pure white. Surfaces should prioritize these warm tones, using the yellow and mint sparingly to draw attention to interactive elements or celebratory feedback.

## Typography

The design system utilizes **Comfortaa** across all levels to maintain a cohesive, bubbly, and approachable feel. The rounded terminals of the typeface mirror the "pill-shaped" UI components.

- **Headlines:** Use Bold or SemiBold weights to create a strong visual hierarchy. For "Display" sizes, use tighter letter spacing to give a more "graphic" look to headings.
- **Body:** Use Regular weight for optimal legibility. Due to the high x-height of Comfortaa, line heights are generous to prevent the text from feeling cramped.
- **Labels:** Use SemiBold or Bold weights at smaller sizes to ensure they pop against colorful backgrounds.

## Layout & Spacing

The layout is defined by a **Fluid Grid** that prioritizes breathing room. To emphasize the playful nature of the design system, spacing should feel "loose" and expansive rather than tight and efficient.

- **Mobile:** 4-column grid with 16px margins and 16px gutters.
- **Tablet:** 8-column grid with 32px margins and 24px gutters.
- **Desktop:** 12-column grid with a maximum container width of 1200px.

Elements should be grouped using "blob" containers rather than strict rectangular boxes. Use irregular, asymmetrical padding (e.g., more on top than the bottom) for decorative background elements to enhance the organic, handmade feel.

## Elevation & Depth

Depth in this design system is achieved through **"Sticker-Style" Shadows** and **Tonal Layering**. Instead of realistic, light-source-based shadows, we use "drop shadows" that give the impression of elements being stuck onto the page.

- **Level 1 (Surface):** Flat, used for the main background.
- **Level 2 (Cards/Buttons):** A soft, slightly offset shadow with 15% opacity using a warm tint (e.g., Terracotta mixed with Neutral).
- **Level 3 (Pop-ups/Floating Action):** A larger, more diffused shadow that makes the element look like it's "hovering" like a balloon.

For a "candy" look, utilize a subtle **inner glow** (1-2px) on primary buttons to simulate a rounded, reflective surface.

## Shapes

The shape language is defined by **Maximum Roundness**. Sharp corners are strictly prohibited.

- **Standard Elements:** All buttons and small components use a full pill shape (1rem+ radius).
- **Cards:** Use `rounded-xl` (3rem) to maintain a soft, friendly silhouette even at large scales.
- **Decorative:** Introduce "Wavy Borders" for section dividers. Background "Blobs" should be generated using 3-5 point SVG paths to create organic, non-geometric underlays for featured content.

## Components

- **Buttons:** High-contrast backgrounds (Terracotta or Yellow) with white text. They should have a "press" animation that scales the button down slightly (0.95) and reduces the shadow depth to simulate physical touch.
- **Chips:** Small, fully rounded badges in Soft Mint or Sunny Yellow. Use them for categorization or status.
- **Input Fields:** Thick, 2px borders in Dusty Rose with a subtle off-white fill. When focused, the border should expand into a soft Mint glow.
- **Lists:** Items are separated by soft, wavy horizontal lines rather than straight dividers.
- **Cards:** Large, generous padding (32px+) with `rounded-xl` corners. Use an inner border or a very soft shadow to distinguish from the background.
- **Progress Bars:** Use a "beaded" look or a thick, rounded bar that fills with a vibrant Mint color, perhaps with a subtle "candy-stripe" animation during loading.
- **Checkboxes/Radios:** Oversized and bubbly. Checkmarks should "pop" into view with an elastic bounce animation.