declare module "ws" {
  export default class WebSocket {
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;

    readyState: number;

    constructor(url: string | URL);

    on(event: "open", listener: () => void): this;
    on(event: "message", listener: (data: unknown) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "close", listener: (code: number, reason: Buffer) => void): this;

    send(data: string): void;
    close(code?: number, reason?: string): void;
  }
}
