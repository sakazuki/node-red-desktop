import * as ngrok from "@ngrok/ngrok";
import log from "./log";

export class NgrokManager {
  private listener: ngrok.Listener | null = null;

  get isConnected(): boolean {
    return this.listener !== null;
  }

  async connect(addr: number | string, authtoken?: string): Promise<string> {
    if (process.env.NRD_NGROK_START_ARGS) {
      log.info("[ngrok] NRD_NGROK_START_ARGS is no longer supported with @ngrok/ngrok SDK and will be ignored.");
    }
    const token = authtoken && authtoken.trim() ? authtoken.trim() : undefined;
    this.listener = await ngrok.forward(
      token
        ? { addr, proto: "http", authtoken: token }
        : { addr, proto: "http", authtoken_from_env: true }
    );
    const url = this.listener.url();
    if (!url) throw new Error("ngrok connected but returned null URL");
    return url;
  }

  async disconnect(): Promise<void> {
    if (!this.listener) return;
    await this.listener.close();
    this.listener = null;
  }
}
