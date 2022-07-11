import Range, {loadRange, RangeLike} from "../util/Range";
import Dict = NodeJS.Dict;
import logLoad from "../logLoad";

export interface ScoreboardSelectorArgumentLike {
    readonly type: "scoreboard";

    readonly scores: Dict<RangeLike>;
}

export default class ScoreboardSelectorArgument implements ScoreboardSelectorArgumentLike {
    readonly type = "scoreboard";

    readonly scores: Dict<Range>;

    constructor(scores: Dict<Range>) {
        this.scores = scores;
    }

    toString() {
        return "{" + Object.entries(this.scores).map(([k, v]) => `${k}=${v}`).join(",") + "}";
    }
}

export function loadScoreboardSelectorArgument(src: ScoreboardSelectorArgumentLike) {
    logLoad(ScoreboardSelectorArgument, src);
    return new ScoreboardSelectorArgument(Object.fromEntries(Object.entries(src.scores)
        .map(([k, v]) => [k, loadRange(v)])));
}
