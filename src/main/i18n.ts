import i18n from "i18n";
import path from "path";

i18n.configure({
  locales: ["en", "ja"],
  defaultLocale: "en",
  directory: path.join(__dirname, "..", "locales"),
  objectNotation: true
});

export default i18n;
