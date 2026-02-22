# Fixes Round 2

## 1. Remove Focus Mode entirely
- Delete `components/FocusMode.svelte`
- Remove all references to FocusMode from `App.svelte` (import, navigation button, rendering)
- Remove focus mode settings from `settings.ts` (focusDuration, breakDuration) and DEFAULT_SETTINGS

## 2. Categories card — dashboard only, with clickable links
- The "Categories" card on the right side should ONLY appear on the Dashboard view
- When viewing a specific group or category, the Categories card should NOT render
- Each category name in the Categories card should be a clickable link/button
- Clicking a category navigates to that category's view within the ADHD Todo UI (sets the selected category in App.svelte navigation state)
- Same for "Uncategorized / group-level" — clicking it should filter to uncategorized tasks

## 3. Quick Capture and Tasks cards — full width when not on dashboard
- On Dashboard: keep the current 2-column layout (Quick Capture + Tasks on left, Categories card on right)
- On category/group views: Quick Capture and Tasks should be full width (no categories sidebar taking space)
- This happens naturally if the Categories card is removed from non-dashboard views

## 4. Sidebar spacing improvements
Looking at the screenshot, the Discord-style sidebar needs:
- More vertical spacing between group sections (PERSONAL, PROGRAMMING, APPS, SCHOOL) — add margin-bottom to each group block
- More horizontal padding on category items (the bullet + name feels cramped)
- Slightly more indent for category items under their group header
- The group header labels (PERSONAL, PROGRAMMING etc.) need a bit more top margin to separate from the previous group's last item
- Consider adding a subtle divider or extra gap (12-16px) between group blocks

## Build
After all changes: `npm run build` — must compile with zero errors.
