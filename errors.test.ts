import {
  FetchError,
  InvalidTemplateError,
  InvalidTezosNetworkError,
  MismatchedHashError,
  UnsupportedOperationError,
  UnsupportedVersionError,
} from "./errors.ts";
import { assertEquals } from "./dev_deps.ts";

Deno.test({
  name: "Invalid template error",
  fn() {
    const error = new InvalidTemplateError("message");
    assertEquals(error.toString(), "InvalidTemplateError: message");
  },
});

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
  name: "Unsupported operation error",
  fn() {
    const error = new UnsupportedOperationError("bogus", "message");
    assertEquals(error.toString(), "UnsupportedOperationError: message");
    assertEquals(error.operation, "bogus");
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
