import Expression from "./Expression";

export enum MathsOperation {
    Add,
    Subtract,
    Multiply,
    Divide,
    Remainder
}

export default interface Maths {
    type: "Maths";
    left: Expression;
    operation: MathsOperation;
    right: Expression;
}
