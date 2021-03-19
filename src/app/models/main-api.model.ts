import {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue
} from 'electron';

export type MainAPISendEvents =
  | 'APP_DISABLE_EXPORT'
  | 'APP_ENABLE_EXPORT'
  | 'APP_OPEN_EXTERNAL_LINK'
  | 'APP_WRITE_CLIPBOARD'
  | 'APP_LOGS'
  | 'APP_QUIT';
export type MainAPIInvokeEvents =
  | 'APP_READ_JSON_DATA'
  | 'APP_WRITE_JSON_DATA'
  | 'APP_READ_CLIPBOARD';
export type MainAPIReceiveEvents = 'APP_MENU';

export interface MainAPI {
  invoke<T>(channel: 'APP_READ_JSON_DATA', key: string): Promise<T>;
  invoke<T>(
    channel: 'APP_WRITE_JSON_DATA',
    key: string,
    data: T
  ): Promise<void>;
  invoke(channel: 'APP_READ_CLIPBOARD'): Promise<any>;
  invoke(channel: 'APP_GET_PLATFORM'): Promise<NodeJS.Platform>;
  invoke(
    channel: 'APP_SHOW_OPEN_DIALOG',
    options: OpenDialogOptions
  ): Promise<OpenDialogReturnValue>;
  invoke(
    channel: 'APP_SHOW_SAVE_DIALOG',
    options: SaveDialogOptions
  ): Promise<SaveDialogReturnValue>;
  invoke(
    channel: 'APP_GET_MIME_TYPE' | 'APP_READ_FILE',
    path: string
  ): Promise<string>;
  invoke(channel: 'APP_WRITE_FILE', path: string, data: string): Promise<void>;

  send(channel: 'APP_WRITE_CLIPBOARD', data: any): void;
  send(channel: 'APP_DISABLE_EXPORT' | 'APP_ENABLE_EXPORT' | 'APP_QUIT'): void;
  send(channel: 'APP_OPEN_EXTERNAL_LINK', ...args: any[]): void;
  send(channel: 'APP_LOGS', { type: MessageLevels, message: string }): void;
  send(channel: 'APP_WRITE_CLIPBOARD', data: any): void;

  receive(channel: 'APP_MENU', listener: (...args: any[]) => void): () => void;
}
