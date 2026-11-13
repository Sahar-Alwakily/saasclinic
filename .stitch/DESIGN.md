---
name: WARAFA Clinic
colors:
  surface: '#ffffff'
  surface-dim: '#e4eee8'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f5f7'
  surface-container: '#f7f8f6'
  surface-container-high: '#ecfdf5'
  surface-container-highest: '#e4eee8'
  on-surface: '#14171c'
  on-surface-variant: '#8a9199'
  inverse-surface: '#111827'
  inverse-on-surface: '#ffffff'
  outline: '#8a9199'
  outline-variant: '#e4eee8'
  surface-tint: '#10b981'
  primary: '#10b981'
  on-primary: '#ffffff'
  primary-container: '#ecfdf5'
  on-primary-container: '#047857'
  inverse-primary: '#059669'
  secondary: '#172b3a'
  on-secondary: '#ffffff'
  secondary-container: '#f3f5f7'
  on-secondary-container: '#111827'
  tertiary: '#0ea5e9'
  on-tertiary: '#ffffff'
  tertiary-container: '#e0f2fe'
  on-tertiary-container: '#0369a1'
  error: '#e11d48'
  on-error: '#ffffff'
  error-container: '#fff1f2'
  on-error-container: '#be123c'
  primary-fixed: '#d1fae5'
  primary-fixed-dim: '#a7f3d0'
  on-primary-fixed: '#064e3b'
  on-primary-fixed-variant: '#047857'
  secondary-fixed: '#e5e9ec'
  secondary-fixed-dim: '#c5ced6'
  on-secondary-fixed: '#111827'
  on-secondary-fixed-variant: '#172b3a'
  tertiary-fixed: '#e0f2fe'
  tertiary-fixed-dim: '#bae6fd'
  on-tertiary-fixed: '#0c4a6e'
  on-tertiary-fixed-variant: '#0369a1'
  background: '#ffffff'
  on-background: '#14171c'
  surface-variant: '#f3f5f7'
typography:
  display-lg:
    fontFamily: Tajawal
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Tajawal
    fontSize: 25px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.03em
  title-md:
    fontFamily: Tajawal
    fontSize: 17px
    fontWeight: '800'
    lineHeight: 24px
    letterSpacing: -0.03em
  body-base:
    fontFamily: Tajawal
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 23px
    letterSpacing: '0'
  body-bold:
    fontFamily: Tajawal
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 23px
    letterSpacing: '0'
  label-caps:
    fontFamily: Tajawal
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  stat-lg:
    fontFamily: Tajawal
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.04em
rounded:
  sm: 12px
  DEFAULT: 14px
  md: 16px
  lg: 18px
  xl: 20px
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 20px
  xl: 28px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
---

# Design System: وَرَفَ | WARAFA

## 1. Visual Theme & Atmosphere

WARAF A is a right-to-left clinic operating system that should feel like a clean treatment room: white paper, a mint-green instrument tray, and quiet gray type. The product canvas is pure white. A frosted light-gray bar sits across the top. The working surface is a vertical sidebar of soft gray links, with the current place painted solid emerald and white. Cards float on a hairline mint-gray border and a very soft green-tinted shadow, never a heavy drop shadow.

The mood is calm, clinical, and practical. Information is dense enough for a working day — appointments, clients, reminders — but each block is a rounded card with air inside it. Arabic Tajawal carries every label, number, and sentence. English lockup text is the same family. Dark mode exists as a deep sea-green night version of the same layout, not a separate brand.

Public login is the one place that stays navy. The signed-in application recolors navy buttons to emerald, so the daily tool reads green, while the front door reads deep clinic navy.

## 2. Color Palette & Roles

### Primary Foundation

- **Clinic Paper** `#ffffff` — page background and card fill inside the signed-in app.
- **Fog Bar** `#f3f5f7` — top bar, at 86% opacity with a light blur.
- **Quiet Wash** `#f7f8f6` — login page field behind the form, and inset panels.
- **Mint Line** `#e4eee8` — card borders, input borders, table rules.
- **Night Sea** `#0e171e` — dark-mode application background. Dark cards are `#152029`, dark lines `#2a3944`.

### Accent & Interactive

- **Treatment Emerald** `#10b981` — primary buttons inside the app, active sidebar item, focus ring, stat numbers on mint cards.
- **Pressed Emerald** `#059669` — hover of those green buttons, and the deeper green of mint chips' text `#047857`.
- **Clinic Navy** `#172b3a` — login submit, the public door. Inside the app this navy is overridden to emerald.
- **Ink Navy** `#111827` — brand ink, inverse surfaces, and the assistant chat header. Inside the app, filled ink buttons become emerald.

### Typography & Text Hierarchy

- **Ink** `#14171c` — body and headings.
- **Muted Slate** `#8a9199` — secondary labels, table headers, empty states.
- **Sidebar Rest** `#6b7280` — inactive navigation. Hover shifts to `#047857` on `#ecfdf5`.
- **Child Nav** `#9ca3af` — nested sidebar links.

### Functional States

- **Mint chip** background `#ecfdf5`, text `#047857`. Stat wash fades from `#ecfdf5` to white.
- **Sky chip** `#e0f2fe` / `#0369a1`. Stat numbers `#0284c7`.
- **Gold chip** `#fffbeb` / `#b45309`. Warning `#d97706`. Stat numbers `#d97706`.
- **Lilac chip** `#f5f3ff` / `#6d28d9`. Stat numbers `#7c3aed`.
- **Rose chip** `#fff1f2` / `#be123c`. Danger `#e11d48` and `#f43f5e`.
- **Login error** `#f8ecea` / `#9a3f32`.
- **Focus** 2px `#10b981` outline, offset 2px.

## 3. Typography Rules

### Hierarchy & Weights

Tajawal is the only product face, with IBM Plex Sans Arabic as the fallback. It is a humanist Arabic sans: open, readable, and slightly soft.

- Page title (`.font-product` on h1): 1.55rem, weight 800, line-height 1.25, tracking −0.03em.
- Section title (h2/h3 `.font-product`): 1.05rem, weight 800, line-height 1.4.
- Login hero: 36px, weight 600, tight leading, white on navy.
- Body: 15px, line-height 1.55, weight 400.
- Chips: 13px, weight 700.
- Sidebar item: 13.5px, weight 500. Child links: 12px.
- Table header: 11px, weight 500, tracking 0.04em, uppercase, muted.
- Stat figure: weight 800, tracking −0.04em, about 28–34px, colored by the card tone.

### Spacing Principles

Body leading stays generous (1.55) so Arabic lines do not collide. Display type tightens tracking. Table headers loosen tracking. Do not introduce a second display serif. Syne, Cairo, Almarai, and Cormorant are loaded for public site themes, not for the operating console.

## 4. Component Stylings

### Buttons

Primary action is a full emerald fill, white Tajawal bold, radius 12–16px, padding about 12px by 16px. Hover darkens to `#059669`. Disabled state drops to 40% opacity. Login's primary button is navy `#172b3a`, radius 6px, because it sits outside the application shell. Ghost actions are chips or text links in emerald `#047857`. Destructive actions are rose text or a rose chip, not a filled red button.

### Cards & Stat Tiles

`.saas-card` is white, 1px `#e4eee8` border, 20px radius, and a soft shadow (`0 10px 28px -20px` emerald at 45% plus a 1px ink shadow). Stat tiles keep that shell and add a vertical wash: mint, sky, gold, rose, or lilac fading to white by 62% of the height. The number sits in the matching deeper hue.

### Chips

Inline pills, radius 16px, padding 7px by 14px, weight 700, 13px. Five tones only: mint, sky, gold, lilac, rose. Status badges are fully round (`999px`) on a pale green `#ecfdf3` with `#15803d` text.

### Navigation

Desktop: a white right-hand rail (RTL) with the wordmark وَرَفَ | WARAFA, grouped labels, and rounded-2xl links. The active route is solid emerald with white text and a small shadow. Inactive links are gray and warm to a mint wash on hover. Children are smaller and indented. A sticky top bar in frosted `#f3f5f7` holds the page title, a pill search on `#ecfdf5`, notifications, and a theme toggle. On small screens the rail becomes a drawer opened by a green menu control.

### Inputs & Forms

Text fields, selects, and textareas inside the app: 14px radius, `#e4eee8` border, white fill, 15px ink text. Focus ring is emerald. Login fields are squarer (6px), border `#e5e9ec`, focus border `#658b83`, labels 12px `#75818b`. Checkboxes stay native. Search is a full pill on mint `#ecfdf5` with no border.

### Domain-Specific Components

Appointment rows and client session rows are inset cards: `#f8faf9` fill, mint line, 16px radius, a small emerald icon tile, then title, muted date, and round icon buttons. The assistant is a fixed white sheet with a `#111827` header, emerald user bubbles, and pale replies. Toasts are 16px radius Tajawal on white with the same soft pop shadow.

## 5. Layout Principles

### Grid & Structure

The signed-in shell is a right sidebar plus a fluid main column. Content pages cap near 56rem on client files (`max-w-4xl`) and otherwise use the full main area with 16–24px page padding. Dashboard groups are two columns from the large breakpoint, one column below it. Stat rows are three or four equal cards. Public booking and the marketing site are separate from this shell and may use themed section layouts. The console itself does not.

### Whitespace Strategy

The base step is 4px. Common gaps are 8, 12, 16, and 20px. Cards pad 16–24px. Sections stack with 20px (`space-y-5`). Do not tighten the shell into a spreadsheet. Tables are the dense exception: 14px type, 12px vertical cell padding.

### Alignment & Visual Balance

The product is RTL. Text, nav, and form labels align to the start (right). Phone numbers, emails, and identifiers set `dir="ltr"`. Login is a two-column split on desktop: navy story on one side, white form on the fog background. The form card is left-bordered in the visual center, max 28rem.

### Responsive Behavior & Touch

Mobile-first collapse: sidebar hides into a drawer, two-column dashboard stacks, login drops the navy panel and keeps the white card. Tap targets on chips and row buttons stay at least 36px. Horizontal tab rows scroll without a visible scrollbar. The page itself must not scroll sideways (`overflow-x: clip`).

## 6. Design System Notes for Stitch Generation

### Language to Use

Say "white clinic paper, emerald active state, Tajawal Arabic, RTL sidebar, frosted gray top bar, mint-line cards." Avoid generic purple SaaS, Inter dashboards, and heavy shadows. Keep the public login navy and the signed-in tool emerald. Do not recolor the whole product navy.

### Color References

- Treatment Emerald `#10b981` — primary action and active nav.
- Pressed Emerald `#059669` — hover.
- Clinic Paper `#ffffff` — canvas.
- Fog Bar `#f3f5f7` — top bar.
- Mint Line `#e4eee8` — borders.
- Ink `#14171c` — text.
- Muted Slate `#8a9199` — secondary text.
- Clinic Navy `#172b3a` — login only.
- Sky `#0ea5e9`, Gold `#f59e0b`, Lilac `#8b5cf6`, Rose `#e11d48` — stat and chip tones only.

### Component Prompts

- "RTL clinic sidebar on white, Tajawal, active item solid emerald with white label, inactive gray links, mint hover wash."
- "Dashboard stat card with a mint-to-white vertical wash, 20px radius, hairline `#e4eee8` border, huge emerald number, small muted Arabic label."
- "Client file tab row of emerald pills, then a note card with the date in muted type and the note in ink."

### Incremental Iteration

Change one screen at a time. Preserve RTL, Tajawal, the 20px card radius, and the emerald-versus-navy split. Do not invent a second accent. When a screen is a public booking page, allow a calmer marketing layout, but pull buttons and type back to these tokens.
