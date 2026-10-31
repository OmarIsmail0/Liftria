import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Header, Screen, Typography } from '../../src/design/primitives';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import {
  ProgressPhotoCompareBody, ProgressPhotosCard, type ProgressPhotoCardPreview,
} from '../../src/features/progress/ProgressPhotos';
import {
  chooseComparePhoto, comparePhotosForPose, defaultCompareIds, type Pose, type ProgressPhotoFrame,
} from '../../src/features/progress/progressPhotos';

/** Screenshot URL: liftria://dev/demo-progress-photos?auto=1
 * Drawn marks only. Opening this screen, with or without auto=1, writes nothing. */
const FRAMES: ProgressPhotoFrame[] = [
  { id: 'front-early', takenAt: '2026-10-01T12:00:00.000Z', pose: 'front', note: null, image: { kind: 'drawing', variant: 'a' } },
  { id: 'front-late', takenAt: '2026-10-20T12:00:00.000Z', pose: 'front', note: null, image: { kind: 'drawing', variant: 'b' } },
  { id: 'side-late', takenAt: '2026-10-20T12:00:00.000Z', pose: 'side', note: null, image: { kind: 'drawing', variant: 'a' } },
  { id: 'back-mid', takenAt: '2026-10-10T12:00:00.000Z', pose: 'back', note: null, image: { kind: 'drawing', variant: 'b' } },
];

const HIDDEN: ProgressPhotoCardPreview = { frames: FRAMES, startRevealed: false };
const SHOWN: ProgressPhotoCardPreview = { frames: FRAMES, startRevealed: true };

function dayOf(at: string): string {
  return at.slice(0, 10);
}

export default function DemoProgressPhotos() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [pose, setPose] = useState<Pose>('front');
  const [picked, setPicked] = useState<{ earlierId: string; laterId: string } | null>(null);
  const options = comparePhotosForPose(FRAMES, pose, dayOf);
  const chosen = picked ?? defaultCompareIds(options);
  const earlier = options.find(item => item.id === chosen?.earlierId) ?? null;
  const later = options.find(item => item.id === chosen?.laterId) ?? null;
  return <Screen scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[3] }}>
      <Header title={t('progressPhotos.demoTitle')} onBack={() => router.back()} />
      <Typography tone="secondary">{t('progressPhotos.demoNotice')}</Typography>
      <Typography bold>{t('progressPhotos.demoBlurred')}</Typography>
      <ProgressPhotosCard preview={HIDDEN} />
      <Typography bold>{t('progressPhotos.demoShown')}</Typography>
      <ProgressPhotosCard preview={SHOWN} />
      <Typography bold>{t('progressPhotos.compare')}</Typography>
      <ProgressPhotoCompareBody pose={pose} onPose={setPose} options={options} earlier={earlier} later={later}
        weightUnit="kg" hidden={false}
        weightFor={id => id === 'front-late' ? 80.4 : null}
        onPick={id => setPicked(current => {
          const base = current ?? defaultCompareIds(options);
          if (!base) return current;
          return chooseComparePhoto(options, base.earlierId, base.laterId, id);
        })} />
    </ScrollView>
  </Screen>;
}
