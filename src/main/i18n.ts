import i18n from "i18n";
import path from "path";

const locales = ["en-US", "ja"];
i18n.configure({
  locales: locales,
  defaultLocale: "en-US",
  directory: path.join(__dirname, "..", "locales"),
  objectNotation: true
});

export default i18n;
