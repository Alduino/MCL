import CoordinateType from "./CoordinateType";
import logLoad from "../logLoad";

export interface CoordinatePartLike {
    readonly type: CoordinateType;
    readonly value: number;
}

export default class CoordinatePart implements CoordinatePartLike {
    readonly type: CoordinateType;
    readonly value: number;

    constructor(type: CoordinateType, value: number) {
        this.type = type;
        this.value = value;
    }

    toString() {
        switch (this.type) {
            case CoordinateType.Absolute:
                return `${this.value}`;
            case CoordinateType.Relative:
                return `~${this.value}`;
            case CoordinateType.Local:
                return `^${this.value}`;
        }
    }
}

export function loadCoordinatePart(src: CoordinatePartLike) {
    logLoad(CoordinatePart, src);
    return new CoordinatePart(src.type, src.value);
}
