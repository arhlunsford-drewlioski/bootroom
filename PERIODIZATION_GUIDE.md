# Bootroom Periodization System - User Guide

## 🎯 Overview
Professional-grade periodization system for season planning, workload management, and training optimization.

## 📊 Features

### 1. **Four-Row Periodization Timeline**
- **Training Phase**: Overall training strategy (General Prep, Competition, Recovery, etc.)
- **Technical Focus**: Specific technical skills to emphasize (Ball Mastery, Passing, Finishing, etc.)
- **Tactical Focus**: Team tactical priorities (Pressing, Build-Up, Transitions, etc.)
- **Physical Focus**: Physical development goals (Aerobic Base, Speed & Agility, etc.)

### 2. **Intelligent Workload Tracking**
- **Auto-calculation**: Practices contribute `(intensity × duration) / 60`, matches = 100
- **Weekly visualization**: Color-coded bars (green/yellow/orange/red) show load intensity
- **Smart thresholds**:
  - Low: < 300 (light week)
  - Medium: 300-600 (normal training)
  - High: 600-900 (match week with training)
  - Peak: > 900 (multiple matches or heavy load)

### 3. **Phase-Aware Practice Planning**
- Recommendations adjust based on current training phase
- Intensity suggestions adapt to periodization blocks
- Session type presets (Technical/Tactical/Physical/Fitness/Recovery)
- Visual intensity indicators on calendar cards

---

## 🚀 Quick Start

### Step 1: Create Periodization Blocks
1. Go to **Season** tab
2. Click **+ Add Block**
3. Select block type (Training/Technical/Tactical/Physical)
4. Choose from pre-defined labels or enter custom
5. Set date range and target intensity
6. Optional: Add focus theme

**Example Season Structure:**
```
Training Phase:
├─ General Preparation (Aug 1 - Sep 15)
├─ Specific Preparation (Sep 16 - Oct 31)
├─ Competition (Nov 1 - Mar 15)
└─ Championship Phase (Mar 16 - May 31)

Technical Focus:
├─ Ball Mastery (Aug 1 - Aug 31)
├─ Passing & Receiving (Sep 1 - Oct 15)
└─ Finishing (Oct 16 - May 31)

Physical Focus:
├─ Aerobic Base (Aug 1 - Sep 30)
├─ Speed & Agility (Oct 1 - Nov 30)
└─ Maintenance (Dec 1 - May 31)
```

### Step 2: Plan Practices with Intensity
1. Go to **Calendar** tab
2. Click on a date → **+ Add Practice**
3. Fill in practice details
4. **Set Session Type** (auto-suggests intensity)
5. **Adjust Intensity** slider (1-10 scale)
6. **Set Duration** (minutes)
7. Save and see workload chart update automatically

### Step 3: Monitor Workload
1. **Season tab** shows weekly workload chart
2. Hover over bars to see exact load values
3. Color indicates intensity:
   - 🟢 Green = Low load (recovery)
   - 🟡 Yellow = Medium load (normal training)
   - 🟠 Orange = High load (match week)
   - 🔴 Red = Peak load (multiple matches)

---

## 💡 Best Practices

### **Pre-Season Planning (General Preparation)**
- Target intensity: 4-6/10
- Focus: Build aerobic base, fundamental skills
- Workload: Gradual increase, avoid peaks
- Session types: Mix of technical + physical

### **In-Season (Competition)**
- Target intensity: 5-7/10
- Focus: Balance training with recovery
- Workload: Peak around 600-800, taper before big matches
- Session types: Tactical emphasis, recovery between matches

### **Championship Phase**
- Target intensity: 6-9/10
- Focus: Peak performance, tactical refinement
- Workload: Manage carefully, avoid overtraining
- Session types: Game-specific, mental preparation

### **Recovery/Transition**
- Target intensity: 2-4/10
- Focus: Active recovery, injury prevention
- Workload: Keep under 300
- Session types: Recovery, flexibility, light technical

---

## 🎨 Visual Indicators

### **Calendar Practice Cards**
- **Left border color**: Intensity level (green → red)
- **Session type badge**: Technical/Tactical/Physical/Fitness/Recovery
- **Intensity rating**: Displayed as "7/10"

### **Phase Context**
When editing practices, you'll see:
- Current active phases for all 4 rows
- Smart recommendations based on phase
- Target intensity hints from periodization blocks
- Warnings if intensity seems too high/low

---

## 📱 Responsive Design

All periodization features work seamlessly on:
- Desktop (full timeline view)
- Tablet (horizontal scroll)
- Mobile (compact cards, touch-friendly)

---

## 🔧 Technical Details

### **Database Schema**
- `periodizationBlocks` table (4 row types)
- `practices.intensity` (1-10 scale)
- `practices.sessionType` (technical/tactical/physical/fitness/recovery)
- `practices.duration` (minutes)

### **Workload Calculation**
```typescript
Practice Load = (intensity × duration) / 60
Match Load = 100 (fixed)
Weekly Load = Sum of all practice loads + match loads
```

### **Files Added**
- `src/constants/periodization.ts` - Phase definitions, colors
- `src/utils/workload.ts` - Workload calculations
- `src/utils/periodization.ts` - Phase helpers
- `src/components/WorkloadChart.tsx` - Visualization
- `src/components/PhaseContext.tsx` - Phase display component

### **Files Enhanced**
- `src/db/database.ts` - Schema v6 with periodization tables
- `src/components/SeasonOverview.tsx` - 4-row timeline editor
- `src/components/PracticeDetail.tsx` - Intensity & phase awareness
- `src/components/calendar.tsx` - Visual intensity indicators

---

## 🎓 Example Workflow

**Scenario: Planning a practice during Competition phase**

1. Open Calendar → Select March 15 (mid-season)
2. Current phase context shows:
   - Training: Competition
   - Technical: Finishing
   - Physical: Maintenance
3. Recommendations appear:
   - "Balance training load with match schedule"
   - "Prioritize recovery between matches"
4. Select session type: **Tactical** (auto-suggests 6/10 intensity)
5. Adjust if needed (e.g., reduce to 5/10 if match in 2 days)
6. Set duration: 75 minutes
7. Save → Workload chart updates showing 62.5 load for that week

---

## 🏆 Professional Features

✅ **Auto-populated workload** from existing matches + practices
✅ **Phase-aware suggestions** adapt to training cycle
✅ **Visual indicators** show intensity at a glance
✅ **Smart warnings** for unusual load patterns
✅ **Responsive design** works on all devices
✅ **Backward compatible** with existing Bootroom data

---

## 🤝 Support

This periodization system integrates seamlessly with existing Bootroom features:
- Team management
- Match planning & reflections
- Player evaluations
- Practice library
- Calendar views

Everything works together to create a comprehensive coaching platform!
