# GROWTH-UI-01 — Product Access Boundary V1

## Status

DESIGN CONTRACT — PRE-PRODUCTIVE AUTHORIZATION

This contract defines the separation between the commercial
Aura Growth product surface and the internal Aura Intelligence
administrative surface.

It does NOT authorize productive execution.

---

## 1. Product Principle

Aura Growth is the customer-facing commercial product.

Aura Intelligence is the internal intelligence engine and
administrative workspace.

A customer purchasing Aura Growth must not require access to
the Aura Intelligence administrative workspace.

---

## 2. Commercial Surface

The commercial Aura Growth surface consists of:

- AuraGrowthLogin
- GrowthStudioEntry
- Executive Overview
- Opportunities
- Campaigns
- Growth Intelligence
- Content & Execution
- Performance
- Growth Advisor
- Team & Users
- Notifications
- Settings

The customer-facing surface must not expose internal
administrative roles, permissions, modules or workspace
terminology.

---

## 3. Internal Surface

The internal administrative surface consists of:

- AuraIntelligenceLogin
- ExecutiveWorkspace
- Aura Intelligence administrative capabilities

This surface remains separate from the commercial Growth
experience.

---

## 4. Shared Authentication Infrastructure

Aura Growth and Aura Intelligence may use the same Firebase
Authentication infrastructure.

Shared authentication does NOT imply shared authorization.

Successful Firebase authentication proves identity only.

It does not by itself authorize:

- Aura Growth access
- Aura Intelligence access
- tenant membership
- administrative privileges
- productive execution

---

## 5. Authorization Requirement

Product access must ultimately be determined by trusted,
server-governed authorization data.

The target authorization model must support at minimum:

- user identity
- tenant identity
- company identity
- product entitlement
- role
- permissions
- account status

The commercial target product entitlement is:

AURA_GROWTH

Internal Aura Intelligence administration requires a separate
explicit entitlement or authority.

---

## 6. Prohibited Authorization Sources

The following MUST NOT be treated as security authority:

- email address matching
- hard-coded user email
- frontend-only role selection
- localStorage
- sessionStorage
- URL query parameters
- pathname alone
- VITE feature flags
- client-controlled product selection
- demo context
- visual navigation state

These mechanisms may influence presentation in controlled
development environments, but they do not grant authority.

---

## 7. Current Demo Context Limitation

The current App implementation constructs a demo
AuraIntelligenceContext containing:

- tenantId: aura_demo
- companyId: aura_demo
- role: SUPER_ADMIN
- profileId: super-admin
- aura_intelligence:read
- aura_intelligence:admin

This context is NOT an acceptable authority source for
commercial Aura Growth users.

Aura Growth integration must not inherit SUPER_ADMIN or
Aura Intelligence administrative permissions merely because
Firebase authentication succeeded.

---

## 8. Feature Flag Limitation

growth_studio.enabled is a feature exposure mechanism.

It is NOT:

- authentication
- authorization
- product entitlement
- tenant membership
- role authority

VITE_FEATURE_GROWTH_STUDIO must never become an authorization
mechanism.

---

## 9. Transitional Development Boundary

Until trusted product entitlement exists, development may
maintain two explicitly separated presentation surfaces:

COMMERCIAL:
AuraGrowthLogin -> GrowthStudioEntry

INTERNAL:
AuraIntelligenceLogin -> ExecutiveWorkspace

Any temporary development selector between these surfaces
must be clearly identified as non-authoritative and must not
grant additional backend permissions.

---

## 10. Target Product Boundary

The target authenticated decision is:

Authenticated Identity
        |
        v
Trusted Product Entitlement
        |
        +-- AURA_GROWTH
        |      |
        |      v
        |  GrowthStudioEntry
        |
        +-- AURA_INTELLIGENCE_INTERNAL
               |
               v
          ExecutiveWorkspace

No entitlement must fail closed.

---

## 11. Team & Users Dependency

The Aura Growth Team & Users capability must eventually
provide governed administration for:

- invitations
- memberships
- roles
- permissions
- account activation/deactivation
- tenant assignment
- product entitlement

This capability must integrate with trusted authorization
rather than frontend-only state.

---

## 12. Commercial Login Rule

AuraGrowthLogin is the commercial identity surface.

It may authenticate through existing Firebase Auth.

After authentication, access to Aura Growth must eventually
be validated against trusted AURA_GROWTH entitlement.

AuraGrowthLogin must not route a commercial user into the
Aura Intelligence administrative workspace by default.

---

## 13. Internal Login Rule

AuraIntelligenceLogin remains the internal administrative
identity surface.

Its existence and UI must not be exposed as the normal
commercial entry point for Aura Growth customers.

---

## 14. Security Posture

Current state:

AUTHENTICATION_INFRASTRUCTURE=FIREBASE_AUTH

COMMERCIAL_LOGIN=AURA_GROWTH

INTERNAL_LOGIN=AURA_INTELLIGENCE

TRUSTED_PRODUCT_ENTITLEMENT=NOT_IMPLEMENTED

COMMERCIAL_SUPER_ADMIN_INHERITANCE=PROHIBITED

FEATURE_FLAG_AS_AUTHORITY=PROHIBITED

PRODUCTIVE_AUTHORIZATION=NOT_GRANTED

FAIL_CLOSED_TARGET=YES

---

## 15. F2 Development Decision

F2 may implement and visually validate the commercial
Aura Growth surface.

F2 must not claim productive customer authorization until
trusted product entitlement and tenant-aware user authority
are implemented and certified.
