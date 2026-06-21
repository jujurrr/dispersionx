Single labelled metric — uppercase label, big mono value, always-visible unit, optional signed delta. The building block of Market Overview, Risk Lab greeks, and snapshot strips.

```jsx
<MetricCard label="Prime ρ" value="+6.4" unit="pts" delta="+1.2 vs hier" accent="var(--accent)" />
<MetricCard label="Vega net" value="−180" hint="Vega indice + composants" deltaTone="neg" />
<MetricCard label="IV ATM SPX" value="18.2" unit="%" size="lg" />
```

`deltaTone="auto"` infers green/red from the delta sign. Pass `accent` for a left meaning-bar. Numeric values **count up** on mount and the card rises in (both respect `prefers-reduced-motion`; set `animate={false}` to disable). Pass `glass` for the dark-glass treatment on gradient backgrounds.
