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
import assert from "assert";

export interface EntityVariableInformation {
    type: "entity";
    srcName: string;
    tag: string;
    userCreated: boolean;

    // Overrides the selector with this one
    selectorOverride?: Selector;
}

export interface IntVariableInformation {
    type: "int";
    srcName: string;
    score: string;
    userCreated: boolean;
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
    readonly root: AST;
    readonly namespace: string;
    readonly setupFunctions: string[] = [];
    readonly tickFunctions: string[] = [];
    readonly cleanupFunctions: string[] = [];
    fn = new FunctionManager();
    _offsetX = 0;
    private autoNameIncr = 0;

    constructor(root: AST, namespace: string) {
        this.root = root;
        this.namespace = namespace;
    }

    static getVariableSelector(variable: VariableInformation) {
        if (variable.type === "entity") {
            if (variable.selectorOverride) return variable.selectorOverride;

            return new Selector([
                new SelectorArgument("tag", variable.tag),
                new SelectorArgument("limit", new Range(1, 1))
            ], SelectorTarget.Entities);
        } else if (variable.type === "int") {
            return new Selector([
                new SelectorArgument("tag", variable.score),
                new SelectorArgument("limit", new Range(1, 1))
            ], SelectorTarget.Entities);
        } else throw new Error(`Invalid variable type, expected entity or int`)
    }

    static hasDecorator(anything: WithDecorators, decorator: string) {
        return anything.decorators.some(it => it.name.value === decorator);
    }

    static getDecorator(anything: WithDecorators, name: string) {
        if (!this.hasDecorator(anything, name)) throw new Error("Cannot get decorator that does not exist");
        return anything.decorators.find(it => it.name.value === name);
    }

    static isExposed(statement: WithDecorators) {
        return this.hasDecorator(statement, "expose")
    }

    static isStdVar(statement: WithDecorators) {
        return this.hasDecorator(statement, "stdvar");
    }

    static getStdVar(statement: WithDecorators) {
        const decorator = this.getDecorator(statement, "stdvar");
        const varName = decorator.args.positional[0];
        if (!varName) throw new Error("stdvar decorator must specify the name as a positional argument");
        return varName;
    }

    process() {
        this.setupFunctions.push("__root");
        this._handleBlock("__root", "__root", this.root);

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

    _handleBlock(description: string, name: string, {statements}: Block) {
        const newName = this.fn.begin(description, name);
        let lastStatementResult: VariableInformation = null;

        for (let i = 0; i < statements.length; i++) {
            if (i === statements.length - 1) {
                // the last statement's result is used as the return value, so it needs to be stored in a scope that
                // won't be cleaned up too early. so we store it in the parent scope, as it is the function using the
                // value. unfortunately this has the side effect that any variables created will be stored one level
                // up even if they don't need to be.
                this.fn.useParentScope();
                lastStatementResult = this._handleStatement(statements[i]);
                this.fn.useParentScope(false);
            } else {
                this._handleStatement(statements[i]);
            }
        }

        this.fn.setFunctionVariable(newName, lastStatementResult);

        this.fn.end();

        return {
            name: newName,
            result: lastStatementResult
        };
    }

    _handleStatement(statement: Statement): VariableInformation {
        switch (statement.type) {
            case "VariableInit":
                return this._handleVariableInit(statement);
            case "VariableDeclaration":
                return this._handleVariableDeclaration(statement);
            case "FunctionDeclaration":
                return this._handleFunctionDeclaration(statement);
            case "FunctionCall":
                return this._handleFunctionCall(statement);
            case "Assignment":
                return this._handleAssignment(statement);
        }
    }

    _handleVariableInit(statement: VariableInit): VariableInformation {
        const variable = this._handleVariableDeclaration({
            ...statement,
            type: "VariableDeclaration"
        });

        this._handleAssignment({
            type: "Assignment",
            value: statement.value,
            name: statement.name
        });

        return variable;
    }

    getEntityStdVarInfo(srcName: string, name: string): EntityVariableInformation {
        return {
            type: "entity",
            srcName,
            tag: name,
            selectorOverride: new Selector([], SelectorTarget.EveryPlayer),
            userCreated: false
        };
    }

    getEntityVarInfo(srcName: string, name: string, userCreated = false): EntityVariableInformation {
        return {
            type: "entity",
            srcName,
            tag: name,
            userCreated
        };
    }

    _handleVariableDeclaration(statement: VariableDeclaration): VariableInformation {
        if (this.fn.hasVariable(statement.name)) throw new Error(`Variable ${statement.name.value} already exists`);

        const srcName = statement.name.value;

        switch (statement.varType.value) {
            case "int": {
                return this._createIntVariable(statement.name.value,
                    Processor.isExposed(statement) && statement.name.value, undefined, true);
            }
            case "entity": {
                const name = Processor.isExposed(statement) ? statement.name.value : ObjectiveNameGenerator.generate(32);
                const stdVar = Processor.isStdVar(statement) ? Processor.getStdVar(statement) : null;

                // we won't actually create anything here.
                // we will just store the entity tag name for later use

                const variable = stdVar ?
                    this.getEntityStdVarInfo(srcName, name) :
                    this.getEntityVarInfo(srcName, name, true);

                this.fn.getCurrentScope().push(variable);

                return variable;
            }
            default: {
                throw new Error("Invalid variable type, expected int or entity");
            }
        }
    }

    _handleFunctionDeclaration(statement: FunctionDeclaration): null {
        const {name} = this._handleBlock(statement.name.value,
            Processor.isExposed(statement) && statement.name.value, statement.block);

        if (Processor.hasDecorator(statement, "tick")) this.tickFunctions.push(name);
        if (Processor.hasDecorator(statement, "setup")) this.setupFunctions.push(name);
        if (Processor.hasDecorator(statement, "cleanup")) this.cleanupFunctions.push(name);

        return null;
    }

    _handleFunctionCall(statement: FunctionCall) {
        if (hasStdFunc(statement.name.value)) {
            return nativeStd[statement.name.value](this, statement.args);
        }

        if (this.fn.hasFunctionByDesc(statement.name.value)) {
            const fnName = this.fn.getFunctionName(statement.name.value);

            // todo: parameters
            this.fn.push(new Command("function", [
                s(`${this.namespace}:${fnName}`)
            ]));

            console.log("Function variable for", statement.name.value, "is", this.fn.getFunctionVariable(fnName));
            return this.fn.getFunctionVariable(fnName);
        }

        throw new Error(`Cannot call undefined function ${statement.name.value}`);
    }

    _handleAssignment(statement: Assignment): VariableInformation {
        const variable = this.fn.getVariable(statement.name);

        let result: VariableInformation;

        if (statement.value.type === "FunctionCall") {
            result = this._handleFunctionCall(statement.value);
        } else {
            result = this._handleExpression(statement.value);
        }

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

            this._deleteVariable(result);
        } else {
            // we already know variable is an entity, but typescript doesn't so this will make it
            assert(variable.type === "entity");

            this._deleteVariable(variable);

            // remove the new variable from its old scope (i.e. move ownership to new variable's scope)
            const oldScope = this.fn.getScope(result);
            oldScope.slice(oldScope.indexOf(result), 1);

            this.fn.push(new Command("tag", [
                Processor.getVariableSelector(result),
                s("add"),
                s(variable.tag)
            ]));
        }

        return variable;
    }

    _handleExpression(expr: Expression) {
        this.fn.enableAdvancedUPS(false);
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

        this.fn.enableAdvancedUPS();
        const leftVariable = left.type === "identifier" ?
            this.fn.getVariable(left) :
            this._createIntVariable(this.autoName("comparison_left"), null, left.value);

        const rightVariable = right.type === "identifier" ?
            this.fn.getVariable(right) :
            this._createIntVariable(this.autoName("comparison_right"), null, right.value);

        const variable = this._createIntVariable(this.autoName("comparison"));

        this.fn.beginAUPS();
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
        this.fn.endAUPS();

        this._deleteVariable(leftVariable);
        this._deleteVariable(rightVariable);

        this.fn.enableAdvancedUPS(false);

        return variable;
    }

    _createIntVariable(desc: string, name?: string, value?: number, userCreated = false) {
        if (!name) name = desc + "_" + ObjectiveNameGenerator.generate(32);

        // we need to create a marker here which will be used later to store the variable
        // we will also need to clean these up at the end of the block
        this._createMarker(name);

        const variable: IntVariableInformation = {
            type: "int",
            srcName: desc,
            score: name,
            userCreated
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

    autoName(base: string) {
        return `__${this.fn.getFunctionDesc()}_${this.autoNameIncr++}__${base}`;
    }

    _deleteVariable(variable: VariableInformation, force = false) {
        if (!force && variable.userCreated) return;

        this.fn.push(new Command("kill", [
            Processor.getVariableSelector(variable)
        ]));
    }

    private _evaluateMaths(expr: Maths) {
        console.log("Evaluate maths:", expr, "in", this.fn.getFunctionDesc());

        this.fn.push(new Comment("Evaluating maths expression"));

        this.fn.enableAdvancedUPS();

        this.fn.beginAUPS();
        const output = this._createIntVariable(this.autoName("maths_output"));
        this.fn.endAUPS();

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

        this.fn.enableAdvancedUPS(false);

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

        this._deleteVariable(left);
        this._deleteVariable(right);

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
}

export default function process(src: AST, namespace: string) {
    const processor = new Processor(src, namespace);
    return processor.process();
}
