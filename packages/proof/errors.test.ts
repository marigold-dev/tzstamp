import {
  FetchError,
  InvalidTezosNetworkError,
  MismatchedHashError,
  UnsupportedVersionError,
} from "./errors.ts";
import { assertEquals } from "./dev_deps.ts";

Deno.test({
  name: "Unsupported version error",
  fn() {
    const error = new UnsupportedVersionError(14, "message");
    assertEquals(error.toString(), "UnsupportedVersionError: message");
    assertEquals(error.version, 14);
  },
});

Deno.test({
  name: "Mismatched hash error",
  fn() {
    const error = new MismatchedHashError("message");
    assertEquals(error.toString(), "MismatchedHashError: message");
  },
});

Deno.test({
  name: "Invalid Tezos network error",
  fn() {
    const error = new InvalidTezosNetworkError("message");
    assertEquals(error.toString(), "InvalidTezosNetworkError: message");
  },
});

Deno.test({
  name: "Fetch error",
  fn() {
    const error = new FetchError(404, "message");
    assertEquals(error.toString(), "FetchError: message");
    assertEquals(error.status, 404);
  },
});
