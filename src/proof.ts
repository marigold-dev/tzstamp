import { Operation } from "./operation.ts";
import { Block } from "./block.ts";
import { assert, Base58, compare, Hex } from "./deps.deno.ts";

/**
 * Network ID prefix
 *
 * @see {@link https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/base58.ml#L424|base58.ml}
 * for details
 */
const NETWORK_PREFIX = new Uint8Array([87, 82, 0]); // Net(15)

/**
 * JSON operation deserializer
 */
function toOperation(op: unknown): Operation {
  assert(
    Array.isArray(op) &&
      op.length > 0 &&
      op.every((arg) => typeof arg == "string"),
    "Invalid operation",
  );
  switch (op[0]) {
    case "prepend": {
      const data = Hex.parse(op[1]);
      return Operation.prepend(data);
    }
    case "append": {
      const data = Hex.parse(op[1]);
      return Operation.append(data);
    }
    case "sha-256":
      return Operation.sha256();
    case "blake2b":
      return Operation.blake2b();
    default:
      throw new Error(`Unsupported operation "${op[0]}"`);
  }
}

/**
 * Cryptographic proof-of-inclusion
 */
export class Proof {
  /**
   * Proof serialization format version
   */
  static readonly VERSION = 0;

  /**
   * Deserialize a JSON proof
   */
  static parse(json: string): Proof {
    const data: Record<string, unknown> = JSON.parse(json);
    assert(
      data != undefined && typeof data == "object",
      "Invalid proof format",
    );
    assert("version" in data, "Missing proof version");
    assert("network" in data, "Missing network ID");
    assert("ops" in data, "Missing operations array");
    assert(
      typeof data.version == "number" &&
        Number.isInteger(data.version) &&
        data.version > -1,
      "Invalid proof version",
    );
    assert(
      Array.isArray(data.ops),
      "Ops field is not an array",
    );
    assert(
      data.version <= Proof.VERSION,
      `Unsupported proof version "${data.version}"`,
    );
    return new Proof(
      data.network as string,
      (data.ops as unknown[]).map(toOperation),
    );
  }

  /**
   * Tezos network
   */
  readonly network: string;

  /**
   * Proof operations
   */
  readonly operations: Operation[];

  /**
   * @param network Network ID
   * @param operations Proof operations
   */
  constructor(network: string, operations: Operation[]) {
    // Empty operations array
    if (operations.length == 0) {
      throw new Error("Empty operations array");
    }

    // Validate network ID
    try {
      const rawNetwork = Base58.decodeCheck(network);
      if (rawNetwork.length != 7) {
        throw null;
      }
      if (!compare(rawNetwork.slice(0, 3), NETWORK_PREFIX)) {
        throw null;
      }
    } catch (_) {
      throw new Error("Invalid network ID");
    }

    this.network = network;
    this.operations = operations;
  }

  /**
   * JSON serializer
   */
  toJSON(): Record<string, unknown> {
    return {
      version: Proof.VERSION,
      network: this.network,
      ops: this.operations,
    };
  }

  /**
   * Derive block hash from operations
   */
  derive(input: Uint8Array): Block {
    const rawHash = this.operations.reduce((acc, op) => op.commit(acc), input);
    return new Block(this.network, rawHash);
  }
}
