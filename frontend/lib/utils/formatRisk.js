export function formatRiskLevel(score) {
  if (score >= 8 || score >= 4000000) return { label: 'Critical', color: 'text-red-400 bg-red-950/60 border-red-800/60' };
  if (score >= 6 || score >= 2500000) return { label: 'High', color: 'text-orange-400 bg-orange-950/60 border-orange-800/60' };
  if (score >= 4 || score >= 1000000) return { label: 'Medium', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' };
  return { label: 'Low', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' };
}

export function formatRisk(value) {
  return formatRiskLevel(value);
}

export default formatRisk;

