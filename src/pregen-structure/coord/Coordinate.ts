import CoordinatePart, {CoordinatePartLike, loadCoordinatePart} from "./CoordinatePart";
import logLoad from "../logLoad";

export interface CoordinateLike {
    type: "coordinate";

    readonly x: CoordinatePartLike;
    readonly y: CoordinatePartLike;
    readonly z: CoordinatePartLike;
}

export default class Coordinate implements CoordinateLike {
    readonly type = "coordinate";

    readonly x: CoordinatePart;
    readonly y: CoordinatePart;
    readonly z: CoordinatePart;

    constructor(x: CoordinatePart, y: CoordinatePart, z: CoordinatePart) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toString() {
        return `${this.x} ${this.y} ${this.z}`;
    }
}

export function loadCoordinate(src: CoordinateLike) {
    logLoad(Coordinate, src);
    return new Coordinate(
        loadCoordinatePart(src.x),
        loadCoordinatePart(src.y),
        loadCoordinatePart(src.z)
    );
}
