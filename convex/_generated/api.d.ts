/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as bookingsActions from "../bookingsActions.js";
import type * as censusData from "../censusData.js";
import type * as chats from "../chats.js";
import type * as codeContent from "../codeContent.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as distressedData from "../distressedData.js";
import type * as formSubmissions from "../formSubmissions.js";
import type * as formSubmissionsActions from "../formSubmissionsActions.js";
import type * as http from "../http.js";
import type * as importRegulations from "../importRegulations.js";
import type * as marketData from "../marketData.js";
import type * as messages from "../messages.js";
import type * as neighborhoodData from "../neighborhoodData.js";
import type * as parcels from "../parcels.js";
import type * as queries from "../queries.js";
import type * as regulations from "../regulations.js";
import type * as router from "../router.js";
import type * as sampleData from "../sampleData.js";
import type * as search from "../search.js";
import type * as seedAllMunicipalities from "../seedAllMunicipalities.js";
import type * as seedContacts from "../seedContacts.js";
import type * as seedData from "../seedData.js";
import type * as seedInvestorData from "../seedInvestorData.js";
import type * as stripe from "../stripe.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  admin: typeof admin;
  auth: typeof auth;
  bookings: typeof bookings;
  bookingsActions: typeof bookingsActions;
  censusData: typeof censusData;
  chats: typeof chats;
  codeContent: typeof codeContent;
  contacts: typeof contacts;
  crons: typeof crons;
  distressedData: typeof distressedData;
  formSubmissions: typeof formSubmissions;
  formSubmissionsActions: typeof formSubmissionsActions;
  http: typeof http;
  importRegulations: typeof importRegulations;
  marketData: typeof marketData;
  messages: typeof messages;
  neighborhoodData: typeof neighborhoodData;
  parcels: typeof parcels;
  queries: typeof queries;
  regulations: typeof regulations;
  router: typeof router;
  sampleData: typeof sampleData;
  search: typeof search;
  seedAllMunicipalities: typeof seedAllMunicipalities;
  seedContacts: typeof seedContacts;
  seedData: typeof seedData;
  seedInvestorData: typeof seedInvestorData;
  stripe: typeof stripe;
  trips: typeof trips;
  users: typeof users;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
