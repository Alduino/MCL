import NbtChild, {loadNbtChild, NbtChildLike} from "./NbtChild";
import logLoad from "../logLoad";

export interface NbtArrayLike {
    readonly type: "nbt.array";
    readonly children: NbtChildLike[];
}

export default class NbtArray implements NbtArrayLike {
    readonly type = "nbt.array";

    readonly children: NbtChild[];

    constructor(children: NbtChild[]) {
        this.children = children;
    }

    toString() {
        return `[${this.children.join(",")}]`;
    }
}

export function loadNbtArray(src: NbtArrayLike) {
    logLoad(NbtArray, src);
    return new NbtArray(src.children.map(child => loadNbtChild(child)));
}
