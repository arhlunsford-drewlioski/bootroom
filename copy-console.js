// Paste this in browser console to get formatted output you can copy

const debug = await (async () => {
  const matches = await db.matches.toArray();
  const practices = await db.practices.toArray();
  
  return {
    totalMatches: matches.length,
    totalPractices: practices.length,
    practicesWithIntensity: practices.filter(p => p.intensity).length,
    matchDates: matches.map(m => m.date).sort(),
    practiceDates: practices.filter(p => p.intensity).map(p => ({
      date: p.date,
      intensity: p.intensity,
      duration: p.duration || 90
    })).sort((a, b) => a.date.localeCompare(b.date))
  };
})();

console.log(JSON.stringify(debug, null, 2));
copy(JSON.stringify(debug, null, 2));
console.log('✅ Copied to clipboard! Paste it here.');
