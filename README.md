# El próximo libro

App web (PWA) para elegir el siguiente libro del club de lectura con rondas de votación anónima, usando un único móvil en horizontal que pasa de mano en mano.

## Reglas
- Cada participante propone hasta 3 libros (opcional). Los duplicados se rechazan sin revelar quién propuso el original.
- **Ronda 1** (si hay 4+ libros): cada uno vota exactamente 3 libros distintos; pasan los 3 más votados y **todos los empatados en el corte** (pueden pasar 4, 5…).
- **Rondas siguientes**: con *n* libros, cada uno vota *n − 1* y pasan *n − 1* (se elimina exactamente uno). Con 2 libros es la **Final** (1 voto).
- **Empate en el corte (ronda 2 en adelante, incluida la final)**: desempate a 1 voto solo entre los empatados; si vuelve a empatar, decide la ruleta.
- Con 3 libros se empieza en la ronda de 2 votos, con 2 en la final y con 1 hay ganador directo.
- Solo se guarda el recuento por libro, nunca qué votó cada persona. La autoría se revela al final.

## Desarrollo
```bash
npm install
npm run dev      # http://localhost:5173 (también accesible en la red local con --host)
npm test         # tests de la lógica de rondas y empates
npm run build    # genera dist/ (PWA con service worker)
```

### Búsqueda de libros
Usa Google Books y Open Library en paralelo. Sin clave, Google Books suele responder `429` (cuota compartida agotada) y se usa solo Open Library. Para activar Google Books, crea una API key gratuita en Google Cloud (Books API) y ponla en `.env.local`:

```
VITE_GOOGLE_BOOKS_KEY=tu_clave
```

## Despliegue
`dist/` es estático y usa rutas relativas, así que funciona en GitHub Pages, Netlify o cualquier hosting estático. Abre la URL en el móvil y usa «Añadir a pantalla de inicio» para tenerla a pantalla completa en horizontal.
