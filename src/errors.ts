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
 * Mismatched timestamp error
 */
export class MismatchedTimestampError extends Error {
  name = "MismatchedTimestampError";
}

/**
 * Mismatched network error
 */
export class MismatchedNetworkError extends Error {
  name = "MismatchedNetworkError";
}

/**
 * Unsupported operation error
 */
export class UnsupportedOperationError extends Error {
  name = "UnsupportedOperationError";
}

/**
 * Unallowed operation error
 */
export class UnallowedOperationError extends Error {
  name = "UnallowedOperationError";
}

/**
 * Invalid Tezos network identifier error
 */
export class InvalidTezosNetworkError extends Error {
  name = "InvalidTezosNetworkError";
}
