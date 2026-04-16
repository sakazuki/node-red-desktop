import { app } from "electron";
import log from "./log";

if (new RegExp(`${app.name}-debug`).exec(process.env.NODE_DEBUG!)) {
  process.on("uncaughtException", (err) => {
    log.info(JSON.stringify(err));
    throw err;
  });
};
