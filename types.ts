
export enum Status {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR',
}

export interface Transcription {
  speaker: 'user' | 'model';
  text: string;
  isPartial?: boolean;
}

export type Direction = 'id_to_jp' | 'jp_to_id';
