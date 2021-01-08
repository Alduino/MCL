import {AST, Block, Identifier, Int, Statement} from "../parser/ast-structure/root-types";
import {Command, Comment} from "../pregen-structure/PreGen";
import VariableInit from "../parser/ast-structure/VariableInit";
import ObjectiveNameGenerator from "./ObjectiveNameGenerator";
import VariableDeclaration from "../parser/ast-structure/VariableDeclaration";
import Selector, {SelectorTarget} from "../pregen-structure/selector/Selector";
import SelectorArgument from "../pregen-structure/selector/SelectorArgument";
import Range from "../pregen-structure/util/Range";
import Nbt from "../pregen-structure/nbt/Nbt";
import NbtString from "../pregen-structure/nbt/NbtString";
import Coordinate from "../pregen-structure/coord/Coordinate";
import CoordinatePart from "../pregen-structure/coord/CoordinatePart";
import CoordinateType from "../pregen-structure/coord/CoordinateType";
import NbtObject from "../pregen-structure/nbt/NbtObject";
import NbtArray from "../pregen-structure/nbt/NbtArray";
import Assignment from "../parser/ast-structure/Assignment";
import FunctionDeclaration from "../parser/ast-structure/FunctionDeclaration";
import FunctionCall from "../parser/ast-structure/FunctionCall";
import nativeStd, {hasStdFunc} from "./nativeStd";
import FunctionManager from "./functionManager";
import WithDecorators from "../parser/ast-structure/util/WithDecorators";
import Expression from "../parser/ast-structure/Expression";
import Comparison, {ComparisonType} from "../parser/ast-structure/Comparison";
import NbtNumber, {NumberType} from "../pregen-structure/nbt/NbtNumber";
import Maths, {MathsOperation} from "../parser/ast-structure/Maths";

interface EntityVariableInformation {
    type: "entity";
    srcName: string;
    tag: string;

    // Overrides the selector with this one
    selectorOverride?: Selector;
    disableCleanup?: boolean;
}

interface IntVariableInformation {
    type: "int";
    srcName: string;
    score: string;
    disableCleanup?: boolean;
}

export type VariableInformation = EntityVariableInformation | IntVariableInformation;

export function s(v: string) {
    return new Nbt(new NbtString(v));
}

export class Processor {
    static readonly valueObjective = "value";

    static readonly tempSelector = new Selector([
        new SelectorArgument("tag", "__is_running", false),
        new SelectorArgument("limit", new Range(1, 1), false)
    ], SelectorTarget.Entities);

    static getVariableSelector(variable: VariableInformation) {
        if (variable.type === "entity") {
            if (variable.selectorOverride) return variable.selectorOverride;

            return new Selector([
                new SelectorArgument("tag", variable.tag, false),
                new SelectorArgument("limit", new Range(1, 1), false)
            ], SelectorTarget.Entities);
        } else if (variable.type === "int") {
            return new Selector([
                new SelectorArgument("tag", variable.score, false),
                new SelectorArgument("limit", new Range(1, 1), false)
            ], SelectorTarget.Entities);
        } else throw new Error(`Invalid variable type, expected entity or int`)
    }

    static hasDecorator(anything: WithDecorators, decorator: string) {
        return anything.decorators.some(it => it.value === decorator);
    }

    static isExposed(statement: WithDecorators) {
        return this.hasDecorator(statement, "expose")
    }

    readonly root: AST;
    readonly namespace: string;

    readonly setupFunctions: string[] = [];
    readonly tickFunctions: string[] = [];
    readonly cleanupFunctions: string[] = [];

    fn = new FunctionManager();

    constructor(root: AST, namespace: string) {
        this.root = root;
        this.namespace = namespace;
    }

    process() {
        this.setupStdVars();

        this.setupFunctions.push("__root");
        this._handleBlock("__root", "__root", this.root, false);

        this.fn.begin("__setup", "__setup");

        // each variable entity has a value on this scoreboard, which is the variable's value
        this.fn.push(new Command("scoreboard", [
            s("objectives"),
            s("add"),
            s(Processor.valueObjective),
            s("dummy")
        ]));

        // summon an entity that will run the tick commands
        // this entity will be killed in cleanup, so the tick commands will stop running
        this._createMarker("__is_running");

        for (const fn of this.setupFunctions) {
            this.fn.push(new Command("function", [
                s(`${this.namespace}:${fn}`)
            ]));
        }

        this.fn.end();

        this.fn.begin("__tick", "__tick");

        for (const fn of this.tickFunctions) {
            this.fn.push(new Command("execute", [
                s("as"),
                new Selector([new SelectorArgument("tag", "__is_running")], SelectorTarget.Entities),
                s("run"),
                new Command("function", [
                    s(`${this.namespace}:${fn}`)
                ])
            ]));
        }

        this.fn.end();

        this.fn.begin("__cleanup", "__cleanup");

        this.fn.push(new Comment("This function is run when the datapack is unloaded, and cleans up any global variables (and runs cleanup hooks)"));

        for (const fn of this.cleanupFunctions) {
            this.fn.push(new Command("function", [
                s(`${this.namespace}:${fn}`)
            ]));
        }

        this._cleanup(this.fn.getGlobalScope());

        this.fn.push(new Command("scoreboard", [
            s("objectives"),
            s("remove"),
            s(Processor.valueObjective)
        ]));

        this.fn.push(new Command("kill", [
            new Selector([new SelectorArgument("tag", "__is_running")], SelectorTarget.Entities)
        ]));

        this.fn.end();

        return Object.fromEntries(Array.from(this.fn.getAll().entries(), ([k, v]) =>
            [`${this.namespace}:${k}`, v]
        ));
    }

    setupStdVars() {
        const scope = this.fn.getGlobalScope();

        scope.push(
            {
                type: "entity",
                srcName: "PLAYERS",
                tag: null,
                selectorOverride: new Selector([], SelectorTarget.EveryPlayer),
                disableCleanup: true
            },
            {
                type: "entity",
                srcName: "RANDOM_PLAYER",
                tag: null,
                selectorOverride: new Selector([], SelectorTarget.RandomPlayer),
                disableCleanup: true
            },
        )
    }

    _createScore() {
        const name = ObjectiveNameGenerator.generate(16);

        this.fn.push(new Command("scoreboard", [
            s("objectives"),
            s("add"),
            s(name),
            s("dummy")
        ]));

        return name;
    }

    _offsetX = 0;
    _createMarker(name: string) {
        this.fn.push(new Command("summon", [
            s("armor_stand"),
            new Coordinate(
                new CoordinatePart(CoordinateType.Relative, this._offsetX++),
                new CoordinatePart(CoordinateType.Relative, 3),
                new CoordinatePart(CoordinateType.Relative, this._offsetX)
            ),
            new Nbt(new NbtObject({
                CustomName: new NbtString(new NbtObject({text: new NbtString(name, true)}).toString()),
                CustomNameVisible: new NbtNumber(1, NumberType.Byte),
                Tags: new NbtArray([
                    new NbtString(name)
                ])
            }))
        ]));
    }

    _cleanup(scope = this.fn.getCurrentScope()) {
        this.fn.push(new Comment("Variable cleanup"));
        for (const variable of scope) {
            if (variable.disableCleanup) continue;

            this.fn.push(new Command("kill", [
                Processor.getVariableSelector(variable)
            ]));
        }

        if (this.fn.getCurrentScope().length === 0) {
            this.fn.push(new Comment("(No variables to clean up)"));
        }
    }

    _handleBlock(description: string, name: string, {statements}: Block, cleanup = true) {
        const newName = this.fn.begin(description, name);

        statements.forEach(this._handleStatement.bind(this));

        if (cleanup) this._cleanup();

        this.fn.end();

        return newName;
    }

    _handleStatement(statement: Statement) {
        switch (statement.type) {
            case "VariableInit":
                this._handleVariableInit(statement);
                break;
            case "VariableDeclaration":
                this._handleVariableDeclaration(statement);
                break;
            case "FunctionDeclaration":
                this._handleFunctionDeclaration(statement);
                break;
            case "FunctionCall":
                this._handleFunctionCall(statement);
                break;
            case "Assignment":
                this._handleAssignment(statement);
                break;

        }
    }

    _handleVariableInit(statement: VariableInit) {
        this._handleVariableDeclaration({
            ...statement,
            type: "VariableDeclaration"
        });

        this._handleAssignment({
            type: "Assignment",
            value: statement.value,
            name: statement.name
        });
    }

    _handleVariableDeclaration(statement: VariableDeclaration): VariableInformation {
        if (this.fn.hasVariable(statement.name)) throw new Error(`Variable ${statement.name} already exists`);

        const srcName = statement.name.value;

        switch (statement.varType.value) {
            case "int": {
                return this._createIntVariable(statement.name.value,
                    Processor.isExposed(statement) && statement.name.value);
            }
            case "entity": {
                const name = Processor.isExposed(statement) ? statement.name.value : ObjectiveNameGenerator.generate(32);

                // we won't actually create anything here.
                // we will just store the entity tag name for later use

                const variable: EntityVariableInformation = {
                    type: "entity",
                    srcName,
                    tag: name
                };

                this.fn.getCurrentScope().push(variable);

                return variable;
            }
            default: {
                throw new Error("Invalid variable type, expected int or entity");
            }
        }
    }

    _handleFunctionDeclaration(statement: FunctionDeclaration) {
        const name = this._handleBlock(statement.name.value,
            Processor.isExposed(statement) && statement.name.value, statement.block);

        if (Processor.hasDecorator(statement, "tick")) this.tickFunctions.push(name);
        if (Processor.hasDecorator(statement, "setup")) this.setupFunctions.push(name);
        if (Processor.hasDecorator(statement, "cleanup")) this.cleanupFunctions.push(name);
    }

    _handleFunctionCall(statement: FunctionCall) {
        if (hasStdFunc(statement.name.value)) {
            nativeStd[statement.name.value](this, statement.args);
            return;
        }

        if (this.fn.hasFunctionByDesc(statement.name.value)) {
            const fnName = this.fn.getFunctionName(statement.name.value);

            // todo: parameters
            this.fn.push(new Command("function", [
                s(`${this.namespace}:${fnName}`)
            ]));
        }
    }

    _handleAssignment(statement: Assignment) {
        const variable = [...this.fn.getGlobalScope(), ...this.fn.getCurrentScope()]
            .find(v => v.srcName === statement.name.value);

        if (statement.value.type === "FunctionCall") {
            return console.warn("warning: function call assignments are not currently supported");
        }

        const result = this._handleExpression(statement.value);

        if (variable.type !== result.type) throw new TypeError(`Cannot assign ${result.type} into ${variable.type}`);

        if (result.type === "int") {
            // move the value of result into variable

            this.fn.push(new Command("scoreboard", [
                s("players"),
                s("operation"),
                Processor.getVariableSelector(variable),
                s(Processor.valueObjective),
                s("="),
                Processor.getVariableSelector(result),
                s(Processor.valueObjective)
            ]));
        }
    }

    _handleExpression(expr: Expression) {
        switch (expr.type) {
            case "Comparison":
                return this._handleComparison(expr);
            case "Maths":
                return this._evaluateMaths(expr);
            case "identifier":
                return this.fn.getVariable(expr);
            case "int":
                return this._createIntVariable(this.autoName("constant_int"), null, expr.value);
            case "string":
                throw new Error("Not supported");
            case "Coordinate":
                throw new Error("Not supported");

        }
    }

    _handleComparison(expr: Comparison) {
        let resultVar: VariableInformation;

        if (expr.left.type === "int" ||
            (expr.left.type === "identifier" && this.fn.getVariable(expr.left).type === "int")) {
            resultVar = this._compareInts(expr.left, expr.right, expr.comparison);
        } else {
            throw new Error(`Cannot compare ${
                expr.left.type === "identifier" ?
                    this.fn.getVariable(expr.left).type :
                    expr.left.type
            }s`);
        }

        return resultVar;
    }

    getComparisonStr(comparison: ComparisonType) {
        switch (comparison) {
            case ComparisonType.Equal:
                return "=";
            case ComparisonType.NotEqual:
                return "=";
            case ComparisonType.GreaterThan:
                return ">";
            case ComparisonType.GreaterThanOrEqual:
                return ">=";
            case ComparisonType.LessThan:
                return "<";
            case ComparisonType.LessThanOrEqual:
                return "<=";
        }
    }

    _compareInts(left: Int | Identifier, right: Expression, comparison: ComparisonType) {
        // todo: warnings for static comparisons

        if (!(right.type === "int" || (right.type === "identifier" && this.fn.getVariable(right).type === "int"))) {
            const rightType = right.type === "identifier" ? this.fn.getVariable(right).type : right.type;
            throw new Error(`Comparison values must have same types (left=int, right=${rightType})`);
        }

        this.fn.push(new Comment(`Comparison between ${left.value} and ${right.value}`))

        const leftVariable = left.type === "identifier" ?
            this.fn.getVariable(left) :
            this._createIntVariable(this.autoName("comparison_left"), null, left.value);

        const rightVariable = right.type === "identifier" ?
            this.fn.getVariable(right) :
            this._createIntVariable(this.autoName("comparison_right"), null, right.value);

        const variable = this._createIntVariable(this.autoName("comparison"));

        this.fn.push(new Command("execute", [
            s(comparison === ComparisonType.NotEqual ? "unless" : "if"),
            s("score"),
            Processor.getVariableSelector(leftVariable),
            s(Processor.valueObjective),
            s(this.getComparisonStr(comparison)),
            Processor.getVariableSelector(rightVariable),
            s(Processor.valueObjective),
            s("run"),
            this.getIntVarSetter(variable, 1)
        ]));

        return variable;
    }

    _createIntVariable(desc: string, name?: string, value?: number) {
        if (!name) name = desc + "_" + ObjectiveNameGenerator.generate(32);

        // we need to create a marker here which will be used later to store the variable
        // we will also need to clean these up at the end of the block
        this._createMarker(name);

        const variable: IntVariableInformation = {
            type: "int",
            srcName: desc,
            score: name
        };

        this.fn.getCurrentScope().push(variable);

        if (value) this._setIntVariable(variable, value);

        return variable;
    }

    getIntVarSetter(variable: IntVariableInformation, value: number) {
        return new Command("scoreboard", [
            s("players"),
            s("set"),
            Processor.getVariableSelector(variable),
            s(Processor.valueObjective),
            s(value.toString())
        ]);
    }

    _setIntVariable(variable: IntVariableInformation, value: number) {
        this.fn.push(this.getIntVarSetter(variable, value));
    }

    getOperationString(operation: MathsOperation) {
        switch (operation) {
            case MathsOperation.Add:
                return "+=";
            case MathsOperation.Subtract:
                return "-=";
            case MathsOperation.Multiply:
                return "*=";
            case MathsOperation.Divide:
                return "/=";
            case MathsOperation.Remainder:
                return "%=";
        }
    }

    private _evaluateMaths(expr: Maths) {
        const output = this._createIntVariable(this.autoName("maths_output"));

        // attempt to statically calculate the value
        // this is only possible if there are no variable references
        // todo: detect constant variables and include them in static calculation
        const staticResult = this.staticMathsEvaluation(expr);
        if (staticResult !== false) {
            this._setIntVariable(output, staticResult);
            return output;
        }

        // if we get here, we can't statically calculate the value, so we will have to use scoreboards
        // this method is similar to comparisons
        const left = this._handleExpression(expr.left);
        const right = this._handleExpression(expr.right);

        // scoreboard maths is like machine code maths, the first input doubles as the output
        // so we copy left into output, then use output as the first input so it can be mutated
        this.fn.push(new Command("scoreboard", [
            s("players"),
            s("operation"),
            Processor.getVariableSelector(output),
            s(Processor.valueObjective),
            s("="),
            Processor.getVariableSelector(left),
            s(Processor.valueObjective)
        ]));

        // now we can operate on output
        this.fn.push(new Command("scoreboard", [
            s("players"),
            s("operation"),
            Processor.getVariableSelector(output),
            s(Processor.valueObjective),
            s(this.getOperationString(expr.operation)),
            Processor.getVariableSelector(right),
            s(Processor.valueObjective)
        ]));

        return output;
    }

    private extractValueForMaths(expr: Expression): number | false | null {
        return expr.type === "int" ?
            expr.value :
            expr.type === "identifier" ?
                false :
                expr.type === "Maths" ?
                    this.staticMathsEvaluation(expr) :
                    null
    }

    private staticMathsEvaluation(expr: Maths): number | false {
        const left = this.extractValueForMaths(expr.left);

        if (left === false) return false;
        if (left === null) throw new Error("Expected int, operation, or identifier in operation");

        const right = this.extractValueForMaths(expr.right);

        if (right === false) return false;
        if (right === null) throw new Error("Expected int, operation, or identifier in operation");

        switch (expr.operation) {
            case MathsOperation.Add:
                return left + right;
            case MathsOperation.Subtract:
                return left - right;
            case MathsOperation.Multiply:
                return left * right;
            case MathsOperation.Divide:
                return left / right;
            case MathsOperation.Remainder:
                return left % right;
        }
    }

    autoNameIncr = 0;
    private autoName(base: string) {
        return `${this.fn.getFunctionDesc()}_${this.autoNameIncr++}__${base}`;
    }
}

export default function process(src: AST, namespace: string) {
    const processor = new Processor(src, namespace);
    return processor.process();
}
