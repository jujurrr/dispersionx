Horizontal progress rail for the 8-step Strategy Builder. Done steps show a check, active is filled accent, todo is muted. Done/active are clickable to jump back.

```jsx
<Stepper
  steps={['Indice','Échéance','Univers','Composants','Corrélation','Construction','Risque','Synthèse']}
  current={4}
  onStepClick={(i) => goToStep(i)}
/>
```
