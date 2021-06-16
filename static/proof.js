class InvalidTemplateError1 extends Error {
    name = "InvalidTemplateError";
}
class UnsupportedVersionError1 extends Error {
    name = "UnsupportedVersionError";
    version;
    constructor(version, message){
        super(message);
        this.version = version;
    }
}
class MismatchedHashError1 extends Error {
    name = "MismatchedHashError";
}
class UnsupportedOperationError1 extends Error {
    name = "UnsupportedOperationError";
    operation;
    constructor(operation, message1){
        super(message1);
        this.operation = operation;
    }
}
class InvalidTezosNetworkError1 extends Error {
    name = "InvalidTezosNetworkError";
}
class FetchError1 extends Error {
    name = "FetchError";
    status;
    constructor(status, message2){
        super(message2);
        this.status = status;
    }
}
export { InvalidTemplateError1 as InvalidTemplateError };
export { UnsupportedVersionError1 as UnsupportedVersionError };
export { MismatchedHashError1 as MismatchedHashError };
export { UnsupportedOperationError1 as UnsupportedOperationError };
export { InvalidTezosNetworkError1 as InvalidTezosNetworkError };
export { FetchError1 as FetchError };
const validator = /^[0-9a-fA-F]+$/;
function stringify(bytes) {
    return Array.from(bytes).map((__byte)=>__byte.toString(16).padStart(2, "0")
    ).join("");
}
function parse(input) {
    if (input.length == 0) {
        return new Uint8Array([]);
    }
    if (!validator.test(input)) {
        throw new SyntaxError("Invalid hexadecimal string");
    }
    const byteCount = Math.ceil(input.length / 2);
    const bytes = new Uint8Array(byteCount);
    for(let index = 0; index < input.length / 2; ++index){
        const offset = index * 2 - input.length % 2;
        const hexByte = input.substring(offset, offset + 2);
        bytes[index] = parseInt(hexByte, 16);
    }
    return bytes;
}
const mod = function() {
    return {
        validator: validator,
        stringify: stringify,
        parse: parse
    };
}();
const IV = [
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225, 
];
const K = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298, 
];
class Sha256 {
    state = new ArrayBuffer(32);
    buffer = new ArrayBuffer(64);
    final = false;
    counter = 0;
    size = 0n;
    get finalized() {
        return this.final;
    }
    constructor(){
        const state1 = new DataView(this.state);
        for(let i = 0; i < 8; ++i){
            state1.setUint32(i * 4, IV[i], false);
        }
    }
    update(input) {
        if (this.final) {
            throw new Error("Cannot update finalized hash function.");
        }
        const buffer = new Uint8Array(this.buffer);
        this.size += BigInt(input.length * 8);
        for(let i1 = 0; i1 < input.length; ++i1){
            buffer[this.counter++] = input[i1];
            if (this.counter == 64) {
                this.compress();
                this.counter = 0;
            }
        }
        return this;
    }
    compress() {
        const state1 = new DataView(this.state);
        const buffer = new DataView(this.buffer);
        const rotate = (x, y)=>x >>> y | x << 32 - y
        ;
        const choose = (x, y, z)=>x & y ^ ~x & z
        ;
        const majority = (x, y, z)=>x & y ^ x & z ^ y & z
        ;
        const Σ0 = (x)=>rotate(x, 2) ^ rotate(x, 13) ^ rotate(x, 22)
        ;
        const Σ1 = (x)=>rotate(x, 6) ^ rotate(x, 11) ^ rotate(x, 25)
        ;
        const σ0 = (x)=>rotate(x, 7) ^ rotate(x, 18) ^ x >>> 3
        ;
        const σ1 = (x)=>rotate(x, 17) ^ rotate(x, 19) ^ x >>> 10
        ;
        const W = new Uint32Array(64);
        for(let i1 = 0; i1 < 16; ++i1){
            W[i1] = buffer.getUint32(i1 * 4, false);
        }
        for(let i2 = 16; i2 < 64; ++i2){
            W[i2] = σ1(W[i2 - 2]) + W[i2 - 7] + σ0(W[i2 - 15]) + W[i2 - 16];
        }
        const h = new Uint32Array(8);
        for(let i3 = 0; i3 < 8; ++i3){
            h[i3] = state1.getUint32(i3 * 4, false);
        }
        for(let i4 = 0; i4 < 64; ++i4){
            const T1 = h[7] + Σ1(h[4]) + choose(h[4], h[5], h[6]) + K[i4] + W[i4];
            const T2 = Σ0(h[0]) + majority(h[0], h[1], h[2]);
            h[7] = h[6];
            h[6] = h[5];
            h[5] = h[4];
            h[4] = h[3] + T1;
            h[3] = h[2];
            h[2] = h[1];
            h[1] = h[0];
            h[0] = T1 + T2;
        }
        for(let i5 = 0; i5 < 8; ++i5){
            const word = state1.getUint32(i5 * 4, false) + h[i5];
            state1.setUint32(i5 * 4, word, false);
        }
    }
    digest() {
        const state1 = new Uint8Array(this.state);
        if (this.final) {
            return state1;
        }
        const buffer = new DataView(this.buffer);
        buffer.setUint8(this.counter++, 128);
        if (this.counter > 56) {
            while(this.counter < 64){
                buffer.setUint8(this.counter++, 0);
            }
            this.compress();
            this.counter = 0;
        }
        while(this.counter < 56){
            buffer.setUint8(this.counter++, 0);
        }
        buffer.setBigUint64(56, this.size, false);
        this.compress();
        this.final = true;
        return state1;
    }
    static digest(input) {
        return new Sha256().update(input).digest();
    }
}
function compare(a, b) {
    if (a.length != b.length) {
        return false;
    }
    for(const index in a){
        if (a[index] != b[index]) {
            return false;
        }
    }
    return true;
}
function concat(...chunks) {
    let size = 0;
    for (const piece of chunks){
        size += piece instanceof Uint8Array ? piece.length : 1;
    }
    const result = new Uint8Array(size);
    let cursor = 0;
    for (const piece1 of chunks){
        if (piece1 instanceof Uint8Array) {
            result.set(piece1, cursor);
            cursor += piece1.length;
        } else {
            result[cursor] = piece1;
            cursor++;
        }
    }
    return result;
}
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
class PrefixError extends Error {
    name = "PrefixError";
}
class ChecksumError extends Error {
    name = "ChecksumError";
}
const validator1 = /^[1-9A-HJ-NP-Za-km-z]*$/;
function encode(payload) {
    if (payload.length == 0) {
        return "";
    }
    let __int = 0n;
    for (const __byte of payload){
        __int = BigInt(__byte) + (__int << 8n);
    }
    let encoding = "";
    for(let n = __int; n > 0n; n /= 58n){
        const mod1 = Number(n % 58n);
        encoding = ALPHABET[mod1] + encoding;
    }
    for(let i1 = 0; payload[i1] == 0; ++i1){
        encoding = ALPHABET[0] + encoding;
    }
    return encoding;
}
function decode(string) {
    if (!validator1.test(string)) {
        throw new SyntaxError(`Invalid Base58 string`);
    }
    let __int = 0n;
    for (const __char of string){
        const index = ALPHABET.indexOf(__char);
        __int = __int * 58n + BigInt(index);
    }
    const bytes = [];
    for(let n = __int; n > 0n; n /= 256n){
        bytes.push(Number(n % 256n));
    }
    for(let i1 = 0; string[i1] == ALPHABET[0]; ++i1){
        bytes.push(0);
    }
    return new Uint8Array(bytes.reverse());
}
function encodeCheck(payload, prefix = new Uint8Array()) {
    const input = concat(prefix, payload);
    const checksum = Sha256.digest(Sha256.digest(input)).slice(0, 4);
    return encode(concat(input, checksum));
}
function decodeCheck(string, prefix = new Uint8Array()) {
    const raw = decode(string);
    const prefixedPayload = raw.slice(0, -4);
    const checksum = Sha256.digest(Sha256.digest(prefixedPayload)).slice(0, 4);
    if (!compare(checksum, raw.slice(-4))) {
        throw new ChecksumError("Base58 checksum does not match");
    }
    if (!compare(prefixedPayload.slice(0, prefix.length), prefix)) {
        throw new PrefixError("Prefix bytes do not match");
    }
    return prefixedPayload.slice(prefix.length);
}
const mod1 = function() {
    return {
        PrefixError: PrefixError,
        ChecksumError: ChecksumError,
        validator: validator1,
        encode: encode,
        decode: decode,
        encodeCheck: encodeCheck,
        decodeCheck: decodeCheck
    };
}();
const IV1 = [
    7640891576956012808n,
    13503953896175478587n,
    4354685564936845355n,
    11912009170470909681n,
    5840696475078001361n,
    11170449401992604703n,
    2270897969802886507n,
    6620516959819538809n, 
];
const SIGMA = [
    [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
    ],
    [
        14,
        10,
        4,
        8,
        9,
        15,
        13,
        6,
        1,
        12,
        0,
        2,
        11,
        7,
        5,
        3
    ],
    [
        11,
        8,
        12,
        0,
        5,
        2,
        15,
        13,
        10,
        14,
        3,
        6,
        7,
        1,
        9,
        4
    ],
    [
        7,
        9,
        3,
        1,
        13,
        12,
        11,
        14,
        2,
        6,
        5,
        10,
        4,
        0,
        15,
        8
    ],
    [
        9,
        0,
        5,
        7,
        2,
        4,
        10,
        15,
        14,
        1,
        11,
        12,
        6,
        8,
        3,
        13
    ],
    [
        2,
        12,
        6,
        10,
        0,
        11,
        8,
        3,
        4,
        13,
        7,
        5,
        15,
        14,
        1,
        9
    ],
    [
        12,
        5,
        1,
        15,
        14,
        13,
        4,
        10,
        0,
        7,
        6,
        3,
        9,
        2,
        8,
        11
    ],
    [
        13,
        11,
        7,
        14,
        12,
        1,
        3,
        9,
        5,
        0,
        15,
        4,
        8,
        6,
        2,
        10
    ],
    [
        6,
        15,
        14,
        9,
        11,
        3,
        0,
        8,
        12,
        2,
        13,
        7,
        1,
        4,
        10,
        5
    ],
    [
        10,
        2,
        8,
        4,
        7,
        6,
        1,
        5,
        15,
        11,
        9,
        14,
        3,
        12,
        13,
        0
    ], 
];
const MIX_INDICES = [
    [
        0,
        4,
        8,
        12
    ],
    [
        1,
        5,
        9,
        13
    ],
    [
        2,
        6,
        10,
        14
    ],
    [
        3,
        7,
        11,
        15
    ],
    [
        0,
        5,
        10,
        15
    ],
    [
        1,
        6,
        11,
        12
    ],
    [
        2,
        7,
        8,
        13
    ],
    [
        3,
        4,
        9,
        14
    ], 
];
class Blake2b {
    state = new ArrayBuffer(64);
    buffer = new ArrayBuffer(128);
    offset = 0n;
    final = false;
    counter = 0;
    digestLength;
    get finalized() {
        return this.final;
    }
    constructor(key1 = new Uint8Array(), digestLength1 = 32){
        if (key1.length > 64) {
            throw new RangeError("Key must be less than 64 bytes");
        }
        if (digestLength1 < 0) {
            throw new RangeError("Digest length must be a positive value");
        }
        if (digestLength1 > 64) {
            throw new RangeError("Digest length must be less than 64 bytes");
        }
        this.digestLength = digestLength1;
        this.init(key1);
    }
    init(key) {
        const state2 = new DataView(this.state);
        for(let i1 = 0; i1 < 8; ++i1){
            state2.setBigUint64(i1 * 8, IV1[i1], true);
        }
        const firstWord = state2.getBigUint64(0, true) ^ 16842752n ^ BigInt(key.length << 8 ^ this.digestLength);
        state2.setBigUint64(0, firstWord, true);
        if (key.length) {
            this.update(key);
            this.counter = 128;
        }
    }
    update(input) {
        if (this.final) {
            throw new Error("Cannot update finalized hash function.");
        }
        const buffer = new Uint8Array(this.buffer);
        for(let i1 = 0; i1 < input.length; ++i1){
            if (this.counter == 128) {
                this.counter = 0;
                this.offset += 128n;
                this.compress();
            }
            buffer[this.counter++] = input[i1];
        }
        return this;
    }
    compress(last = false) {
        const state2 = new DataView(this.state);
        const buffer = new DataView(this.buffer);
        const vector = new BigUint64Array(16);
        for(let i1 = 0; i1 < 8; ++i1){
            vector[i1] = state2.getBigUint64(i1 * 8, true);
        }
        vector.set(IV1, 8);
        vector[12] ^= this.offset;
        vector[13] ^= this.offset >> 64n;
        if (last) {
            vector[14] = ~vector[14];
        }
        const rotate = (x, y)=>x >> y | x << 64n - y
        ;
        for(let i2 = 0; i2 < 12; ++i2){
            const s = SIGMA[i2 % 10];
            for(let j = 0; j < 8; ++j){
                const x = buffer.getBigUint64(s[2 * j] * 8, true);
                const y = buffer.getBigUint64(s[2 * j + 1] * 8, true);
                const [a, b, c, d] = MIX_INDICES[j];
                vector[a] += vector[b] + x;
                vector[d] = rotate(vector[d] ^ vector[a], 32n);
                vector[c] += vector[d];
                vector[b] = rotate(vector[b] ^ vector[c], 24n);
                vector[a] += vector[b] + y;
                vector[d] = rotate(vector[d] ^ vector[a], 16n);
                vector[c] += vector[d];
                vector[b] = rotate(vector[b] ^ vector[c], 63n);
            }
        }
        for(let i3 = 0; i3 < 8; ++i3){
            const word = state2.getBigUint64(i3 * 8, true) ^ vector[i3] ^ vector[i3 + 8];
            state2.setBigUint64(i3 * 8, word, true);
        }
    }
    digest() {
        if (this.final) {
            throw new Error("Cannot re-finalize hash function.");
        }
        this.offset += BigInt(this.counter);
        const buffer = new Uint8Array(this.buffer);
        while(this.counter < 128){
            buffer[this.counter++] = 0;
        }
        this.compress(true);
        this.final = true;
        return new Uint8Array(this.state).slice(0, this.digestLength);
    }
    static digest(input, key, digestLength) {
        return new Blake2b(key, digestLength).update(input).digest();
    }
}
function isRefForm(schema) {
    return "ref" in schema;
}
function isTypeForm(schema) {
    return "type" in schema;
}
function isEnumForm(schema) {
    return "enum" in schema;
}
function isElementsForm(schema) {
    return "elements" in schema;
}
function isPropertiesForm(schema) {
    return "properties" in schema || "optionalProperties" in schema;
}
function isValuesForm(schema) {
    return "values" in schema;
}
function isDiscriminatorForm(schema) {
    return "discriminator" in schema;
}
const pattern = /^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(\.\d+)?([zZ]|((\+|-)(\d{2}):(\d{2})))$/;
function isRFC3339(s) {
    const matches = s.match(pattern);
    if (matches === null) {
        return false;
    }
    const year = parseInt(matches[1], 10);
    const month = parseInt(matches[2], 10);
    const day = parseInt(matches[3], 10);
    const hour = parseInt(matches[4], 10);
    const minute = parseInt(matches[5], 10);
    const second = parseInt(matches[6], 10);
    if (month > 12) {
        return false;
    }
    if (day > maxDay(year, month)) {
        return false;
    }
    if (hour > 23) {
        return false;
    }
    if (minute > 59) {
        return false;
    }
    if (second > 60) {
        return false;
    }
    return true;
}
function maxDay(year, month) {
    if (month === 2) {
        return isLeapYear(year) ? 29 : 28;
    }
    return MONTH_LENGTHS[month];
}
function isLeapYear(n) {
    return n % 4 === 0 && (n % 100 !== 0 || n % 400 === 0);
}
const MONTH_LENGTHS = [
    0,
    31,
    0,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31, 
];
class MaxDepthExceededError extends Error {
}
class MaxErrorsReachedError extends Error {
}
function validate(schema, instance, config) {
    const state2 = {
        errors: [],
        instanceTokens: [],
        schemaTokens: [
            []
        ],
        root: schema,
        config: config || {
            maxDepth: 0,
            maxErrors: 0
        }
    };
    try {
        validateWithState(state2, schema, instance);
    } catch (err) {
        if (err instanceof MaxErrorsReachedError) {
        } else {
            throw err;
        }
    }
    return state2.errors;
}
function validateWithState(state2, schema, instance, parentTag) {
    if (schema.nullable && instance === null) {
        return;
    }
    if (isRefForm(schema)) {
        if (state2.schemaTokens.length === state2.config.maxDepth) {
            throw new MaxDepthExceededError();
        }
        state2.schemaTokens.push([
            "definitions",
            schema.ref
        ]);
        validateWithState(state2, state2.root.definitions[schema.ref], instance);
        state2.schemaTokens.pop();
    } else if (isTypeForm(schema)) {
        pushSchemaToken(state2, "type");
        switch(schema.type){
            case "boolean":
                if (typeof instance !== "boolean") {
                    pushError(state2);
                }
                break;
            case "float32":
            case "float64":
                if (typeof instance !== "number") {
                    pushError(state2);
                }
                break;
            case "int8":
                validateInt(state2, instance, -128, 127);
                break;
            case "uint8":
                validateInt(state2, instance, 0, 255);
                break;
            case "int16":
                validateInt(state2, instance, -32768, 32767);
                break;
            case "uint16":
                validateInt(state2, instance, 0, 65535);
                break;
            case "int32":
                validateInt(state2, instance, -2147483648, 2147483647);
                break;
            case "uint32":
                validateInt(state2, instance, 0, 4294967295);
                break;
            case "string":
                if (typeof instance !== "string") {
                    pushError(state2);
                }
                break;
            case "timestamp":
                if (typeof instance !== "string") {
                    pushError(state2);
                } else {
                    if (!isRFC3339(instance)) {
                        pushError(state2);
                    }
                }
                break;
        }
        popSchemaToken(state2);
    } else if (isEnumForm(schema)) {
        pushSchemaToken(state2, "enum");
        if (typeof instance !== "string" || !schema.enum.includes(instance)) {
            pushError(state2);
        }
        popSchemaToken(state2);
    } else if (isElementsForm(schema)) {
        pushSchemaToken(state2, "elements");
        if (Array.isArray(instance)) {
            for (const [index, subInstance] of instance.entries()){
                pushInstanceToken(state2, index.toString());
                validateWithState(state2, schema.elements, subInstance);
                popInstanceToken(state2);
            }
        } else {
            pushError(state2);
        }
        popSchemaToken(state2);
    } else if (isPropertiesForm(schema)) {
        if (typeof instance === "object" && instance !== null && !Array.isArray(instance)) {
            if (schema.properties !== undefined) {
                pushSchemaToken(state2, "properties");
                for (const [name, subSchema] of Object.entries(schema.properties)){
                    pushSchemaToken(state2, name);
                    if (instance.hasOwnProperty(name)) {
                        pushInstanceToken(state2, name);
                        validateWithState(state2, subSchema, instance[name]);
                        popInstanceToken(state2);
                    } else {
                        pushError(state2);
                    }
                    popSchemaToken(state2);
                }
                popSchemaToken(state2);
            }
            if (schema.optionalProperties !== undefined) {
                pushSchemaToken(state2, "optionalProperties");
                for (const [name, subSchema] of Object.entries(schema.optionalProperties)){
                    pushSchemaToken(state2, name);
                    if (instance.hasOwnProperty(name)) {
                        pushInstanceToken(state2, name);
                        validateWithState(state2, subSchema, instance[name]);
                        popInstanceToken(state2);
                    }
                    popSchemaToken(state2);
                }
                popSchemaToken(state2);
            }
            if (schema.additionalProperties !== true) {
                for (const name of Object.keys(instance)){
                    const inRequired = schema.properties && name in schema.properties;
                    const inOptional = schema.optionalProperties && name in schema.optionalProperties;
                    if (!inRequired && !inOptional && name !== parentTag) {
                        pushInstanceToken(state2, name);
                        pushError(state2);
                        popInstanceToken(state2);
                    }
                }
            }
        } else {
            if (schema.properties !== undefined) {
                pushSchemaToken(state2, "properties");
            } else {
                pushSchemaToken(state2, "optionalProperties");
            }
            pushError(state2);
            popSchemaToken(state2);
        }
    } else if (isValuesForm(schema)) {
        pushSchemaToken(state2, "values");
        if (typeof instance === "object" && instance !== null && !Array.isArray(instance)) {
            for (const [name, subInstance] of Object.entries(instance)){
                pushInstanceToken(state2, name);
                validateWithState(state2, schema.values, subInstance);
                popInstanceToken(state2);
            }
        } else {
            pushError(state2);
        }
        popSchemaToken(state2);
    } else if (isDiscriminatorForm(schema)) {
        if (typeof instance === "object" && instance !== null && !Array.isArray(instance)) {
            if (instance.hasOwnProperty(schema.discriminator)) {
                const tag = instance[schema.discriminator];
                if (typeof tag === "string") {
                    if (tag in schema.mapping) {
                        pushSchemaToken(state2, "mapping");
                        pushSchemaToken(state2, tag);
                        validateWithState(state2, schema.mapping[tag], instance, schema.discriminator);
                        popSchemaToken(state2);
                        popSchemaToken(state2);
                    } else {
                        pushSchemaToken(state2, "mapping");
                        pushInstanceToken(state2, schema.discriminator);
                        pushError(state2);
                        popInstanceToken(state2);
                        popSchemaToken(state2);
                    }
                } else {
                    pushSchemaToken(state2, "discriminator");
                    pushInstanceToken(state2, schema.discriminator);
                    pushError(state2);
                    popInstanceToken(state2);
                    popSchemaToken(state2);
                }
            } else {
                pushSchemaToken(state2, "discriminator");
                pushError(state2);
                popSchemaToken(state2);
            }
        } else {
            pushSchemaToken(state2, "discriminator");
            pushError(state2);
            popSchemaToken(state2);
        }
    }
}
function validateInt(state2, instance, min, max) {
    if (typeof instance !== "number" || !Number.isInteger(instance) || instance < min || instance > max) {
        pushError(state2);
    }
}
function pushInstanceToken(state2, token) {
    state2.instanceTokens.push(token);
}
function popInstanceToken(state2) {
    state2.instanceTokens.pop();
}
function pushSchemaToken(state2, token) {
    state2.schemaTokens[state2.schemaTokens.length - 1].push(token);
}
function popSchemaToken(state2) {
    state2.schemaTokens[state2.schemaTokens.length - 1].pop();
}
function pushError(state2) {
    state2.errors.push({
        instancePath: [
            ...state2.instanceTokens
        ],
        schemaPath: [
            ...state2.schemaTokens[state2.schemaTokens.length - 1]
        ]
    });
    if (state2.errors.length === state2.config.maxErrors) {
        throw new MaxErrorsReachedError();
    }
}
function isValid(schema, instance) {
    return validate(schema, instance).length == 0;
}
class Operation1 {
    static schema = {
        properties: {
            type: {
                type: "string"
            }
        },
        additionalProperties: true
    };
    static from(template) {
        if (!isValid(Operation1.schema, template)) {
            throw new InvalidTemplateError1("Invalid operation template");
        }
        switch(template.type){
            case "join":
                if (!isValid(JoinOperation1.schema, template)) {
                    throw new InvalidTemplateError1("Invalid join operation template");
                }
                return new JoinOperation1({
                    prepend: template.prepend ? mod.parse(template.prepend) : undefined,
                    append: template.append ? mod.parse(template.append) : undefined
                });
            case "blake2b":
                if (!isValid(Blake2bOperation1.schema, template)) {
                    throw new InvalidTemplateError1("Invalid BLAKE2b operation template");
                }
                return new Blake2bOperation1(template.length, template.key ? mod.parse(template.key) : undefined);
            case "sha256":
                if (!isValid(Sha256Operation1.schema, template)) {
                    throw new InvalidTemplateError1("Invalid SHA-256 operation template");
                }
                return new Sha256Operation1();
            default:
                throw new UnsupportedOperationError1(template.type, `Unsupported operation "${template.type}"`);
        }
    }
}
class JoinOperation1 extends Operation1 {
    prepend;
    append;
    constructor({ prepend , append  }){
        super();
        this.prepend = prepend ?? new Uint8Array();
        this.append = append ?? new Uint8Array();
    }
    toString() {
        const prependString = this.prepend.length ? `Prepend 0x${mod.stringify(this.prepend)}` : "";
        const conjunction = this.prepend.length && this.append.length ? ", " : "";
        const appendString = this.append.length ? `Append 0x${mod.stringify(this.append)}` : "";
        return prependString + conjunction + appendString;
    }
    toJSON() {
        const template = {
            type: "join"
        };
        if (this.prepend.length) {
            template.prepend = mod.stringify(this.prepend);
        }
        if (this.append.length) {
            template.append = mod.stringify(this.append);
        }
        return template;
    }
    commit(input) {
        return concat(this.prepend, input, this.append);
    }
    static schema = {
        properties: {
            type: {
                enum: [
                    "join"
                ]
            }
        },
        optionalProperties: {
            prepend: {
                type: "string"
            },
            append: {
                type: "string"
            }
        }
    };
}
class Blake2bOperation1 extends Operation1 {
    length;
    key;
    constructor(length = 32, key2){
        super();
        if (length < 0 || length > 64) {
            throw new RangeError("BLAKE2b digest length must be between 0-64 bytes.");
        }
        if (key2 && key2.length > 64) {
            throw new RangeError("BLAKE2b key length must be no longer than 64 bytes.");
        }
        this.length = length;
        this.key = key2;
    }
    toString() {
        return `BLAKE2b hash, ${this.length}-byte digest` + (this.key ? ` with key 0x${mod.stringify(this.key)}` : "");
    }
    toJSON() {
        const template = {
            type: "blake2b"
        };
        if (this.length != 32) {
            template.length = this.length;
        }
        if (this.key) {
            template.key = mod.stringify(this.key);
        }
        return template;
    }
    commit(input) {
        return Blake2b.digest(input, this.key, this.length);
    }
    static schema = {
        properties: {
            type: {
                enum: [
                    "blake2b"
                ]
            }
        },
        optionalProperties: {
            length: {
                type: "uint32"
            },
            key: {
                type: "string"
            }
        }
    };
}
class Sha256Operation1 extends Operation1 {
    toString() {
        return "SHA-256 hash";
    }
    toJSON() {
        return {
            type: "sha256"
        };
    }
    commit(input) {
        const digest = Sha256.digest(input);
        return new Uint8Array(digest);
    }
    static schema = {
        properties: {
            type: {
                enum: [
                    "sha256"
                ]
            }
        }
    };
}
export { Operation1 as Operation };
export { JoinOperation1 as JoinOperation };
export { Blake2bOperation1 as Blake2bOperation };
export { Sha256Operation1 as Sha256Operation };
class Proof1 {
    hash;
    operations;
    derivation;
    constructor({ hash , operations  }){
        this.hash = hash;
        this.operations = operations;
        this.derivation = operations.reduce((input, operation1)=>operation1.commit(input)
        , hash);
    }
    concat(proof) {
        if (this instanceof AffixedProof1) {
            throw new TypeError("Cannot concatenate to an affixed proof");
        }
        if (!compare(this.derivation, proof.hash)) {
            throw new MismatchedHashError1("Derivation of partial proof does not match the stored hash of the appended proof");
        }
        const hash1 = this.hash;
        const operations1 = this.operations.concat(proof.operations);
        if (proof instanceof AffixedProof1) {
            return new AffixedProof1({
                hash: hash1,
                operations: operations1,
                network: proof.network,
                timestamp: proof.timestamp
            });
        }
        if (proof instanceof PendingProof1) {
            return new PendingProof1({
                hash: hash1,
                operations: operations1,
                remote: proof.remote
            });
        }
        return new Proof1({
            hash: hash1,
            operations: operations1
        });
    }
    toJSON() {
        return {
            version: 1,
            hash: mod.stringify(this.hash),
            operations: this.operations.map((operation1)=>operation1.toJSON()
            )
        };
    }
    static schema = {
        properties: {
            version: {
                type: "uint32"
            },
            hash: {
                type: "string"
            },
            operations: {
                elements: Operation1.schema
            }
        },
        additionalProperties: true
    };
    static from(template) {
        if (!isValid(Proof1.schema, template)) {
            throw new InvalidTemplateError1("Invalid proof template");
        }
        const supported = [
            1
        ];
        if (!supported.includes(template.version)) {
            throw new UnsupportedVersionError1(template.version, `Unsupported proof version "${template.version}"`);
        }
        if (!mod.validator.test(template.hash)) {
            throw new SyntaxError("Invalid input hash");
        }
        const baseOptions = {
            hash: mod.parse(template.hash),
            operations: template.operations.map(Operation1.from)
        };
        if (isValid(AffixedProof1.schema, template)) {
            return new AffixedProof1({
                ...baseOptions,
                network: template.network,
                timestamp: new Date(template.timestamp)
            });
        }
        if (isValid(PendingProof1.schema, template)) {
            return new PendingProof1({
                ...baseOptions,
                remote: template.remote
            });
        }
        return new Proof1(baseOptions);
    }
}
var VerifyStatus1;
(function(VerifyStatus1) {
    VerifyStatus1["Verified"] = "verified";
    VerifyStatus1["NetError"] = "netError";
    VerifyStatus1["NotFound"] = "notFound";
    VerifyStatus1["Mismatch"] = "mismatch";
})(VerifyStatus1 || (VerifyStatus1 = {
}));
const NETWORK_PREFIX = new Uint8Array([
    87,
    82,
    0
]);
const TEZOS_MAINNET = "NetXdQprcVkpaWU";
class AffixedProof1 extends Proof1 {
    network;
    timestamp;
    get blockHash() {
        return mod1.encodeCheck(concat(1, 52, this.derivation));
    }
    constructor({ hash: hash1 , operations: operations1 , network , timestamp  }){
        super({
            hash: hash1,
            operations: operations1
        });
        try {
            const rawNetwork = mod1.decodeCheck(network);
            if (rawNetwork.length != 7) throw null;
            if (!compare(rawNetwork.slice(0, 3), NETWORK_PREFIX)) throw null;
        } catch (_) {
            throw new InvalidTezosNetworkError1(`Invalid Tezos network "${network}"`);
        }
        this.network = network;
        this.timestamp = timestamp;
    }
    get mainnet() {
        return this.network == TEZOS_MAINNET;
    }
    async verify(rpcURL) {
        const endpoint = new URL(`chains/${this.network}/blocks/${this.blockHash}/header`, rpcURL);
        try {
            const response = await fetch(endpoint, {
                headers: {
                    accept: "application/json"
                }
            });
            switch(response.status){
                case 200: break;
                case 404:
                    return VerifyStatus1.NotFound;
                default:
                    return VerifyStatus1.NetError;
            }
            const header = await response.json();
            const timestamp1 = new Date(header.timestamp);
            if (timestamp1.getTime() != this.timestamp.getTime()) {
                return VerifyStatus1.Mismatch;
            }
            return VerifyStatus1.Verified;
        } catch (_) {
            return VerifyStatus1.NetError;
        }
    }
    toJSON() {
        return {
            ...super.toJSON(),
            network: this.network,
            timestamp: this.timestamp.toISOString()
        };
    }
    static schema = {
        properties: {
            version: {
                type: "uint32"
            },
            hash: {
                type: "string"
            },
            operations: {
                elements: Operation1.schema
            },
            network: {
                type: "string"
            },
            timestamp: {
                type: "timestamp"
            }
        }
    };
}
class PendingProof1 extends Proof1 {
    remote;
    constructor({ hash: hash2 , operations: operations2 , remote  }){
        super({
            hash: hash2,
            operations: operations2
        });
        this.remote = remote instanceof URL ? remote : new URL(remote);
    }
    async resolve() {
        const response = await fetch(this.remote, {
            headers: {
                accept: "application/json"
            }
        });
        if (!response.ok) {
            throw new FetchError1(response.status, "Could not resolve remote proof");
        }
        const template = await response.json();
        const proof = Proof1.from(template);
        return this.concat(proof);
    }
    toJSON() {
        return {
            ...super.toJSON(),
            remote: this.remote.toString()
        };
    }
    static schema = {
        properties: {
            version: {
                type: "uint32"
            },
            hash: {
                type: "string"
            },
            operations: {
                elements: Operation1.schema
            },
            remote: {
                type: "string"
            }
        }
    };
}
export { Proof1 as Proof };
export { VerifyStatus1 as VerifyStatus,  };
export { AffixedProof1 as AffixedProof };
export { PendingProof1 as PendingProof };

