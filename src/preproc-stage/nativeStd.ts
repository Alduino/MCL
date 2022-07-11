import {EntityVariableInformation, Processor, s, VariableInformation} from "./process";
import ArgumentList from "../parser/ast-structure/ArgumentList";
import Argument from "../pregen-structure/Argument";
import {Command, Comment} from "../pregen-structure/PreGen";
import Nbt from "../pregen-structure/nbt/Nbt";
import NbtString from "../pregen-structure/nbt/NbtString";
import NbtObject from "../pregen-structure/nbt/NbtObject";
import Selector from "../pregen-structure/selector/Selector";
import NbtArray from "../pregen-structure/nbt/NbtArray";
import ScoreboardSelectorArgument from "../pregen-structure/selector/ScoreboardSelectorArgument";
import Range from "../pregen-structure/util/Range";
import SelectorArgument from "../pregen-structure/selector/SelectorArgument";
import Coordinate from "../pregen-structure/coord/Coordinate";
import CoordinatePart from "../pregen-structure/coord/CoordinatePart";
import CoordinateType from "../pregen-structure/coord/CoordinateType";
import NbtChild from "../pregen-structure/nbt/NbtChild";
import NbtNumber, {NumberType} from "../pregen-structure/nbt/NbtNumber";
import ObjectiveNameGenerator from "./ObjectiveNameGenerator";
import {Block} from "../parser/ast-structure/root-types";

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

        const {name: functionName, result} = processor._handleBlock(processor.autoName("command_execute"), null, block);

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

    delete(processor: Processor, args: ArgumentList) {
        if (args.positional.length !== 1) throw new Error("delete expects (identifier)");

        const identifier = args.positional[0];

        if (identifier.type !== "identifier") throw new Error("delete(identifier) must be an identifier");

        const variable = processor.fn.getVariable(identifier);

        processor.fn.push(new Comment(`delete(${identifier.value})`));
        processor._deleteVariable(variable, true);

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

        const variableToDelete: VariableInformation[] = [];

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
                const variable = processor.fn.getVariable(arg);
                variableToDelete.push(variable);

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

        for (const variable of variableToDelete) processor._deleteVariable(variable);

        return null;
    },

    if(processor: Processor, args: ArgumentList) {
        // must have two positional arguments, the comparison and the block
        if (args.positional.length !== 2 && args.positional.length !== 3) {
            throw new Error("if expects (comparison, if block, else block?)");
        }

        const comparison = args.positional[0];
        if (comparison.type !== "Comparison") throw new Error("if(comparison) must be a comparison");

        const ifBlock = args.positional[1];
        if (ifBlock.type !== "block") throw new Error("if(if block) must be a block");

        const elseBlock = args.positional[2];
        if (elseBlock && elseBlock.type !== "block") throw new Error("if(else block) must be a block when defined");

        const result = processor._handleComparison(comparison);

        const {name: ifFn} = processor._handleBlock(processor.fn.getFunctionDesc() + "__if_handler", null, ifBlock);
        const elseFn = elseBlock && processor._handleBlock(processor.fn.getFunctionDesc() + "__else_handler", null, elseBlock as Block).name;

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
            s(`${processor.namespace}:${ifFn}`)
        ]));

        if (elseFn) {
            processor.fn.push(new Command("execute", [
                s("unless"),
                s("entity"),
                Processor.getVariableSelector(result).extend([
                    new SelectorArgument("scores", new ScoreboardSelectorArgument({
                        [Processor.valueObjective]: new Range(1, 1)
                    }))
                ]),
                s("run"),
                s("function"),
                s(`${processor.namespace}:${elseFn}`)
            ]));
        }

        processor._deleteVariable(result);

        return null;
    },

    summon(processor, args) {
        const type = args.positional[0];

        let pos = args.positional[1] || new Coordinate(
            new CoordinatePart(CoordinateType.Relative, 0),
            new CoordinatePart(CoordinateType.Relative, 0),
            new CoordinatePart(CoordinateType.Relative, 0)
        );

        if (!type) throw new Error("summon expects (type, pos?)");
        if (type.type !== "string") throw new Error("summon(type) must be a string");

        if (pos.type === "Coordinate") {
            pos = new Coordinate(pos.x, pos.y, pos.z);
        }

        if (pos.type !== "coordinate") throw new Error("summon(pos) must be a coordinate");

        const name = processor.autoName(`summon_${type.value}`);

        // create the variable for the entity
        const variable: EntityVariableInformation = {
            type: "entity",
            srcName: name,
            tag: name + "_" + ObjectiveNameGenerator.generate(32),
            userCreated: true
        };

        processor.fn.getCurrentScope().push(variable);

        const nbtEntries: [string, NbtChild][] = [
            ["Tags", new NbtArray([
                new NbtString(variable.tag, true)
            ])]
        ];

        switch (type.value) {
            case "armor_stand":
                if (args.named["marker"]?.type === "int" && args.named["marker"].value === 1) {
                    nbtEntries.push(["CustomNameVisible", new NbtNumber(1, NumberType.Byte)]);
                    nbtEntries.push(["CustomName", new NbtString("{\"text\":\"marker\"}")]);
                }
        }

        processor.fn.push(new Command("summon", [
            s(type.value),
            pos,
            new Nbt(new NbtObject(Object.fromEntries(nbtEntries)))
        ]));

        return variable;
    },

    teleport(processor, args) {
        if (args.positional.length !== 2) throw new Error("teleport expects (player, target)");

        const [player, target] = args.positional;

        if (player.type !== "identifier" || processor.fn.getVariable(player).type !== "entity")
            throw new Error("teleport(player) must be an entity");

        if (target.type === "Coordinate") {
            processor.fn.push(new Command("tp", [
                Processor.getVariableSelector(processor.fn.getVariable(player)),
                new Coordinate(target.x, target.y, target.z)
            ]));
        } else if (target.type === "identifier") {
            // make sure the variable is an entity
            if (processor.fn.getVariable(target).type !== "entity")
                throw new Error("teleport(target) must be a coordinate or an entity");

            processor.fn.push(new Command("tp", [
                Processor.getVariableSelector(processor.fn.getVariable(player)),
                Processor.getVariableSelector(processor.fn.getVariable(target))
            ]));
        } else {
            throw new Error("teleport(target) must be a coordinate or an entity");
        }

        return null;
    },

    is_dead(processor, args) {
        if (args.positional.length !== 1) throw new Error("is_dead expects (entity)");

        const arg = args.positional[0];

        if (arg.type !== "identifier" || processor.fn.getVariable(arg).type !== "entity")
            throw new Error("is_dead(entity) must be an entity");

        const variable = processor.fn.getVariable(arg);
        const resultVariable = processor._createIntVariable(`is_dead_${arg.value}`);

        processor.fn.push(new Command("execute", [
            s("unless"),
            s("entity"),
            Processor.getVariableSelector(variable),
            s("run"),
            processor.getIntVarSetter(resultVariable, 1)
        ]));

        return resultVariable;
    }
};
export default nativeStd;

export function hasStdFunc(fn: string | number): fn is keyof typeof nativeStd {
    return Object.keys(nativeStd).includes(fn as string);
}
