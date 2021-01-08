import ArgumentList from "./ArgumentList";
import {Identifier} from "./root-types";

export default interface FunctionCall {
    type: "FunctionCall";
    name: Identifier;
    args: ArgumentList;
}
