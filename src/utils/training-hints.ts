/** Maps opponent traits to suggested training phase emphasis */
const TRAIT_TO_PHASES: Record<string, string[]> = {
  'High Press': ['Build Out', 'Pressing'],
  'Direct': ['Defensive Shape', 'Transition'],
  'Strong in Wide Areas': ['Defensive Shape', 'Attacking Patterns'],
  'Set Piece Threat': ['Set Pieces', 'Defensive Shape'],
  'Counter-Attack': ['Pressing', 'Recovery Runs', 'Transition'],
  'Low Block': ['Attacking Patterns', 'Final Third', 'Combination Play'],
  'Physical': ['Set Pieces', 'Transition'],
  'Possession-Based': ['Pressing', 'Counter-Press', 'Transition'],
  'Quick Transitions': ['Defensive Shape', 'Recovery Runs'],
  'Man-Marking': ['Combination Play', 'Attacking Patterns'],
  'Aerial Threat': ['Set Pieces', 'Defensive Shape'],
  'Compact Shape': ['Final Third', 'Attacking Patterns', 'Combination Play'],
  'Overlapping Full-Backs': ['Defensive Shape', 'Transition'],
  'Long Ball': ['Defensive Shape', 'Build Out'],
  'Zonal Marking': ['Set Pieces', 'Attacking Patterns'],
};

export function getSuggestedPhases(opponentTraits: string[]): string[] {
  const phaseCount = new Map<string, number>();
  for (const trait of opponentTraits) {
    const phases = TRAIT_TO_PHASES[trait];
    if (phases) {
      for (const phase of phases) {
        phaseCount.set(phase, (phaseCount.get(phase) ?? 0) + 1);
      }
    }
  }
  // Return top 3 most suggested phases
  return [...phaseCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([phase]) => phase);
}
