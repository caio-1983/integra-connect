---
name: Integra Connect
description: WhatsApp Web, extended into a shared attendance workspace with Lu as copilot.
colors:
  primary: "#008069"
  primary-dark: "#00a884"
  primary-foreground: "#ffffff"
  primary-foreground-dark: "#111b21"
  primary-subtle: "#d9fdd3"
  primary-subtle-dark: "#0a332c"
  primary-subtle-foreground: "#005c4b"
  primary-subtle-foreground-dark: "#00a884"
  background: "#f0f2f5"
  background-dark: "#0c1317"
  foreground: "#111b21"
  foreground-dark: "#e9edef"
  card: "#ffffff"
  card-dark: "#111b21"
  popover: "#ffffff"
  popover-dark: "#233138"
  muted: "#f0f2f5"
  muted-dark: "#202c33"
  muted-foreground: "#667781"
  muted-foreground-dark: "#8696a0"
  secondary: "#f0f2f5"
  secondary-dark: "#2a3942"
  accent: "#f5f6f6"
  accent-dark: "#202c33"
  border: "#e9edef"
  border-dark: "#222d34"
  input: "#d1d7db"
  input-dark: "#2a3942"
  icon: "#54656f"
  icon-dark: "#aebac1"
  avatar: "#dfe5e7"
  avatar-dark: "#6a7175"
  read-receipt: "#53bdeb"
  destructive: "#ea0038"
  destructive-dark: "#f15c6d"
  success: "#047756"
  success-dark: "#36d399"
  success-subtle: "#e9fcf3"
  success-subtle-dark: "#143429"
  warning: "#b35309"
  warning-dark: "#fbbd23"
  warning-subtle: "#fffae5"
  warning-subtle-dark: "#342814"
  danger: "#ba1c1c"
  danger-dark: "#f87272"
  danger-subtle: "#fef1f1"
  danger-subtle-dark: "#3b1616"
  info: "#096590"
  info-dark: "#53bdeb"
  info-subtle: "#e3f4fc"
  info-subtle-dark: "#16303b"
  wa-wall: "#efeae2"
  wa-wall-dark: "#0b141a"
  wa-doodle: "#e3dcd1"
  wa-doodle-dark: "#141f26"
  wa-in: "#ffffff"
  wa-in-dark: "#202c33"
  wa-out: "#d9fdd3"
  wa-out-dark: "#005c4b"
  wa-text: "#111b21"
  wa-text-dark: "#e9edef"
  wa-meta: "#667781"
  wa-meta-dark: "#8696a0"
  wa-wave: "#b4bcc1"
  wa-wave-dark: "#6a7a84"
  wa-quote: "#06cf9c"
typography:
  display:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  list-title:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "22px"
    fontWeight: 700
  panel-title:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "19px"
    fontWeight: 500
  row-name:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "21px"
  header-name:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  body:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "21px"
  bubble:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "14.2px"
    fontWeight: 400
    lineHeight: "19px"
  body-sm:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  secondary:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  time:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    fontFeature: "tnum"
  label:
    fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 500
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  bar: "60px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.accent}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    height: "40px"
  button-ghost:
    textColor: "{colors.icon}"
    rounded: "{rounded.full}"
    height: "40px"
    width: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    height: "40px"
  chip-filter:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  chip-filter-active:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary-subtle-foreground}"
  status-chip:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary-subtle-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 6px"
    height: "18px"
  badge-unread:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.time}"
    rounded: "{rounded.full}"
    padding: "0 6px"
    height: "20px"
  input-search:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 16px 0 48px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "40px"
  panel-bar:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.header-name}"
    padding: "0 16px"
    height: "60px"
  list-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.row-name}"
    padding: "12px"
  list-row-hover:
    backgroundColor: "{colors.accent}"
  list-row-selected:
    backgroundColor: "{colors.secondary}"
  nav-item:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.secondary}"
  menu:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "8px 6px"
  tooltip:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  dialog:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  bubble-in:
    backgroundColor: "{colors.wa-in}"
    textColor: "{colors.wa-text}"
    typography: "{typography.bubble}"
    rounded: "{rounded.lg}"
  bubble-out:
    backgroundColor: "{colors.wa-out}"
    textColor: "{colors.wa-text}"
    typography: "{typography.bubble}"
    rounded: "{rounded.lg}"
  composer-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "42px"
  lu-suggestion:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px"
---

# Design System: Integra Connect

## Overview

**Creative North Star: "WhatsApp Web, Extended"**

The operator's workspace is WhatsApp Web itself, with more panels. An attendant who spends the whole day in WhatsApp should open this app and feel no seam: the same greys, the same green, the same Segoe UI stack, the same flat panels split by hairline dividers, the same beige chat wall and bubble tails. Everything this product adds (Lu's suggestions, the Detalhes panel, CRM blocks, filters, attendant tags) is dressed as if WhatsApp had shipped it: a flat panel, a 60px grey bar on top, pill chips, green only where WhatsApp would put green.

Density is WhatsApp's density: 60px bars, 72px conversation rows with a 49px avatar, 44px nav items, 15px body text. The system has exactly one palette, rendered in light and dark; there are no user-selectable palettes. Depth is tonal, not shadowed: panels sit side by side on the backdrop, and only layers that genuinely float (menus, popovers, dialogs) take WhatsApp's menu shadow. The look refuses the generic SaaS dashboard: no gradient cards, no decorative accent colors, no heavy card chrome.

**Key Characteristics:**
- One palette, light and dark, taken from WhatsApp Web's own tones.
- WhatsApp green as the only accent, darkened in light mode for AA with white text.
- Flat panels divided by 1px lines; shadow only on floating layers.
- Pill-shaped buttons, chips, search fields and badges.
- The chat wall is fixed WhatsApp: wallpaper, bubble colors and tails do not follow any theme choice beyond light/dark.
- WhatsApp's own type ramp, from 22px list titles down to 11px chip labels.

## Colors

WhatsApp Web's neutral greys and single green, with a small semantic status set layered on top for the product's own states.

### Primary
- **WhatsApp Deep Green** (`primary`): the action color in light mode: primary buttons, send button, unread badges and unread timestamps, active nav badges, the "Lu sugere" label, focus rings. It is darker than WhatsApp's own green so white text on it passes AA.
- **WhatsApp Green** (`primary-dark`): the same role in dark mode, carrying dark text (`primary-foreground-dark`) instead of white.
- **Mint Selection** (`primary-subtle` / `primary-subtle-foreground`): the WhatsApp outgoing-bubble mint used as the fill of the active filter chip, the "Lu" status chip, and today's task badge. In dark mode it becomes a deep teal (`primary-subtle-dark`) with green text.

### Neutral
- **Panel Backdrop** (`background`): the grey behind and between panels.
- **Panel White** (`card`): every panel surface: conversation list, Detalhes panel, sidebar, input fields, the Lu suggestion card.
- **Bar Grey** (`muted`): the 60px header bar of each panel, the composer tray, and the empty-chat home.
- **Selected Grey** (`secondary`): the selected conversation row, the active nav item, the filled search field, inactive filter chips.
- **Hover Wash** (`accent`): row and icon-button hover.
- **Ink** (`foreground`) and **Slate Meta** (`muted-foreground`): primary text and secondary text (previews, times, counts, descriptions).
- **Icon Slate** (`icon`): header, composer, and nav icons at rest; they move to `foreground` on hover.
- **Divider** (`border`): the 1px lines between rows and panels. **Field Outline** (`input`): outline of outline buttons, form fields and small chips.
- **Avatar Grey** (`avatar`): the placeholder disc for contacts without a photo.
- **Read Blue** (`read-receipt`): read ticks and the played portion of voice-note waveforms.

### Status
- **Success / Warning / Danger / Info** with matching **-subtle** fills: small semantic text and badge backgrounds. Warning marks "Aguardando" (customer spoke last) and paused conversations; danger marks late tasks; info marks origin and attribution chips. The base tone is legible as small text on both `card` and its own `-subtle` fill.
- **Destructive** (`destructive`): WhatsApp's red, reserved for the fill of irreversible-action buttons and the recording dot. `danger` is for status text, `destructive` is for the button.

### Chat Wall
- **Wall Beige / Wall Night** (`wa-wall`, with `wa-doodle` for the masked doodle pattern), **Incoming White** (`wa-in`), **Outgoing Mint** (`wa-out`), **Bubble Ink** (`wa-text`), **Bubble Meta** (`wa-meta`), **Waveform Grey** (`wa-wave`), **Quote Green** (`wa-quote`). These are fixed WhatsApp values, scoped to the chat wall only.

### Named Rules
**The One Palette Rule.** There is one palette in two modes. Do not reintroduce palette switching or a second accent hue; every surface resolves through the tokens above.

**The Fixed Wall Rule.** The chat wall and its bubbles use the `wa-*` values and nothing else. Theme tokens never recolor a bubble, and bubble colors never leak out of the wall.

**The Where-WhatsApp-Puts-Green Rule.** Green marks action, unread, and "on" states (active chip, Lu active). Headings, icons at rest, and decoration stay neutral.

## Typography

**Body Font:** Segoe UI (with Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif), WhatsApp Web's own system stack. It is the only family.

**Character:** A plain system sans with no display face; hierarchy comes from WhatsApp's size steps and a few bold weights, not from a type pairing.

### Hierarchy
- **Display** (700, 28px, tight tracking): the greeting and "Fila zerada" title on the empty-chat home only.
- **List Title** (700, 22px): the "Conversas" title atop the conversation list.
- **Panel Title** (500, 19px): the back-arrow title of a sub-view in the list column.
- **Row Name** (400, 17px / 21px): the contact name in a conversation row.
- **Header Name** (400, 16px): the contact name in the chat header.
- **Body** (400, 15px / 21px): composer text, search field, nav labels, menu items, Detalhes rows, Lu's draft reply.
- **Bubble** (400, 14.2px / 19px): message text inside bubbles; 14px (`body-sm`) for message previews, buttons and chips.
- **Secondary** (400, 13px): phone number under the header name, Lu status lines, quick-reply descriptions.
- **Time** (400, 12px, tabular numerals): row timestamps and unread counts.
- **Label** (500 to 700, 11px): status chips, tags, task badges, bubble timestamps.

### Named Rules
**The WhatsApp Ramp Rule.** New text uses one of the steps above. Half-pixel variants outside the ramp (12.5, 13.5, 14.5, 11.5px) are drift, not steps.

**The Weight-Not-Face Rule.** Emphasis is a weight change (500 for selected and names that need it, 600 to 700 for counts and titles). No second family, no uppercase labels outside the chat wall's date divider.

## Layout

The first viewport is four columns, left to right: a labeled sidebar (248px open, 68px collapsed), the conversation list (30% of the width, 320px min, 560px max), the chat (flexible), and the Detalhes panel (320px, 340px at xl). Columns are separated by 1px `border` lines, never by gaps or gutters.

Every column starts with a 60px bar. The list column's bar holds the list title; the chat and Detalhes columns use a `muted` bar. Below the list title sit a pill search field (40px) and a wrapping row of filter chips (32px, 8px gap); chips wrap rather than scroll so none hides past the column edge.

Conversation rows are 12px horizontally padded with a 49px avatar and a 12px gap; the divider runs under the text block only, not under the avatar, as in WhatsApp. Rows hold two fixed lines (name + time; preview + badges), with an optional third line for attendant, origin and tag chips.

The chat column is header bar, wall, then composer tray (`muted`, 16px x 10px padding) with a 42px field and a 40px round send button. Lu's suggestion card sits inside the composer tray, above the field.

Spacing rhythm is 4px-based: 4, 8, 12, 16, 20px. Detalhes sections are 52px collapsible rows separated by top dividers, 20px side padding.

## Elevation & Depth

Depth is tonal. Panels are flat and sit on the `background` backdrop; separation comes from 1px dividers and the step between `card` and `muted`. Only two shadows exist, both taken from WhatsApp Web.

### Shadow Vocabulary
- **WhatsApp Menu** (`box-shadow: 0 2px 5px 0 rgba(11,20,26,.26), 0 2px 10px 0 rgba(11,20,26,.16)`): dropdown menus, popovers, select lists, dialogs, and the composer's quick-reply list.
- **Bubble Lift** (`box-shadow: 0 1px 0.5px rgba(11,20,26,.13)`): message bubbles and the chips that sit on the chat wall (date divider, system notices).

### Named Rules
**The Only-Floaters-Cast Rule.** A shadow means the element floats above the workspace. Panels, cards, rows, bars and buttons at rest have no shadow.

## Shapes

Two shape families. Controls are pills: buttons, filter chips, status chips, badges, the search field, and round icon buttons (40px circles). Containers are gently rounded: 8px for bubbles, fields, the composer field, nav items, Lu's card and inline cards; 12px for menus and popovers; 16px for dialogs. Panels themselves are square and edge-to-edge.

The first bubble of each side's run loses its top outer corner and gains WhatsApp's 8x13px tail. A reply quote inside a bubble (and the reply preview above the composer) carries a 4px left bar in quote green or primary; that is the one place a left accent bar is used.

## Components

### Buttons
Quiet, round, WhatsApp-plain.
- **Shape:** fully pill (9999px); icon buttons are 40px circles.
- **Primary:** `primary` fill, `primary-foreground` text, 14px medium, 40px tall, 20px side padding (16px in the app-level Button). Hover drops to 90% opacity of the fill.
- **Outline (WhatsApp secondary):** `card` fill, `input` 1px outline, `primary` label; hover to `accent`. Used for secondary actions and Lu's "Editar antes / Mais curta / Outra versão" chips.
- **Ghost:** `icon` color, no fill; hover `accent` fill and `foreground` icon. Used for every header and composer icon.
- **Destructive / Danger:** `destructive` fill for irreversible actions; the app-level `danger` variant is a `danger-subtle` fill with `danger` text for softer warnings.
- **Focus:** 2px `ring` (primary) outline with a 2px offset in the backdrop color.

### Chips
- **Filter chips:** 32px pills, 14px text. Inactive: `secondary` fill, `muted-foreground` text, hover `accent`. Active: `primary-subtle` fill, `primary-subtle-foreground` text, medium weight. Counts are 16px pills inside (`card` when inactive, `primary` when active).
- **Status and tag chips:** 18px pills, 11px text with a 10px icon. Lu active: `primary-subtle`; paused: `warning-subtle` / `warning`; tag and archived: `secondary` / `muted-foreground`; late task: `danger-subtle` / `danger`.
- **Unread badge:** 20px `primary` pill with 12px semibold tabular count; the row's timestamp turns `primary` alongside it.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** `card` on a `muted` or `background` field.
- **Shadow Strategy:** none (see Elevation).
- **Border:** none; separation is tonal or by a 1px divider.
- **Internal Padding:** 12px (Lu card), 16px (home cards).

### Inputs / Fields
- **Search:** 40px pill, `secondary` fill, no border, 15px text, 48px left inset for the icon.
- **Form field / select:** 40px, 8px radius, `card` fill, 1px `input` outline, 14px text, `muted-foreground` placeholder.
- **Composer:** borderless `card` field (8px radius, 42px min, 15px / 22px text) in the `muted` tray; no focus ring inside the tray.
- **Focus:** 2px primary ring; search and inline pill fields drop the offset.
- **Disabled:** 50% opacity.

### Navigation
- **Sidebar:** `card`-colored column, 10px padding. Items are 44px, 8px radius, 20px `icon` glyph and 15px `foreground` label with a 14px gap. Hover `accent`; active `secondary` fill with medium label and `foreground` icon. Unread counts are `primary` pills: at the right when open, on the icon's corner when collapsed.

### Conversation Row
The WhatsApp chat-list row: 49px avatar, 17px name with a 12px time aligned on the baseline, 14px `muted-foreground` preview on the second line with status and task chips inline, and the unread pill at the end. Hover `accent`, selected `secondary`. A chevron menu slides in on hover over the second line.

### Chat Wall and Bubbles
The beige (night: near-black) wall with a masked low-contrast doodle pattern at 420px repeat, fixed behind the scrolling timeline. Bubbles are 8px-radius, `wa-in` or `wa-out`, 14.2px text, Bubble Lift shadow, with the tail on the first of a run. Metadata (time, ticks) is 11px `wa-meta` at the bubble's bottom right; read ticks are `read-receipt`. Voice notes use `wa-wave` bars that fill with `read-receipt` as they play.

### Lu Suggestion Card
Lu reads as a WhatsApp panel, not as an AI widget: an 8px `card` block inside the composer tray, a 13px `primary` "Lu sugere" label with a sparkle icon, the 15px draft, then a 32px `primary` pill "Enviar" and 32px outline pills for the alternatives. Loading and error states are a single 13px `muted-foreground` line in the tray.

### Menus, Popovers, Dialogs, Tooltips
Menus and popovers: `popover` fill, 12px radius, WhatsApp Menu shadow, no border; items are 15px, 8px radius, `accent` on focus, 18px `icon` glyphs. Dialogs: `card`, 16px radius, 24px padding, WhatsApp Menu shadow. Tooltips invert: `foreground` fill, `background` text, 12px, 6px radius.

## Do's and Don'ts

### Do:
- **Do** build every new surface from the surface model: `background` behind, `card` for the panel, `muted` for its 60px top bar, `accent` for hover, `secondary` for selected and filled.
- **Do** use pills for buttons, chips, badges and search, and 8px corners for cards, fields and bubbles.
- **Do** separate panels and rows with 1px `border` dividers; keep panels flat.
- **Do** reserve the WhatsApp Menu shadow for menus, popovers, select lists and dialogs, and Bubble Lift for things on the chat wall.
- **Do** keep type on the WhatsApp ramp (22 / 19 / 17 / 16 / 15 / 14.2 / 14 / 13 / 12 / 11px) in the Segoe UI stack.
- **Do** keep white text on light `primary` and dark text on dark `primary`, as the tokens define.
- **Do** migrate the remaining screens (Visão Geral KPI cards, Kanban, Contatos, Canais, Configurações, Onboarding) onto these tokens next; their current literal colors are legacy, not reference.

### Don't:
- **Don't** reintroduce selectable palettes, a violet or second accent, or gradient cards; there is one WhatsApp palette in light and dark.
- **Don't** recolor the chat wall or bubbles from theme tokens, or use `wa-*` values outside the wall.
- **Don't** put shadows on panels, rows, cards or buttons at rest.
- **Don't** use a 4px left accent bar anywhere except reply quotes (in a bubble or above the composer).
- **Don't** copy the look of screens not yet migrated; they still carry the retired world's literal colors.
- **Don't** add a second font family, uppercase labels, or small labels above headings.
- **Don't** use emoji as icons in UI chrome; use the line icon set in `icon` color.
