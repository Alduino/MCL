import logLoad, {ElliRequiredKeys} from "../logLoad";

export interface RangeLike {
    readonly type: "range";

    readonly min?: number;
    readonly max?: number;
}

export default class Range implements RangeLike, ElliRequiredKeys<RangeLike> {
    _elliRequiredKeys: (keyof RangeLike)[] = ["type"];

    readonly type = "range";

    readonly min?: number;
    readonly max?: number;

    constructor(min?: number, max?: number) {
        this.min = min;
        this.max = max;
    }

    toString() {
        if (this.min == null && this.max == null) throw new RangeError("Both min and max are undefined");
        if (this.min == null) return `..${this.max}`;
        if (this.max == null) return `${this.min}..`;
        if (this.min === this.max) return `${this.min}`;
        return `${this.min}..${this.max}`;
    }
}

export function loadRange(src: RangeLike) {
    logLoad(Range, src);
    return new Range(src.min, src.max);
}
