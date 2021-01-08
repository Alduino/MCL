import {Parser} from "./parser";
import simplify from "./simplify";

export default function parse(src: string) {
    const parser = new Parser(src);
    const res = parser.parse();

    if (res.errs.length > 0) throw new Error(res.errs[0].toString());

    return simplify(res.ast);
}
