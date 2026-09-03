export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter, customFetch } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
export {
  getAuthenticatedEntryDestination,
} from "./auth-routing";
export type {
  AuthenticatedEntryState,
} from "./auth-routing";
