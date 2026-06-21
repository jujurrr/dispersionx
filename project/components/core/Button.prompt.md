Primary action button — reserve `variant="primary"` for the single main action on a view; everything else is `outline` / `ghost`.

```jsx
<Button variant="primary" size="lg" onClick={start}>Créer une stratégie</Button>
<Button variant="outline">Comprendre la dispersion</Button>
<Button variant="ghost" size="sm">Mode avancé</Button>
<Button variant="danger" size="sm">Supprimer</Button>
```

Variants: `primary` (accent blue), `outline`, `ghost`, `danger` (soft red), `success` (teal). Sizes `sm | md | lg`. Pass `icon` for a leading glyph, `full` to stretch.
