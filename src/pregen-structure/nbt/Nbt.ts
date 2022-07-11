import NbtChild, {loadNbtChild, NbtChildLike} from "./NbtChild";
import logLoad from "../logLoad";

export interface NbtLike {
    readonly type: "nbt";
    readonly value: NbtChildLike;
}

export default class Nbt implements NbtLike {
    readonly type = "nbt";

    readonly value: NbtChild;

    constructor(value: NbtChild) {
        this.value = value;
    }

    toString() {
        return this.value.toString();
    }
}

export function loadNbt(src: NbtLike) {
    logLoad(Nbt, src);
    return new Nbt(loadNbtChild(src.value));
}
