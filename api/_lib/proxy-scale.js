// Source UNIQUE des échelles ETF proxy → niveau d'indice (côté serveur).
// ETF price × scale ≈ niveau réel de l'indice, pour un vega d'option indice
// et un sizing vega-neutre réalistes :
//   SPY×10 ≈ SPX · QQQ×41 ≈ NDX · DIA×100 ≈ DJI · EWQ×196 ≈ CAC 40 · EWG×565 ≈ DAX 40.
// Les ETF (EWQ/EWG) sont ceux effectivement cotés/tradés ; CAC/DAX n'ont pas
// d'options US, on passe par leur proxy (cf. api/_lib/cboe.js CBOE_INDEX).
//
// Miroir navigateur : js/data.js → window.DXProxy.PROXY_SCALE (même table).
// Garder les DEUX synchronisés (pas de build partagé entre edge et browser).
export const PROXY_SCALE = {
  SPX: { etf: 'SPY', scale: 10 },
  NDX: { etf: 'QQQ', scale: 41 },
  DJI: { etf: 'DIA', scale: 100 },
  CAC: { etf: 'EWQ', scale: 196 },
  DAX: { etf: 'EWG', scale: 565 },
};

export function proxyEtf(sym) {
  const p = PROXY_SCALE[String(sym || '').toUpperCase()];
  return p ? p.etf : String(sym || '').toUpperCase();
}

export function proxyScale(sym) {
  const p = PROXY_SCALE[String(sym || '').toUpperCase()];
  return p ? p.scale : 1;
}
