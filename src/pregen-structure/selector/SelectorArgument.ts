import Range, {loadRange, RangeLike} from "../util/Range";
import logLoad from "../logLoad";
import ScoreboardSelectorArgument, {
    loadScoreboardSelectorArgument,
    ScoreboardSelectorArgumentLike
} from "./ScoreboardSelectorArgument";
import NbtObject, {loadNbtObject, NbtObjectLike} from "../nbt/NbtObject";
import AdvancementsSelectorArgument, {AdvancementsSelectorArgumentLike, loadAdvancementsSelectorArgument} from "./AdvancementsSelectorArgument";

export interface SelectorArgumentLike {
    readonly name: string;
    readonly inverted: boolean;
    readonly value: RangeLike | ScoreboardSelectorArgumentLike | AdvancementsSelectorArgumentLike | NbtObjectLike | string;
}

export default class SelectorArgument implements SelectorArgumentLike {
    readonly name: string;
    readonly inverted: boolean;
    readonly value: Range | ScoreboardSelectorArgument | AdvancementsSelectorArgument | NbtObject | string;

    constructor(name: string, value: typeof SelectorArgument.prototype.value, inverted: boolean = false) {
        this.name = name;
        this.value = value;
        this.inverted = inverted;
    }

    toString() {
        return `${this.name}=${this.inverted ? "!" : ""}${this.value}`;
    }
}

export function loadSelectorArgument(src: SelectorArgumentLike) {
    logLoad(SelectorArgument, src);

    let value: typeof SelectorArgument.prototype.value;
    if (typeof src.value === "string") value = src.value;
    else if (src.value.type === "range") value = loadRange(src.value);
    else if (src.value.type === "scoreboard") value = loadScoreboardSelectorArgument(src.value);
    else if (src.value.type === "nbt.object") value = loadNbtObject(src.value);
    else if (src.value.type === "advancements") value = loadAdvancementsSelectorArgument(src.value);
    else throw new TypeError("Invalid selector argument");

    return new SelectorArgument(src.name, value, src.inverted);
}
