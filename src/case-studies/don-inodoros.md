---
title: Don Inodoros POS
subtitle: Punto de venta y stock para un comercio con dos sucursales
teaser: Dos sucursales llevaban caja y stock a mano, y los faltantes aparecían tarde. Ahora cada sucursal controla su caja y su stock, los precios por cantidad se aplican solos y llegan avisos de stock bajo.
# Meta description for search results (keep it under ~155 characters)
description: 'Backend de un punto de venta con dos sucursales: caja con arqueo, stock por sucursal, precios por volumen y alertas de stock bajo. Java 21 y Spring Boot 4.'
summary: Un comercio de artículos de limpieza con dos sucursales llevaba ventas, caja y stock a mano. Los faltantes y las diferencias de caja aparecían tarde, y los precios por cantidad se calculaban a ojo. Construí el backend de un punto de venta donde cada sucursal maneja su caja y su stock, los precios por volumen se aplican solos y el dueño ve todo consolidado.
period: Jun 2026 — Jul 2026
image: don-inodoros.png
imageAlt: Pantalla de control de inventario del sistema Don Inodoros, con los datos del cliente desenfocados
stats:
  - value: "2"
    label: sucursales con caja y stock propios
  - value: "3"
    label: tramos de precio por producto
  - value: "2"
    label: roles con permisos por sucursal
  - value: "8"
    label: migraciones versionadas
problems:
  - title: Stock a ciegas
    text: Los faltantes se descubrían tarde, y no se sabía qué quedaba en cada sucursal.
  - title: Caja sin control
    text: Las diferencias de caja aparecían al cierre, sin forma de saber de dónde venían.
  - title: Precios por cantidad
    text: El mismo producto cuesta distinto por unidad, pack de 5 o pack de 20, y se calculaba a mano.
roleNote: El frontend lo desarrolló otra persona del equipo. Yo construí la API, el modelo de datos, las reglas de negocio y el despliegue.
solutions:
  - title: Venta en un solo paso
    text: Valida stock, aplica el precio, registra los pagos y descuenta el stock. Si algo falla, no se guarda nada.
  - title: Stock por sucursal con alertas
    text: Cada sucursal maneja su stock, y llega un aviso en tiempo real cuando un producto baja del mínimo.
  - title: Caja con arqueo
    text: Apertura y cierre por medio de pago. El sistema calcula lo esperado y marca cada diferencia.
  - title: Precios y combos automáticos
    text: El tramo de precio sale de la cantidad, y los combos descuentan el stock de cada componente.
decisions:
  - title: Dinero sin errores de redondeo
    text: Todo el cálculo monetario pasa por un único servicio con BigDecimal y reglas de redondeo fijas.
  - title: Permisos siempre actualizados
    text: Los permisos salen de la base en cada pedido, así un cambio de rol o una baja aplica al instante.
  - title: Java en un servidor chico
    text: Ajusté la memoria de la JVM y de los contenedores para que el sistema sea estable en un VPS con poca RAM.
meta:
  - label: Rol
    value: Backend, desde la API hasta el despliegue
  - label: Tipo
    value: Backend de punto de venta y administración
stack: [Java 21, Spring Boot 4, Spring Security, JWT, JPA / Hibernate, PostgreSQL 16, Flyway, Hibernate Envers, WebSocket, Docker, Caddy]
learned:
  - Modelar reglas de negocio con muchos casos borde y cubrirlas con tests antes de tocarlas.
  - Que la base sea la fuente de verdad de los permisos, no lo que viaja en el token.
  - Dimensionar una aplicación Java para un servidor chico, y medir antes de cambiar código.
---

### Qué pasa en cada venta

Toda la venta es una sola operación. Si falla cualquier paso, se deshace todo y no queda stock ni caja a medio registrar.

```mermaid
flowchart LR
  V([Nueva venta]) --> VAL
  subgraph VAL [Validaciones]
    direction TB
    A[Caja abierta] --> B[Stock suficiente] --> C[Precio según cantidad] --> D[Pagos = total]
  end
  VAL -- todo en orden --> OK[Guarda la venta, descuenta stock y registra la caja]
  VAL -- falla algo --> X[Se rechaza y no se guarda nada]
  OK -. stock bajo el mínimo .-> N[Aviso en tiempo real]
```
