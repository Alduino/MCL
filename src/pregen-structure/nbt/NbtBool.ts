import logLoad from "../logLoad";

export interface NbtBoolLike {
    readonly type: "nbt.bool";
    readonly value: boolean;
}

export default class NbtBool implements NbtBoolLike {
    readonly type = "nbt.bool";

    readonly value: boolean;

    constructor(value: boolean) {
        this.value = value;
    }

    toString() {
        return this.value ? "true" : "false";
    }
}

export function loadNbtBool(src: NbtBoolLike) {
    logLoad(NbtBool, src);
    return new NbtBool(src.value);
}
