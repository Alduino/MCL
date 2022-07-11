import Dict = NodeJS.Dict;
import Argument from "./Argument";

export default interface ArgumentList {
    type: "ArgumentList";
    positional: Argument[];
    named: Dict<Argument>;
}
