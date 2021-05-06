# TzStamp Proofs

Cryptographic proofs-of-inclusion for use with
[TzStamp tools](https://tzstamp.io).

## Usage

```js
import { Block, Operation, Proof } from "@tzstamp/proof";
```

### Construct new proof

The `Proof` constructor takes two arguments:

- The network identifier as a string. The identifier of the Tezos mainnet is
  `"NetXdQprcVkpaWU"`
- An array of `Operation`s. Operations must not be an empty array.

```js
const proof = new Proof("NetXdQprcVkpaWU", [
  Operation.sha256(),
  Operation.blake2b(),
  Operation.prepend(new Uint8Array([55, 66, 77])),
  Operation.append(new Uint8Array([55, 66, 77])),
]);
```

### Operations

| Accessor          | Description                    | Arguments  |
| ----------------- | ------------------------------ | ---------- |
| Operation.prepend | Prepend arbitrary bytes        | Uint8Array |
| Operation.append  | Append arbitrary bytes         | Uint8Array |
| Operation.sha256  | Produce SHA-256 digest         | -          |
| Operation.blake2b | Produce Blake2b 256-bit digest | -          |

### Serializating and Deserializing

```js
// Deserialize from JSON
const json = fs.readFileSync("my-proof.json", "utf-8");
const proof = Proof.parse(json);

// Serialize to JSON
const json = JSON.stringify(proof);
fs.writeFileSync("my-proof.json", json);
```

## Derive Tezos block from proof

```js
const { createHash } = require("crypto");

// ...

const file = fs.readFileSync("my-file.pdf");
const input = new Uint8Array(
  createHash("SHA-256")
    .update(file)
    .digest(),
);
const block = proof.derive(input);
```

This will pipe the input through each operation. If the input and proof are
correct, the resulting byte array will be a raw Tezos block hash. A `Block`
interface with convenience methods is returned in place of that raw byte array.

## Lookup timestamp

```js
const block = proof.derive(input);
const timestamp = block.lookup("https://mainnet-tezos.giganode.io");
// returns `Date`
```

## License

[MIT](LICENSE.txt)
