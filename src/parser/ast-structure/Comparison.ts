import Expression from "./Expression";

export enum ComparisonType {
    NotEqual = 0b000,
    Equal = 0b001,
    GreaterThan = 0b100,
    GreaterThanOrEqual = 0b101,
    LessThan = 0b110,
    LessThanOrEqual = 0b111
}

export default interface Comparison {
    type: "Comparison";
    left: Expression;
    comparison: ComparisonType;
    right: Expression;
}
