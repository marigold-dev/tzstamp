# TzStamp Helper Functions

## Usage

```js
import { Base58, blake2b, compare, concat, Hex } from "@tzstamp/helpers";
```

### Functions

| Accessor             | Description                                                  | Signature                  | Returns      |
| -------------------- | ------------------------------------------------------------ | -------------------------- | ------------ |
| `Hex.stringify`      | Encode a byte array as a hexidecimal string.                 | `Uint8Array`               | `string`     |
| `Hex.parse`          | Parse a byte array from a hexidecimal string.                | `string`                   | `Uint8Array` |
| `Base58.encode`      | Encode a byte array as a base-58 string.                     | `Uint8Array`               | `string`     |
| `Base58.decode`      | Decode a byte array from a base-58 string.                   | `string`                   | `Uint8Array` |
| `Base58.encodeCheck` | Encode a byte array as a base-58 string with a checksum.     | `Uint8Array`               | `string`     |
| `Base58.decodeCheck` | Decore a byte array from a base-58 string with a checksum.   | `string`                   | `Uint8Array` |
| `blake2b`            | Produce a 256-bit Blake2b hash digest of a given byte array. | `Uint8Array`               | `Uint8Array` |
| `concat`             | Join byte arrays and numbers.                                | `...(Uint8Array            | number)`     |
| `compare`            | Determine the equality of two byte arrays.                   | `Uint8Array`, `Uint8Array` | `boolean`    |
| `readStream`         | Collect Node read-stream into byte array.                    | `Readable` (Node)          | `Uint8Array` |

### Constants

| Accessor          | Description                  | Type     |
| ----------------- | ---------------------------- | -------- |
| `Base58.ALPHABET` | The common base-58 alphabet. | `string` |

## License

[MIT](LICENSE.txt)
