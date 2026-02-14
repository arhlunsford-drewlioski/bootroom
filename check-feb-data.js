// Run this in browser console to check February 2026 data

(async () => {
  const matches = await db.matches.toArray();
  const practices = await db.practices.toArray();
  
  // Filter to February 2026
  const febMatches = matches.filter(m => m.date >= '2026-02-01' && m.date < '2026-03-01');
  const febPractices = practices.filter(p => p.date >= '2026-02-01' && p.date < '2026-03-01');
  
  console.log('=== FEBRUARY 2026 DATA ===');
  console.log('Matches:', febMatches.length);
  febMatches.forEach(m => console.log(`  ${m.date}: vs ${m.opponent}`));
  
  console.log('\nPractices:', febPractices.length);
  febPractices.forEach(p => {
    console.log(`  ${p.date}: ${p.focus}`);
    console.log(`    intensity: ${p.intensity}, duration: ${p.duration}, sessionType: ${p.sessionType}`);
  });
  
  console.log('\n=== WORKLOAD CHECK ===');
  const week = '2026-02-10'; // Week containing your data
  const weekEnd = '2026-02-17';
  
  const weekMatches = matches.filter(m => m.date >= week && m.date < weekEnd);
  const weekPractices = practices.filter(p => p.date >= week && p.date < weekEnd);
  
  console.log(`Week ${week} to ${weekEnd}:`);
  console.log(`  Matches: ${weekMatches.length} → Load: ${weekMatches.length * 100}`);
  console.log(`  Practices: ${weekPractices.length}`);
  
  let practiceLoad = 0;
  weekPractices.forEach(p => {
    if (p.intensity) {
      const load = (p.intensity * (p.duration || 90)) / 60;
      practiceLoad += load;
      console.log(`    ${p.date}: intensity ${p.intensity}, duration ${p.duration || 90} → ${load} load`);
    } else {
      console.log(`    ${p.date}: NO INTENSITY SET (skipped)`);
    }
  });
  
  console.log(`  Total Practice Load: ${practiceLoad}`);
  console.log(`  TOTAL WEEKLY LOAD: ${weekMatches.length * 100 + practiceLoad}`);
})();
