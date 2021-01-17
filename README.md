# TzStamp Client

## How To Verify An Inclusion Proof On Debian 10.6

Before you start make sure you have:

* The original file you timestamped or its SHA-256 hash.

* The proof JSON file returned by the tzstamp server.

Assuming a fresh install you'll need to `apt-get` some dependencies:

    sudo apt-get install git nodejs npm

Next clone the tzstamp client utility.

    git clone https://gitlab.com/tzstamp/cli.git
    cd cli

Install the dependencies for the client utility.

    npm install

Run the `verify` subcommand.

    ./bin/index.js verify a.png 1ab1b7db1f4a533de4294166cd3df01403b11c84c16f178a4807b94aa858c3fb.json

If your 'file' is actually a set of bytes, say a block of text, you can also pass
the sha256 directly in place of a filename.

    ./bin/index.js verify a4e9de2410c9e7c3ac4c57bbc18beedc5935d5c8118e345a72baee00a9820b67 1ab1b7db1f4a533de4294166cd3df01403b11c84c16f178a4807b94aa858c3fb.json

You should get back a derived merkle root:

```
ROOT HASH DERIVED FROM PROOF AND LEAF HASH:
a5623dd08fdf7e743374508d250a20d9fa8c1450a84340a3f398f2390a6b19ae
```

Check this root against the [published roots on mainnet](https://better-call.dev/mainnet/KT1K5npkpWK6wxkcBg97dZD77c2J7DmWvxSb/operations).
You can find the block where your root was published [by searching an indexer for](https://better-call.dev/search?text=oo4e8CKMXndK5f4Rpz67nyzqpVczXSVHmrTzB1PtfCHWgJ7Xaea)
the `operation` provided inside the `proof.json`. The roots should match.


