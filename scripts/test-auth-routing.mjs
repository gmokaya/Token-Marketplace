import assert from "node:assert/strict";
import { getAuthenticatedEntryDestination } from "../lib/api-client-react/src/auth-routing.ts";

const cases = [
  {
    name: "new account",
    state: { hasOnboarding: false, tier: "OFF_TAKER" },
    expected: "/onboarding",
  },
  {
    name: "completed producer",
    state: { hasOnboarding: true, tier: "PRODUCER" },
    expected: "/market",
  },
  {
    name: "completed trader",
    state: { hasOnboarding: true, tier: "OFF_TAKER" },
    expected: "/market",
  },
  {
    name: "completed broker",
    state: { hasOnboarding: true, tier: "ENABLER" },
    expected: "/market",
  },
  {
    name: "completed financier",
    state: { hasOnboarding: true, tier: "FINANCIER" },
    expected: "/market",
  },
  {
    name: "completed cooperative",
    state: { hasOnboarding: true, tier: "COOPERATIVE" },
    expected: "/market",
  },
  {
    name: "completed account with no tier",
    state: { hasOnboarding: true },
    expected: "/market",
  },
  {
    name: "completed admin",
    state: { hasOnboarding: true, tier: "ADMIN" },
    expected: "/dashboard",
  },
];

for (const testCase of cases) {
  assert.equal(
    getAuthenticatedEntryDestination(testCase.state),
    testCase.expected,
    testCase.name,
  );
}

assert.notEqual(
  getAuthenticatedEntryDestination({ hasOnboarding: true, tier: "OFF_TAKER" }),
  "/onboarding",
  "completed accounts must never enter onboarding",
);

console.log(`Auth routing regression passed (${cases.length + 1} assertions).`);