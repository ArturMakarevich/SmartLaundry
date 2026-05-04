# SmartLaundry: market scan and product redesign

Date of research: 2026-04-30

## 1. Executive summary

The criticism of the current SmartLaundry concept is justified, but the core idea should not be thrown away.

The market shows two dominant patterns:

1. Most US and multifamily laundry products focus on `availability + payment + notifications + support`, not on a hard reservation queue.
2. Products that do support reservation or queueing usually also control the physical handoff to the machine through app activation, QR, NFC, Bluetooth, geofencing, or room-level access control.

The main implication is simple: a booking calendar alone is not enough. If SmartLaundry wants to solve conflict around shared washers, it needs an `execution layer`, not only a `time-slot layer`.

Your differentiator should stay, but be reframed:

- not "we parse manuals because it is interesting"
- but "we build a verified machine profile from manuals and use it to improve booking accuracy, program choice, finish-time prediction, and fairness"

## 2. What the current repository already does

Current implementation is a solid skeleton, but it is still a prototype:

- `backend/sl_territories/models.py` stores territories, zones, machines, wash programs, and bookings.
- `backend/sl_territories/views.py` supports territory access by code, booking creation, machine list fetch, and instruction-template upload.
- `backend/sl_territories/views.py` also parses PDF manuals into `parsed_programs`.
- `frontend/smartlaundry-ui/src/features/territories/UserTerritoryView.tsx` lets a user choose a washer, select a program, pick a start time, and create a booking.

The strongest existing idea is already present:

- manuals are uploaded
- programs are extracted
- program duration is used in booking

That is the correct seed. The problem is that it is attached to a weak operational model.

## 3. Why the current product logic gets criticized

### 3.1 Booking logic is still calendar-based, not real-world enforced

The frontend computes slot availability by overlapping time ranges and adding a buffer:

- [frontend/smartlaundry-ui/src/features/territories/UserTerritoryView.tsx](../frontend/smartlaundry-ui/src/features/territories/UserTerritoryView.tsx)

The backend validates only:

- machine present
- `end_time > start_time`
- no active overlap
- not in the past

See:

- [backend/sl_territories/serializers.py](../backend/sl_territories/serializers.py)

Missing pieces:

- no check-in window
- no no-show handling
- no auto-release
- no pickup window
- no overstay policy
- no physical claim of the machine

This is exactly why users can still "jump the queue" in practice.

### 3.2 Important rules live in the frontend, not in the backend

The frontend enforces:

- same-day booking only
- 10-minute step alignment
- max 2 active bookings per day
- no duplicate same-day booking on the same machine

See:

- [frontend/smartlaundry-ui/src/features/territories/UserTerritoryView.tsx](../frontend/smartlaundry-ui/src/features/territories/UserTerritoryView.tsx)

But the backend serializer does not enforce those rules server-side:

- [backend/sl_territories/serializers.py](../backend/sl_territories/serializers.py)

That means a user can bypass the UI and still create bookings through the API.

### 3.3 Access control is too weak for a shared-space product

Current authenticated users can hit booking and territory endpoints without clear server-side checks that they belong to that territory.

Relevant files:

- [backend/sl_territories/views.py](../backend/sl_territories/views.py)

For a shared laundry system this is risky, because fairness depends on trusted room membership.

### 3.4 The booking model does not separate cycle time from reservation policy

`Booking` currently stores only:

- `start_time`
- `end_time`
- `status`

See:

- [backend/sl_territories/models.py](../backend/sl_territories/models.py)

But operationally those are different things:

- actual cycle start
- actual cycle finish
- reservation hold window
- pickup grace period
- no-show expiry

Today the frontend sends `endSlot`, not the raw program end, when creating a booking:

- [frontend/smartlaundry-ui/src/features/territories/UserTerritoryView.tsx](../frontend/smartlaundry-ui/src/features/territories/UserTerritoryView.tsx)

That makes analytics and fairness rules harder later.

### 3.5 The manual parsing idea exists, but only at OCR level

The instruction parsing flow is interesting:

- upload manual
- parse text and tables
- extract programs and durations

See:

- [backend/sl_territories/views.py](../backend/sl_territories/views.py)
- [backend/sl_territories/models.py](../backend/sl_territories/models.py)

But today it is still raw because it lacks:

- confidence scores
- admin review flow
- versioned machine profile
- fallback when parsing is ambiguous
- user-facing recommendation logic based on fabric/load/urgency

### 3.6 Tests are effectively missing

- [backend/sl_territories/tests.py](../backend/sl_territories/tests.py)

For a fairness-sensitive queueing product, that is a serious gap.

## 4. Market scan: how similar products solve the problem

Research date: 2026-04-30.

### 4.1 WeWash

What it does:

- reservation of washers and dryers
- virtual queue when all machines are busy
- automatic assignment when a machine frees up
- start within reservation period
- pickup/collection period after cycle completion
- digital payments
- push notifications
- GPS-based laundry-room access in some flows

Why it matters:

- this is the clearest example of a real digital queue
- it does not stop at "calendar booking"; it manages reservation window, machine assignment, and collection window

Sources:

- https://we-wash.com/en/how-does-it-work/
- https://we-wash.com/en/support-for-laundry-room-users/
- https://we-wash.com/en/solutions/

### 4.2 CSC GO

What it does:

- real-time machine availability
- mobile payment
- QR/NFC machine start
- cycle status
- notifications
- refunds/support

Why it matters:

- US market leader logic is more operational than reservation-first
- the app reduces friction by connecting app identity to machine start
- this is a strong anti-abuse pattern even without a classic queue

Sources:

- https://www.getcscgo.com/
- https://marketingpro.cscsw.com/csc-go-app/
- https://www.cscsw.com/press-release/csc-serviceworks-installs-digital-laundry-technology-at-colleges-universities-nationwide/

### 4.3 WASH / WASH-Connect

What it does:

- mobile payment
- remote machine availability
- cycle notifications
- service and refund workflows
- connected room upgrades
- strong business framing around security and reduced vandalism/theft

Why it matters:

- another major US player that prioritizes visibility, support, and digital control over pure reservation
- shows that operators care about security and uptime as much as user convenience

Sources:

- https://www.wash.com/
- https://www.wash.com/wash-connect?trk=public_post_reshare-text
- https://www.wash.com/universities/
- https://www.wash.com/bundles/

### 4.4 PayRange

What it does:

- app-based payment
- live machine availability
- room connectivity through BluKey Connect

Why it matters:

- reinforces the pattern that real-time availability is a core market expectation
- again, the market defaults to connected execution, not just scheduling

Sources:

- https://payrange.com/products/blukey-connect/
- https://payrange.com/support/payrange-university/rooms/
- https://payrange.com/consumers/payrange-app/

### 4.5 ShinePay + ShineAccess

What it does:

- QR-based mobile payment
- cycle-finished notifications
- operator dashboard
- optional QR/mobile access control for doors and amenities

Why it matters:

- important signal for your anti-queue-jump problem
- room access and machine usage can be tied to the same identity layer

Sources:

- https://shinepay.co/
- https://shinepay.co/access
- https://shinepay.co/shinepay

### 4.6 Tumble

What it does:

- real-time availability
- cycle tracking
- cashless payment
- push notifications
- machine security
- predictive maintenance

Why it matters:

- pushes the category toward "smart laundry operations"
- public materials emphasize machine security as a product feature

Sources:

- https://www.tumble.to/
- https://page.tumble.to/hubfs/Tumble%20-%20Welcome%20to%20Smart%20Laundry.pdf

### 4.7 Washlava

What it does:

- reserve 1 to 3 washers
- pay by phone
- connected machine start
- machine availability
- completion notifications

Why it matters:

- useful example that reservation can work in the US, but usually together with machine control

Sources:

- https://appadvice.com/app/washlava-smart-laundry-app/1209867632
- https://apps.apple.com/us/app/washlava-laundry/id6452589939

### 4.8 WashWash

What it does:

- digital calendar for shared laundry rooms
- quiet hours
- max bookings per week
- PIN-based protection so others cannot modify slots
- no hardware required

Why it matters:

- this is close to your current model
- it proves that scheduling-only solutions exist
- but it also shows their ceiling: they optimize fairness on paper, not physical enforcement

Sources:

- https://washwash.app/en

## 5. Core market insight

The market does **not** support the idea that "a booking table is enough".

What the market actually suggests:

- if you do not control machine handoff, you mostly offer visibility, not hard fairness
- if you want real fairness, you need identity + claim window + start confirmation + expiry + pickup logic
- the strongest products connect digital identity to physical machine access

This is the central redesign principle for SmartLaundry.

## 6. Keep your idea, but reposition it

Your manual-recognition idea is good. It is just currently aimed too low.

### 6.1 Weak framing

"We scan manuals and extract programs."

This sounds like a technical demo.

### 6.2 Strong framing

"SmartLaundry creates a machine profile from the manual and uses it to drive fairer booking, better finish-time prediction, lower user error, and better program recommendations."

That is a product argument.

## 7. The product SmartLaundry should become

### 7.1 New product definition

SmartLaundry should be a `machine-aware queueing and access system for shared laundry rooms`.

Three layers:

1. `Access layer`
   Only authorized residents can join the queue and claim a machine.
2. `Queue execution layer`
   The system assigns, confirms, expires, and reassigns machine slots.
3. `Machine intelligence layer`
   Manual-derived machine knowledge improves cycle selection and duration prediction.

### 7.2 New core promise

Instead of:

- "book a washer"

Use:

- "join a fair, machine-aware queue and get a verified machine slot you can actually claim"

## 8. Anti-queue-jump design: what to implement

This is the most important part.

### 8.1 Mandatory claim flow

When a machine becomes available:

- system assigns it to the next eligible user
- user gets a short claim window, for example 10 minutes
- if the user does not check in, the slot expires automatically
- machine goes to the next user in queue

### 8.2 Check-in before start

Possible check-in methods:

- QR code on machine
- NFC tag
- Bluetooth proximity
- room geofence plus machine QR
- room door access event

Without this, you still do not know who physically took the machine.

### 8.3 Pickup grace period

After cycle completion:

- give a pickup window
- after that, machine status changes from `cooldown_reserved` to `releasable`
- repeated overstays reduce future queue priority or trigger soft penalties

### 8.4 No-show and abuse policy

Track:

- reservation expired without check-in
- user checked in but never started
- user frequently blocks peak times

Then apply:

- lower queue priority
- cap on future concurrent claims
- temporary lock during peak hours

### 8.5 Transparent state model

Users should see machine states like:

- `available`
- `assigned`
- `check-in pending`
- `running`
- `pickup window`
- `maintenance`
- `blocked`

This is much clearer than only `available / broken`.

## 9. How to preserve and improve the manual-recognition feature

This is where your idea can become unique.

### 9.1 Turn manuals into verified machine profiles

From each manual, extract and store:

- program name
- nominal duration
- supported temperature ranges
- spin options if available
- eco / quick / delicates / wool / bedding capability
- detergent or dosing notes if relevant
- load-size notes if stated

### 9.2 Add confidence and review

Do not let raw OCR go directly to user-facing scheduling.

Use:

- parsed values
- confidence per field
- admin review screen
- machine profile versioning
- "verified" flag

### 9.3 Use the machine profile in booking

At booking time ask the user:

- laundry type
- urgency or latest acceptable finish time
- delicate / eco / fast priority

Then SmartLaundry can:

- recommend the best machine
- recommend the best program
- estimate realistic finish time
- route the user into the correct queue

### 9.4 Why this is better than a plain program dropdown

A dropdown from a PDF is not yet product value.

Value appears when the manual-derived data changes the fairness or quality of booking decisions.

Examples:

- user wants the fastest available compatible cycle before 21:00
- user has delicates and should not be sent to a machine without an appropriate cycle
- user chooses eco mode and can accept a longer wait if that improves room utilization

## 10. Recommended SmartLaundry v2 MVP

### 10.1 MVP scope

Do not start with full hardware integration everywhere.

Start with:

- room membership by invitation/access code
- queue by machine type or program capability
- auto-assignment to next machine
- short claim window
- QR check-in on machine
- cycle start confirmation
- finish notification
- pickup grace period
- no-show logging
- verified manual-derived machine profiles

### 10.2 Minimal user flow

1. User joins a queue for a compatible washer.
2. System predicts wait time using current runs and verified program durations.
3. User gets assigned a specific machine.
4. User must reach the room and scan the machine QR within the claim window.
5. User confirms the recommended program or chooses another allowed one.
6. Session starts.
7. User gets completion and pickup reminders.
8. If pickup window expires, the room and admin dashboard reflect that.

### 10.3 If hardware integration is not available yet

Then use a staged approach:

- stage 1: QR check-in + manual start confirmation
- stage 2: room geofence or door access integration
- stage 3: NFC/Bluetooth/machine activation

That still gives a much stronger story than a plain booking calendar.

## 11. What should change in this codebase next

### 11.1 Backend priority changes

Add:

- server-side access validation for territory membership
- queue and session entities, not only `Booking`
- booking states like `assigned`, `checked_in`, `running`, `pickup_window`, `expired`, `no_show`
- machine claim token / QR token
- separate fields for `scheduled_start`, `actual_start`, `expected_end`, `pickup_deadline`
- selected `wash_program`
- policy rules enforced on the server

### 11.2 Frontend priority changes

Replace:

- manual start-time picking as the primary flow

With:

- join queue
- see ETA
- receive machine assignment
- scan to claim
- confirm start

Keep manual slot selection only as an advanced admin or low-tech fallback.

### 11.3 Instruction feature priority changes

Add:

- admin review UI for parsed manuals
- confidence labels
- ability to edit parsed programs before publishing
- machine capability tags

### 11.4 Quality priority changes

Add tests for:

- overlap and queue fairness
- no-show expiry
- territory access enforcement
- machine assignment rules
- instruction parsing fallback behavior

## 12. Final positioning statement

The best way to defend this project is not to say:

- "it is a laundry booking app with OCR"

The stronger version is:

- "SmartLaundry is a fair-access system for shared laundry rooms. It combines digital queue execution, anti-abuse check-in mechanics, and machine intelligence generated from washer manuals."

That keeps your original idea, but upgrades it from a prototype gimmick into a product argument.

## 13. Suggested next deliverables

1. Redesign the domain model around `queue ticket + machine session + machine profile`.
2. Move fairness rules from frontend-only logic into backend enforcement.
3. Introduce QR-based claim/check-in as the first anti-queue-jump mechanism.
4. Turn manual parsing into a verified machine-profile workflow.
5. Rewrite the user flow around `join queue -> get assigned -> claim -> run -> pick up`.
