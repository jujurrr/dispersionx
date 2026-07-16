/* Généré par backtest/build_baseline.mjs — NE PAS éditer à la main.
   Baseline historique de la PRIME DE CORRÉLATION (ρ implicite − ρ réalisée), en POINTS, calculée
   exactement comme l'app (ρ_impl 30 j CBOE cap top-N ≈ indice ; réalisée trailing 60 j) sur
   ThetaData 2022-2026. premiumPts = 21 quantiles réguliers p0, p5, … p100.
   Consommée par le Correlation Lab (panneau « Régime de corrélation ») et par Construction
   (situer, dans son histoire, la prime qu'il faut capturer pour couvrir le spread). */
window.DXCorrBaseline = {
  SPX: {
    label: "S&P 500", window: "2022–2026", n: 224,
    premiumPts: [-36.3, -12.1, -9.3, -7, -5.2, -3.7, -2.5, -1.5, 0.1, 1.9, 2.7, 3.3, 4.2, 5.7, 6.9, 7.8, 9.3, 10.7, 12.8, 20.7, 39.4],
  },
  NDX: {
    label: "Nasdaq 100", window: "2022–2026", n: 224,
    premiumPts: [-31.3, -14.4, -7.9, -6.1, -3.1, -2.2, -0.7, 0.7, 1.5, 2.8, 3.8, 4.3, 5.1, 6.3, 7.7, 9.5, 11.4, 13.3, 14.1, 17, 31.4],
  },
  DJI: {
    label: "Dow Jones", window: "2022–2026", n: 224,
    premiumPts: [-30.4, -8.8, -6.9, -4.4, -3.5, -1.4, -0.6, 0.5, 1.9, 2.7, 3.4, 4.2, 5.1, 5.8, 7.4, 8.3, 10.4, 12.3, 15.1, 19, 34.9],
  },
};
