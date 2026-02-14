# Workload Chart Debugging Guide

## 🔍 Why the Workload Chart Might Appear Empty

The workload chart **only shows data for**:
1. **Matches** (contribute 100 load each, regardless of other fields)
2. **Practices with intensity values set** (contribute based on intensity × duration)

**Old practices without intensity values will NOT appear in the workload chart.**

---

## ✅ Quick Test to Verify It's Working

### Option 1: Add a Match (Quickest)
1. Open app at http://localhost:5175
2. Go to **Calendar** tab
3. Click any date → **+ Add Match**
4. Fill in opponent, date, time
5. Save
6. Go to **Season** tab
7. **Workload chart should show a bar** for that week (~100 load)

### Option 2: Add Practice with Intensity
1. Go to **Calendar** tab
2. Click any date → **+ Add Practice**
3. Fill in practice details
4. Scroll down to **Session Type** dropdown
5. Select "Technical" (auto-suggests intensity 5)
6. Set **Duration**: 90 minutes
7. Set **Intensity**: 8/10
8. Save
9. Go to **Season** tab
10. **Workload chart should show a bar** for that week (120 load)
    - Calculation: (8 × 90) / 60 = 120

---

## 🐛 Debugging Steps

### Step 1: Check If Data Exists

Open browser DevTools (F12) → Console:

```javascript
// Check if you have any matches
db.matches.toArray().then(matches => {
  console.log('Matches:', matches.length);
  console.log('Match dates:', matches.map(m => m.date));
});

// Check if you have practices
db.practices.toArray().then(practices => {
  console.log('Total practices:', practices.length);
  console.log('Practices with intensity:', practices.filter(p => p.intensity).length);
  practices.filter(p => p.intensity).forEach(p => {
    console.log(`Practice on ${p.date}: intensity ${p.intensity}, duration ${p.duration || 90}`);
  });
});
```

**Expected:**
- If you have matches, they should show in the workload chart
- If you have practices with intensity values, they should contribute
- If all practices have `intensity: undefined`, they won't appear

---

### Step 2: Verify Workload Calculation

```javascript
// Import the workload functions
import { calculateWeeklyWorkload } from './src/utils/workload';

// Test calculation for current week
db.matches.toArray().then(matches => {
  db.practices.toArray().then(practices => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const load = calculateWeeklyWorkload(matches, practices, weekStartStr);
    console.log(`Current week (${weekStartStr}) load:`, load);
  });
});
```

**Expected:**
- If load = 0, no matches or practices with intensity in current week
- If load > 0, chart should show a bar

---

### Step 3: Check WorkloadChart Component

In Season tab, open DevTools → Elements → Find `<div class="mt-6">` (WorkloadChart wrapper)

**Look for:**
- "No workload data yet" message → No practices/matches with load
- Bars visible → Chart is working, bars may be very short if load is low
- "Loading workload data..." → Matches/practices still loading from DB

---

## 🎯 Expected Behavior

### Scenario 1: No Matches or Practices
```
Weekly Workload Chart:
┌─────────────────────────────────┐
│  No workload data yet           │
│  Add practices with intensity   │
│  values or schedule matches     │
└─────────────────────────────────┘
```

### Scenario 2: 1 Match in Week 1
```
Weekly Workload Chart:
┌─────────────────────────────────┐
│ ▓                               │  <- Orange bar (100 load)
│ Week labels below               │
└─────────────────────────────────┘
Avg Weekly Load: 16
Peak Week: 100
```

### Scenario 3: 1 Match + 2 Practices (intensity 6 & 8, 90 min each)
```
Week calculation:
- Match: 100
- Practice 1: (6 × 90) / 60 = 90
- Practice 2: (8 × 90) / 60 = 120
- Total: 310 (Yellow/Medium load)

Weekly Workload Chart:
┌─────────────────────────────────┐
│ ████                            │  <- Yellow bar (310 load)
│ Week labels below               │
└─────────────────────────────────┘
Avg Weekly Load: 51
Peak Week: 310
```

---

## 🔧 Common Issues & Fixes

### Issue 1: "Chart shows but no bars visible"
**Cause:** Load values are very low, bars are rendering but too short to see

**Fix:**
- Add more matches/practices
- Increase practice intensity values
- Check if dates are within the 6-month visible range

### Issue 2: "Empty state showing but I have matches"
**Cause:** Match dates might be outside the 6-month window

**Fix:**
- Use Earlier/Later buttons to scroll timeline
- Check match dates: `db.matches.toArray().then(m => console.log(m.map(x => x.date)))`
- Add matches within current 6-month range

### Issue 3: "Practices not showing in workload"
**Cause:** Practices don't have intensity values

**Fix:**
1. Open existing practice
2. Scroll to intensity controls
3. Set **Session Type** and **Intensity**
4. Save
5. Workload chart should update

### Issue 4: "Chart not updating after adding data"
**Cause:** React not detecting data change

**Fix:**
- Refresh browser (F5)
- Navigate away from Season tab and back
- Check console for errors

---

## 📊 Manual Calculation Example

**Week of Feb 10-16, 2025:**

| Date    | Type     | Intensity | Duration | Load Contribution |
|---------|----------|-----------|----------|-------------------|
| Feb 10  | Practice | 5         | 90 min   | (5×90)/60 = 75    |
| Feb 12  | Match    | -         | -        | 100               |
| Feb 14  | Practice | 3         | 60 min   | (3×60)/60 = 30    |
| Feb 16  | Practice | 7         | 90 min   | (7×90)/60 = 105   |

**Total Weekly Load: 75 + 100 + 30 + 105 = 310**
**Intensity Category: Medium (300-600 range)**
**Bar Color: Yellow/Amber (#f59e0b)**

---

## 🎨 Visual Debugging

### Test Gradient Colors

Add practices with different intensities to see color progression:

| Intensity | Duration | Load | Color  |
|-----------|----------|------|--------|
| 2         | 90       | 30   | Green  |
| 5         | 90       | 75   | Green  |
| 7         | 90       | 105  | Green  |
| + Match   | -        | +100 | Yellow |

Total with match: 310 (Yellow bar)

---

## ✅ Success Checklist

- [ ] Dev server running at http://localhost:5175
- [ ] Season tab loads without errors
- [ ] Workload chart section visible
- [ ] At least 1 match or practice with intensity added
- [ ] Match/practice date within 6-month visible range
- [ ] Bar appears in workload chart
- [ ] Hover tooltip shows load value
- [ ] Summary stats update (Avg, Peak, Total)

---

## 🆘 Still Not Working?

**Check browser console for errors:**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Common issues:
   - `calculateWeeklyWorkload is not defined` → Import issue
   - `Cannot read property 'intensity'` → Type mismatch
   - `practices.filter is not a function` → Data not loaded

**Share this info for help:**
```javascript
// Copy/paste this into console and share output
{
  matches: await db.matches.count(),
  practices: await db.practices.count(),
  practicesWithIntensity: (await db.practices.toArray()).filter(p => p.intensity).length,
  samplePractice: (await db.practices.toArray())[0],
  sampleMatch: (await db.matches.toArray())[0]
}
```

---

## 🎉 When It Works

You should see:
- ✅ Color-coded bars in the chart
- ✅ Hover tooltips with load details
- ✅ Summary statistics updating
- ✅ Bars grow/shrink as you add/remove data
- ✅ Timeline scrolls with Earlier/Later buttons

**The workload chart is reactive and will auto-update as you add matches and practices with intensity values!**
