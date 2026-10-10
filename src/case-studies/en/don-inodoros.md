---
title: Don Inodoros POS
subtitle: Point of sale and stock for a two-branch store
teaser: Two branches kept the till and stock by hand, and shortages showed up late. Now each branch runs its own till and stock, bulk prices apply on their own and low-stock alerts arrive in real time.
# Meta description for search results (keep it under ~155 characters)
description: 'Point-of-sale backend for a two-branch store: till reconciliation, per-branch stock, bulk pricing and low-stock alerts. Java 21 and Spring Boot 4.'
summary: A cleaning-supplies store with two branches tracked sales, the till and stock by hand. Shortages and till differences surfaced late, and bulk prices were worked out by eye. I built the backend of a point of sale where each branch runs its own till and stock, bulk pricing applies automatically and the owner sees everything in one place.
period: Jun 2026 — Jul 2026
image: don-inodoros.png
imageAlt: Inventory control screen of the Don Inodoros system, with the client's data blurred
stats:
  - value: "115+"
    label: sales in the first 2 months
  - value: "660+"
    label: stock movements recorded
  - value: "~700"
    label: products in the catalog
  - value: "2"
    label: branches with their own till and stock
problems:
  - title: Stock in the dark
    text: Shortages were found late, and nobody knew what was left at each branch.
  - title: Uncontrolled till
    text: Till differences appeared at closing time, with no way to tell where they came from.
  - title: Bulk pricing
    text: The same product costs differently per unit, 5-pack or 20-pack, and it was calculated by hand.
roleNote: Another team member built the frontend. I built the API, the data model, the business rules and the deployment.
solutions:
  - title: One-step sale
    text: It checks stock, applies the price, records the payments and deducts the stock. If anything fails, nothing is saved.
  - title: Per-branch stock with alerts
    text: Each branch manages its own stock, and a real-time alert fires when a product drops below its minimum.
  - title: Till reconciliation
    text: Opening and closing per payment method. The system computes the expected amount and flags every difference.
  - title: Automatic prices and bundles
    text: The price tier follows the quantity, and bundles deduct the stock of each component.
decisions:
  - title: Money without rounding errors
    text: Every monetary calculation goes through a single service with BigDecimal and fixed rounding rules.
  - title: Always up-to-date permissions
    text: Permissions are read from the database on every request, so a role change or a deactivation applies instantly.
  - title: Java on a small server
    text: I tuned JVM and container memory so the system runs reliably on a low-RAM VPS.
meta:
  - label: Role
    value: Backend, from the API to the deployment
  - label: Type
    value: Point-of-sale and admin backend
stack: [Java 21, Spring Boot 4, Spring Security, JWT, JPA / Hibernate, PostgreSQL 16, Flyway, Hibernate Envers, WebSocket, Docker, Caddy]
learned:
  - Modelling business rules with many edge cases and covering them with tests before touching them.
  - Making the database the source of truth for permissions, not whatever travels in the token.
  - Sizing a Java application for a small server, and measuring before changing code.
---

### What happens in every sale

The whole sale is a single operation. If any step fails, everything is rolled back and no stock or till entry is left half-recorded.

```mermaid
flowchart LR
  V([New sale]) --> VAL
  subgraph VAL [Checks]
    direction TB
    A[Till open] --> B[Enough stock] --> C[Price by quantity] --> D[Payments = total]
  end
  VAL -- all good --> OK[Saves the sale, deducts stock and records the till]
  VAL -- something fails --> X[Rejected, nothing is saved]
  OK -. stock below minimum .-> N[Real-time alert]
```
