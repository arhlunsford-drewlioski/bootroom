# Periodization System - Testing Checklist

## ✅ Pre-Testing Setup
- [ ] `npm run dev` is running
- [ ] Browser open at `http://localhost:5173`
- [ ] At least one team created in the app

---

## 🧪 Phase 1: Database & Schema (Auto-Migration)

### Database Migration
- [ ] Open browser DevTools (F12) → Console
- [ ] Run: `db.periodizationBlocks.toArray().then(console.log)`
- [ ] Verify table exists (should return `[]` or existing blocks)
- [ ] Run: `db.practices.toArray().then(console.log)`
- [ ] Verify practices have `intensity`, `sessionType`, `duration` fields (may be undefined for old data)

**Expected**: No errors, tables exist, schema updated to v6

---

## 🧪 Phase 2: Season Overview - Block Creation

### Create Training Phase Block
1. [ ] Navigate to **Season** tab
2. [ ] Click **+ Add Block**
3. [ ] Verify editor shows:
   - Block Type dropdown (defaults to "Training Phase")
   - Label options (7 training phases)
   - Date inputs
   - Color palette (8 colors)
   - Target Intensity slider
   - Focus Theme input
4. [ ] Select **"Competition"** label
5. [ ] Set dates: Start = 2024-11-01, End = 2025-03-15
6. [ ] Set target intensity to **7**
7. [ ] Click **Create**
8. [ ] Verify block appears in:
   - Training Phase row (cyan timeline)
   - Block list on left (shows "training / Competition")

### Create Technical Focus Block
1. [ ] Click **+ Add Block**
2. [ ] Change Block Type to **"Technical Focus"**
3. [ ] Verify label options change (10 technical focuses)
4. [ ] Select **"Finishing"**
5. [ ] Set overlapping dates with Competition phase
6. [ ] Pick a different color
7. [ ] Click **Create**
8. [ ] Verify block appears in Technical Focus row (blue)

### Create Tactical & Physical Blocks
1. [ ] Repeat for **Tactical Focus** (e.g., "Pressing Systems")
2. [ ] Repeat for **Physical Focus** (e.g., "Aerobic Base")
3. [ ] Verify all 4 rows show blocks
4. [ ] Verify no empty row shows "No [type] blocks" message

### Edit & Delete Blocks
1. [ ] Click on a block in timeline or list
2. [ ] Verify editor opens with existing values
3. [ ] Change label, dates, or intensity
4. [ ] Click **Update**
5. [ ] Verify changes reflected immediately
6. [ ] Click block again → Click **Delete**
7. [ ] Verify block removed from timeline & list

**Expected**: All blocks create/edit/delete smoothly, labels change per type, colors work

---

## 🧪 Phase 3: Workload Chart

### Empty State
1. [ ] With no matches or practices scheduled
2. [ ] Scroll to Workload Chart section
3. [ ] Verify shows: "No workload data yet" message

### Add Test Data
1. [ ] Go to **Calendar** tab
2. [ ] Add a **Match** (any date)
3. [ ] Return to **Season** tab
4. [ ] Verify workload chart shows bar for that week (~100 load)
5. [ ] Bar should be **yellow/orange** (medium/high intensity)

### Verify Calculations
1. [ ] Add a practice with intensity **8** and duration **90 min**
   - Expected load: (8 × 90) / 60 = 120
2. [ ] Return to Season tab
3. [ ] Hover over bar for that week
4. [ ] Verify tooltip shows combined load (match 100 + practice 120 = 220)
5. [ ] Bar color should be **orange/red** (high load)

### Timeline Synchronization
1. [ ] Click **Earlier** button in Season tab
2. [ ] Verify workload chart scrolls with periodization blocks
3. [ ] Click **Later** → Verify sync maintained
4. [ ] Click **Today** → Verify returns to current view

**Expected**: Chart updates in real-time, calculations correct, colors match intensity

---

## 🧪 Phase 4: Practice Detail - Phase Awareness

### Phase Context Display
1. [ ] Create periodization blocks for all 4 rows (if not already done)
2. [ ] Go to **Calendar** tab
3. [ ] Add a practice during an active periodization phase
4. [ ] Open practice detail
5. [ ] Verify **Phase Context card** shows:
   - Current Training phase
   - Current Technical focus
   - Current Tactical focus
   - Current Physical focus
   - Each with colored dot indicators

### Recommendations
1. [ ] With practice during **"Competition"** phase open
2. [ ] Verify recommendations appear:
   - "Balance training load with match schedule"
   - "Prioritize recovery between matches"
3. [ ] Create a practice during **"Recovery"** phase
4. [ ] Verify different recommendations:
   - "Focus on recovery and light technical work"
   - "Consider low-intensity sessions (2-4/10)"

### Intensity Controls
1. [ ] In practice detail, find **Session Type** dropdown
2. [ ] Select **"Technical"**
3. [ ] Verify intensity slider auto-adjusts to **5** (base intensity)
4. [ ] Change to **"Fitness"**
5. [ ] Verify intensity auto-adjusts to **9**
6. [ ] Change to **"Recovery"**
7. [ ] Verify intensity auto-adjusts to **2**

### Duration Input
1. [ ] Find **Duration** input
2. [ ] Default should be **90 minutes**
3. [ ] Change to **60**
4. [ ] Save practice
5. [ ] Return to Season tab
6. [ ] Verify workload chart reflects new duration

### Target Intensity Hints
1. [ ] Create periodization block with target intensity **6**
2. [ ] Create practice during that phase
3. [ ] Open practice detail
4. [ ] Verify intensity slider shows: **(target: 6)** hint
5. [ ] Adjust slider to **9** (above target)
6. [ ] Save and verify workload chart updates

**Expected**: Phase context accurate, recommendations smart, auto-suggestions helpful

---

## 🧪 Phase 5: Calendar Integration - Visual Indicators

### Week View Practice Cards
1. [ ] Go to **Calendar** tab
2. [ ] Switch to **Week** view (if toggle exists)
3. [ ] Find a practice with intensity set
4. [ ] Verify practice card shows:
   - **Left border** colored by intensity (green → red gradient)
   - **Session type badge** with correct color
   - **Intensity rating** displayed (e.g., "7/10")

### Intensity Color Coding
1. [ ] Create practices with different intensities:
   - Intensity 2 → Border should be **green**
   - Intensity 5 → Border should be **yellow/amber**
   - Intensity 7 → Border should be **orange**
   - Intensity 10 → Border should be **red**
2. [ ] Verify colors match expectations

### Session Type Badges
1. [ ] Create practices with each session type:
   - Technical → **Blue** badge
   - Tactical → **Purple** badge
   - Physical → **Red** badge
   - Fitness → **Orange** badge
   - Recovery → **Green** badge
2. [ ] Verify colors and labels display correctly

**Expected**: Visual indicators clear, colors intuitive, information at a glance

---

## 🧪 Phase 6: Responsive Design

### Desktop (1920×1080)
1. [ ] Open in full screen browser
2. [ ] Season tab: Verify 4 rows + workload chart fit well
3. [ ] Editor panel: Verify side-by-side layout (blocks list | editor)
4. [ ] No horizontal scroll on main timeline

### Tablet (768×1024)
1. [ ] Resize browser to tablet size
2. [ ] Verify timeline has horizontal scroll (min-width 500px)
3. [ ] Verify editor panel stacks vertically (blocks above editor)
4. [ ] Practice detail: Verify controls remain usable

### Mobile (375×667)
1. [ ] Resize to mobile dimensions
2. [ ] Verify timeline scrolls horizontally
3. [ ] Verify periodization rows readable
4. [ ] Verify touch targets large enough (buttons, sliders)
5. [ ] Practice detail: Verify intensity slider usable with touch

**Expected**: Usable on all screen sizes, no layout breaks

---

## 🧪 Phase 7: Data Persistence

### Browser Reload
1. [ ] Create multiple periodization blocks
2. [ ] Add practices with intensity
3. [ ] Refresh browser (F5)
4. [ ] Verify all data persists:
   - Blocks remain in timeline
   - Practice intensities saved
   - Workload chart matches

### IndexedDB Verification
1. [ ] Open DevTools → Application → IndexedDB → BootroomDB
2. [ ] Check `periodizationBlocks` table
3. [ ] Verify entries exist with correct structure:
   - `type`, `label`, `startDate`, `endDate`, `color`, `targetIntensity`
4. [ ] Check `practices` table
5. [ ] Verify entries have: `intensity`, `sessionType`, `duration`

**Expected**: All data persists correctly, no data loss on reload

---

## 🧪 Phase 8: Edge Cases

### Empty States
- [ ] No periodization blocks → "No blocks yet" message
- [ ] No practices/matches → "No workload data yet"
- [ ] Practice during no active phase → Generic recommendations

### Overlapping Blocks
- [ ] Create 2 training phase blocks with overlapping dates
- [ ] Verify only first matching block is considered active
- [ ] No visual glitches in timeline

### Invalid Data
- [ ] Try creating block with end date before start date
- [ ] Verify save button disabled or validation error
- [ ] Try setting intensity to 0 or 11
- [ ] Verify slider constraints work (1-10)

### Large Datasets
- [ ] Create 20+ practices across multiple weeks
- [ ] Verify workload chart renders smoothly
- [ ] Verify no performance issues
- [ ] Scroll timeline → No lag

**Expected**: Graceful handling, no crashes, helpful error states

---

## 🧪 Phase 9: Integration with Existing Features

### Team Selection
1. [ ] Switch between teams (if multiple exist)
2. [ ] Verify periodization blocks filter by team
3. [ ] Verify workload chart updates per team

### Match Integration
1. [ ] Create match from Calendar
2. [ ] Verify workload chart includes match (100 load)
3. [ ] Complete match with result
4. [ ] Verify workload unaffected by match completion

### Practice Templates
1. [ ] Create practice from existing template
2. [ ] Open practice detail
3. [ ] Verify intensity/sessionType/duration editable
4. [ ] Set values and save
5. [ ] Verify template not modified, only this instance

**Expected**: No conflicts, all features work together seamlessly

---

## 🧪 Phase 10: Performance & Polish

### Load Times
- [ ] Initial page load < 2 seconds
- [ ] Season tab opens instantly
- [ ] Practice detail modal opens < 300ms
- [ ] Workload chart renders < 500ms

### Smooth Interactions
- [ ] Slider adjustments feel responsive
- [ ] Block creation/editing has no lag
- [ ] Timeline scroll is smooth (60fps)
- [ ] Hover tooltips appear promptly

### Visual Polish
- [ ] Colors match app theme (surface-*, txt-*, accent)
- [ ] Borders consistent (surface-5)
- [ ] Typography follows Bebas Neue font
- [ ] Spacing feels balanced

**Expected**: Professional feel, no janky interactions

---

## 🎉 Final Checklist

- [ ] All Phase 1-10 tests pass
- [ ] No console errors
- [ ] No TypeScript build errors (`npm run build`)
- [ ] User guide read and understood
- [ ] Ready for production use

---

## 🐛 Bug Reporting Template

If you find issues, document with:

```
**Issue**: [Brief description]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected**: [What should happen]
**Actual**: [What actually happens]
**Browser**: [Chrome/Firefox/Safari + version]
**Console Errors**: [Any errors from DevTools]
**Screenshot**: [If applicable]
```

---

## ✅ Success Criteria

The periodization system is ready when:
✅ All 4 rows display blocks correctly
✅ Workload chart auto-populates and updates in real-time
✅ Practice detail shows phase context and smart suggestions
✅ Calendar cards display intensity indicators
✅ Responsive design works on all devices
✅ Data persists across browser reloads
✅ No TypeScript or console errors
✅ Professional look and feel matching Bootroom design

**Happy testing! 🚀**
