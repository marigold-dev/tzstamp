# TzStamp

<p align="center">
  <img src="https://github.com/marigold-dev/tzstamp/blob/main/website/public/logomark.png"  width="300px" />
</p>

## About

TzStamp is a [cryptographic timestamping service](https://www.gwern.net/Timestamping)
that uses the Tezos blockchain to prove a file existed at or before a certain time.


## Stamp and Verify

To create a timestamp, choose a file to calculate its SHA-256 hash locally in your browser. Alternatively, hash the file yourself and paste the hexadecimal representation into the corresponding field. The stamp button will send the hash to the api.tzstamp.io aggregator server, which will include your file hash in its next publication. Your browser will be prompted to download a partial timestamp proof file. Once published to the blockchain, your timestamp proof will become verifiable.

To verify a timestamp, choose a file (or enter its hash) and a corresponding timestamp proof. The verify button will contact the mainnet.tezos.marigold.dev public Tezos node to verify the proof and display the timestamp. If the timestamp proof is partial, your browser will be prompted to download a full proof.

**The aggregator root is published every five minutes.**

## How to use

We provide tools that integrate with our TzStamp Server:

- [Website](https://tzstamp.io).
- [CLI](https://github.com/marigold-dev/tzstamp/tree/main/cli).
- [Proof Library](https://github.com/marigold-dev/tzstamp/tree/main/packages/proof).

Furthermore you can set up your own [TzStamp Server](https://github.com/marigold-dev/tzstamp/tree/main/server) and [TzStamp Website](https://github.com/marigold-dev/tzstamp/tree/main/website).

