// Quick script to check database for workload data
// Run this in browser console

(async () => {
  const matches = await db.matches.toArray();
  const practices = await db.practices.toArray();
  
  console.log('=== WORKLOAD DATA CHECK ===');
  console.log('Matches:', matches.length);
  console.log('Practices:', practices.length);
  console.log('Practices with intensity:', practices.filter(p => p.intensity).length);
  
  if (matches.length > 0) {
    console.log('\nMatches:');
    matches.forEach(m => console.log(`  - ${m.date}: vs ${m.opponent}`));
  }
  
  if (practices.filter(p => p.intensity).length > 0) {
    console.log('\nPractices with intensity:');
    practices.filter(p => p.intensity).forEach(p => {
      const load = (p.intensity * (p.duration || 90)) / 60;
      console.log(`  - ${p.date}: ${p.focus}, intensity ${p.intensity}, load ${load}`);
    });
  }
  
  // Check current week
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  
  const thisWeekMatches = matches.filter(m => m.date >= weekStartStr && m.date < weekEndStr);
  const thisWeekPractices = practices.filter(p => p.date >= weekStartStr && p.date < weekEndStr && p.intensity);
  
  const matchLoad = thisWeekMatches.length * 100;
  const practiceLoad = thisWeekPractices.reduce((sum, p) => sum + (p.intensity * (p.duration || 90)) / 60, 0);
  
  console.log(`\n=== CURRENT WEEK (${weekStartStr}) ===`);
  console.log('Matches:', thisWeekMatches.length, '→ Load:', matchLoad);
  console.log('Practices:', thisWeekPractices.length, '→ Load:', practiceLoad.toFixed(0));
  console.log('TOTAL LOAD:', (matchLoad + practiceLoad).toFixed(0));
})();
