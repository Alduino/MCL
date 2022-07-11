import NbtObject, {loadNbtObject, NbtObjectLike} from "../nbt/NbtObject";
import SelectorArgument, {loadSelectorArgument, SelectorArgumentLike} from "../selector/SelectorArgument";
import logLoad from "../logLoad";

export interface ItemLike {
    readonly type: "item";

    readonly namespace: string;
    readonly name: string;

    readonly tag: boolean;

    readonly state: SelectorArgumentLike[];
    readonly data: NbtObjectLike;
}

export default class Item implements ItemLike {
    readonly type = "item";

    readonly name: string;
    readonly namespace: string;

    readonly tag: boolean;

    readonly state: SelectorArgument[];
    readonly data: NbtObject;

    constructor(namespace: string, name: string, tag: boolean, state: SelectorArgument[], data: NbtObject) {
        this.namespace = namespace;
        this.name = name;
        this.tag = tag;
        this.state = state;
        this.data = data;
    }

    toString() {
        const stateStr = this.state.length === 0 ? "" : `[${this.state.join(",")}]`;
        return `${this.tag ? "#" : ""}${this.namespace}:${this.name}${stateStr}${this.data || ""}`;
    }
}

export function loadItem(src: ItemLike) {
    logLoad(Item, src);
    return new Item(src.namespace, src.name, src.tag,
        src.state.map(s => loadSelectorArgument(s)), loadNbtObject(src.data));
}
