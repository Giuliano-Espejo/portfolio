---
title: Pasta Fiorella
subtitle: Plataforma de pedidos online con delivery
teaser: Una fábrica de pastas recibía pedidos por mensajes, sin cobro integrado ni un lugar único para organizarlos. Ahora vende online, con pago y envío automáticos, y gestiona todo desde un panel.
summary: Una fábrica de pastas artesanales recibía pedidos por mensajes y apps de terceros, sin cobro integrado ni un lugar único para ver qué preparar. Construí el backend de una plataforma propia donde el cliente pide y paga online, el envío se calcula solo y el negocio organiza todo desde un panel.
period: Mar 2025 — Ago 2025
image: pasta-fiorella.png
imageAlt: 'Home de la tienda online de Pasta Fiorella: logo, horario de atención y buscador de productos'
imageUrl: tienda-dun-six.vercel.app
demos:
  - label: Tienda demo
    href: https://tienda-dun-six.vercel.app/
  - label: Dashboard demo
    href: https://panel-admin-opal-xi.vercel.app/
demoNote: 'Demo con datos ficticios y pago simulado. Panel: usuario demo, contraseña demo1234.'
stats:
  - value: "3"
    label: aplicaciones conectadas
  - value: "6"
    label: estados por pedido
  - value: "13"
    label: tests de contrato
  - value: "0"
    label: cambios al front para la demo
problems:
  - title: Pedidos dispersos
    text: Llegaban por mensajes y apps de terceros, sin un lugar único para ver qué había que preparar.
  - title: Cobro manual
    text: No había pago online, y confirmar qué pedido estaba pagado dependía de revisar a mano.
  - title: Envío a ojo
    text: El costo de envío se calculaba caso por caso según dónde vivía el cliente.
roleNote: La tienda y el panel los desarrolló otra persona. Yo construí el backend que los hace funcionar, la integración con Mercado Pago y la API mock de la demo.
solutions:
  - title: Pedido y pago en un paso
    text: El pedido se crea y se paga con Mercado Pago, y se confirma solo cuando el pago se acredita.
  - title: Envío automático
    text: El costo sale de la distancia real hasta el cliente, con una tarifa por tramo.
  - title: Panel para el día a día
    text: Productos, pedidos y estados por sucursal, con una alarma cuando entra un pedido pagado.
  - title: Demo sin servidor
    text: Una API mock idéntica a la real permite mostrar el sistema completo sin pagar infraestructura.
decisions:
  - title: El pago lo confirma el proveedor
    text: El estado no depende de que el cliente vuelva a la página. El webhook consulta el pago a Mercado Pago y recién ahí confirma el pedido.
  - title: Los precios se calculan en el servidor
    text: Subtotales y total salen de los productos guardados, así el cliente nunca decide cuánto paga.
  - title: Mismo contrato, cero cambios
    text: El mock replica endpoints, paginación y formatos de la API real. Para la demo solo cambia una variable de entorno.
meta:
  - label: Rol
    value: Backend, integración con Mercado Pago y API mock
  - label: Tipo
    value: Plataforma de 3 aplicaciones + API mock
stack: [Java 17, Spring Boot 3, Spring Data JPA, MapStruct, PostgreSQL, Mercado Pago, OpenRouteService, Cloudinary, Docker, json-server]
learned:
  - Integrar pagos con webhooks y manejar todos los estados posibles de un pago.
  - Mantener un contrato estable entre frontend y backend, al punto de poder reemplazar el backend por un mock.
  - Preparar un proyecto real para hacerlo público, limpiando datos sensibles y credenciales.
---

### Cómo se conectan las piezas

La tienda y el panel hablan con la misma API. La API es la única que conoce los precios, habla con Mercado Pago y calcula el envío.

```mermaid
flowchart LR
  C([Cliente]) --> T[Tienda online]
  N([Negocio]) --> P[Panel de administración]
  T --> API[API Spring Boot]
  P --> API
  API --> DB[(PostgreSQL)]
  API <--> MP[Mercado Pago]
  API --> ORS[OpenRouteService]
  API --> CL[Cloudinary]
```

### La vida de un pedido

Un pedido nace esperando el pago, y solo pasa a la cocina cuando Mercado Pago confirma que se cobró.

```mermaid
stateDiagram-v2
  direction LR
  state "Esperando pago" as PendientePago
  state "En cola" as Pendiente
  state "En preparación" as Preparacion
  [*] --> PendientePago: el cliente confirma
  PendientePago --> Pendiente: pago aprobado
  PendientePago --> Rechazado: pago rechazado
  Pendiente --> Preparacion: el local lo toma
  Preparacion --> Entregado
  Pendiente --> Cancelado
  Preparacion --> Cancelado
  Entregado --> [*]
```
