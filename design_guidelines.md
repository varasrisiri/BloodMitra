# Smart Blood Donation Platform - Design Guidelines

## Design Approach

**Selected Framework:** Medical UI Design System combining Material Design's structured components with healthcare-specific clarity standards. This platform prioritizes **life-critical information delivery** where clarity, speed, and accessibility are non-negotiable.

**Key Principle:** Every element must communicate status and enable action immediately. No decorative complexity that impedes urgent decision-making.

---

## Core Design Elements

### A. Typography

**Font Family:**
- Primary: Inter (Google Fonts) - exceptional readability for data-dense interfaces
- Headings: 600-700 weight
- Body: 400-500 weight
- Data/Numbers: 500-600 weight (tabular figures)

**Hierarchy:**
- Page Titles: text-3xl md:text-4xl font-semibold
- Section Headers: text-xl md:text-2xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base
- Labels/Meta: text-sm
- Blood Group Displays: text-2xl font-bold (high visibility)

### B. Layout System

**Spacing Units:** Use Tailwind units of **4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-6 or p-8
- Section spacing: gap-8 or gap-12
- Card spacing: space-y-6
- Form fields: space-y-4

**Grid System:**
- Dashboard widgets: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: full-width with responsive scroll
- Forms: max-w-2xl centered layouts

### C. Component Library

**Status Indicators:**
- Available Badge: Solid green pill with white text
- Unavailable Badge: Gray outlined pill
- Emergency Badge: Pulsing red background with white text
- Request Status: Color-coded chips (Pending: yellow, Accepted: blue, Completed: green, Cancelled: red)

**Cards:**
- Clean white backgrounds with subtle shadow (shadow-sm)
- Rounded corners (rounded-lg)
- Border on hover for interactive cards
- Clear visual separation between card sections using dividers

**Blood Group Display:**
- Large, bold typography in circular badges
- High contrast (dark text on light background)
- Prominent placement in donor/receiver cards

**Dashboards:**
- Sidebar navigation for hospital admin (fixed left, collapsible on mobile)
- Tab-based navigation for user dashboard (horizontal tabs)
- Sticky action buttons for critical functions (Create Request, Toggle Availability)

**Forms:**
- Single column on mobile, smart two-column on desktop where logical
- Large touch targets (min 44px height for inputs/buttons)
- Clear field labels above inputs
- Inline validation with icon indicators
- Required field asterisks in red

**Tables (Hospital Dashboard):**
- Sticky headers on scroll
- Alternating row backgrounds for scanability
- Inline action buttons (icon-only with tooltips)
- Search bar fixed above table
- Filters as horizontal pill toggles

**Data Visualization:**
- Live stats counter: Large numbers with subtle count-up animation
- Blood inventory: Horizontal bar charts showing stock levels
- Low stock warnings: Amber/red color coding

### D. Animations

**Minimal and purposeful only:**
- Fade-in for dashboard data loads (200ms)
- Subtle scale on card hover (scale-105)
- Smooth transitions for availability toggle (300ms)
- No scroll animations or parallax effects

---

## Page-Specific Guidelines

### Home Page

**Structure (5 key sections):**
1. **Hero Section (80vh):** Full-width impactful medical imagery showing blood donation in action. White text overlaid on darkened image backdrop. Primary CTA buttons with blurred backgrounds. Large heading communicating urgent value proposition.

2. **How It Works:** Three-column grid with numbered steps. Icon → Heading → Description format. Clean white background.

3. **Live Statistics Panel:** Four-column counter grid showing Total Donors, Active Requests, Blood Units Donated, Lives Saved. Large numbers with descriptive labels beneath.

4. **Dual Role Explanation:** Two-column section (Donor side | Receiver side) with feature lists and visual distinction.

5. **Emergency Contact Footer:** Red background banner with white text showing 24/7 helpline. Full footer with links below.

**Multi-column usage:** Hero (centered single), How It Works (3-col), Stats (4-col), Dual Role (2-col)

### User Dashboard

**Layout:** Top profile card with availability toggle prominent. Below: tabbed interface switching between Search Donors | My Requests | Donation History.

**Search Results:** Grid of donor cards (2-col on tablet, 3-col desktop) with blood group badge, location, availability dot indicator.

### Hospital Dashboard

**Layout:** Left sidebar navigation. Main area contains statistics overview cards at top, then data table below. Create User button fixed to bottom-right as FAB.

**Inventory Section:** Grid of 8 blood group cards showing current units. Visual fill indicators. Sort by stock level.

---

## Images

**Hero Image:** Professional stock photo showing diverse people donating blood in modern medical facility. Warm, hopeful tone. High-quality, optimized for web. Image should be darkened (overlay: bg-black/40) for text legibility.

**No other images required** - focus on data clarity through typography and iconography.

---

## Accessibility

- WCAG AA minimum contrast ratios
- All interactive elements keyboard navigable
- Screen reader labels on all icon buttons
- Focus indicators visible and high-contrast
- Form validation announcing errors to screen readers
- Emergency status changes announced via aria-live regions