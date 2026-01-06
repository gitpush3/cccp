Functional Specification (Revised)
Trip Package Booking with Travel Advisor Attribution, Deposit + Dynamic Monthly Payments
Stack: WordPress + ACF + Trips CPT + WooCommerce + Stripe + Fluent Forms Pro + WP Fusion (+ FluentCRM or other CRM)

1) Purpose
Enable customers and travel advisors to book trip packages from Trip (CPT) landing pages while supporting:
Advisor attribution capture (for commissions later)


Deposit at booking


Dynamic monthly payments based on purchase date, paid through a cutoff date


CRM automation via WP Fusion for post-booking workflows (tags, sequences, reminders, delinquency, advisor pipelines)



2) System of record
To prevent later trip edits from affecting historical bookings, define authoritative ownership:
Trip CPT + ACF = Source of truth for trip/package definitions at time of booking


WooCommerce Order Meta (and Subscription/Schedule Meta) = Source of truth for financial totals, deposit, cutoff, payment plan schedule


Fluent Forms Entry = Source of truth for intake/customer/advisor inputs (traveler details, advisor claim, acknowledgements)


CRM (via WP Fusion) = Source of truth for marketing automation state (tags/fields), not billing



3) Architectural decision (unchanged)
3.1 Trips stay CPT-driven
Trips remain a CPT: trip


LatitudeGo continues managing trips via ACF field groups


3.2 WooCommerce is the transaction engine
Use one hidden WooCommerce product: Trip Booking (virtual, hidden from catalog/search)


Booking adds this product with dynamic pricing + metadata.


3.3 Fluent Forms Pro adds an “intake layer”
Fluent Forms can be used to collect booking inputs before cart/checkout


Fluent Forms is not the authoritative pricing source; prices are calculated server-side.


3.4 WP Fusion is the automation/sync layer
WP Fusion must:
Sync WooCommerce customer + order events to CRM


Sync Fluent Forms entries to CRM


Apply tags and update custom fields based on:


trip/package selected


advisor attribution


payment plan status


key dates (departure, cutoff)


delinquency / payment failure



4) Roles and permissions
Admin
Creates/edits Trips (CPT)


Verifies advisor claims


Reviews orders/subscriptions


Runs commission reports


Travel Advisor (role: travel_advisor)
Books trips for customers


Attribution auto-applied


May be VIP (v2)


Customer
Books trips directly


May claim advisor relationship



5) Data model
5.1 Trip-level ACF fields (required additions)
Field
Key
Type
Notes
Deposit Amount
trip_deposit_amount
Number
Base deposit
Deposit Type
trip_deposit_type
Select
per_person, per_booking
Cutoff Date
trip_payment_cutoff_date
Date
Or computed by rule
Cutoff Source
trip_cutoff_rule_source
Select
default, manual
Payment Frequency
trip_payment_frequency
Select
monthly (v1 only)
Min Payment Count
trip_min_payment_count
Number
Default 1
Rounding Mode
trip_rounding_mode
Select
round_up_to_cent
Commission Eligible
trip_commission_eligible
True/False


Default Commission Rate
trip_default_commission_rate
Number
Optional

Optional: Global “Trip Settings” options page to define default cutoff rule (e.g., 30 days prior).

5.2 Package repeater fields (existing + interpretation)
Your package repeater currently contains:
trip_package_type_pricing (Select)


trip_package_price (Number) authoritative


trip_pay_over_time_price (Number) display-only / deprecated


trip_package_type (Text)


trip_package_destination (Text)


trip_package_departure (Text)


trip_package_departure_date (Date)


Rules:
trip_package_price is used for checkout calculations.


trip_pay_over_time_price must NOT be used as the billed monthly amount; monthly is computed at booking time.


Recommended additions:
trip_package_price_basis (per_person / per_booking)


trip_package_deposit_override (Number)


trip_package_cutoff_override (Date)


trip_package_enabled (True/False)



6) Frontend flows
6.1 Package selection UI
On Trip single page, each package card provides:
Total price


Deposit info


“Pay over time from $X/mo” (computed dynamically as-of today)


CTA: Book



6.2 Booking intake via Fluent Forms (recommended)
Clicking “Book” opens a Fluent Form (modal or dedicated page) with:
Required user-facing fields
Quantity / travelers (if applicable)


Customer email + phone


“Are you working with a travel advisor?” (Yes/No)


If Yes: advisor email OR advisor code OR advisor name + agency


Acknowledgements:


Terms / cancellation policy checkbox


Hidden fields (must be injected)
trip_id


package_index


package_price_snapshot (optional display-only; not trusted)


source_url


Submission behavior (server-side)
On submission:
Validate trip/package exists + enabled


Compute plan (deposit/cutoff/payment_count/monthly)


Store form entry ID (for linking)


Add hidden Woo “Trip Booking” product to cart with full metadata


Redirect to checkout


Important: Even if Fluent Forms shows price info, server recomputes price from CPT meta.

6.3 Checkout in WooCommerce
At checkout:
Show summary:


Trip name, package name


Deposit due today


Monthly schedule preview


Advisor status (if provided earlier)


Take payment (deposit)


If customer skipped advisor info in form, optionally show the advisor question here as fallback.

7) Advisor attribution
7.1 Attribution sources (priority order)
Logged-in user role travel_advisor → auto set advisor


URL parameter: ?advisor=CODE


Fluent Forms intake field (advisor email/code)


Checkout fallback field


7.2 Order meta fields (authoritative)
Store on the Woo Order (and subscription/schedule record):
trip_id


package_index


package_label


package_price_total


deposit_amount_total


cutoff_date


payment_count


monthly_amount


final_payment_amount


advisor_user_id (nullable)


advisor_code (nullable)


advisor_claimed_by_customer (bool)


advisor_verification_status (unverified, verified, rejected)


ff_entry_id (link to Fluent Forms submission)


7.3 Admin verification
Admin can set advisor verification in order admin:
If advisor email matches an existing advisor user, auto-mark verified (optional rule)


Otherwise default unverified



8) Payment plan calculation (v1 rules)
Inputs
Total price (from package)


Deposit amount (trip-level or package override)


Deposit type (per person vs per booking)


Cutoff date (trip-level or override; may be rule-derived)


Purchase date (today)


Frequency monthly


Output
Deposit due today


Payment count (number of monthly charges)


Monthly amount and final adjusted amount


Edge cases
If purchase date > cutoff date → block booking or force pay-in-full (configurable)


If calculated payment_count < min_payment_count → set to min_payment_count


Final payment adjusts for rounding to ensure totals match exactly



9) Billing implementation options
Option A (recommended v1): WooCommerce Subscriptions + Stripe
Deposit is charged at checkout (order)


Remaining balance becomes a finite subscription (monthly for payment_count cycles)


WP Fusion responsibilities
Apply tags on:


deposit paid


subscription created


each renewal success/failure


Update CRM fields:


next payment date


remaining balance (optional)


Option B (advanced): Stripe Subscription Schedules (API)
Deposit is a Stripe PaymentIntent


Create a Stripe Subscription Schedule for monthly invoices


Woo order mirrors Stripe state via webhooks


WP Fusion responsibilities
Tag based on order status + webhook-based status changes


Sync payment failures/delinquency tags



10) WP Fusion requirements (new)
10.1 CRM sync triggers
WP Fusion must be configured to sync on:
Fluent Forms submission (create/update contact)


Woo order created / completed


Subscription created / renewal paid / renewal failed / cancelled


Refund (if used)


10.2 CRM fields to map (recommended)
Create these custom fields in CRM and map via WP Fusion:
trip_name


trip_id


package_label


departure_date


cutoff_date


deposit_paid_amount


monthly_amount


payment_count


advisor_code


advisor_name (optional)


advisor_verification_status


booking_status (enum)


10.3 Tag taxonomy (recommended)
Apply tags like:
Trip/package
trip:december-30-2025


package:solo / package:couple


Advisor
advisor:claimed


advisor:verified


advisor:none


Billing
billing:deposit-paid


billing:on-plan


billing:paid-in-full


billing:delinquent


billing:cancelled


Dates
trip:departing:<month-year> (optional)


10.4 Automation use-cases (owned by CRM)
Deposit receipt sequence


Payment reminder sequence (X days before next payment)


Cutoff reminder sequence


Delinquent recovery sequence


Pre-trip info sequence (30/14/7 days prior)


(Automations live in CRM; WP Fusion just applies tags/fields.)

11) Admin & reporting
Admin order view must display
Trip and package details


Deposit collected


Schedule summary


Advisor attribution + verification status


Fluent Forms entry link


CRM contact sync status (optional display)


CSV export
Trip, package, departure date


Customer info


Advisor info + verification


Total, deposit, remaining, monthly, payment_count


Order/subscription status



12) v2: VIP advisor submits trip (updated with Fluent Forms + WP Fusion)
VIP Submission form (Fluent Forms)
VIP advisors submit trip data via Fluent Forms


Submission creates trip post as pending_review


File uploads stored in media library (flyer, PDF)


Admin notified


WP Fusion enhancements
Tag advisor: vip:submitted-trip


Start an “approval pipeline” automation


Notify advisor on approve/reject via CRM sequences



13) Acceptance criteria
Trips remain CPT-driven; no manual per-trip Woo products required.


Booking intake form captures customer + advisor claim and creates a Woo checkout session.


Checkout charges deposit today and creates the recurring plan (Option A or B).


Order meta contains immutable plan snapshot (deposit/cutoff/payment_count/monthly).


WP Fusion syncs contact + applies tags and updates fields at each lifecycle event.


Admin can report by advisor and reconcile commissions.



14) Implementation notes for developer (practical)
Do not trust any price values posted from Fluent Forms.


Cart item meta must include a complete snapshot, copied to order item meta at checkout.


If using Woo Subscriptions:


create subscription programmatically on order completion


ensure the subscription total matches the calculated monthly


WP Fusion: implement consistent tag schema; avoid tag explosion beyond what’s useful.


End-to-End Booking Walkthrough
1) Visitor lands on a Trip page (Trips CPT)
The user visits a Trip page (example: a December 30, 2025 trip).
On this page they see:
Trip overview (hero image, itinerary, highlights, etc.)


A list of Packages (from the ACF repeater), such as:


Solo Package


Couple Package


Private Flight Only


Each package shows:


Total price


Deposit required


“Pay over time from $X/month”
 (calculated live based on today’s date and the trip’s cutoff date)


Book button


👉 At this point, no WooCommerce products exist yet. This is still purely CPT content.

2) User clicks “Book” on a package
When the user clicks Book on a specific package:
What happens technically
The site captures:


trip_id


package_index (which repeater row)


The user is taken to a Booking Intake Form (Fluent Forms), either:


in a modal, or


on a dedicated booking page



3) Booking Intake Form (Fluent Forms)
This step is about collecting intent and context, not payment.
What the user fills out
Email address (required)


Phone number (optional, but recommended)


Number of travelers (if applicable)


Advisor question:


 “Are you working with a travel advisor?”



No


Yes → advisor email, code, or name + agency


Required checkboxes:


Terms & conditions


Cancellation / refund policy acknowledgement


What’s hidden in the form
Trip ID


Package index


Source URL


⚠️ Any prices shown here are informational only.
 They are never trusted for billing.

4) Form submission → server-side calculation
Once the form is submitted:
The server does the following
Loads the Trip CPT and selected package


Validates:


Trip exists and is enabled


Package exists and is enabled


Determines pricing inputs:


Package total price


Deposit amount (trip-level or package override)


Deposit type (per person vs per booking)


Cutoff date (trip-level or override)


Calculates the payment plan:


Deposit due today


Remaining balance


Number of monthly payments (based on today vs cutoff)


Monthly amount (rounded per rules)


Final payment adjustment if needed


Stores a snapshot of all of this data (this snapshot is important)



5) Add booking to WooCommerce cart
Now WooCommerce comes into play.
What gets added to cart
A single hidden WooCommerce product called something like:


 “Trip Booking”



Cart item metadata includes
Trip ID + Trip name


Package name


Total price


Deposit amount (today’s charge)


Cutoff date


Number of monthly payments


Monthly payment amount


Advisor attribution info (if provided)


Fluent Forms entry ID


👉 The cart price is set to deposit amount only.

6) User is redirected to WooCommerce checkout
The user now sees a normal WooCommerce checkout page.
What they see
Order summary:


Trip name


Package selected


Deposit due today


A preview of the payment plan (e.g. “6 monthly payments of $100”)


If advisor info was supplied:


“Travel Advisor: John Smith (Unverified)”
 (or Verified if auto-matched)


What they do
Enter billing details


Enter credit card (Stripe)


Submit payment



7) Deposit is charged (Stripe)
At checkout:
Stripe charges only the deposit


WooCommerce creates an Order in “processing” or “completed” state


The order now becomes the financial system of record



8) Recurring payment plan is created
Depending on implementation choice:
Option A: WooCommerce Subscriptions (most common v1)
A subscription is created automatically:


Monthly amount = calculated value


Billing starts next billing cycle


Length = calculated payment count


Stripe stores the payment method for future charges


Option B: Stripe Subscription Schedule
Stripe:


Saves payment method


Creates a subscription schedule with fixed iterations


WooCommerce stores a mirrored record for reporting


Either way:
The user does not have to come back to pay monthly


Payments are automatic until cutoff is reached



9) WP Fusion + CRM automation kicks in
Once the order and/or subscription is created:
WP Fusion actions
Syncs the customer to the CRM


Applies tags such as:


trip:december-30-2025


package:solo


billing:deposit-paid


advisor:claimed or advisor:none


Updates CRM fields:


Departure date


Cutoff date


Monthly amount


Payment count


CRM automations may now run
Deposit receipt email


Payment reminder sequences


Cutoff reminders


Pre-trip travel info


Advisor notification workflows



10) Admin review & advisor verification (if needed)
In the WordPress admin:
Admin views the WooCommerce order


Sees:


Trip/package details


Payment plan snapshot


Advisor claim status


If advisor was claimed:


Admin verifies or rejects the claim


Verification status updates


WP Fusion updates CRM tags accordingly



11) Monthly payments occur automatically
Each month:
Stripe attempts the scheduled payment


On success:


Subscription remains active


WP Fusion applies billing:payment-success


On failure:


Stripe retries per rules


WP Fusion applies billing:delinquent


CRM can trigger recovery emails



12) Final payment & completion
When the final payment is made:
Subscription ends (or schedule completes)


Order is effectively “Paid in Full”


WP Fusion applies:


billing:paid-in-full


Customer continues receiving trip-related communications



13) Day-of-trip and beyond
Trip departs


Advisor commissions can now be reconciled using:


Order totals


Advisor attribution


CRM tags/fields


No dependency on CPT data changing later



Summary (one sentence)
Trips define what can be booked, Fluent Forms captures intent, WooCommerce + Stripe handle money, and WP Fusion orchestrates everything that happens before and after the payment.
