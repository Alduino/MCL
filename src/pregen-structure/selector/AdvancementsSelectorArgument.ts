import Range, {loadRange, RangeLike} from "../util/Range";
import Dict = NodeJS.Dict;
import logLoad from "../logLoad";

type SubCriteria = {name: string, value: string};
type Advancement = Dict<boolean | SubCriteria>;

export interface AdvancementsSelectorArgumentLike {
    readonly type: "advancements";

    readonly advancements: Advancement;
}

export default class AdvancementsSelectorArgument implements AdvancementsSelectorArgumentLike {
    readonly type = "advancements";

    readonly advancements: Advancement;

    constructor(advancements: Advancement) {
        this.advancements = advancements;
    }

    toString() {
        return "{" + Object.entries(this.advancements).map(([k, v]) => {
            if (typeof v === "boolean") return `${k}=${v}`;
            return `${k}={${v.name}=${v.value}}`;
        });
    }
}

export function loadAdvancementsSelectorArgument(src: AdvancementsSelectorArgumentLike) {
    logLoad(AdvancementsSelectorArgument, src);
    return new AdvancementsSelectorArgument(src.advancements);
}
