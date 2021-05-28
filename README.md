<img src="https://tzstamp.io/workmark-small.png" width="300px" />

## About tzstamp-client

**tzstamp-client** is the command line client for the TzStamp server software.
It lets users stamp and verify files. A full description of its functionality can
be found [in its manual page](man/man1/tzstamp.md).

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

Upgrade the system installation of npm:

    sudo npm install --global --upgrade npm

Upgrade the system installation of node:

    sudo npm install --global --upgrade node

Run the `derive` subcommand.

    ./bin/index.js derive a.png 1ab1b7db1f4a533de4294166cd3df01403b11c84c16f178a4807b94aa858c3fb.json

If your 'file' is actually a set of bytes, say a block of text, you can also pass
the sha256 directly in place of a filename.

    ./bin/index.js derive a4e9de2410c9e7c3ac4c57bbc18beedc5935d5c8118e345a72baee00a9820b67 1ab1b7db1f4a533de4294166cd3df01403b11c84c16f178a4807b94aa858c3fb.json

You should get back a derived Tezos block:

```
Block hash derived from proof:
BMTUxYz166GSjyKszmirbYubDLiGEBPRUiJrkjAz6ryVppvDiFX
```

Check this block against the [published blocks on mainnet](https://tzkt.io/).
The block [should exist at some point in time](https://tzkt.io/BMTUxYz166GSjyKszmirbYubDLiGEBPRUiJrkjAz6ryVppvDiFX/), if you can't find it the proof may
be invalid.


