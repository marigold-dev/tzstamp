import { Blake2b, concat, createHash, Hex } from "./deps.deno.ts";
import { isValid, Schema } from "./_validate.ts";

/**
 * Operation template
 */
export interface OperationTemplate {
  type: string;
  [_: string]: unknown;
}

/**
 * Invalid operation error
 */
export class InvalidOperationError extends Error {
  name = "InvalidOperationError";
}

/**
 * Unsupported operation error
 */
export class UnsupportedOperationError extends Error {
  name = "UnsupportedOperationError";
}

/**
 * Proof operation
 */
export abstract class Operation {
  /**
   * Represents the operation as a human friendly string.
   */
  abstract toString(): string;

  /**
   * Converts the operation to a JSON-serializable template.
   */
  abstract toJSON(): OperationTemplate;

  /**
   * Commits the operation to the input.
   */
  abstract commit(input: Uint8Array): Uint8Array;

  /**
   * [JTD] schema for an operation template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      type: { type: "string" },
    },
    additionalProperties: true,
  };

  /**
   * Creates subclassed operation from template object.
   * Throws if operation is not supported.
   *
   * ```ts
   * Operation.from({
   *   type: "sha256",
   * });
   * // Sha256Operation {}
   * ```
   *
   * @param template Template object
   */
  static from(template: unknown): Operation {
    if (!isValid<OperationTemplate>(Operation.schema, template)) {
      throw new InvalidOperationError("Invalid operation template");
    }
    switch (template.type) {
      case "append":
      case "prepend":
        return JoinOperation.from(template);
      case "blake2b":
        return Blake2bOperation.from(template);
      case "sha256":
        return Sha256Operation.from(template);
      default:
        throw new UnsupportedOperationError(
          `Unsupported operation "${template.type}"`,
        );
    }
  }
}

/**
 * Join operation template
 */
export interface JoinTemplate extends OperationTemplate {
  type: "append" | "prepend";
  data: string;
}

/**
 * Join data operation
 */
export class JoinOperation extends Operation {
  /**
   * Data to join
   */
  readonly data: Uint8Array;

  /**
   * Indicates if the data is to be prepended.
   * If true, the commit method will prepend the data to the input.
   * Otherwise, the commit method will append the data to the input.
   */
  readonly prepend: boolean;

  /**
   * @param data Data to join
   * @param prepend Prepend flag
   */
  constructor(data: Uint8Array, prepend = false) {
    super();
    this.data = data;
    this.prepend = prepend;
  }

  toString(): string {
    return (this.prepend ? "Prepend" : "Append") +
      " 0x" + Hex.stringify(this.data);
  }

  toJSON(): JoinTemplate {
    return {
      type: this.prepend ? "prepend" : "append",
      data: Hex.stringify(this.data),
    };
  }

  commit(input: Uint8Array): Uint8Array {
    return this.prepend ? concat(this.data, input) : concat(input, this.data);
  }

  /**
   * [JTD] schema for a join operation template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      type: { enum: ["append", "prepend"] },
      data: { type: "string" },
    },
  };

  /**
   * Creates subclassed operation from template object.
   * Throws if the template is invalid or the join operation is not supported.
   *
   * ```ts
   * JoinOperation.from({
   *   type: "prepend",
   *   data: "e789f123"
   * });
   * // JoinOperation { prepend: true, data: Uint8Array(4) }
   * ```
   *
   * @param template Template object
   */
  static from(template: unknown): JoinOperation {
    if (!isValid<JoinTemplate>(JoinOperation.schema, template)) {
      throw new InvalidOperationError("Invalid join operation");
    }
    const data = Hex.parse(template.data);
    switch (template.type) {
      case "append":
        return new JoinOperation(data);
      case "prepend":
        return new JoinOperation(data, true);
    }
  }
}

/**
 * BLAKE2b operation template
 */
export interface Blake2bTemplate extends OperationTemplate {
  type: "blake2b";
  length?: number;
  key?: string;
}

/**
 * [BLAKE2b] hashing operation
 *
 * [BLAKE2b]: https://www.blake2.net
 */
export class Blake2bOperation extends Operation {
  readonly length?: number;
  readonly key?: Uint8Array;

  /**
   * Throws a `RangeError` if either of the optional
   * `length` or `key` fields are incompatible with the
   * [BLAKE2b] hashing algorithm.
   *
   * @param length Digest length. Defaults to 32
   * @param key Hashing key
   *
   * [BLAKE2b]: https://www.blake2.net
   */
  constructor(length = 32, key?: Uint8Array) {
    super();
    if (
      length < Blake2b.MIN_DIGEST_BYTES || length > Blake2b.MAX_DIGEST_BYTES
    ) {
      throw new RangeError(
        `BLAKE2b digest length must be between ${Blake2b.MIN_DIGEST_BYTES}–${Blake2b.MAX_DIGEST_BYTES} bytes.`,
      );
    }
    if (
      key instanceof Uint8Array &&
      (key.length < Blake2b.MIN_KEY_BYTES || key.length > Blake2b.MAX_KEY_BYTES)
    ) {
      throw new RangeError(
        `BLAKE2b key length must be between ${Blake2b.MIN_KEY_BYTES}–${Blake2b.MAX_KEY_BYTES} bytes.`,
      );
    }
    this.length = length;
    this.key = key;
  }

  toString(): string {
    return `BLAKE2b hash, ${this.length}-byte digest` +
      (this.key ? ` with key 0x${Hex.stringify(this.key)}` : "");
  }

  toJSON(): Blake2bTemplate {
    const template: Blake2bTemplate = { type: "blake2b" };
    if (this.length != 32) {
      template.length = this.length;
    }
    if (this.key) {
      template.key = Hex.stringify(this.key);
    }
    return template;
  }

  commit(input: Uint8Array): Uint8Array {
    return new Blake2b(this.length, this.key)
      .update(input)
      .digest();
  }

  /**
   * [JTD] schema for a BLAKE2b operation template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      type: { enum: ["blake2b"] },
    },
    optionalProperties: {
      length: { type: "uint32" },
      key: { type: "string" },
    },
  };

  /**
   * Creates a BLAKE2b operation from template object.
   * Throws if the template is invalid.
   *
   * ```ts
   * Blake2bOperation.from({
   *   type: "blake2b",
   *   length: 64
   * });
   * // Blake2bOperation { length: 64 }
   * ```
   *
   * @param template Template object
   */
  static from(template: unknown): Blake2bOperation {
    if (!isValid<Blake2bTemplate>(Blake2bOperation.schema, template)) {
      throw new InvalidOperationError("Invalid BLAKE2b operation");
    }
    return new Blake2bOperation(
      template.length,
      template.key ? Hex.parse(template.key) : undefined,
    );
  }
}

/**
 * SHA-256 operation template
 */
export interface Sha256Template extends OperationTemplate {
  type: "sha256";
}

/**
 * SHA-256 hashing operation
 */
export class Sha256Operation extends Operation {
  toString(): string {
    return "SHA-256 hash";
  }

  toJSON(): OperationTemplate {
    return { type: "sha256" };
  }

  commit(input: Uint8Array): Uint8Array {
    const digest = createHash("sha256")
      .update(input)
      .digest();
    return new Uint8Array(digest);
  }

  /**
   * [JTD] schema for a SHA-256 operation template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      type: { enum: ["sha256"] },
    },
  };

  /**
   * Creates a SHA-256 operation from a template object.
   * Throws if the template is invalid.
   *
   * ```ts
   * Sha256Operation.from({
   *   type: "sha256",
   * });
   * // Sha256Operation {}
   * ```
   *
   * @param template Template object
   */
  static from(template: unknown): Sha256Operation {
    if (!isValid<Sha256Template>(Sha256Operation.schema, template)) {
      throw new InvalidOperationError("Invalid SHA-256 operation");
    }
    return new Sha256Operation();
  }
}
