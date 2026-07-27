// Public entry point. The UMD build exposes these as `window.KontexEditor`.
export { create } from './editor';
export type {
  KontexOptions,
  KontexEditorInstance,
  ToolbarItem,
  UploadOption,
  TemplateDef,
} from './types';
export type { SlashItem } from './extensions/slash-command';

export const version = '0.1.0';
