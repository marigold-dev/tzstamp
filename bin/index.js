#!/usr/bin/env node

var parseArgs = require('minimist')

var argv = parseArgs(
    process.argv,
    opts={"default":
          {
              "server":"https://tzstamp.io",
          }
         }
)

const crypto = require('crypto');
const fs = require('fs');
const fetch = require('node-fetch');
const { Proof, _util: Hash } = require('@tzstamp/merkle')

const subcommand = argv._[2];

const { createHash } = require('crypto')

/**
 * Asynchronously SHA-256 hash a read stream
 */
const sha256Async = stream => new Promise((resolve, reject) => {
  if (stream.readableEnded) reject(new Error('Stream has ended'))
  const hash = createHash('SHA256')
  stream
    .on('data', data => hash.update(data))
    .on('end', () => resolve(new Uint8Array(hash.digest())))
    .on('error', reject)
})

/**
 * Asynchronously hash a file from read stream
 */
async function hashFile (path) {
  const stream = fs.createReadStream(path)
  try {
    const hash = await sha256Async(stream) // returns Uint8Array
    return hash
  } catch (error) {
    // Something went wrong with reading the file
    // Do something with the error
  }
}

async function handleVerify (hash_or_filep, proof_file_or_url) {
    // Determine what arguments we've been passed
    sha256_p = /^[0-9a-fA-F]{64}$/;
    http_p = /^https?:\/\//
    if (hash_or_filep == undefined) {
        console.log("Error: Hash to test for inclusion not given (first argument).")
    }
    const hash = hash_or_filep.match(sha256_p)
          ? Hash.parse(hash_or_filep)
          : await hashFile(hash_or_filep);
    if (proof_file_or_url == undefined) {
        throw "Error: Proof to test inclusion against not given (second argument)."
    }
    const proof = proof_file_or_url.match(http_p)
        ? await fetch(proof_file_or_url).then(
            async function (_proof) {
                if (_proof.status == 404) {
                    throw `Requested proof "${proof_file_or_url}" hasn't been posted to tzstamp server or has expired`
                }
                else if (_proof.status == 202) {
                    throw `Requested proof "${proof_file_or_url}" will be posted with the next merkle root`
                }
                proof_obj = await _proof.json()
                return Proof.parse(JSON.stringify(proof_obj));
            }).catch(error => { console.log(error) ; process.exit(1) })
        : Proof.parse(fs.readFileSync(proof_file_or_url));
    console.log("ROOT HASH DERIVED FROM PROOF AND LEAF HASH: ")
    console.log(
        Hash.stringify(
            proof.derive(
                Hash.hash(
                    hash))));
}

async function handleStamp (arg) {
    digest = Hash.stringify(await hashFile(arg))
    fetch(argv.server + "/api/stamp", {
        method: 'POST',
        body: JSON.stringify({hash:digest}),
        headers: {
            "Content-type": "application/json"
        }
    })
        .then(res => res.json())
        .then(data => console.log(data.url))
        .catch(error => console.log(error));
}

function handleHelp () {
    console.log("Was not a recognized subcommand.");
}

switch (subcommand) {
  case "verify":
    handleVerify(argv._[3], argv._[4]);
    break;
  case "stamp":
    handleStamp(argv._[3]);
    break;
  case "help":
  default:
    handleHelp();
}
