import {Processor, s, VariableInformation} from "./process";
import ArgumentList from "../parser/ast-structure/ArgumentList";
import Argument from "../pregen-structure/Argument";
import {Command} from "../pregen-structure/PreGen";
import Nbt from "../pregen-structure/nbt/Nbt";
import NbtString from "../pregen-structure/nbt/NbtString";
import NbtObject from "../pregen-structure/nbt/NbtObject";
import Selector from "../pregen-structure/selector/Selector";
import NbtArray from "../pregen-structure/nbt/NbtArray";
import ScoreboardSelectorArgument from "../pregen-structure/selector/ScoreboardSelectorArgument";
import Range from "../pregen-structure/util/Range";
import SelectorArgument from "../pregen-structure/selector/SelectorArgument";

const nativeStd: {
    [key: string]: (processor: Processor, args: ArgumentList) => VariableInformation | null
} = {
    execute(processor: Processor, args: ArgumentList) {
        if (args.positional.length !== 1) throw new Error("execute expects one positional argument");
        const block = args.positional[0];

        if (block.type !== "block") throw new Error("execute positional argument must be a block");

        const argus: Argument[] = [];

        if (args.named["at"]) {
            argus.push(new Nbt(new NbtString("at")));

            const arg = args.named["at"];

            // todo: support selectors
            if (arg.type === "identifier") {
                const entity = processor.fn.getVariable(arg);
                if (entity.type !== "entity") throw new Error("expecting entity variable for execute(at)");

                argus.push(Processor.getVariableSelector(entity));
            } else {
                throw new Error("execute(at) must be an entity, selector, or coordinate");
            }
        }

        const {name: functionName, result} = processor._handleBlock("command_execute", null, block);

        argus.push(new Nbt(new NbtString("run")));
        argus.push(new Command("function", [
            new Nbt(new NbtString(`${processor.namespace}:${functionName}`))
        ]));

        processor.fn.push(new Command("execute", argus));

        // todo return last result
        return result;
    },

    kill(processor: Processor, args: ArgumentList) {
        if (args.positional.length !== 1) throw new Error("kill expects one positional argument");

        const arg = args.positional[0];

        // todo: support selectors
        if (arg.type === "identifier") {
            const entity = processor.fn.getVariable(arg);
            if (entity.type !== "entity") throw new Error("expecting entity variable for kill");

            processor.fn.push(new Command("kill", [Processor.getVariableSelector(entity)]));
        } else {
            throw new Error("kill expects an entity");
        }

        return null;
    },

    say(processor: Processor, args: ArgumentList) {
        if (!Object.keys(args.named).includes("to")) throw new Error("say requires argument `to`");
        const to = args.named["to"];

        let selector: Selector;

        if (to.type === "identifier") {
            const variable = processor.fn.getVariable(to);
            if (variable.type !== "entity") throw new Error("say(to) must reference an entity");
            selector = Processor.getVariableSelector(variable);
        } else throw new Error("say(to) must be a selector");

        const components = args.positional.map(arg => {
            if (arg.type === "Maths" || arg.type === "Comparison") {
                const exprRes = processor._handleExpression(arg);

                arg = {
                    type: "identifier",
                    value: exprRes.srcName
                };
            }

            if (arg.type === "string") {
                return new NbtObject({
                    text: new NbtString(arg.value, true)
                });
            } else if (arg.type === "identifier") {
                const variable  = processor.fn.getVariable(arg);

                if (variable.type === "entity") {
                    return new NbtObject({
                        selector: new NbtString(Processor.getVariableSelector(variable).toString(), true)
                    });
                } else if (variable.type === "int") {
                    return new NbtObject({
                        score: new NbtObject({
                            name: new NbtString(Processor.getVariableSelector(variable).toString(), true),
                            objective: new NbtString(Processor.valueObjective, true)
                        })
                    });
                } else throw new Error("Invalid variable type");
            } else throw new Error("say arguments must be strings or variables");
        });

        processor.fn.push(new Command("tellraw", [
            selector,
            new Nbt(new NbtArray([
                new NbtString("", true),
                ...components
            ]))
        ]));

        return null;
    },

    if(processor: Processor, args: ArgumentList) {
        // must have two positional arguments, the comparison and the block
        if (args.positional.length !== 2) throw new Error("if expects (comparison, block)");

        const comparison = args.positional[0];
        if (comparison.type !== "Comparison") throw new Error("if(comparison) must be a comparison");

        const block = args.positional[1];
        if (block.type !== "block") throw new Error("if(block) must be a block");

        const result = processor._handleComparison(comparison);

        const fn = processor._handleBlock(processor.fn.getFunctionDesc() + "__if_handler", null, block);

        processor.fn.push(new Command("execute", [
            s("if"),
            s("entity"),
            Processor.getVariableSelector(result).extend([
                new SelectorArgument("scores", new ScoreboardSelectorArgument({
                    [Processor.valueObjective]: new Range(1, 1)
                }))
            ]),
            s("run"),
            s("function"),
            s(`${processor.namespace}:${fn}`)
        ]));

        return null;
    }
};
export default nativeStd;

export function hasStdFunc(fn: string | number): fn is keyof typeof nativeStd {
    return Object.keys(nativeStd).includes(fn as string);
}
