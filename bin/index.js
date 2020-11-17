#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
const crypto = require('crypto');
const fs = require('fs');
const fetch = require('node-fetch');
const hash = crypto.createHash('sha256');
hash.setEncoding('hex');

const subcommand = argv._[0];

if (subcommand === "check")
    {
        const input = fs.createReadStream(argv._[1]);
            digest = new Promise((resolve, reject) => {
                input.on('error', err => reject(err));
                input.on('data', chunk => hash.update(chunk));
                input.on('end', () => resolve(hash.digest('hex')));
            });

        digest.then(function (h) {
            return fetch("http://localhost:8080/api/add_hash", {
                method: 'POST',
                body: JSON.stringify({h:h}),
                headers: {
                    "Content-type": "application/json"
                }
            })
            .then(res => res.json())
            .then(data => console.log(data))
            .catch(error => console.log(error));
        })
    }
else if (subcommand === "stamp") {
    console.log("Test");
}

else {
    console.log("Was not a recognized subcommand.");
}

/* const hashstr = 
  digest.then(function (hashstr) {
    return fulfilled;
}); */

