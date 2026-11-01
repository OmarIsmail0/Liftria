const { patchMainActivity } = jest.requireActual('../../../../plugins/withIncomingCsv.js') as {
  patchMainActivity: (src: string) => string;
};

const activity=`package com.liftria.app

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }
}
`;

test('text/plain file shares are relabeled before the activity listeners run',()=>{
 const patched=patchMainActivity(activity);
 expect(patched).toContain('import android.content.Intent');
 expect(patched).toContain('import android.net.Uri');
 expect(patched.indexOf('normalizeIncomingCsv(intent)')).toBeLessThan(patched.indexOf('super.onCreate(null)'));
 expect(patched).toContain('override fun onNewIntent(intent: Intent)');
 expect(patched).toContain('target.type = "application/octet-stream"');
 expect(patched).toContain('liftria: incoming-csv');
 expect(patchMainActivity(patched)).toBe(patched);
});

test('a MainActivity without onCreate fails loudly',()=>{
 expect(()=>patchMainActivity('class MainActivity')).toThrow('onCreate');
});
