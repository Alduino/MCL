import src from "../../example-pregen/example.g.json";
import {generateMcfunctions, loadPregen} from "./PreGen";

console.log(JSON.stringify(src));
console.log(generateMcfunctions(loadPregen(src)));
