export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0';
  if (Math.abs(amount) >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    const l = amount / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function parseCurrency(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  let val = str.replace(/[₹,]/g, '').trim();
  if (val.endsWith('Cr')) {
    return parseFloat(val) * 10000000;
  }
  if (val.endsWith('L')) {
    return parseFloat(val) * 100000;
  }
  return parseFloat(val) || 0;
}

export default formatCurrency;

