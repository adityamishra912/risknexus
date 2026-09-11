export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

export default formatPercentage;

