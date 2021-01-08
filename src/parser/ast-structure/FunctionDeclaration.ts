import WithDecorators from "./util/WithDecorators";
import {Block, Identifier} from "./root-types";

export default interface FunctionDeclaration extends WithDecorators {
    type: "FunctionDeclaration";
    name: Identifier;
    block: Block;
}
