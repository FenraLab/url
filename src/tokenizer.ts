import { EToken } from "./types";

export interface ILexerCursor {
	index: number;
	scope: number;
	[key: string]: any;
}

export class Token<
	ETokenType extends EToken = EToken
>{
	constructor(public type: ETokenType){}
	static consume(input: string, cursor: ILexerCursor): Token | undefined {
		throw new Error("Method not implemented.");
	}
}
export class ValueToken<
	ETokenType extends EToken = EToken,
	ValueType = unknown
> extends Token<ETokenType> {
	constructor(type: ETokenType, public value: ValueType) {super(type)}
	static consume(input: string, cursor: ILexerCursor): Token | undefined {
		throw new Error("Method not implemented.");
	}
}

export function generateToken<ETokenType extends EToken>(type: ETokenType) {
	return class DynamicToken extends Token<ETokenType> {
		constructor() {
			super(type);
		}
	};
}

export function generateValueToken<ETokenType extends EToken, K>(
	type: ETokenType
) {
	return class DynamicToken extends ValueToken<ETokenType, K> {
		constructor(value: K) {
			super(type, value);
		}
	};
}

export function generatePunctuationToken<ETokenType extends EToken>(
	token: ETokenType,
	query: string
) {
	return class PunctuationToken extends generateToken(token) {
		static consume(input: string, cursor: ILexerCursor): Token | undefined {
			if (input.startsWith(query, cursor.index)) {
				cursor.index += query.length;
				return new this();
			}
		}
	};
}

export namespace Tokens {
	export class ParameterOperator extends generatePunctuationToken(
		EToken.ParameterOperator,
		":"
	) {}

	export class DirectoryOperator extends generatePunctuationToken(
		EToken.DirectoryOperator,
		"/"
	) {}

	export class GroupStart extends generatePunctuationToken(
		EToken.GroupStart,
		"{"
	) {
		public scope: number = 0;
		static consume(input: string, cursor: ILexerCursor): Token | undefined {
			const child = super.consume(input, cursor) as GroupStart | undefined;
			if (child) {
				child.scope = cursor.scope;
				cursor.scope++;
				return child;
			}
		}
	}

	export class GroupEnd extends generatePunctuationToken(EToken.GroupEnd, "}") {
		public scope: number = 0;
		static consume(input: string, cursor: ILexerCursor): Token | undefined {
			const child = super.consume(input, cursor) as GroupEnd | undefined;
			if (child) {
				cursor.scope--;
				child.scope = cursor.scope;
				return child;
			}
		}
	}

	export class LiteralToken extends generateValueToken<EToken.Literal, string>(
		EToken.Literal
	) {
		static consume(input: string, cursor: ILexerCursor): Token | undefined {
			let next = cursor.index;
			while (next < input.length) {
				if ([":", "/", "{", "}"].includes(input[next])) break;
				next++;
			}

			if (cursor.index >= next) return;
			const segment = input.slice(cursor.index, next);

			cursor.index = next;
			return new this(segment);
		}
	}
}

export function toTokens(input: string): Token[] {
	const tokens: Token[] = [];
	const cursor: ILexerCursor = {
		index: 0,
		scope: 0,
	};

	while (cursor.index < input.length) {
		let matched: boolean = false;

		for (const TokenClass of [
			Tokens.DirectoryOperator,
			Tokens.GroupStart,
			Tokens.GroupEnd,
			Tokens.ParameterOperator,
			Tokens.LiteralToken,
		]) {
			const token = TokenClass.consume(input, cursor);
			if (token) {
				tokens.push(token);
				matched = true;
				break;
			}
		}

		if (!matched) {
			break;
		}
	}

	return tokens;
}
