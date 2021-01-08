import Argument, {ArgumentLike} from "./Argument";
import {loadCoordinate} from "./coord/Coordinate";
import {loadSelector} from "./selector/Selector";
import {loadNbt} from "./nbt/Nbt";
import {loadItem} from "./item/Item";

export interface CommandLike {
    type: "command";

    name: string;
    arguments: ArgumentLike[];
}

export class Command implements CommandLike {
    type: "command" = "command";

    name: string;
    arguments: Argument[];

    constructor(name: string, args: Argument[]) {
        this.name = name;
        this.arguments = args;
    }

    toString() {
        return `${this.name} ${this.arguments.join(" ")}`;
    }
}

export interface CommentLike {
    type: "comment";
    value: string;
}

export class Comment implements CommentLike {
    type: "comment" = "comment";

    value: string;

    constructor(value: string) {
        this.value = value;
    }

    toString() {
        return `# ${this.value}`;
    }
}

export default interface PreGen {
    [namespace: string]: (Command | Comment)[];
}

// takes in a pregen-like structure (should have same properties but no methods) and converts it to a proper pregen
export function loadPregen(src: any) {
    return Object.fromEntries(Object.entries(src).map(([key, val]) => {
        return [key, (val as (Command | Comment)[])
            .map(v => v.type === "command" ? new Command(v.name, loadArguments(v.arguments)) : new Comment(v.value))];
    }));
}

function loadArguments(src: ArgumentLike[]): Argument[] {
    return src.map(el => {
        switch (el.type) {
            case "coordinate":
                return loadCoordinate(el);
            case "selector":
                return loadSelector(el);
            case "nbt":
                return loadNbt(el);
            case "item":
                return loadItem(el);
            case "comment":
                return new Comment(el.value);
            case "command":
                return new Command(el.name, loadArguments(el.arguments));
            default:
                throw new ReferenceError(`Invalid argument, ${JSON.stringify(el)}`);
        }
    });
}

function mapFunctionName(ns: string) {
    const [namespace, fn] = ns.split(":");
    return `${namespace}/functions/${fn}.mcfunction`;
}

export function generateMcfunctions(src: PreGen) {
    return Object.fromEntries(Object.entries(src).map(([namespace, fn]) => {
        return [mapFunctionName(namespace), fn.map(command => command.toString())];
    }));
}
