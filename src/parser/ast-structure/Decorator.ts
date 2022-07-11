import {Identifier} from "./root-types";
import ArgumentList from "./ArgumentList";

export default interface Decorator {
    type: "Decorator";
    name: Identifier;
    args: ArgumentList;
}
