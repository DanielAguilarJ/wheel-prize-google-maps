# UltraGiro 🎡

Ruleta de premios para conseguir reseñas 5★ en Google y capturar leads, hecha a medida para
**WorldBrain México** (CWBMX, S.C. · ultravelozmente.com).

Es la respuesta propia a herramientas tipo Riwil, con dos diferencias importantes: **es tuya**
(sin mensualidad, sin cuenta, sin depender de un tercero) y **está diseñada para no pelearse con
las políticas de Google**.

---

## Qué incluye

| Página | Archivo | Para qué sirve |
| --- | --- | --- |
| Landing | `index.html` | Página de venta interna: explica el sistema, ruleta demo jugable, catálogo de programas, calculadora de impacto, comparativa, FAQ y CTA a WhatsApp. |
| Ruleta del visitante | `ruleta.html` | Lo que se abre al escanear el QR: captura de datos → giro → premio con código → invitación a reseñar. |
| Panel interno | `admin.html` | Premios y probabilidades, datos de marca, enlace de Google, reglas del juego, estadísticas y exportación CSV. |
| Cartel imprimible | `cartel.html` | Genera el cartel con QR en 4 estilos, con etiqueta de origen, y lo manda a imprimir. |

Todo es **estático**: no hay servidor, ni base de datos, ni cuentas de usuario. Los datos viven en
el `localStorage` del dispositivo donde corre la ruleta y se exportan a CSV cuando quieras.

---

## Arrancar

```bash
cd ultragiro-worldbrain
npm install
npm run dev      # http://localhost:5173
```

Otros comandos:

```bash
npm test         # 131 pruebas unitarias y de humo (Vitest)
npm run coverage # cobertura del núcleo lógico (~95%)
npm run build    # typecheck + build a dist/
npm run preview  # sirve dist/ para revisarlo antes de publicar
```

---

## Puesta en marcha en 6 pasos

1. **Abre `admin.html` → pestaña “Marca y enlaces”.**
   - WhatsApp real en formato `52` + 10 dígitos (ej. `525512345678`).
   - Correo, teléfono, horario y sede.
2. **El enlace de reseñas ya viene configurado** con la ficha real de WorldBrain en Cuautitlán
   Izcalli:

   ```
   Place ID: ChIJA_UWvz4e0oURXT3jeebn4-Y
   CID:      16637396425510174045
   Enlace:   https://search.google.com/local/writereview?placeid=ChIJA_UWvz4e0oURXT3jeebn4-Y
   ```

   Se derivó del par hexadecimal `0x85d21e3ebf16f503:0xe6e3e7e679e33d5d` que aparece en la URL de
   tu ficha de Maps (el algoritmo está verificado contra un caso de control conocido en las
   pruebas). **Confírmalo una vez**: abre el enlace con tu sesión de Google y comprueba que el
   cuadro que aparece diga *WorldBrain*. Si prefieres el enlace corto oficial, cópialo desde tu
   Perfil de Empresa (*Pedir reseñas*) y pégalo en el panel; también se acepta `g.page`.
3. **Ajusta premios y pesos** en la pestaña “Premios”. El peso es relativo: peso 22 sobre un total
   de 100 significa 22% de probabilidad. La columna de probabilidad se recalcula en vivo.
4. **Define las reglas**: horas de espera entre giros del mismo dispositivo, vigencia del código,
   si se piden datos (o modo discreto) y si se exige consentimiento.
5. **Publica** el contenido de `dist/` en ultravelozmente.com (por ejemplo en `/ruleta`) o en
   cualquier hosting estático. Copia esa URL en el panel, campo “URL pública de la ruleta”.
6. **Genera el cartel** en `cartel.html`, ponle etiqueta de origen (`recepcion`, `feria`, `aula-3`)
   e imprime. Un cartel por punto: así sabes cuál funciona.

> Consejo: deja una tablet vieja en recepción con `ruleta.html` abierta. Funciona sin internet
> para girar y capturar datos; sólo se necesita conexión cuando el visitante abre Google.

---

## Cómo se decide el premio

`src/core/prizes.ts` hace una selección ponderada con `crypto.getRandomValues` (y `Math.random`
como respaldo). El premio se decide **antes** de animar: la ruleta sólo muestra el resultado, así
que el segmento que se detiene bajo la aguja siempre corresponde al premio registrado.
`src/core/wheel-geometry.ts` garantiza esa correspondencia y está cubierto por pruebas.

Para regalar menos premios caros, baja su peso (o ponlo en 0 y deja el segmento visible pero
inalcanzable). Con peso 0 nunca sale.

---

## Por qué el visitante no ve las reseñas de otras personas

El enlace usa `search.google.com/local/writereview?placeid=…`, que abre **directamente el cuadro
para escribir** (estrellas + texto). No pasa por `/maps/place/…`, que es la vista donde sí se
listan las reseñas ajenas. Efecto práctico: quien viene de la ruleta escribe su opinión sin que la
nota actual ni los comentarios de otros le condicionen.

Hay una prueba automática que lo protege: si alguien cambia el enlace a una URL de tipo
`/maps/place`, la suite falla.

Tres precisiones honestas:

- **La UI es de Google, no mía.** Puede mostrar la nota media o el nombre del negocio en el
  encabezado del diálogo, y en algunos dispositivos abre la app de Maps. No puedo controlar eso.
- **No se pueden ocultar ni filtrar las reseñas que ya existen.** Nadie puede, salvo Google, y
  sólo si una reseña viola sus políticas (puedes reportarla desde tu Perfil de Empresa).
- **La única palanca legítima para subir la nota es el volumen de reseñas genuinas.** Es
  exactamente lo que hace esta herramienta: si tu mayoría real está contenta, más reseñas mueven el
  promedio hacia arriba. Con 40 reseñas de 4.2★, sumar 60 reseñas de 5★ te deja cerca de 4.7★; con
  20 más no se mueve casi nada. El trabajo está en el volumen sostenido, no en el filtrado.

---

## Cumplimiento: lo que sí y lo que no

Esta parte es la que más importa, porque el competidor que copiaste promete cosas que Google
prohíbe.

**Lo que hace UltraGiro (permitido):**

- El premio se entrega **por girar la ruleta**, no por reseñar. Se gana igual si la persona
  reseña o no.
- El botón de reseña se ofrece **a todo el mundo**, sin depender de la calificación que haya dado
  en la encuesta interna.
- Se sugiere *de qué* hablar (el programa, el avance observado), nunca la calificación ni el texto.
- Si alguien tuvo mala experiencia, se le ofrece **además** un canal privado para poder corregir —
  sin quitarle en ningún momento el enlace público.

**Lo que NO hace, y no deberías añadir:**

- Condicionar el premio a publicar una reseña (es un incentivo prohibido por las políticas de
  contenido de Google y puede costarte las reseñas o la ficha).
- Bloquear el enlace público a quien quiere calificar bajo (*review gating*).
- Pedir 5 estrellas, dictar el texto o escribir la reseña por el cliente.

**Datos personales (LFPDPPP, México):**

- CWBMX, S.C. es el responsable del tratamiento: publica tu **aviso de privacidad** y enlázalo en
  la casilla de consentimiento (`ruleta.html`).
- Recaba sólo lo necesario (nombre, un contacto, programa de interés) y atiende las solicitudes de
  acceso, rectificación, cancelación u oposición.
- Los datos están sin cifrar en el navegador del dispositivo: usa un equipo controlado, con
  bloqueo de pantalla, y guarda los CSV en tu resguardo habitual.

**Antes de publicar la landing, revisa el contenido de marketing:**

- Los testimonios de `src/landing/reviews.data.ts` son **plantilla, no reseñas reales**.
  Sustitúyelos por casos con autorización por escrito, o borra la sección.
- Las cifras marcadas con `*` (+25 años, +200,000 graduados) y las menciones de medios
  (Forbes, Entrepreneur, TEDx, El Universal) son afirmaciones propias de la marca: respáldalas con
  evidencia interna antes de usarlas en campañas pagadas.
- La comparativa "15–30 reseñas por cada 100 visitantes" está redactada como **objetivo a medir**,
  no como resultado garantizado. El panel te dirá tu número real.

---

## Estructura

```
src/
  core/               Lógica pura, sin DOM (aquí viven las pruebas)
    types.ts          Tipos del dominio
    defaults.ts       Premios, programas y marca por defecto
    prizes.ts         Selección ponderada, validaciones, códigos de canje
    storage.ts        localStorage, histórico de jugadas, espera entre giros
    stats.ts          KPIs del panel y calculadora de impacto
    csv.ts            Exportación CSV (con defensa contra inyección de fórmulas)
    lead.ts           Validación de datos, WhatsApp, URL segura de Google
    countdown.ts      Cuenta regresiva cíclica de la promoción
    wheel-geometry.ts Ángulos, segmento bajo la aguja, easing, etiquetas
    qr-url.ts         URL del QR con origen y programa
  wheel/
    wheel.ts          Ruleta en canvas 2D (render, giro, tics)
    page.ts           Flujo completo de ruleta.html
  landing/            Lógica de index.html + testimonios de plantilla
  admin/              Lógica de admin.html
  cartel/             Lógica de cartel.html
  ui/dom.ts           Utilidades de DOM (siempre textContent, nunca innerHTML)
  pages.smoke.test.ts Pruebas de humo: carga cada HTML real y ejecuta su módulo
```

Decisiones de diseño: datos inmutables (las funciones devuelven copias), lógica separada del DOM
para poder probarla, y validación en todo borde de entrada (formulario, URL, configuración
guardada).

---

## Seguridad

- El panel **no tiene contraseña**: es una página estática, cualquier autenticación en el cliente
  sería decorativa. Si publicas `admin.html`, protégelo con autenticación del hosting
  (Basic Auth, Cloudflare Access, etc.) o simplemente **no lo publiques**: úsalo en local y
  publica sólo `ruleta.html` y sus assets.
- Todo texto capturado se pinta con `textContent`, nunca con `innerHTML`: no hay superficie de XSS.
- El enlace de Google se valida contra una lista de dominios permitidos.
- El CSV escapa los campos que empiezan con `=`, `+`, `-` o `@` para que Excel no ejecute fórmulas.
- La espera entre giros es anti-abuso ligero (se puede burlar limpiando el navegador); suficiente
  para uso presencial, no es control de acceso.

---

## Ideas para después

Están listadas en la landing como "módulos que puedes activar": respuestas asistidas por IA para
las reseñas, un QR por asesor o sede con tablero comparativo, ruleta embebida en
ultravelozmente.com, y aviso automático por WhatsApp al ganador.

---

Uso interno de CWBMX, S.C. · Hecho para entrenar cerebros 🧠
