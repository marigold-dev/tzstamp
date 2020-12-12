#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
const crypto = require('crypto');
const fs = require('fs');
const fetch = require('node-fetch');
const { Proof, _util: Hash } = require('@tzstamp/merkle')

const subcommand = argv._[0];

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

async function handleVerify () {
    // Determine what arguments we've been passed
    sha256_p = /^[0-9a-fA-F]{64}$/;
    http_p = /^https?:\/\//
    if (argv._[1] == undefined) {
        console.log("Error: Hash to test for inclusion not given (first argument).")
    }
    const hash = argv._[1].match(sha256_p)
          ? Hash.parse(argv._[1])
          : await hashFile(argv._[1]);
    if (argv._[2] == undefined) {
        throw "Error: Proof to test inclusion against not given (second argument)."
    }
    const proof = argv._[2].match(http_p)
        ? await fetch(argv._[2]).then(
            async function (_proof) {
                if (_proof.status == 404) {
                    throw `Requested proof "${argv._[2]}" hasn't been posted to tzstamp server or has expired`
                }
                else if (_proof.status == 202) {
                    throw `Requested proof "${argv._[2]}" will be posted with the next merkle root`
                }
                proof_obj = await _proof.json()
                return Proof.parse(JSON.stringify(proof_obj));
            }).catch(error => { console.log(error) ; process.exit(1) })
        : Proof.parse(fs.readFileSync(argv._[2]));
    console.log("ROOT HASH DERIVED FROM PROOF AND LEAF HASH: ")
    console.log(
        Hash.stringify(
            proof.derive(
                Hash.hash(
                    hash))));
}

async function handleStamp () {
    digest = hashFile(argv._[1])
    digest.then(function (h) {
        return fetch("http://localhost:8080/api/add_hash", {
            method: 'POST',
            body: JSON.stringify({h:Hash.stringify(h)}),
            headers: {
                "Content-type": "application/json"
            }
        })
            .then(res => res.json())
            .then(data => console.log(data))
            .catch(error => console.log(error));
    })
}

function handleHelp () {
    console.log("Was not a recognized subcommand.");
}

switch (subcommand) {
  case "verify":
    handleVerify();
    break;
  case "stamp":
    handleStamp();
    break;
  case "help":
  default:
    handleHelp();
}
