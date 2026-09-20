import "server-only";
import { canonicalOrigin } from "../server/origin.mjs";

// Never derive trusted origins from client-controlled forwarding headers.
export function appOrigin() { return canonicalOrigin(); }
