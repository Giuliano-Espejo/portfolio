---
title: BurGame API
subtitle: Reservas y cobros online para un local gamer
teaser: Un local gamer con equipos limitados perdía reservas por superposiciones y señas sin cobrar. Ahora se reserva y se paga online sin choques de horario, y marketing sabe qué anuncios convierten.
# Meta description for search results (keep it under ~155 characters)
description: 'Backend de reservas y cobros para un local gamer: turnos sin superposiciones, señas con Mercado Pago y campañas medibles. Java 21 y Spring Boot.'
summary: Un local de gaming con pocos equipos (simuladores, VR, pantallas) coordinaba las reservas a mano, con turnos que se pisaban y señas que no se cobraban. Construí el backend que permite reservar y pagar la seña online, garantiza que ningún equipo se reserve dos veces y le muestra al negocio qué campañas traen clientes.
period: Feb 2026 — Abr 2026
image: burgame.png
imageAlt: Pantalla de reserva por servicio de BurGame con simuladores F1, VR y pantallas PlayStation
imageUrl: burgame.com
demos:
  - label: Ver sitio
    href: https://www.burgame.com
stats:
  - value: "9"
    label: tipos de equipo reservables
  - value: "3"
    label: turnos de cumpleaños por día
  - value: "63"
    label: tests automatizados
  - value: 1 GB
    label: de RAM en producción
problems:
  - title: Turnos que se pisaban
    text: Con equipos limitados, dos reservas podían caer sobre el mismo simulador o pantalla en el mismo horario.
  - title: Señas sin cobrar
    text: La seña se coordinaba a mano, y muchas reservas nunca se concretaban.
  - title: Marketing a ciegas
    text: Se invertía en anuncios sin saber cuáles traían reservas pagas.
roleNote: Me encargué del backend completo, del diseño al despliegue. El front del sitio es un proyecto aparte.
solutions:
  - title: Disponibilidad garantizada
    text: Antes de reservar se verifica que el equipo esté libre, y se asigna el mejor disponible sin gastar los que necesitan los cumpleaños.
  - title: Seña online automática
    text: El cliente paga con Mercado Pago y la reserva se confirma sola cuando el pago se acredita.
  - title: Panel del negocio
    text: Reservas, precios, servicios y paquetes de cumpleaños, con filtros por fecha, estado y cliente.
  - title: Campañas medibles
    text: Cada reserva registra de qué anuncio vino, y marketing consulta las conversiones sin armar un CRM.
decisions:
  - title: No confiar en el aviso de pago
    text: Cuando Mercado Pago avisa un pago, el backend lo vuelve a consultar y decide con el estado oficial.
  - title: Reproducir el error antes de arreglarlo
    text: Un cambio de base de datos podía romper producción en silencio. Lo reproduje con un test contra el esquema real y quedó como red de seguridad.
  - title: Diseñar para un servidor chico
    text: Todo corre en 1 CPU y 1 GB, con healthchecks, HTTPS automático y backups diarios verificados.
meta:
  - label: Rol
    value: Backend completo, del diseño al despliegue
  - label: Tipo
    value: API REST para un negocio real en producción
stack: [Java 21, Spring Boot 3.5, Spring Security, JWT, JPA / Hibernate, PostgreSQL 16, Mercado Pago, Docker, Caddy, GitHub Actions]
learned:
  - En pagos, la fuente de verdad es la API del proveedor, no el mensaje que llega.
  - Un test contra H2 no detecta problemas propios de Postgres. Conviene reproducir el escenario real.
  - El hardware disponible cambia decisiones de build, memoria y monitoreo.
---

### Cómo se reserva y se paga

La reserva queda en espera hasta que Mercado Pago confirma el cobro. El backend no confía en el aviso: vuelve a preguntar el estado antes de confirmar.

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant A as BurGame API
  participant M as Mercado Pago
  C->>A: Elige servicio y horario
  A->>A: Verifica que el equipo esté libre
  A->>M: Crea el cobro de la seña
  A-->>C: Link de pago
  C->>M: Paga
  M-->>A: Aviso de pago
  A->>M: Consulta el estado real
  M-->>A: Aprobado
  A->>A: Confirma la reserva
  M-->>C: Vuelve al sitio
```

### Del anuncio a la reserva paga

Cada reserva guarda de qué campaña vino, así el negocio mide qué anuncios terminan en un pago.

```mermaid
flowchart LR
  AD[Anuncio en Meta Ads] --> PR[Página de promo]
  PR --> R[Reserva con origen de campaña]
  R --> PG{Pagó la seña?}
  PG -- Sí --> OK[Conversión]
  PG -- No --> AB[Abandono]
  OK --> MK[Reporte para marketing]
  AB --> MK
```
