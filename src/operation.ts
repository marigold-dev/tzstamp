import { Blake2b, concat, createHash, Hex } from "./deps.deno.ts";
import { isValid, Schema } from "./_validate.ts";
import { InvalidTemplateError, UnsupportedOperationError } from "./errors.ts";

/**
 * Operation template
 */
export interface OperationTemplate {
  type: string;
  [_: string]: unknown;
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
   * Creates a subclassed operation from a template object.
   * Throws `InvalidTemplateError` if the template is invalid.
   * Throws `UnsupportedOperationError` if operation is not supported.
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
      throw new InvalidTemplateError("Invalid operation template");
    }
    switch (template.type) {
      case "join":
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
  type: "join";
  prepend?: string;
  append?: string;
}

/**
 * Join operation constructor options
 */
export interface JoinOptions {
  prepend?: Uint8Array;
  append?: Uint8Array;
}

/**
 * Join data operation
 */
export class JoinOperation extends Operation {
  /**
   * Data to prepend
   */
  readonly prepend?: Uint8Array;

  /**
   * Data to append
   */
  readonly append?: Uint8Array;

  /**
   * @param data Data to join
   * @param prepend Prepend flag
   */
  constructor({ prepend, append }: JoinOptions) {
    super();
    this.prepend = prepend;
    this.append = append;
  }

  toString(): string {
    const prependString = this.prepend
      ? `Prepend 0x${Hex.stringify(this.prepend)}`
      : "";
    const conjunction = this.prepend && this.append ? ", and " : "";
    const appendString = this.append
      ? `Append 0x${Hex.stringify(this.append)}`
      : "";
    return prependString + conjunction + appendString;
  }

  toJSON(): JoinTemplate {
    const template: JoinTemplate = { type: "join" };
    if (this.prepend) {
      template.prepend = Hex.stringify(this.prepend);
    }
    if (this.append) {
      template.append = Hex.stringify(this.append);
    }
    return template;
  }

  commit(input: Uint8Array): Uint8Array {
    return concat(
      this.prepend ?? new Uint8Array(),
      input,
      this.append ?? new Uint8Array(),
    );
  }

  /**
   * [JTD] schema for a join operation template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      type: { enum: ["join"] },
    },
    optionalProperties: {
      prepend: { type: "string" },
      append: { type: "string" },
    },
  };

  /**
   * Creates a join operation from a template object.
   * Throws `InvalidTemplateError` if the template is invalid.
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
      throw new InvalidTemplateError("Invalid join operation template");
    }
    const prepend = template.prepend ? Hex.parse(template.prepend) : undefined;
    const append = template.append ? Hex.parse(template.append) : undefined;
    return new JoinOperation({ prepend, append });
  }
}

/**
 * BLAKE2b hash operation template
 */
export interface Blake2bTemplate extends OperationTemplate {
  type: "blake2b";
  length?: number;
  key?: string;
}

/**
 * [BLAKE2b] hash operation
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
   * Creates a BLAKE2b hash operation from a template object.
   * Throws `InvalidTemplateError` if the template is invalid.
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
      throw new InvalidTemplateError("Invalid BLAKE2b operation template");
    }
    return new Blake2bOperation(
      template.length,
      template.key ? Hex.parse(template.key) : undefined,
    );
  }
}

/**
 * SHA-256 hash operation template
 */
export interface Sha256Template extends OperationTemplate {
  type: "sha256";
}

/**
 * SHA-256 hash operation
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
   * [JTD] schema for a SHA-256 hash operation template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      type: { enum: ["sha256"] },
    },
  };

  /**
   * Creates a SHA-256 hash operation from a template object.
   * Throws `InvalidTemplateError` if the template is invalid.
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
      throw new InvalidTemplateError("Invalid SHA-256 operation template");
    }
    return new Sha256Operation();
  }
}
