// Starts the very first launch right to left on an Arabic phone.
// React Native only lays out RTL when forceRTL is set (its device-language check reads
// Locale.getAvailableLocales()[0], not the phone's language), and a JS forceRTL applies only
// after a restart. So before React loads, force RTL once if the phone is Arabic and the app
// has never stored a choice. The in-app language setting overwrites it from then on.
const { withMainApplication } = require('expo/config-plugins');

const MARKER = '// liftria: arabic-first-launch-rtl';
const SNIPPET = `
    ${MARKER}
    getSharedPreferences("com.facebook.react.modules.i18nmanager.I18nUtil", MODE_PRIVATE).let { prefs ->
      if (!prefs.contains("RCTI18nUtil_forceRTL") && resources.configuration.locales[0].language == "ar") {
        com.facebook.react.modules.i18nmanager.I18nUtil.instance.allowRTL(this, true)
        com.facebook.react.modules.i18nmanager.I18nUtil.instance.forceRTL(this, true)
      }
    }`;

module.exports = function withArabicFirstLaunchRtl(config) {
  return withMainApplication(config, (mod) => {
    if (mod.modResults.language !== 'kt') throw new Error('withArabicFirstLaunchRtl expects MainApplication.kt');
    const src = mod.modResults.contents;
    if (src.includes(MARKER)) return mod;
    const anchor = 'super.onCreate()';
    if (!src.includes(anchor)) throw new Error('withArabicFirstLaunchRtl: super.onCreate() not found');
    mod.modResults.contents = src.replace(anchor, anchor + SNIPPET);
    return mod;
  });
};
