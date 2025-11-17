import { ESyntax, IInterpreterCursor, IInterpreterParams } from "./types";
import { Token, Tokens } from "./tokenizer";
import { inspect } from "util";

export interface ITokensCursor {
  index: number;
}

export interface IValidator {
  accepts(uri: string, cursor: ITokensCursor): boolean;
}

export abstract class Syntax<T extends ESyntax = ESyntax>
  implements IValidator
{
  constructor(public type: T) {}
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `${ESyntax[this.type]}`;
  }
  static consume(tokens: Token[], cursor: ITokensCursor): Syntax | undefined {
    return undefined;
  }
  abstract accepts(uri: string, cursor: ITokensCursor): boolean;
  abstract toString(params: IInterpreterParams): string;
}

export function generateSyntax<T extends ESyntax>(type: T) {
  abstract class DynamicSyntax extends Syntax<T> {
    constructor() {
      super(type);
    }
  }
  return DynamicSyntax;
}

export abstract class ValueSyntax<
  T extends ESyntax = ESyntax,
  K = any,
> extends Syntax<T> {
  constructor(
    type: T,
    public value: K,
  ) {
    super(type);
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `${ESyntax[this.type]} ${inspect(this.value, false, null, true)}`;
  }
  static consume(tokens: Token[], cursor: ITokensCursor): Syntax | undefined {
    return undefined;
  }
}

export function generateValueSyntax<T extends ESyntax, K>(type: T) {
  abstract class DynamicSyntax extends ValueSyntax<T, K> {
    constructor(value: K) {
      super(type, value);
    }
  }
  return DynamicSyntax;
}

export namespace Expressions {
  export class Literal extends generateValueSyntax<ESyntax.Literal, string>(
    ESyntax.Literal,
  ) {
    static consume(tokens: Token[], cursor: ITokensCursor): Syntax | undefined {
      const token = tokens[cursor.index];
      if (token instanceof Tokens.LiteralToken) {
        cursor.index++;
        return new Literal(token.value);
      }
      return;
    }

    accepts(uri: string, cursor: IInterpreterCursor): boolean {
      if (uri.startsWith(this.value, cursor.index)) {
        cursor.index += this.value.length;
        return true;
      }
      return false;
    }
    toString() {
      return this.value;
    }
  }

  export class Parameter extends generateValueSyntax<ESyntax.Parameter, string>(
    ESyntax.Parameter,
  ) {
    static consume(tokens: Token[], cursor: ITokensCursor): Syntax | undefined {
      const operator = tokens[cursor.index];
      const literal = tokens[cursor.index + 1];
      if (
        operator instanceof Tokens.ParameterOperator &&
        literal instanceof Tokens.LiteralToken
      ) {
        cursor.index += 2;
        return new Parameter(literal.value);
      }
      return;
    }

    accepts(uri: string, cursor: IInterpreterCursor): boolean {
      let next = uri.indexOf("/", cursor.index);
      if (next < 0) {
        next = uri.length;
      }
      const segment = uri.slice(cursor.index, next);
      if (segment.length > 0) {
        cursor.index += segment.length;
        cursor.params[this.value] = segment;
        return true;
      }

      return false;
    }
    toString(params: IInterpreterParams) {
      return params[this.value] ?? this.value;
    }
  }

  export type GroupChild = Literal | Parameter | Directory | Group;
  export class Group extends generateValueSyntax<ESyntax.Group, GroupChild[]>(
    ESyntax.Group,
  ) {
    static consume(tokens: Token[], cursor: ITokensCursor): Syntax | undefined {
      const start = tokens[cursor.index];
      if (!(start instanceof Tokens.GroupStart)) return;

      cursor.index++;

      const children: Syntax[] = consumeTokens(
        tokens,
        cursor,
        [Literal, Parameter, Directory, Group],
        (t, c) => {
          const token = t[c.index];
          if (token instanceof Tokens.GroupEnd) {
            return token.scope == start.scope;
          }
          return c.index > t.length;
        },
      );

      return new this(children as GroupChild[]);
    }

    accepts(uri: string, cursor: IInterpreterCursor): boolean {
      return true;
    }

    toString(params: IInterpreterParams): string {
      return this.value.map((it) => it.toString(params)).join("");
    }
  }

  export type DirectoryChild = GroupChild;
  export class Directory extends generateValueSyntax<
    ESyntax.Directory,
    DirectoryChild[]
  >(ESyntax.Directory) {
    optional: boolean = true;

    static consume(tokens: Token[], cursor: ITokensCursor): Syntax | undefined {
      const token = tokens[cursor.index];
      if (token instanceof Tokens.DirectoryOperator) {
        cursor.index++;
        return new Directory([]);
      }
      return;
    }

    accepts(uri: string, cursor: IInterpreterCursor): boolean {
      // Special case: Terminal directory may be optional

      if (cursor.index == uri.length && this.optional) {
        return true;
      }

      if (uri.startsWith("/", cursor.index)) {
        cursor.index++;
        return true;
      }

      return false;
    }

    toString(params: IInterpreterParams): string {
      return "/" + this.value.map((it) => it.toString(params)).join("");
    }
  }
}

export function consumeTokens<
  ValidSyntax extends {
    consume(tokens: Token[], cursor: ITokensCursor): Syntax | undefined;
  }[],
>(
  tokens: Token[],
  cursor: ITokensCursor,
  validSyntax: ValidSyntax,
  stop?: (tokens: Token[], cursor: ITokensCursor) => boolean,
) {
  const result: Syntax[] = [];

  while (!stop?.(tokens, cursor)) {
    let matched = false;
    for (const SyntaxElement of validSyntax) {
      const child = SyntaxElement.consume(tokens, cursor);
      if (child) {
        result.push(child);
        matched = true;
        break;
      }
    }

    if (!matched) break;
  }

  return result;
}

export function toAST(tokens: Token[]): Syntax[] {
  const cursor: ITokensCursor = {
    index: 0,
  };

  return consumeTokens(
    tokens,
    cursor,
    [
      Expressions.Directory,
      Expressions.Group,
      Expressions.Parameter,
      Expressions.Literal,
    ],
    (t, c) => c.index > t.length,
  );
}
