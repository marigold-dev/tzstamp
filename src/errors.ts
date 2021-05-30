/**
 * Invalid template error
 */
export class InvalidTemplateError extends Error {
  name = "InvalidProofError";
}

/**
 * Unsupported proof version error
 */
export class UnsupportedVersionError extends Error {
  name = "UnsupportedVersionError";
}

/**
 * Mismatched hash error
 */
export class MismatchedHashError extends Error {
  name = "MismatchedHashError";
}

/**
 * Unsupported operation error
 */
export class UnsupportedOperationError extends Error {
  name = "UnsupportedOperationError";
}

/**
 * Invalid Tezos network identifier error
 */
export class InvalidTezosNetworkError extends Error {
  name = "InvalidTezosNetworkError";
}

/**
 * Fetch error
 */
export class FetchError extends Error {
  name = "FetchError";

  /**
   * HTTP status code
   */
  status: number;

  /**
   * @param status HTTP status code
   * @param message Optional error message
   */
  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
  }
}
