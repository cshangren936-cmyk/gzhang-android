import { roundMoney } from "./money";

type Operator = "+" | "-" | "*" | "/";

const precedence: Record<Operator, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

function isOperator(token: string): token is Operator {
  return token === "+" || token === "-" || token === "*" || token === "/";
}

function tokenize(expression: string): string[] {
  const normalized = expression
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll(",", "")
    .replace(/\s+/g, "");
  if (!normalized) return [];
  const tokens = normalized.match(/\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
  if (tokens.join("") !== normalized) {
    throw new Error("INVALID_EXPRESSION");
  }
  return tokens;
}

export function evaluateExpression(expression: string): number {
  const tokens = tokenize(expression);
  if (!tokens.length) throw new Error("INVALID_EXPRESSION");

  const output: string[] = [];
  const operators: string[] = [];
  let previous: string | undefined;

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      output.push(token);
    } else if (token === "(") {
      operators.push(token);
    } else if (token === ")") {
      while (operators.length && operators.at(-1) !== "(") {
        output.push(operators.pop()!);
      }
      if (operators.pop() !== "(") throw new Error("INVALID_EXPRESSION");
    } else if (isOperator(token)) {
      if (
        token === "-" &&
        (!previous || previous === "(" || isOperator(previous))
      ) {
        output.push("0");
      }
      while (
        operators.length &&
        isOperator(operators.at(-1)!) &&
        precedence[operators.at(-1)! as Operator] >= precedence[token]
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    }
    previous = token;
  }

  while (operators.length) {
    const operator = operators.pop()!;
    if (operator === "(") throw new Error("INVALID_EXPRESSION");
    output.push(operator);
  }

  const stack: number[] = [];
  for (const token of output) {
    if (!isOperator(token)) {
      stack.push(Number(token));
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      throw new Error("INVALID_EXPRESSION");
    }
    if (token === "/" && right === 0) throw new Error("DIVIDE_BY_ZERO");
    stack.push(
      token === "+"
        ? left + right
        : token === "-"
          ? left - right
          : token === "*"
            ? left * right
            : left / right,
    );
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error("INVALID_EXPRESSION");
  }
  return roundMoney(stack[0]);
}

