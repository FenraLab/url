export enum EToken {
  Unknown,
  Literal,
  ParameterOperator,
  DirectoryOperator,
  GroupStart,
  GroupEnd,
}

export enum ESyntax {
  Unknown,
  Literal,
  Parameter,
  Group,
  Directory,
}

export type IInterpreterParams = Record<string, string>;

export interface IInterpreterCursor {
  index: number;
  params: IInterpreterParams;
}

export enum EParseOutcome {
  NoMatch,
  Partial,
  Complete,
}

export interface IParseResult {
  outcome: EParseOutcome;
  cursor: IInterpreterCursor;
}
