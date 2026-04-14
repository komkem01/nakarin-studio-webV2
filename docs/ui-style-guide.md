# UI Style Guide (Customer + Admin)

This guide defines the shared UI classes for keeping the admin and customer sections in one consistent white-green formal theme.

## Theme Scope
- Use `ns-admin-theme` on admin layout root.
- Use `ns-customer-theme` on customer layout root.
- Do not hardcode random green hex values in new pages unless truly needed for a unique hero/background.

## Buttons
- Primary action: `ns-ui-btn ns-ui-btn-primary`
- Secondary action: `ns-ui-btn ns-ui-btn-secondary`
- Danger action: `ns-ui-btn ns-ui-btn-danger`
- Disabled state: rely on native `disabled` (already styled by shared class)

Examples:
- Submit/create/save: use primary
- Back/cancel/refresh/list filters: use secondary
- Delete/logout/destructive confirm: use danger

## Form Controls
- Text input: `ns-ui-input`
- Textarea: `ns-ui-textarea`
- Select-like custom button (dropdown trigger): prefer same border/focus tone as `ns-ui-input`

Validation pattern:
- Invalid input: add `border-red-300 bg-red-50` and if needed `focus:border-red-400 focus:ring-0`

## Surface and Labels
- Standard card: `ns-ui-card`
- Soft accent card: `ns-ui-card-soft`
- Section chip/label: `ns-ui-pill`
- Filter chip: `ns-ui-filter-chip`
- Active filter chip: `ns-ui-filter-chip ns-ui-filter-chip-active`

## Status Badge Mapping
Use these classes for semantic status tones:
- Success/completed/delivered: `ns-ui-status-success`
- Info/processing: `ns-ui-status-info`
- Warning/pending: `ns-ui-status-warning`
- Error/canceled: `ns-ui-status-danger`

Badge base structure example:
- `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium` + one status class above.

## Page Implementation Rules
- Prefer shared classes first, Tailwind utility overrides second.
- Keep one visual language: white surfaces, green accent, slate text.
- For new pages, start from:
  - Wrapper: `bg-slate-50`
  - Main blocks: `ns-ui-card`
  - Main CTA: `ns-ui-btn ns-ui-btn-primary`
  - Inputs: `ns-ui-input` / `ns-ui-textarea`

## Review Checklist (Before PR)
- No duplicate custom button palettes for similar actions.
- No inconsistent focus styles across forms.
- No ad-hoc status colors if mapped status class exists.
- Primary and secondary actions are visually distinct and predictable.
