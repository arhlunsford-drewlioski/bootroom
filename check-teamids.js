// Run this in browser console to check teamId mismatch

(async () => {
  const teams = await db.teams.toArray();
  const matches = await db.matches.toArray();
  const practices = await db.practices.toArray();
  
  console.log('=== TEAMS ===');
  teams.forEach(t => console.log(`Team ${t.id}: ${t.name}`));
  
  console.log('\n=== MATCHES (all) ===');
  console.log(`Total: ${matches.length}`);
  matches.forEach(m => console.log(`  ${m.date}: vs ${m.opponent} (teamId: ${m.teamId})`));
  
  console.log('\n=== PRACTICES (all) ===');
  console.log(`Total: ${practices.length}`);
  practices.forEach(p => console.log(`  ${p.date}: ${p.focus} (teamId: ${p.teamId})`));
  
  console.log('\n=== GROUP BY TEAM ===');
  teams.forEach(team => {
    const teamMatches = matches.filter(m => m.teamId === team.id);
    const teamPractices = practices.filter(p => p.teamId === team.id);
    console.log(`Team ${team.id} (${team.name}):`);
    console.log(`  Matches: ${teamMatches.length}`);
    console.log(`  Practices: ${teamPractices.length}`);
  });
})();
