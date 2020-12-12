const assert = require('assert')
const fs = require('fs')
const fetch = require('node-fetch')
const {
  MerkleTree,
  Proof,
  _util: {
    parse,
    hash,
    compare,
    stringify
  }
} = require('@tzstamp/merkle')

const hash1 = "55746df2109657ce123e2f676f35ce1845181999d534e2592a9590eb974d4223"
const hash2 = "344f904b931e6033102e4235e592ea19f800ff3737ff3a18c47cfe63dbea2ed7"
const hash3 = "3c06ddada5c6b4be8605f6396a16e9bf3a5cc730d0f34cbbf5d5707871ec5cce"
const hash4 = "e94c5c36fae0474f5d4f19fcbe038dd98c069d4afa552f556e063ef6c9f95aa4"
const hash5 = "a4e9de2410c9e7c3ac4c57bbc18beedc5935d5c8118e345a72baee00a9820b67"


async function postHash (h) {
    return await fetch("http://localhost:8080/api/stamp/", {
        method: 'POST',
        body: JSON.stringify({hash:h}),
        headers: {
            "Content-type": "application/json"
        }
    })
        .catch(error => console.log(error))
}

// Test 1: POSTing a hash and getting a 202 response

async function test_1 () {
    postHash(hash1)
    .then(res => assert.equal(res.status, 202, "POSTed hash and got non-202 response"))
    .catch(error => console.log(error))
}

// Test 2: POSTing a hash and GETing its proof

async function test_2 () {
    posted = await postHash(hash2)
    proof_url = (await posted.json()).url
    proof = await fetch(proof_url).catch(error => console.log(error))
    while (proof.status != 200) {
        proof = await fetch(proof_url).catch(error => console.log(error))
    }
    assert.equal(proof.status, 200, "POSTed hash and couldn't get corresponding proof")
    return proof
}


// Test 3: Validating a proof

async function test_3 (proof_obj) {
    proof = Proof.parse(JSON.stringify(proof_obj))
    assert.ok(
        proof.verify(hash(parse(hash2)),
                     parse("9043a5db1d3b5a8c2445ac77fd3f44c4ebb842a315cac3968ac7694c8845f298"))
    )
}

async function run_tests () {
    await test_1().catch(error => console.log(error))
    proof_res = await test_2().catch(error => console.log(error))
    proof = await proof_res.json()
    await test_3(proof).catch(error => console.log(error))
    console.log("Tests complete!")
}

run_tests()
