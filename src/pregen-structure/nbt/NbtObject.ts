import Dict = NodeJS.Dict;
import NbtChild, {loadNbtChild, NbtChildLike} from "./NbtChild";
import logLoad from "../logLoad";

export interface NbtObjectLike {
    readonly type: "nbt.object";
    readonly children: Dict<NbtChildLike>;
}

export default class NbtObject implements NbtObjectLike {
    readonly type = "nbt.object";

    readonly children: Dict<NbtChild>;

    constructor(children: Dict<NbtChild>) {
        this.children = children;
    }

    toString() {
        return `{${
            Object.entries(this.children).map(([k, v]) => `"${k}":${v}`)
        }}`;
    }
}

export function loadNbtObject(src: NbtObjectLike) {
    logLoad(NbtObject, src);
    return new NbtObject(Object.fromEntries(Object.entries(src.children)
        .map(([k, v]) => [k, loadNbtChild(v)])));
}
