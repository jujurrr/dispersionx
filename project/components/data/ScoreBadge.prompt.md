Tiered score chip — color and label follow the scoring engine's signal tiers (FORT ≥75 teal, MODÉRÉ ≥50 lime, FAIBLE ≥30 amber, NÉGATIF red).

```jsx
<ScoreBadge score={82} />            {/* 82/100 · FORT */}
<ScoreBadge score={48} size="lg" />  {/* 48/100 · FAIBLE */}
<ScoreBadge score={64} label="MODÉRÉ" />
```
