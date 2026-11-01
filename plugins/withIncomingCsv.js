// A CSV shared as text/plain often arrives as EXTRA_STREAM, not EXTRA_TEXT.
// expo-sharing only reads EXTRA_TEXT for text/plain, so the file would be dropped.
// Relabel that one case as a generic file before the sharing listener runs.
const { withMainActivity } = require('expo/config-plugins');

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

function withIncomingCsv(config) {
  return withMainActivity(config, (mod) => {
    if (mod.modResults.language !== 'kt') throw new Error('withIncomingCsv expects MainActivity.kt');
    mod.modResults.contents = patchMainActivity(mod.modResults.contents);
    return mod;
  });
}

module.exports = withIncomingCsv;
module.exports.patchMainActivity = patchMainActivity;
