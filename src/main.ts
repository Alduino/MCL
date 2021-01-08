import Dict = NodeJS.Dict;
import {Parser} from "./parser/parser";

// todo

function compile(namespace: string, files: Dict<string>) {
    return Object.entries(files).map(([path, source]) => {
        const parser = new Parser(source);
        const result = parser.parse();
        if (result.errs.length > 0) throw new Error(result.errs[0].toString());


    });
}

function compileFromDir(namespace: string, dir: string) {

}
