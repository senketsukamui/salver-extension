export type SalverMessage =
  | { type: 'ATTACH_START'; fileId: string; name: string; mimeType: string; dataB64: string; mode?: 'drag' | 'click' }
  | { type: 'ATTACH_RESULT'; ok: boolean; inputsFound: number; reason?: string }
  | { type: 'ATTACH_CANCEL' }
  | { type: 'ADD_SELECTION'; text: string; pageUrl: string; pageTitle: string }
  | { type: 'OPEN_PANEL' };
