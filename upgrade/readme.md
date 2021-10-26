# TzStamp Proof Upgrade Utility

Upgrade deprecated [TzStamp] proofs to a supported version.

## Usage

Install with [Deno]:

```bash
deno install --allow-read https://gitlab.com/metanomial/tzstamp-upgrade/-/raw/main/tzstamp-upgrade.ts
```

Version 0 to Version 1:

```bash
tzstamp-upgrade --version 0 --timestamp <iso-datetime-string> --proof <file> [--file <file> | --hash <hex>] > upgraded.proof.json
```

## License

[MIT](license.txt)

[TzStamp]: http://tzstamp.io/
[Deno]: https://deno.land/
