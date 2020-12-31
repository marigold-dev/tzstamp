#!/usr/bin/env node

const fs = require('fs')
const fetch = require('node-fetch')
const parseArgs = require('minimist')
const { createHash } = require('crypto')
const { Proof, _util: Hash } = require('@tzstamp/merkle')

const argv = parseArgs(
    process.argv.slice(2),
    opts = {
        default: {
            server: "https://tzstamp.io",
        }
    }
)

const sha256_p = /^[0-9a-fA-F]{64}$/
const http_p = /^https?:\/\//

const [ subcommand, ...subcommandArgs ] = argv._

void async function () {
    try {
        switch (subcommand) {
            case "verify":
                await handleVerify(...subcommandArgs)
                break;
            case "stamp":
                await handleStamp(...subcommandArgs)
                break;
            case "help":
            default:
                handleHelp();
        }
    } catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}()

/**
 * Asynchronously SHA-256 hash a read stream
 */
function sha256Async (stream) {
    return new Promise((resolve, reject) => {
        if (stream.readableEnded) reject(new Error('Stream has ended'))
        const hash = createHash('SHA256')
        stream
            .on('data', data => hash.update(data))
            .on('end', () => resolve(new Uint8Array(hash.digest())))
            .on('error', reject)
    })
}

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

async function fetchProofSerialization (url) {
    const response = await fetch(url)
    if (response.status == 404) {
        throw new Error(`Requested proof "${url}" hasn't been posted to tzstamp server or has expired`)
    } else if (response.status == 202) {
        throw new Error(`Requested proof "${url}" will be posted with the next merkle root`)
    }
}

async function handleVerify (hash_or_filep, proof_file_or_url) {
    if (hash_or_filep == undefined) {
        throw new Error("Hash to test for inclusion not given (first argument).")
    }
    if (proof_file_or_url == undefined) {
        throw new Error("Proof to test inclusion against not given (second argument).")
    }
    // Determine what arguments we've been passed
    const hash = hash_or_filep.match(sha256_p)
        ? Hash.parse(hash_or_filep)
        : await hashFile(hash_or_filep);
    const proofSerialization = proof_file_or_url.match(http_p)
        ? await fetchProofSerialization(proof_file_or_url)
        : fs.readFileSync(proof_file_or_url, 'utf-8')
    let proof
    try {
        proof = Proof.parse(proofSerialization)
    } catch (_) {
        throw new Error('Unable to parse proof')
    }
    let merkleRoot
    try {
        merkleRoot = proof.derive(Hash.hash(hash))
    } catch (_) {
        throw new Error('Unable to derive merkle root')
    }
    console.log(`ROOT HASH DERIVED FROM PROOF AND LEAF HASH:\n${Hash.stringify(merkleRoot)}`)
}

async function handleStamp (filePathOrHash) {
    const hash = sha256_p.test(filePathOrHash)
        ? filePathOrHash
        : Hash.stringify(await hashFile(filePathOrHash))
    const response = await fetch(`${argv.server}/api/stamp`, {
        method: 'POST',
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ hash })
    })
    const { url } = await response.json()
    console.log(url)
}

function handleHelp () {
    console.log("Was not a recognized subcommand.");
}
