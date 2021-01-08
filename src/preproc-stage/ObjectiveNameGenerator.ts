import {randomBytes} from "crypto";

export default class ObjectiveNameGenerator {
    // must have a length that is a power of 2
    private static readonly characters = "abcdefghijklmnopqrstuvywxz234567";

    // amount of bits each character uses (=log2(characters.length))
    private static readonly bitsPerCharacter = 5;

    private static readBit(byte: number, idx: number) {
        const mask = 1 << idx;
        return (byte & mask) >> idx;
    }

    private static joinBitsToNum(bits: number[]) {
        return bits.reduce((prev, curr, idx) => prev | (curr << idx), 0);
    }

    // reads 5 bytes and returns 8 characters
    private static readCharacters(buff: Buffer, offset: number) {
        // split buff into 5x8 bits
        const bits: number[] = [];
        for (let i = 0; i < 5; i++) {
            const byte = buff.readUInt8(offset + i);

            for (let j = 0; j < 8; j++) {
                bits.push(this.readBit(byte, j));
            }
        }

        // group bits into 8x 5 bits
        const charIds = Array.from({length: 8})
            .map((_, i) => this.joinBitsToNum(bits.slice(i * 5, (i + 1) * 5)));

        // map the charIds to their chars
        return charIds.map(id => this.characters[id]).join("");
    }

    // length will be rounded up to the nearest 8, then extra characters will be discarded
    static generate(len: number) {
        const genLen = Math.ceil(len / 8) * 8;

        const length = (this.bitsPerCharacter * genLen) / 8;
        const bytes = randomBytes(length);

        const chars: string[] = [];

        for (let i = 0; i < genLen / 8; i++) {
            chars.push(this.readCharacters(bytes, i * 5));
        }

        return chars.join("").substring(0, len);
    }
}
