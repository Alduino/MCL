import {
    Assignment as PegAssignment,
    ASTKinds,
    Block as PegBlock,
    Comparison as PegComparison,
    Coordinate as PegCoordinate,
    CoordinateValue as PegCoordinateValue,
    DecoratorPart,
    Expression as PegExpression,
    FunctionCall as PegFunctionCall,
    FunctionDeclaration as PegFunctionDeclaration,
    Identifier as PegIdentifier,
    Int as PegInt,
    MainProgram,
    Maths as PegMaths,
    NamedArgument as PegNamedArgument,
    Program,
    Program_$0_1,
    Statement as PegStatement,
    String as PegString,
    VariableDeclaration as PegVariableDeclaration,
    VariableInit as PegVariableInit
} from "./parser";
import {AST, Block, Identifier, Int, Statement, String} from "./ast-structure/root-types";
import VariableInit from "./ast-structure/VariableInit";
import FunctionCall from "./ast-structure/FunctionCall";
import Expression from "./ast-structure/Expression";
import Comparison, {ComparisonType} from "./ast-structure/Comparison";
import Maths, {MathsOperation} from "./ast-structure/Maths";
import Coordinate, {CoordinateType, CoordinateValue} from "./ast-structure/Coordinate";
import VariableDeclaration from "./ast-structure/VariableDeclaration";
import FunctionDeclaration from "./ast-structure/FunctionDeclaration";
import Assignment from "./ast-structure/Assignment";
import Decorator from "./ast-structure/Decorator";

export default function simplify(src: MainProgram): AST {
    return loadProgAsBlock(src.prog);
}

function loadProgAsBlock(src: Program): Block {
    return {
        type: "block",
        statements: src.x
            .filter(v => v.kind === ASTKinds.Program_$0_1)
            .map((v: Program_$0_1) => loadStatement(v.y.statement))
    };
}

function loadIdentifier(src: PegIdentifier): Identifier {
    return {
        type: "identifier",
        value: src.value
    };
}

function loadDecorators(src?: DecoratorPart): Decorator[] {
    if (src == null) return [];

    return [
        ...src.decorator.items.list.map(it => loadIdentifier(it.val)),
        loadIdentifier(src.decorator.items.last)
    ];
}

function loadComparison(src: PegComparison): Comparison {
    let comparisonType: ComparisonType;

    switch (src.comparison) {
        case "==":
            comparisonType = ComparisonType.Equal;
            break;
        case "!=":
            comparisonType = ComparisonType.NotEqual;
            break;
        case ">":
            comparisonType = ComparisonType.GreaterThan;
            break;
        case "<":
            comparisonType = ComparisonType.LessThan;
            break;
        case ">=":
            comparisonType = ComparisonType.GreaterThanOrEqual;
            break;
        case "<=":
            comparisonType = ComparisonType.LessThanOrEqual;
            break;
        default:
            throw new RangeError("Invalid comparison type");
    }

    return {
        type: "Comparison",
        left: loadExpression(src.left),
        comparison: comparisonType,
        right: loadExpression(src.right)
    };
}

function loadMaths(src: PegMaths): Maths {
    let operation: MathsOperation;

    switch (src.op) {
        case "+":
            operation = MathsOperation.Add;
            break;
        case "-":
            operation = MathsOperation.Subtract;
            break;
        case "*":
            operation = MathsOperation.Multiply;
            break;
        case "/":
            operation = MathsOperation.Divide;
            break;
        case "%":
            operation = MathsOperation.Remainder;
            break;
    }

    return {
        type: "Maths",
        left: loadExpression(src.left),
        operation,
        right: loadExpression(src.right)
    };
}

function loadCoordinateValue(src: PegCoordinateValue): CoordinateValue {
    let type: CoordinateType;
    let value: number;

    switch (src.kind) {
        case ASTKinds.CoordinateValue_1:
            type = CoordinateType.Relative;
            value = parseFloat(src.relative.pos?.value || "0");
            break;
        case ASTKinds.CoordinateValue_2:
            type = CoordinateType.Local;
            value = parseFloat(src.local.pos?.value || "0");
            break;
        case ASTKinds.CoordinateValue_3:
            type = CoordinateType.Absolute;
            value = parseFloat(src.absolute.value);
            break;
    }

    return {
        type,
        value
    };
}

function loadCoordinate(src: PegCoordinate): Coordinate {
    return {
        type: "Coordinate",
        x: loadCoordinateValue(src.x),
        y: loadCoordinateValue(src.y),
        z: loadCoordinateValue(src.z)
    };
}

function loadInt(src: PegInt): Int {
    return {
        type: "int",
        value: parseInt(src.value)
    };
}

function loadString(src: PegString): String {
    return {
        type: "string",
        value: src.value.substring(1, src.value.length - 1)
    };
}

function loadExpression(src: PegExpression): Expression {
    switch (src.kind) {
        case ASTKinds.Expression_1:
            return loadExpression(src.sub.val);
        case ASTKinds.Comparison:
            return loadComparison(src);
        case ASTKinds.Maths:
            return loadMaths(src);
        case ASTKinds.Coordinate:
            return loadCoordinate(src);
        case ASTKinds.Identifier:
            return loadIdentifier(src);
        case ASTKinds.Int:
            return loadInt(src);
        case ASTKinds.String:
            return loadString(src);
    }
}

function loadArgument(src: PegExpression | PegBlock) {
    return typeof src === "string" || src.kind !== ASTKinds.Block ?
        loadExpression(src) :
        loadProgAsBlock(src.program);
}

function loadFunctionCall(src: PegFunctionCall): FunctionCall {
    const allArgs = [...src.args.list.map(v => v.arg), src.args.last, src.lastFnArg]
        .filter(v => v != null);

    return {
        type: "FunctionCall",
        name: loadIdentifier(src.fn),
        args: {
            type: "ArgumentList",
            named: Object.fromEntries(allArgs
                .filter(v => typeof v !== "string" && v.kind === ASTKinds.NamedArgument)
                .map((v: PegNamedArgument) => [v.name.value, loadArgument(v.value)])),
            positional: allArgs
                .filter(v => typeof v === "string" || v.kind !== ASTKinds.NamedArgument)
                .map(loadArgument)
        }
    };
}

function loadVariableValue(src: PegFunctionCall | PegExpression) {
    if (typeof src === "string" || src.kind !== ASTKinds.FunctionCall) return loadExpression(src);
    return loadFunctionCall(src);
}

function loadVariableInit(src: PegVariableInit): VariableInit {
    return {
        type: "VariableInit",
        decorators: loadDecorators(src.decl.decorator),
        name: loadIdentifier(src.decl.name),
        varType: loadIdentifier(src.decl.type),
        value: loadVariableValue(src.value)
    };
}

function loadVariableDeclaration(src: PegVariableDeclaration): VariableDeclaration {
    return {
        type: "VariableDeclaration",
        decorators: loadDecorators(src.decorator),
        name: loadIdentifier(src.name),
        varType: loadIdentifier(src.type)
    };
}

function loadFunctionDeclaration(src: PegFunctionDeclaration): FunctionDeclaration {
    return {
        type: "FunctionDeclaration",
        decorators: loadDecorators(src.decorator),
        name: loadIdentifier(src.name),
        block: loadProgAsBlock(src.block.program)
    };
}

function loadAssignment(src: PegAssignment): Assignment {
    let value: FunctionCall | Expression;

    if (typeof src.value === "string" || src.value.kind !== ASTKinds.FunctionCall) {
        value = loadExpression(src.value);
    } else {
        value = loadFunctionCall(src.value);
    }

    return {
        type: "Assignment",
        name: loadIdentifier(src.variable),
        value
    };
}

function loadStatement(src: PegStatement): Statement {
    switch (src.kind) {
        case ASTKinds.VariableInit:
            return loadVariableInit(src);
        case ASTKinds.VariableDeclaration:
            return loadVariableDeclaration(src);
        case ASTKinds.FunctionDeclaration:
            return loadFunctionDeclaration(src);
        case ASTKinds.FunctionCall:
            return loadFunctionCall(src);
        case ASTKinds.Assignment:
            return loadAssignment(src);
    }
}
