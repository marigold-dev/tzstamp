import { Blake2b, concat, Hex, Sha256 } from "./deps.ts";
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
        if (!isValid<JoinTemplate>(JoinOperation.schema, template)) {
          throw new InvalidTemplateError("Invalid join operation template");
        }
        return new JoinOperation({
          prepend: template.prepend ? Hex.parse(template.prepend) : undefined,
          append: template.append ? Hex.parse(template.append) : undefined,
        });
      case "blake2b":
        if (!isValid<Blake2bTemplate>(Blake2bOperation.schema, template)) {
          throw new InvalidTemplateError("Invalid BLAKE2b operation template");
        }
        return new Blake2bOperation(
          template.length,
          template.key ? Hex.parse(template.key) : undefined,
        );
      case "sha256":
        if (!isValid<Sha256Template>(Sha256Operation.schema, template)) {
          throw new InvalidTemplateError("Invalid SHA-256 operation template");
        }
        return new Sha256Operation();
      default:
        throw new UnsupportedOperationError(
          template.type,
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
 * Join operation
 */
export class JoinOperation extends Operation {
  /**
   * Data to prepend
   */
  readonly prepend: Uint8Array;

  /**
   * Data to append
   */
  readonly append: Uint8Array;

  /**
   * Throws `TypeError` if no data is set.
   *
   * @param prepend Data to prepend
   * @param append Data to append
   */
  constructor({ prepend, append }: JoinOptions) {
    super();
    this.prepend = prepend ?? new Uint8Array();
    this.append = append ?? new Uint8Array();
  }

  toString(): string {
    const prependString = this.prepend.length
      ? `Prepend 0x${Hex.stringify(this.prepend)}`
      : "";
    const conjunction = this.prepend.length && this.append.length ? ", " : "";
    const appendString = this.append.length
      ? `Append 0x${Hex.stringify(this.append)}`
      : "";
    return prependString + conjunction + appendString;
  }

  toJSON(): JoinTemplate {
    const template: JoinTemplate = { type: "join" };
    if (this.prepend.length) {
      template.prepend = Hex.stringify(this.prepend);
    }
    if (this.append.length) {
      template.append = Hex.stringify(this.append);
    }
    return template;
  }

  commit(input: Uint8Array): Uint8Array {
    return concat(this.prepend, input, this.append);
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
    if (length < 0 || length > 64) {
      throw new RangeError("BLAKE2b digest length must be between 0-64 bytes.");
    }
    if (key && key.length > 64) {
      throw new RangeError(
        "BLAKE2b key length must be no longer than 64 bytes.",
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
    return Blake2b.digest(input, this.key, this.length);
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
    const digest = Sha256.digest(input);
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
}
