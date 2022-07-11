import {Command, Comment} from "../pregen-structure/PreGen";
import ObjectiveNameGenerator from "./ObjectiveNameGenerator";
import {VariableInformation} from "./process";
import {Identifier} from "../parser/ast-structure/root-types";

export default class FunctionManager {
    private parentFunctions: string[] = [];
    private currentFunction: string;

    private readonly functions: Map<string, (Command | Comment)[]> = new Map();
    private readonly functionVars: Map<string, VariableInformation> = new Map();
    private readonly functionDescriptionToName: Map<string, string> = new Map();
    private readonly functionNameToDescription = new Map<string, string>();

    private readonly globalScope: VariableInformation[] = [];
    private parentScopes: VariableInformation[][] = [];
    private currentScope: VariableInformation[] = [];

    private useParent = false;
    private aups = false;

    begin(description: string, name?: string) {
        if (!name) {
            name =
                description.replace(/[^a-zA-Z0-9-_]+/g, "_") + "_" +
                ObjectiveNameGenerator.generate(32);
        }

        if (this.functions.has(name)) throw new Error(`Function ${name} already exists`);

        this.functions.set(name, [
            new Comment(`Begin function ${description}, child of ${this.functionNameToDescription.get(this.currentFunction) || this.currentFunction || "the root function"}`)
        ]);

        this.functionDescriptionToName.set(description, name);
        this.functionNameToDescription.set(name, description);

        this.parentFunctions.push(this.currentFunction);
        this.currentFunction = name;

        this.parentScopes.push(this.currentScope);
        this.currentScope = [];

        return name;
    }

    end() {
        const name = this.currentFunction;
        if (!this.functions.has(name)) throw new Error(`Function ${name} does not exist`);

        this.currentScope = this.parentScopes.pop();
        this.currentFunction = this.parentFunctions.pop();
    }

    getCurrent() {
        return this.functions.get(this.currentFunction);
    }

    hasFunctionByDesc(description: string) {
        return this.functionDescriptionToName.has(description);
    }

    getFunctionName(description: string) {
        if (!this.functionDescriptionToName.has(description)) throw new Error(`Function ${description} does not exist`);
        return this.functionDescriptionToName.get(description);
    }

    getVariable(desc: Identifier, scope = this.getEveryScope()) {
        if (!this.hasVariable(desc)) throw new Error(`Variable ${desc.value} does not exist`);
        return scope.find(v => v.srcName === desc.value);
    }

    hasVariable(desc: Identifier, scope = this.getEveryScope()) {
        return scope.some(v => v.srcName === desc.value);
    }

    getCurrentScope() {
        if (this.inGlobalScope()) return this.getGlobalScope();
        return this.useParent ? (this.parentScopes[0] ?? this.globalScope) : this.currentScope;
    }

    getGlobalScope() {
        return this.globalScope;
    }

    getEveryScope() {
        return [...this.currentScope, ...this.globalScope, ...this.parentScopes.flat()];
    }

    inGlobalScope() {
        return this.useParent && !this.aups ? this.parentScopes.length <= 2 : this.parentScopes.length <= 1;
    }

    getAll(): ReadonlyMap<string, (Command | Comment)[]> {
        return this.functions;
    }

    optimise() {
        const resFns = new Map<string, (Command | Comment)[]>();
        const skipped = new Set<string>();

        for (const [name, fn] of Array.from(this.functions.entries())) {
            if (skipped.has(name)) continue;

            const resCommands: (Command | Comment)[] = [];

            for (const command of fn) {
                console.log(command);

                if (command.type === "comment") {
                    resCommands.push(command);
                    continue;
                }

                if (command.name === "function") {
                    const fnNameContainer = command.arguments[0];
                    if (fnNameContainer.type !== "nbt") throw new Error("Execute argument must be an nbt string");
                    const fnNameValue = fnNameContainer.value;
                    if (fnNameValue.type !== "nbt.string") throw new Error("Execute argument must be an nbt string");
                    const fnName = fnNameValue.value.split(":")[1];
                    if (!this.functions.has(fnName)) {
                        throw new Error(`Could not find function "${fnName}" called in "${name}"`);
                    }
                    const targetFunction = this.functions.get(fnName);

                    const commandCalls = targetFunction.filter(el => el.type === "command");

                    if (commandCalls.length === 0) {
                        // no need to call an empty function
                        skipped.add(fnName);
                        resFns.delete(fnName);
                        continue;
                    }

                    if (commandCalls.length === 1) {
                        // replace this command with the inner command
                        skipped.add(fnName);
                        resFns.delete(fnName);
                        resCommands.push(commandCalls[0]);
                        continue;
                    }

                    resCommands.push(command);
                }
            }

            resFns.set(name, resCommands);
        }

        return resFns;
    }

    push(...items: (Comment | Command)[]) {
        this.getCurrent().push(...items);
    }

    getFunctionDesc() {
        return this.functionNameToDescription.get(this.currentFunction) ?? "the root function";
    }

    useParentScope(force = true) {
        this.useParent = force;
    }

    enableAdvancedUPS(value = true) {
        this.aups = value;
    }

    beginAUPS() {
        this.aups = false;
    }

    endAUPS() {
        this.aups = true;
    }

    setFunctionVariable(name: string, variable: VariableInformation) {
        this.functionVars.set(name, variable);
    }

    getFunctionVariable(name: string) {
        return this.functionVars.get(name);
    }

    getScope(variable: VariableInformation) {
        // search through every scope to find it
        // it's not very efficient but it will have to do for now

        if (this.getGlobalScope().includes(variable)) return this.getGlobalScope();
        if (this.getCurrentScope().includes(variable)) return this.getCurrentScope();

        for (const scope of this.parentScopes) {
            if (scope.includes(variable)) return scope;
        }

        throw new Error(`Variable ${variable.srcName} is not defined`);
    }
}
