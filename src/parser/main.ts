import {Parser} from "./parser";
import simplify from "./simplify";

export default function parse(src: string) {
    const parser = new Parser(src);
    const res = parser.parse();

    const srcLines = src.split("\n")
        .map((l, i) => `${(i + 1).toString().padStart(4, " ")}: ${l}`);

    for (const error of res.errs) {
        console.log("An error occurred at", error.pos.line + ":" + error.pos.offset);
        console.log("Expecting", error.expmatches.map(el => {
            switch (el.kind) {
                case "EOF":
                    return (el.negated ? "NOT " : "") + "EOF";
                case "RegexMatch":
                    return (el.negated ? "NOT " : "") + el.literal;
                default:
                    return null;
            }
        }).map(e => JSON.stringify(e)).join(", "))

        const lines = [
            ...srcLines.slice(Math.max(error.pos.line - 3), error.pos.line),
            "      " + " ".repeat(error.pos.offset) + "^ (here)",
            ...srcLines.slice(error.pos.line, Math.min(error.pos.line + 3, srcLines.length - 1))
        ];

        console.log(lines.join("\n"));
    }

    if (res.errs.length > 0) return null;

    return simplify(res.ast);
}
