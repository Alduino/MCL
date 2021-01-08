import {Identifier} from "./root-types";
import FunctionCall from "./FunctionCall";
import Expression from "./Expression";

export default interface Assignment {
    type: "Assignment";
    name: Identifier;
    value: FunctionCall | Expression;
}
