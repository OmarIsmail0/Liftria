"""No real keystore needed; verify the template transform fails closed."""
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from configure_release_signing import apply_release_signing  # noqa: E402

GRADLE = """android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            shrinkResources false
        }
    }
    packagingOptions {
    }
}
"""


class TestReleaseSigning(unittest.TestCase):
    def test_patches_only_release(self):
        patched = apply_release_signing(GRADLE)
        self.assertIn("signingConfig signingConfigs.liftriaRelease", patched)
        self.assertIn("signingConfig signingConfigs.debug", patched)
        self.assertEqual(patched.count("liftriaRelease {"), 1)
        self.assertNotIn("my-password", patched)

    def test_fails_closed_if_template_changes(self):
        with self.assertRaises(ValueError):
            apply_release_signing(GRADLE.replace("signingConfigs {", "releaseSigners {"))
        with self.assertRaises(ValueError):
            apply_release_signing(GRADLE.replace(
                "        release {", "        production {"
            ))
        with self.assertRaises(ValueError):
            apply_release_signing(GRADLE.replace(
                "signingConfig signingConfigs.debug", "signingConfig signingConfigs.other"
            ))

    def test_repeated_patch_is_rejected(self):
        with self.assertRaises(ValueError):
            apply_release_signing(apply_release_signing(GRADLE))


if __name__ == "__main__":
    unittest.main()
