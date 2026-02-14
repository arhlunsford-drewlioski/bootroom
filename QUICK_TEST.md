# Quick Workload Chart Test

## The Issue
You see "Game density" but workload chart shows no colors = **No workload data yet**

## Why Game Density Shows But Workload Doesn't

**Game Density:**
- Shows ALL matches (regardless of any fields)
- Just counts matches per week
- No intensity needed

**Workload Chart:**
- Shows matches (100 load each) + practices with intensity
- If practices have NO intensity field set, they're skipped
- If all your practices are old (before adding intensity feature), they won't show

## Quick 2-Minute Test

### Step 1: Open Browser Console (F12)
Paste this and press Enter:
```javascript
db.matches.toArray().then(m => console.log('Matches:', m.length, m.map(x => x.date)))
db.practices.toArray().then(p => {
  console.log('Total practices:', p.length);
  console.log('With intensity:', p.filter(x => x.intensity).length);
})
```

### Step 2: Interpret Results

**If you see:**
```
Matches: 5 ['2024-11-15', '2024-11-22', ...]
Total practices: 10
With intensity: 0
```
**→ This is the problem!** Your practices don't have intensity values yet.

**Fix:** Add intensity to existing practices or create a new one with intensity.

### Step 3: Add a Test Practice

1. Calendar → Click today's date
2. **+ Add Practice**
3. Fill in:
   - Focus: "Test"
   - Session Type: **Technical** (this auto-suggests intensity 5)
   - Intensity: Move slider to **8**
   - Duration: **90** minutes
4. **Save**

### Step 4: Check Workload Chart

1. Go to **Season** tab
2. Scroll to "Weekly Workload"
3. **You should now see a colored bar!**

## Expected Result

After adding practice with intensity 8:
- Load calculation: (8 × 90) / 60 = **120**
- Bar color: **Green** (#10b981) because 120 < 300 (low threshold)
- Bar height: Proportional to 120 (should be visible)

If you also have a match that week:
- Total load: 120 + 100 = **220**
- Still **green** (220 < 300)

## What Colors Mean

| Load Range | Color        | Hex       | Meaning           |
|------------|--------------|-----------|-------------------|
| < 300      | Green        | #10b981   | Low (recovery)    |
| 300-600    | Yellow/Amber | #f59e0b   | Medium (normal)   |
| 600-900    | Orange       | #f97316   | High (match week) |
| > 900      | Red          | #ef4444   | Peak (heavy load) |

## Still Not Showing?

Check these:

1. **Practice date within 6-month range?**
   - Use "Earlier" / "Later" buttons if needed
   - Timeline shows 6 months from current month + scrollOffset

2. **Browser console errors?**
   - F12 → Console tab
   - Look for red errors
   - If you see errors, share them

3. **Data saved correctly?**
   ```javascript
   db.practices.where('intensity').above(0).toArray().then(console.log)
   ```
   Should show your practice with intensity value.

## Visual Debug

Open `test-workload.html` in browser to verify colors work in isolation.
If that shows colors, the issue is definitely no workload data in your DB.
