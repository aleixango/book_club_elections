# El proper llibre

App web (PWA) per triar el proper llibre del club de lectura amb rondes de votació anònima, fent servir un únic mòbil en horitzontal que passa de mà en mà.

## Regles
- Cada participant proposa fins a 3 llibres (opcional). Els duplicats es rebutgen sense revelar qui va proposar l’original.
- **Ronda 1** (si hi ha 4 llibres o més): cadascú vota exactament 3 llibres diferents; passen els 3 més votats i **tots els empatats al tall** (en poden passar 4, 5…).
- **Rondes següents**: amb *n* llibres, cadascú en vota *n − 1* i en passen *n − 1* (se n’elimina exactament un). Amb 2 llibres és la **Final** (1 vot).
- **Empat al tall (de la ronda 2 endavant, final inclosa)**: desempat a 1 vot només entre els empatats; si torna a haver-hi empat, decideix la ruleta.
- Amb 3 llibres es comença a la ronda de 2 vots, amb 2 a la final i amb 1 hi ha guanyador directe.
- Només es desa el recompte per llibre, mai què ha votat cada persona. L’autoria es revela al final.

## Propostes del club
Les propostes ja recollides (portada, sinopsi, gènere, pàgines i proponent) són a [`src/data/club.ts`](src/data/club.ts) i les portades a `public/club/`. A l’inici, «Votar les propostes del club» crea la sessió amb aquests llibres i va directament a la votació. La llista de votants es pot editar abans de començar; si algú que ha proposat no vota, el seu llibre continua en joc i el seu nom apareix al final.

Per a una votació futura, substitueix aquestes dades o fes servir «Nova votació», que recull les propostes amb el cercador.

## Desenvolupament
```bash
npm install
npm run dev      # http://localhost:5173 (també accessible a la xarxa local amb --host)
npm test         # tests de la lògica de rondes, empats i propostes precarregades
npm run build    # genera dist/ (PWA amb service worker)
```

### Cerca de llibres
Fa servir Google Books i Open Library en paral·lel. Sense clau, Google Books sol respondre `429` (quota compartida esgotada) i només es fa servir Open Library. Per activar Google Books, crea una API key gratuïta a Google Cloud (Books API) i posa-la a `.env.local`:

```
VITE_GOOGLE_BOOKS_KEY=la_teva_clau
```

## Desplegament
`dist/` és estàtic i fa servir rutes relatives, així que funciona a GitHub Pages, Netlify o qualsevol allotjament estàtic. Obre l’URL al mòbil i fes servir «Afegeix a la pantalla d’inici» per tenir-la a pantalla completa en horitzontal.
