import SelectorArgument, {loadSelectorArgument, SelectorArgumentLike} from "./SelectorArgument";
import logLoad from "../logLoad";

export enum SelectorTarget {
    NearestPlayer,
    RandomPlayer,
    EveryPlayer,
    Entities,
    Executor
}

export interface SelectorLike {
    readonly type: "selector";

    readonly target: SelectorTarget;
    readonly arguments: SelectorArgumentLike[];
}

export default class Selector implements SelectorLike {
    static extend(sel: Selector, args: SelectorArgument[]) {
        return new Selector([...sel.arguments, ...args], sel.target);
    }

    static targetToString(target: SelectorTarget) {
        switch (target) {
            case SelectorTarget.NearestPlayer:
                return "@p";
            case SelectorTarget.RandomPlayer:
                return "@r";
            case SelectorTarget.EveryPlayer:
                return "@a";
            case SelectorTarget.Entities:
                return "@e";
            case SelectorTarget.Executor:
                return "@s";
        }
    }

    readonly type = "selector";

    readonly target: SelectorTarget;
    readonly arguments: SelectorArgument[];

    constructor(args: SelectorArgument[], target: SelectorTarget) {
        this.target = target;
        this.arguments = args;
    }

    toString() {
        const targetStr = Selector.targetToString(this.target);
        const argsStr = this.arguments.length > 0 ? `[${this.arguments.join(",")}]` : "";

        return `${targetStr}${argsStr}`;
    }

    extend(args: SelectorArgument[]) {
        return Selector.extend(this, args);
    }
}

export function loadSelector(src: SelectorLike) {
    logLoad(Selector, src);
    return new Selector(
        src.arguments.map(loadSelectorArgument),
        src.target
    );
}
