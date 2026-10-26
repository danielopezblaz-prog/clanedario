# Clawndario

Tareas, calendario y recordatorios de reuniones en una sola app, con estética tipo iOS. Sin cuentas, sin servidor: todo se guarda en tu dispositivo.

**Abrir:** https://danielopezblaz-prog.github.io/clawndario/

## Instalar

- **Escritorio (Windows / Mac):** abre la URL en Chrome o Edge y pulsa el icono «Instalar» de la barra de direcciones (o menú ⋮ → *Instalar Clawndario*). Queda como una app con su propia ventana e icono.
- **Android:** abre la URL en Chrome → menú ⋮ → *Añadir a pantalla de inicio* / *Instalar app*.
- **iPhone / iPad:** abre la URL en Safari → botón *Compartir* → *Añadir a pantalla de inicio*.
- **Sin internet:** en Windows, `instalar.ps1` crea un acceso directo que abre la copia local en una ventana propia de Chrome.

Para recibir avisos, pulsa la campana y acepta las notificaciones. Avisa mientras la app esté abierta (también minimizada); cerrada del todo no puede avisar.

## Añadir en lenguaje natural

Escribe en el cuadro de arriba (tecla **N**) y pulsa Intro:

```
Reunión con Dani mañana 10:30 #trabajo !alta
Llamar al banco el viernes a las 12
Visita a la obra el 3 de noviembre de 9 a 11 avisa 1 h antes
Pagar el seguro cada mes el 5 #personal
```

Entiende fechas (hoy, mañana, lunes…, 15/11, 15 de noviembre, el 15), horas (10:30, a las 10, de 10 a 11:30, 1h / 30 min de duración), listas con `#`, prioridad con `!alta / !media / !baja`, repeticiones (cada día / semana / mes / lunes / laborables) y avisos («avisa 15 min antes»). Si dice reunión, cita, llamada, visita… lo guarda como reunión.

## Vistas

- **Hoy:** anillo de progreso, vencidas / para hoy / semana / total, agenda por horas con «Siguiente», tareas.
- **Próximos:** los 30 días siguientes.
- **Calendario:** mes o semana; arrastra una tarea a otro día para moverla.
- **Todo pendiente**, **Completadas** y **listas** de colores.

Atajos: `N` añadir · `Ctrl+K` buscar · `1`–`5` vistas · `Esc` cerrar · `Ctrl+Intro` guardar.

## Datos

Se guardan en el navegador del dispositivo (localStorage). En *Ajustes* puedes descargar una copia (.json), restaurarla y exportar todo a Outlook o Google Calendar (.ics).

## Archivos

`index.html` · `app.css` · `app.js` · `sw.js` (funciona sin conexión) · `manifest.webmanifest` · iconos. Scripts de Windows: `instalar.ps1`, `autoinicio.ps1`, `serve.ps1`.
