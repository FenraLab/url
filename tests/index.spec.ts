import { toTokens } from "../src/tokenizer";
import { toAST } from "../src/ast";
import { Interpret } from "../src/interpreter";
import { IInterpreterCursor } from "../src/types";

describe("URL", function () {
	describe("Input validation", function () {
		it("accepts", function () {
			const testSyntax = "/eln/:document/:section/:datum";
			console.log(testSyntax);

			const tokens = toTokens(testSyntax);
			console.log(tokens);

			const syntax = toAST(tokens);
			console.log(syntax);

			function test(input: string) {
				const cursor: IInterpreterCursor = {
					index: 0,
					params: {},
				};

				const accepts = Interpret(input, syntax, cursor);
				console.log(input, accepts);
			}

			test("/eln");
			test("/eln/document/section/datum");
		});
	});
});
