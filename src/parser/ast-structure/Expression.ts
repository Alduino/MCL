import Comparison from "./Comparison";
import Maths from "./Maths";
import {Identifier, Int, String} from "./root-types";
import Coordinate from "./Coordinate";

type Expression = Comparison | Maths | Identifier | Int | String | Coordinate;
export default Expression;
