---
title: Pasta Fiorella
subtitle: Online ordering platform with delivery
teaser: A pasta maker took orders through messages, with no built-in payments and no single place to organize them. Now it sells online, with automatic payment and shipping, and runs everything from a dashboard.
# Meta description for search results (keep it under ~155 characters)
description: 'Online ordering backend for a pasta maker: Mercado Pago payments, distance-based shipping and a business dashboard. Spring Boot and PostgreSQL.'
summary: An artisanal pasta maker took orders through messages and third-party apps, with no built-in payments and no single place to see what had to be prepared. I built the backend of its own platform, where customers order and pay online, shipping is calculated automatically and the business organizes everything from a dashboard.
period: Mar 2025 — Aug 2025
image: pasta-fiorella.png
imageAlt: 'Home of the Pasta Fiorella online store: logo, opening hours and product search'
imageUrl: tienda-dun-six.vercel.app
demos:
  - label: Store demo
    href: https://tienda-dun-six.vercel.app/
  - label: Dashboard demo
    href: https://panel-admin-opal-xi.vercel.app/
demoNote: 'Demo with fictitious data and simulated payments. Dashboard: user demo, password demo1234.'
stats:
  - value: "3"
    label: connected applications
  - value: "6"
    label: states per order
  - value: "13"
    label: contract tests
  - value: "0"
    label: frontend changes for the demo
problems:
  - title: Scattered orders
    text: They came through messages and third-party apps, with no single place to see what had to be prepared.
  - title: Manual payments
    text: There was no online payment, and confirming which order was paid meant checking by hand.
  - title: Shipping by eye
    text: The shipping cost was worked out case by case depending on where the customer lived.
roleNote: Someone else built the store and the dashboard. I built the backend that powers them, the Mercado Pago integration and the demo's mock API.
solutions:
  - title: Order and payment in one step
    text: The order is created and paid with Mercado Pago, and confirms itself once the payment clears.
  - title: Automatic shipping
    text: The cost comes from the real distance to the customer, with a price per distance band.
  - title: A dashboard for daily work
    text: Products, orders and statuses per branch, with an alarm when a paid order comes in.
  - title: Serverless demo
    text: A mock API identical to the real one shows the whole system without paying for infrastructure.
decisions:
  - title: The provider confirms the payment
    text: The status doesn't depend on the customer returning to the page. The webhook queries the payment from Mercado Pago and only then confirms the order.
  - title: Prices are calculated on the server
    text: Subtotals and the total come from the stored products, so the customer never decides how much they pay.
  - title: Same contract, zero changes
    text: The mock replicates the real API's endpoints, pagination and formats. For the demo, only one environment variable changes.
meta:
  - label: Role
    value: Backend, Mercado Pago integration and mock API
  - label: Type
    value: 3-application platform + mock API
stack: [Java 17, Spring Boot 3, Spring Data JPA, MapStruct, PostgreSQL, Mercado Pago, OpenRouteService, Cloudinary, Docker, json-server]
learned:
  - Integrating payments with webhooks and handling every possible payment state.
  - Keeping a stable contract between frontend and backend, to the point of being able to swap the backend for a mock.
  - Preparing a real project to go public, cleaning out sensitive data and credentials.
---

### How the pieces connect

The store and the dashboard talk to the same API. The API is the only one that knows the prices, talks to Mercado Pago and calculates shipping.

```mermaid
flowchart LR
  C([Customer]) --> T[Online store]
  N([Business]) --> P[Admin dashboard]
  T --> API[Spring Boot API]
  P --> API
  API --> DB[(PostgreSQL)]
  API <--> MP[Mercado Pago]
  API --> ORS[OpenRouteService]
  API --> CL[Cloudinary]
```

### The life of an order

An order starts out waiting for payment, and only reaches the kitchen once Mercado Pago confirms it was charged.

```mermaid
stateDiagram-v2
  direction LR
  state "Awaiting payment" as PendientePago
  state "Queued" as Pendiente
  state "In preparation" as Preparacion
  state "Rejected" as Rechazado
  state "Delivered" as Entregado
  state "Cancelled" as Cancelado
  [*] --> PendientePago: the customer confirms
  PendientePago --> Pendiente: payment approved
  PendientePago --> Rechazado: payment rejected
  Pendiente --> Preparacion: the shop takes it
  Preparacion --> Entregado
  Pendiente --> Cancelado
  Preparacion --> Cancelado
  Entregado --> [*]
```
