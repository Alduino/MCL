import logLoad from "../logLoad";

export enum NumberType {
    Byte,
    Short,
    Int,
    Long,
    Float,
    Double
}

export interface NbtNumberLike {
    readonly type: "nbt.number";

    readonly numberType: NumberType;
    readonly value: number;
}

export default class NbtNumber implements NbtNumberLike {
    readonly type = "nbt.number";

    readonly numberType: NumberType;
    readonly value: number;

    constructor(value: number, type: NumberType) {
        this.value = value;
        this.numberType = type;
    }

    toString() {
        switch (this.numberType) {
            case NumberType.Byte:
                return `${this.value}b`;
            case NumberType.Short:
                return `${this.value}s`;
            case NumberType.Int:
                return `${this.value}`;
            case NumberType.Long:
                return `${this.value}l`;
            case NumberType.Float:
                return `${this.value}f`;
            case NumberType.Double:
                return `${this.value}d`;

        }
    }
}

export function loadNbtNumber(src: NbtNumberLike) {
    logLoad(NbtNumber, src);
    return new NbtNumber(src.value, src.numberType);
}
