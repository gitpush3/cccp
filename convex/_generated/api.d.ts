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
import type * as auth from "../auth.js";
import type * as contacts from "../contacts.js";
import type * as http from "../http.js";
import type * as importRegulations from "../importRegulations.js";
import type * as messages from "../messages.js";
import type * as queries from "../queries.js";
import type * as regulations from "../regulations.js";
import type * as router from "../router.js";
import type * as sampleData from "../sampleData.js";
import type * as search from "../search.js";
import type * as stripe from "../stripe.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  auth: typeof auth;
  contacts: typeof contacts;
  http: typeof http;
  importRegulations: typeof importRegulations;
  messages: typeof messages;
  queries: typeof queries;
  regulations: typeof regulations;
  router: typeof router;
  sampleData: typeof sampleData;
  search: typeof search;
  stripe: typeof stripe;
  users: typeof users;
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
