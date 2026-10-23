// Entirely fictional. Addresses/hashes are placeholders and are never queried.
export function demoCase() {
  const transaction = {kind:'cash_out', title:'SYNTHETIC — bank to exchange to wallet to cash-out', amount:'50000', asset:'USD', date:'2026-10-21', network:'none', txid:'', chainId:'', narrative:'SYNTHETIC walkthrough: USD 40,000 from savings was sent to an exchange, used to buy 1 BTC, withdrawn to a wallet, returned to the exchange and sold for USD 50,000. This fictional example demonstrates manual links across different assets and dates; it does not establish authenticity or ownership.', structure:null};
  const rows = [
    ['Savings source','source','40000','USD','2026-09-01','Fictional savings statement; underlying income evidence still needed.'],
    ['Bank → exchange','bank','40000','USD','2026-09-02','Synthetic outgoing bank transfer reference DEMO-01.'],
    ['Exchange purchase','exchange','1','BTC','2026-09-03','Fictional trade: USD 40,000 → 1 BTC. No inferred exchange rate.'],
    ['Exchange → wallet','chain','1','BTC','2026-09-04','Placeholder withdrawal hash; no blockchain query performed.'],
    ['Wallet ownership claim','ownership','','','2026-09-04','Self-declaration only. A signature or other independent ownership evidence is missing.'],
    ['Wallet → exchange','chain','1','BTC','2026-10-20','Fictional return deposit; requires independent chain records.'],
    ['Exchange sale and withdrawal','exchange','50000','USD','2026-10-20','Fictional sale of 1 BTC for USD 50,000. Fees are unspecified.'],
    ['Cash-out bank receipt','bank','50000','USD','2026-10-21','Fictional bank receipt DEMO-02; exact match is only a candidate.']
  ];
  return {transaction, evidence:rows.map(([label,role,amount,asset,date,notes],i)=>({id:`demo-${i+1}`,label:`SYNTHETIC — ${label}`,role,amount,asset,date,notes,txid:'',provenance:'Synthetic walkthrough',review:'unreviewed',linked:false}))};
}
