export enum CoordinateType {
    Absolute,
    Relative,
    Local
}

export interface CoordinateValue {
    type: CoordinateType;
    value: number;
}

export default interface Coordinate {
    type: "Coordinate";
    x: CoordinateValue;
    y: CoordinateValue;
    z: CoordinateValue;
}
