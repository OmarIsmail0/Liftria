// A CSV shared as text/plain often arrives as EXTRA_STREAM, not EXTRA_TEXT.
// expo-sharing only reads EXTRA_TEXT for text/plain, so the file would be dropped.
// Relabel that one case as a generic file before the sharing listener runs.
const { withMainActivity, withAndroidManifest } = require('expo/config-plugins');

const MARKER = 'liftria: incoming-csv';
const METHOD = `
  // ${MARKER}
  private fun normalizeIncomingCsv(target: Intent?) {
    if (target?.action != Intent.ACTION_SEND || target.type != "text/plain") return
    val stream = if (android.os.Build.VERSION.SDK_INT >= 33) {
      target.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      @Suppress("DEPRECATION")
      target.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
    }
    if (stream != null) target.type = "application/octet-stream"
  }
`;

function patchMainActivity(src) {
  if (src.includes(MARKER)) return src;
  if (!src.includes('override fun onCreate')) {
    throw new Error('withIncomingCsv: MainActivity.onCreate was not found');
  }
  let next = src;
  if (!next.includes('import android.content.Intent')) {
    next = next.replace(/package [^\n]+\n/, (line) => line + '\nimport android.content.Intent\nimport android.net.Uri\n');
  } else if (!next.includes('import android.net.Uri')) {
    next = next.replace('import android.content.Intent\n', 'import android.content.Intent\nimport android.net.Uri\n');
  }
  next = next.replace(
    'override fun onCreate(savedInstanceState: Bundle?) {',
    'override fun onCreate(savedInstanceState: Bundle?) {\n    normalizeIncomingCsv(intent)',
  );
  const added = `
  override fun onNewIntent(intent: Intent) {
    normalizeIncomingCsv(intent)
    super.onNewIntent(intent)
  }
${METHOD}`;
  const end = next.lastIndexOf('}');
  if (end < 0) throw new Error('withIncomingCsv: MainActivity has no closing brace');
  return next.slice(0, end) + added + '\n' + next.slice(end);
}

// Expo's dev-client plugin appends its `exp+<slug>` scheme to every VIEW intent filter. On the
// "open a CSV" filter (mime types, no scheme) that makes Android require that scheme, so a
// file:// or content:// CSV from Files would never offer Liftria. Drop it from filters that
// match by mime type.
function removeDevSchemeFromMimeFilters(manifest) {
  for (const application of manifest.manifest.application || []) {
    for (const activity of application.activity || []) {
      for (const filter of activity['intent-filter'] || []) {
        const data = filter.data || [];
        if (!data.some((d) => d.$ && d.$['android:mimeType'])) continue;
        filter.data = data.filter((d) => !String((d.$ && d.$['android:scheme']) || '').startsWith('exp+'));
      }
    }
  }
  return manifest;
}

function withIncomingCsv(config) {
  config = withAndroidManifest(config, (mod) => {
    mod.modResults = removeDevSchemeFromMimeFilters(mod.modResults);
    return mod;
  });
  return withMainActivity(config, (mod) => {
    if (mod.modResults.language !== 'kt') throw new Error('withIncomingCsv expects MainActivity.kt');
    mod.modResults.contents = patchMainActivity(mod.modResults.contents);
    return mod;
  });
}

module.exports = withIncomingCsv;
module.exports.patchMainActivity = patchMainActivity;
module.exports.removeDevSchemeFromMimeFilters = removeDevSchemeFromMimeFilters;
