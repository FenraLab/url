import { Syntax } from "./ast";
import { EParseOutcome, IInterpreterCursor, IParseResult } from "./types";


export function Interpret(
	uri: string,
	fragments: Syntax[],
	cursor: IInterpreterCursor
): IParseResult {
	const hypotheticalCursor = Object.create(cursor);

	for (const fragment of fragments) {
		const accepts = fragment.accepts(uri, hypotheticalCursor);

		if (!accepts) {
			return {
				outcome: EParseOutcome.NoMatch,
				cursor,
			};
		}
	}


	cursor.index = hypotheticalCursor.index;
	cursor.params = hypotheticalCursor.params;

	return {
		outcome:
			cursor.index == uri.length
				? EParseOutcome.Complete
				: EParseOutcome.Partial,
		cursor,
	};
}
