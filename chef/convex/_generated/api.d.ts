/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as agents from "../agents.js";
import type * as bookings from "../bookings.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as installments from "../installments.js";
import type * as lib_sendgrid from "../lib/sendgrid.js";
import type * as lib_stripe from "../lib/stripe.js";
import type * as payments from "../payments.js";
import type * as router from "../router.js";
import type * as travelers from "../travelers.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agents: typeof agents;
  bookings: typeof bookings;
  crons: typeof crons;
  http: typeof http;
  installments: typeof installments;
  "lib/sendgrid": typeof lib_sendgrid;
  "lib/stripe": typeof lib_stripe;
  payments: typeof payments;
  router: typeof router;
  travelers: typeof travelers;
  trips: typeof trips;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
