---
title: BurGame API
subtitle: Online bookings and payments for a gaming venue
teaser: A gaming venue with limited equipment lost bookings to double-booked slots and unpaid deposits. Now customers book and pay online with no clashes, and marketing knows which ads convert.
# Meta description for search results (keep it under ~155 characters)
description: 'Booking and payments backend for a gaming venue: no double bookings, Mercado Pago deposits and measurable campaigns. Java 21 and Spring Boot.'
summary: A gaming venue with a few machines (simulators, VR, screens) coordinated bookings by hand, with overlapping slots and deposits that were never collected. I built the backend that lets customers book and pay the deposit online, guarantees no machine is booked twice and shows the business which campaigns bring in customers.
period: Feb 2026 — Apr 2026
image: burgame.png
imageAlt: BurGame booking screen by service, with F1 simulators, VR and PlayStation screens
imageUrl: burgame.com
demos:
  - label: Visit site
    href: https://www.burgame.com
stats:
  - value: "9"
    label: bookable equipment types
  - value: "3"
    label: birthday slots per day
  - value: "63"
    label: automated tests
  - value: 1 GB
    label: of RAM in production
problems:
  - title: Overlapping slots
    text: With limited equipment, two bookings could land on the same simulator or screen at the same time.
  - title: Unpaid deposits
    text: Deposits were arranged by hand, and many bookings never happened.
  - title: Marketing in the dark
    text: Money went into ads without knowing which ones led to paid bookings.
roleNote: I owned the whole backend, from design to deployment. The site's frontend is a separate project.
solutions:
  - title: Guaranteed availability
    text: Before booking, the machine is checked to be free, and the best available one is assigned without using up those birthdays need.
  - title: Automatic online deposit
    text: The customer pays with Mercado Pago and the booking confirms itself once the payment clears.
  - title: Business dashboard
    text: Bookings, prices, services and birthday packages, with filters by date, status and customer.
  - title: Measurable campaigns
    text: Every booking records which ad it came from, and marketing checks conversions without setting up a CRM.
decisions:
  - title: Don't trust the payment notice
    text: When Mercado Pago reports a payment, the backend queries it again and decides with the official status.
  - title: Reproduce the bug before fixing it
    text: A database change could silently break production. I reproduced it with a test against the real schema, and it stayed as a safety net.
  - title: Designed for a small server
    text: Everything runs on 1 CPU and 1 GB, with healthchecks, automatic HTTPS and verified daily backups.
meta:
  - label: Role
    value: Full backend, from design to deployment
  - label: Type
    value: REST API for a real business in production
stack: [Java 21, Spring Boot 3.5, Spring Security, JWT, JPA / Hibernate, PostgreSQL 16, Mercado Pago, Docker, Caddy, GitHub Actions]
learned:
  - In payments, the source of truth is the provider's API, not the message that arrives.
  - A test against H2 won't catch Postgres-specific problems. It pays to reproduce the real scenario.
  - The available hardware changes build, memory and monitoring decisions.
---

### How booking and payment work

The booking waits until Mercado Pago confirms the charge. The backend doesn't trust the notice: it asks for the status again before confirming.

```mermaid
sequenceDiagram
  autonumber
  actor C as Customer
  participant A as BurGame API
  participant M as Mercado Pago
  C->>A: Picks a service and time
  A->>A: Checks the machine is free
  A->>M: Creates the deposit charge
  A-->>C: Payment link
  C->>M: Pays
  M-->>A: Payment notice
  A->>M: Queries the real status
  M-->>A: Approved
  A->>A: Confirms the booking
  M-->>C: Back to the site
```

### From ad to paid booking

Every booking stores which campaign it came from, so the business can measure which ads end in a payment.

```mermaid
flowchart LR
  AD[Meta Ads ad] --> PR[Promo page]
  PR --> R[Booking with campaign source]
  R --> PG{Deposit paid?}
  PG -- Yes --> OK[Conversion]
  PG -- No --> AB[Drop-off]
  OK --> MK[Report for marketing]
  AB --> MK
```
