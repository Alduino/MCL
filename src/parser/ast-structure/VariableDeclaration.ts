import {Identifier} from "./root-types";
import WithDecorators from "./util/WithDecorators";

export default interface VariableDeclaration extends WithDecorators {
    type: "VariableDeclaration";
    name: Identifier;
    varType: Identifier;
}
