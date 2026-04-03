# CASA – System Architecture

## Overview

This document defines the technical architecture for **Casa**, a Nigerian real estate marketplace designed to help users discover verified properties for rent, sale, and student accommodation.

The architecture focuses on scalability, security, and mobile-first performance. The system is designed to support thousands of listings, user accounts, property media uploads, and search functionality.

The platform will be built using a modern full-stack architecture powered by **Next.js, Supabase, PostgreSQL, and Cloudinary**.

---

# 1. Technology Stack

## Frontend

**Next.js**

Next.js will power the web application frontend.

Benefits:

* Fast page loading
* SEO friendly pages
* Server-side rendering
* Scalable architecture
* Mobile-first performance

---

## Backend

**Supabase**

Supabase will handle the backend infrastructure.

Capabilities:

* Authentication
* Database management
* API access
* Realtime functionality
* Row-level security

---

## Database

**PostgreSQL (via Supabase)**

PostgreSQL will store:

* users
* property listings
* saved properties
* reports
* reviews
* property images

---

## Media Storage

**Cloudinary (recommended)**

Used to store:

* property images
* property videos
* virtual tours

Benefits:

* fast global CDN
* automatic image optimization
* responsive image delivery

---

# 2. High Level System Architecture

```
User Browser
     ↓
Next.js Frontend
     ↓
Supabase API
     ↓
PostgreSQL Database
     ↓
Cloudinary Media Storage
```

Flow explanation:

1. Users access Casa through the web application.
2. The Next.js frontend handles UI and page rendering.
3. API requests are sent to Supabase.
4. Supabase interacts with the PostgreSQL database.
5. Property media files are stored and delivered through Cloudinary.

---

# 3. Core Application Routes

The platform will use the **Next.js App Router**.

```
/
Home page

/search
Property search results

/property/[id]
Individual property page

/list-property
Create new property listing

/login
User login

/signup
User registration

/dashboard
User dashboard

/dashboard/listings
User property listings

/dashboard/saved
Saved properties

/admin
Admin dashboard
```

---

# 4. Project Folder Structure

```
casa/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── property/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── list-property/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── listings/
│   │   ├── saved/
│   │   └── profile/
│   └── admin/
│       ├── page.tsx
│       ├── listings/
│       └── reports/
│
├── components/
│   ├── PropertyCard.tsx
│   ├── PropertyGallery.tsx
│   ├── SearchBar.tsx
│   ├── FilterPanel.tsx
│   ├── ContactAgent.tsx
│   ├── SavePropertyButton.tsx
│   └── Navbar.tsx
│
├── lib/
│   ├── supabaseClient.ts
│   ├── auth.ts
│   └── utils.ts
│
├── services/
│   ├── propertyService.ts
│   ├── userService.ts
│   ├── reportService.ts
│   └── uploadService.ts
│
├── hooks/
│   ├── useProperties.ts
│   ├── useAuth.ts
│   └── useSavedProperties.ts
│
├── types/
│   ├── property.ts
│   ├── user.ts
│   └── report.ts
│
├── public/
│   ├── images/
│   └── icons/
│
├── styles/
│   └── globals.css
│
├── CASA_PRD.md
├── CASA_ARCHITECTURE.md
├── README.md
└── package.json
```

---

# 5. Database Schema

## Users Table

```
users
```

Fields:

* id
* name
* email
* phone
* role (buyer, renter, agent, landlord, admin)
* verified
* created_at

---

## Properties Table

```
properties
```

Fields:

* id
* title
* description
* price
* property_type
* bedrooms
* bathrooms
* state
* city
* area
* street
* latitude
* longitude
* agent_id
* created_at
* status (pending, approved, rejected)

---

## Property Images Table

```
property_images
```

Fields:

* id
* property_id
* image_url
* created_at

---

## Saved Properties Table

```
saved_properties
```

Fields:

* id
* user_id
* property_id
* created_at

---

## Reports Table

```
reports
```

Fields:

* id
* property_id
* reported_by
* reason
* created_at

---

## Reviews Table

```
reviews
```

Fields:

* id
* agent_id
* user_id
* rating
* comment
* created_at

---

# 6. Property Listing Flow

```
Agent / Landlord
       ↓
Creates Property Listing
       ↓
Property Saved in Database
       ↓
Listing Status = Pending
       ↓
Admin Reviews Listing
       ↓
If Approved → Listing Visible
```

---

# 7. Property Search Flow

```
User opens search page
       ↓
Search query sent to database
       ↓
Filters applied
       ↓
Matching properties returned
       ↓
Displayed in property cards
```

---

# 8. Contact Agent Flow

```
User views property
       ↓
Clicks Contact Agent
       ↓
Options displayed:
Phone
WhatsApp
Schedule viewing
```

---

# 9. Fraud Reporting Flow

```
User reports listing
       ↓
Report saved in database
       ↓
Admin receives report
       ↓
Admin reviews listing
       ↓
Listing may be removed
```

---

# 10. Security

Security features include:

* Supabase authentication
* Role-based access control
* Admin-only listing approvals
* User identity verification
* Fraud reporting system

Future improvements may include AI-powered fraud detection.

---

# 11. Performance Optimization

Performance strategies:

* image optimization via Cloudinary
* lazy loading of images
* server-side rendering with Next.js
* CDN distribution for media

---

# 12. Scalability

The architecture supports scaling through:

* PostgreSQL database
* serverless backend infrastructure
* modular component architecture
* stateless frontend deployment

This ensures the platform can support thousands of listings and concurrent users.

---

# 13. Future Architecture Enhancements

Future improvements may include:

* AI-powered recommendation engine
* map-based property discovery
* mobile applications
* payment processing
* escrow system
* property analytics dashboards

---

# 14. Deployment

Recommended deployment stack:

Frontend hosting
**Vercel**

Backend infrastructure
**Supabase**

Media hosting
**Cloudinary**

This allows the platform to scale automatically while keeping operational complexity low.
