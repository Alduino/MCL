import VariableInit from "./VariableInit";
import VariableDeclaration from "./VariableDeclaration";
import FunctionDeclaration from "./FunctionDeclaration";
import FunctionCall from "./FunctionCall";
import Assignment from "./Assignment";

export type AST = Block;

export interface Block {
    type: "block";
    statements: Statement[];
}

export type Statement = VariableInit | VariableDeclaration | FunctionDeclaration | FunctionCall | Assignment;

export interface Int {
    type: "int";
    value: number;
}

export interface String {
    type: "string";
    value: string;
}

export interface Identifier {
    type: "identifier";
    value: string;
}
