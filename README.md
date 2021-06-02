<img src="https://tzstamp.io/workmark-small.png" width="300px" />

## About tzstamp-client

**tzstamp-client** is the command line client for the TzStamp server software.
It lets users stamp and verify files. A full description of its functionality can
be found [in its manual page](man/man1/tzstamp.md).

## Installation

Assuming a fresh install you'll need to `apt-get` some dependencies:

    sudo apt-get install git nodejs npm

Upgrade the system installation of npm:

    sudo npm install --global --upgrade npm

Upgrade the system installation of node:

    sudo npm install --global --upgrade node

Then install the tzstamp package with npm:

    npm install -g @tzstamp/cli

## How To Verify An Inclusion Proof On Debian 10.6

You need:

* The original file you timestamped or its SHA-256 hash.

* The proof JSON file returned by the tzstamp server.

With these run the `verify` subcommand.

    tzstamp verify a.png 1ab1b7db1f4a533de4294166cd3df01403b11c84c16f178a4807b94aa858c3fb.json

If your 'file' is actually a set of bytes, say a block of text, you can also pass
the sha256 directly in place of a filename.

    tzstamp verify a4e9de2410c9e7c3ac4c57bbc18beedc5935d5c8118e345a72baee00a9820b67 1ab1b7db1f4a533de4294166cd3df01403b11c84c16f178a4807b94aa858c3fb.json

You should get back a derived Tezos block and timestamp:

```
Verified
Target: /home/user/Downloads/Streisand_Estate_800_521.jpg
Hash existed at 6/1/2021, 6:30:54 AM
Block hash: BLQFwmjYJDTyT6wjEwKyot2RFC8wZf9Qyzo56fQ5x4nUYjnfKid
Node queried: https://testnet-tezos.giganode.io/
```

If the proof is high stakes you should also manually check this block hash against the [published blocks on mainnet](https://tzkt.io/).
The block [should exist at some point in time](https://tzkt.io/BMTUxYz166GSjyKszmirbYubDLiGEBPRUiJrkjAz6ryVppvDiFX/), if you can't find it the proof may
be invalid.

## Timestamping a file

Files or their hashes can be timestamped like so:

    tzstamp stamp filename.txt

    tzstamp stamp 4a5be57589b4ddc42d87e4df775161e5bbcdf772058093d524b04dd88533a50a

