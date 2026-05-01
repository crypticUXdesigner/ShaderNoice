export type ShortcutKeys =
  | string[]
  | {
      parts: string[];
      joiner?: ' + ' | ' / ';
    };

