import logLoad from "../logLoad";

export interface NbtStringLike {
    readonly type: "nbt.string";
    readonly value: string;
    readonly requireQuotes: boolean;
}

export default class NbtString implements NbtStringLike {
    private static readonly specialCharacters = /[,(){} "]/;

    readonly type = "nbt.string";

    readonly value: string;
    readonly requireQuotes: boolean;

    constructor(value: string, requireQuotes = false) {
        this.value = value;
        this.requireQuotes = requireQuotes;
    }

    toString() {
        if (NbtString.specialCharacters.test(this.value)) return JSON.stringify(this.value);
        if (this.requireQuotes) return `"${this.value}"`;
        return this.value;
    }
}

export function loadNbtString(src: NbtStringLike) {
    logLoad(NbtString, src);
    return new NbtString(src.value, src.requireQuotes);
}
