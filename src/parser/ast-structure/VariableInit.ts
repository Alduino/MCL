import FunctionCall from "./FunctionCall";
import Expression from "./Expression";
import {Identifier} from "./root-types";
import WithDecorators from "./util/WithDecorators";

export default interface VariableInit extends WithDecorators {
    type: "VariableInit";
    name: Identifier;
    varType: Identifier;
    value: FunctionCall | Expression;
}
