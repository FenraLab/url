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

export interface IInterpreterCursor {
  index: number;
  params: Record<string, string>;
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
