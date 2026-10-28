// ERC-20 decimals are uint8. Canonical strings compare without floating point.
export function canonicalAmount(value) {
  const text=String(value);
  if(!/^\d+(\.\d{1,255})?$/.test(text) || text.length>4000) throw Error('Use a positive decimal with up to 255 decimal places.');
  const [whole,fraction='']=text.split('.');
  const a=String(BigInt(whole)),b=fraction.replace(/0+$/,'');
  if(a==='0'&&!b)throw Error('Amount must be greater than zero.');
  return b?`${a}.${b}`:a;
}
export function formatUnits(raw,decimals) {
  if(typeof raw!=='string'||!/^\d{1,78}$/.test(raw)||!Number.isInteger(decimals)||decimals<0||decimals>255)throw Error('Invalid exact token amount.');
  const n=String(BigInt(raw));if(decimals===0)return n;
  const padded=n.padStart(decimals+1,'0');const fraction=padded.slice(-decimals).replace(/0+$/,'');
  return fraction?`${padded.slice(0,-decimals)}.${fraction}`:padded.slice(0,-decimals);
}
