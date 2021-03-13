import {Command, Comment} from "../pregen-structure/PreGen";
import ObjectiveNameGenerator from "./ObjectiveNameGenerator";
import {VariableInformation} from "./process";
import {Identifier} from "../parser/ast-structure/root-types";

export default class FunctionManager {
    private parentFunctions: string[] = [];
    private currentFunction: string;

    private readonly functions: Map<string, (Command | Comment)[]> = new Map();
    private readonly functionVars: Map<string, VariableInformation> = new Map();
    private readonly functionMapping: Map<string, string> = new Map();

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
            new Comment(`Begin function ${description}, child of ${this.functionMapping.get(this.currentFunction) || this.currentFunction || "the root function"}`)
        ]);

        this.functionMapping.set(description, name);

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
        return this.functionMapping.has(description);
    }

    getFunctionName(description: string) {
        if (!this.functionMapping.has(description)) throw new Error(`Function ${description} does not exist`);
        return this.functionMapping.get(description);
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

    push(...items: (Comment | Command)[]) {
        this.getCurrent().push(...items);
    }

    getFunctionDesc() {
        return Array.from(this.functionMapping.entries()).find(v => v[1] === this.currentFunction)?.[0] || "the root function";
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
