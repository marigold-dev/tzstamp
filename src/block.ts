import { assert, Base58, concat } from "./deps.deno.ts";

/**
 * Tezos block
 */
export class Block {
  /**
   * Block address prefix
   *
   * @see {@link https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/base58.ml#L354|base58.ml}
   * for details
   */
  static PREFIX = new Uint8Array([1, 52]); // B(51)

  /**
   * Tezos network
   */
  readonly network: string;

  /**
   * Raw block hash
   */
  readonly hash: Uint8Array;

  /**
   * @param hash Raw block hash bytes
   */
  constructor(network: string, hash: Uint8Array) {
    this.network = network;
    this.hash = hash;
  }

  /**
   * Prefixed Base-58 check-encoded block address
   */
  get address() {
    const prefixedHash = concat(Block.PREFIX, this.hash);
    return Base58.encodeCheck(prefixedHash);
  }

  /**
   * Lookup block
   * @param rpcURL RPC
   */
  async lookup(rpcURL: string | URL): Promise<Date> {
    const endpoint = new URL(
      `/chains/${this.network}/blocks/${this.address}/header`,
      rpcURL,
    );
    const response = await fetch(endpoint);
    assert(response.ok, `Server responsed with status ${response.status}`);
    const header = await response.json();
    return new Date(header.timestamp);
  }
}
