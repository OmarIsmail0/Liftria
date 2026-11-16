import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { useTheme } from '../../design/ThemeProvider';
import {
  bidiIsolate, formatDate, pluralForm, type AppLanguage, type TranslationKey,
} from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Button, Card, Field, Header, ListGroup, ListRow, Screen, SectionHeader, SegmentedControl, Sheet, Typography } from '../../design/primitives';
import { localDay } from '../eat/foodCatalog';
import { getTypedSetting } from '../../services/database/settings';
import type { WeightUnit } from '../train/workoutUnits';
import { listLocalWeights } from './weightRepository';
import { captureProgressPhoto } from './progressPhotoCapture';
import { sanitizeProgressPhoto, type CleanProgressPhoto } from './progressPhotoFile';
import { ProgressPhotoMark } from './ProgressPhotoMark';
import {
  addProgressPhoto, getProgressPhoto, listProgressPhotoSummaries, listProgressPhotosForCard, progressPhotoImages,
  removeProgressPhoto, saveProgressPhotoNote,
} from './progressPhotoRepository';
import {
  POSES, PROGRESS_PHOTO_BLUR, chooseComparePhoto, comparePhotosForPose, defaultCompareIds, formatLoggedBodyWeight,
  frameFromPhoto, groupPhotosByDay, latestByPose, loggedWeightKgOnDay, progressPhotosBlurred,
  type Pose, type ProgressPhotoFrame,
} from './progressPhotos';

export type ProgressPhotoCardPreview = {
  frames: ProgressPhotoFrame[];
  startRevealed: boolean;
};

function poseKey(pose: Pose): TranslationKey {
  return `progressPhotos.pose.${pose}` as TranslationKey;
}

function countKey(language: AppLanguage, count: number): TranslationKey {
  return `progressPhotos.count.${pluralForm(language, count)}` as TranslationKey;
}

function formatWhen(language: AppLanguage, at: string): string {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return '';
  return bidiIsolate(language, formatDate(language, date, { day: 'numeric', month: 'short', year: 'numeric' }));
}

function photoDay(at: string): string {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return '';
  return localDay(date);
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/progress/body');
}

function discardFile(uri: string) {
  try { new File(uri).delete(); } catch { /* The cache copy may already be gone. */ }
}

function PhotoVisual({ frame, blurred, label, height }: {
  frame: ProgressPhotoFrame;
  blurred: boolean;
  label: string;
  height: number;
}) {
  const { theme } = useTheme();
  // A summary frame carries no image bytes yet; keep the slot until they arrive.
  if (frame.image.kind === 'jpeg' && frame.image.base64 === '') {
    return <View accessible accessibilityLabel={label}
      style={{ width: '100%', height, borderRadius: theme.radius.md, backgroundColor: theme.color.bg.raised }} />;
  }
  if (frame.image.kind === 'drawing') {
    return <ProgressPhotoMark pose={frame.pose} variant={frame.image.variant} blurred={blurred} label={label} height={height} />;
  }
  return <Image
    accessible
    accessibilityLabel={label}
    source={{ uri: 'data:image/jpeg;base64,' + frame.image.base64 }}
    blurRadius={blurred ? PROGRESS_PHOTO_BLUR : 0}
    resizeMode="cover"
    // Android decodes a 1080 px photo at the size it is drawn, not at full size, for the small thumbnails.
    resizeMethod="resize"
    style={{ width: '100%', height, borderRadius: theme.radius.md }}
  />;
}

export function ProgressPhotosCard({ preview }: { preview?: ProgressPhotoCardPreview }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const live = preview == null;
  const [photos, setPhotos] = useState<ProgressPhotoFrame[]>([]);
  const [settingOn, setSettingOn] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [ready, setReady] = useState(!live);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pose, setPose] = useState<Pose>('front');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<CleanProgressPhoto | null>(null);
  const [denied, setDenied] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [list, setting] = await Promise.all([
      listProgressPhotosForCard(),
      getTypedSetting('progress.showPhotos'),
    ]);
    if (list.ok) { setPhotos(list.value.map(frameFromPhoto)); setError(false); }
    else setError(true);
    if (setting.ok) setSettingOn(setting.value);
    setReady(true);
  }, []);
  useFocusEffect(useCallback(() => {
    if (!live) return;
    setRevealed(false);
    void load();
  }, [live, load]));
  const frames = preview?.frames ?? photos;
  const showWithoutTap = preview ? preview.startRevealed : settingOn;
  const blurred = !preview && !ready ? true : progressPhotosBlurred(showWithoutTap, revealed);
  const latest = latestByPose(frames);
  function labelFor(frame: ProgressPhotoFrame): string {
    if (blurred) return t('progressPhotos.hiddenA11y');
    return t('progressPhotos.photoA11y', { pose: t(poseKey(frame.pose)) });
  }
  function closeAdd() {
    if (busy) return;
    if (draft) discardFile(draft.uri);
    setDraft(null);
    setAdding(false);
    setDenied(false);
    setCaptureError(false);
    setNote('');
  }
  async function pick(camera: boolean) {
    if (!live || busy || picking) return;
    setPicking(true);
    setCaptureError(false);
    const result = await captureProgressPhoto(camera, {
      requestCameraPermission: () => ImagePicker.requestCameraPermissionsAsync(),
      launchCamera: async () => {
        const selection = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'], allowsEditing: false, exif: false, base64: false, quality: 1,
        });
        return { canceled: selection.canceled, asset: selection.assets?.[0] ?? null };
      },
      launchLibrary: async () => {
        const selection = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], allowsEditing: false, exif: false, base64: false, quality: 1,
        });
        return { canceled: selection.canceled, asset: selection.assets?.[0] ?? null };
      },
      sanitize: sanitizeProgressPhoto,
      deleteFile: discardFile,
      isOwnCacheFile: uri => uri.startsWith(Paths.cache.uri),
    });
    setPicking(false);
    if (result.kind === 'denied') { setDenied(true); return; }
    if (result.kind === 'cancelled') return;
    if (result.kind !== 'ready') { setCaptureError(true); return; }
    setDraft(current => {
      if (current) discardFile(current.uri);
      return result.photo;
    });
  }
  async function save() {
    if (!live || !draft || busy || picking || note.length > 400) return;
    setBusy(true);
    const saved = await addProgressPhoto({
      takenAt: new Date().toISOString(),
      pose,
      jpegBase64: draft.base64,
      width: draft.width,
      height: draft.height,
      note,
    });
    setBusy(false);
    if (!saved.ok) { setCaptureError(true); return; }
    discardFile(draft.uri);
    setDraft(null);
    setAdding(false);
    setNote('');
    await load();
  }
  return <>
    <Card>
      {frames.length > 0 && <Typography size="metric">{t(countKey(language, frames.length), { count: frames.length })}</Typography>}
      {frames.length > 0 && <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
        {latest.map(item => <View key={item.pose} style={{ flex: 1, gap: theme.space[2] }}>
          {item.photo
            ? <PhotoVisual frame={item.photo} blurred={blurred} label={labelFor(item.photo)} height={148} />
            : <Typography tone="secondary" size="small">{t('progressPhotos.noneYet')}</Typography>}
          <Typography size="small">{t(poseKey(item.pose))}</Typography>
        </View>)}
      </View>}
      {ready && frames.length === 0 && !error && <Typography tone="secondary" size="secondary">{t('progressPhotos.empty')}</Typography>}
      {error && <>
        <Typography tone="secondary">{t('progressPhotos.loadError')}</Typography>
        <Button label={t('common.retry')} variant="neutral" onPress={() => void load()} />
      </>}
      {blurred && frames.length > 0 && <Button label={t('progressPhotos.show')} onPress={() => setRevealed(true)} />}
      {/* One wrapping row, so the card doesn't stack four full-width lines. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {frames.length > 0 && <>
          <Button label={t('progressPhotos.gallery')} variant="neutral"
            onPress={() => { if (live) router.push('/(tabs)/progress/photos'); }} />
          <Button label={t('progressPhotos.compare')} variant="neutral"
            onPress={() => { if (live) router.push('/(tabs)/progress/photo-compare'); }} />
        </>}
        <Button label={t('progressPhotos.add')} variant="tonal" onPress={() => {
          if (!live) return;
          setPose('front');
          setNote('');
          setDenied(false);
          setCaptureError(false);
          setAdding(true);
        }} />
      </View>
    </Card>
    <Sheet visible={adding} title={t('progressPhotos.add')} description={t('progressPhotos.privacy')} onClose={closeAdd}>
      <SegmentedControl label={t('progressPhotos.pose')} value={pose} onChange={setPose}
        options={POSES.map(item => ({ value: item, label: t(poseKey(item)) }))} />
      <Button label={t('hikuPhoto.take')} variant="neutral" disabled={busy || picking} onPress={() => void pick(true)} />
      <Button label={t('hikuPhoto.gallery')} variant="neutral" disabled={busy || picking} onPress={() => void pick(false)} />
      {denied && <Typography tone="secondary">{t('hikuPhoto.denied')}</Typography>}
      {picking && <Typography tone="secondary">{t('hikuPhoto.processing')}</Typography>}
      {captureError && <Typography tone="secondary">{t('progressPhotos.saveError')}</Typography>}
      {draft && <>
        <Typography bold>{t('progressPhotos.preview')}</Typography>
        <Image accessible accessibilityLabel={t('progressPhotos.preview')} source={{ uri: draft.uri }}
          resizeMode="contain" style={{ width: '100%', height: 240, borderRadius: theme.radius.md }} />
        <Typography tone="secondary" size="small">{t('progressPhotos.dimensions', {
          width: draft.width, height: draft.height,
        })}</Typography>
      </>}
      <Field label={t('hikuPhoto.note')} value={note} onChangeText={setNote} multiline />
      <Button label={t('common.save')} disabled={!draft || busy || picking || note.length > 400}
        fullWidth onPress={() => void save()} />
    </Sheet>
  </>;
}

export function ProgressPhotoGallery() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [photos, setPhotos] = useState<ProgressPhotoFrame[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const list = await listProgressPhotoSummaries();
    if (list.ok) { setPhotos(list.value.map(frameFromPhoto)); setError(false); }
    else setError(true);
    setReady(true);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const groups = groupPhotosByDay(photos, photoDay);
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[3] }}>
      <Header mode="inline" title={t('progressPhotos.gallery')} onBack={leave} />
      {photos.length > 0 && <Typography size="metric">{t(countKey(language, photos.length), { count: photos.length })}</Typography>}
      {ready && photos.length === 0 && !error && <Typography tone="secondary">{t('progressPhotos.empty')}</Typography>}
      {groups.map(group => <View key={group.day} style={{ gap: theme.space[2] }}>
        <SectionHeader title={formatWhen(language, group.photos[0]?.takenAt ?? '')} />
        <ListGroup>
          {group.photos.map(photo => <ListRow key={photo.id} title={t(poseKey(photo.pose))}
            detail={photo.note ?? undefined}
            onPress={() => router.push({ pathname: '/(tabs)/progress/photo/[id]', params: { id: photo.id } })} />)}
        </ListGroup>
      </View>)}
      <Typography tone="secondary" size="secondary">{t('progressPhotos.privacy')}</Typography>
      {error && <>
        <Typography tone="secondary">{t('progressPhotos.loadError')}</Typography>
        <Button label={t('common.retry')} variant="neutral" onPress={() => void load()} />
      </>}
    </ScrollView>
  </Screen>;
}

export function ProgressPhotoViewer() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [frame, setFrame] = useState<ProgressPhotoFrame | null>(null);
  const [note, setNote] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const load = useCallback(async () => {
    if (!id) { setReady(true); return; }
    const result = await getProgressPhoto(id);
    if (!result.ok) { setError(true); setReady(true); return; }
    setFrame(result.value ? frameFromPhoto(result.value) : null);
    setNote(result.value?.note ?? '');
    setError(false);
    setReady(true);
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function saveNote() {
    if (!id || busy || note.length > 400) return;
    setBusy(true);
    const saved = await saveProgressPhotoNote(id, note);
    setBusy(false);
    if (!saved.ok) { setError(true); return; }
    setFrame(frameFromPhoto(saved.value));
  }
  async function remove() {
    if (!id || busy) return;
    setBusy(true);
    const removed = await removeProgressPhoto(id);
    setBusy(false);
    if (!removed.ok) { setError(true); return; }
    setConfirming(false);
    leave();
  }
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[3] }}>
      <Header mode="inline" title={frame ? t(poseKey(frame.pose)) : t('progressPhotos.title')} onBack={leave} />
      {ready && !frame && !error && <Typography tone="secondary">{t('progressPhotos.unknown')}</Typography>}
      {frame && frame.image.kind === 'jpeg' && <PhotoVisual frame={frame} blurred={false} height={360}
        label={t('progressPhotos.photoA11y', { pose: t(poseKey(frame.pose)) })} />}
      {frame && <>
        <Typography tone="secondary" size="secondary">{formatWhen(language, frame.takenAt)}</Typography>
        <Field label={t('hikuPhoto.note')} value={note} onChangeText={setNote} multiline />
        <Button label={t('common.save')} disabled={busy || note.length > 400} onPress={() => void saveNote()} />
        <Button label={t('progressPhotos.delete')} variant="destructive" disabled={busy} onPress={() => setConfirming(true)} />
      </>}
      {error && <>
        <Typography tone="secondary">{t('progressPhotos.loadError')}</Typography>
        <Button label={t('common.retry')} variant="neutral" onPress={() => void load()} />
      </>}
    </ScrollView>
    <Sheet visible={confirming} destructive title={t('progressPhotos.deleteTitle')}
      description={t('progressPhotos.deleteDetail')} onClose={() => { if (!busy) setConfirming(false); }}>
      <Button label={t('progressPhotos.keep')} fullWidth disabled={busy} onPress={() => setConfirming(false)} />
      <Button label={t('progressPhotos.delete')} variant="destructive" fullWidth disabled={busy} onPress={() => void remove()} />
    </Sheet>
  </Screen>;
}

function WeightLine({ kg, hidden, weightUnit }: { kg: number | null; hidden: boolean; weightUnit: WeightUnit }) {
  const { t, language } = useLanguage();
  if (hidden) return <Typography tone="secondary" size="small">{t('trend.hidden')}</Typography>;
  if (kg === null) return <Typography tone="secondary" size="small">{t('progressPhotos.noLoggedWeight')}</Typography>;
  const weight = formatLoggedBodyWeight(language, kg, weightUnit);
  return <Typography tone="secondary" size="small">{t('progressPhotos.loggedWeight', { weight })}</Typography>;
}

export function ProgressPhotoCompareBody({
  pose, onPose, options, earlier, later, onPick, weightFor, weightUnit, hidden,
}: {
  pose: Pose;
  onPose: (pose: Pose) => void;
  options: ProgressPhotoFrame[];
  earlier: ProgressPhotoFrame | null;
  later: ProgressPhotoFrame | null;
  onPick: (id: string) => void;
  weightFor: (id: string) => number | null;
  weightUnit: WeightUnit;
  hidden: boolean;
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const pair = earlier && later ? [earlier, later] as const : [];
  return <>
    <SegmentedControl label={t('progressPhotos.pose')} value={pose} onChange={onPose}
      options={POSES.map(item => ({ value: item, label: t(poseKey(item)) }))} />
    {options.length < 2 && <Typography tone="secondary">{t('progressPhotos.compareNeed')}</Typography>}
    {pair.length === 2 && <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
      {pair.map((frame, index) => <View key={frame.id} style={{ flex: 1, gap: theme.space[2] }}>
        <Typography size="small" bold>{t(index === 0 ? 'progressPhotos.earlier' : 'progressPhotos.later')}</Typography>
        <PhotoVisual frame={frame} blurred={false} height={220}
          label={t('progressPhotos.photoA11y', { pose: t(poseKey(frame.pose)) })} />
        <Typography size="small">{formatWhen(language, frame.takenAt)}</Typography>
        <WeightLine kg={weightFor(frame.id)} hidden={hidden} weightUnit={weightUnit} />
      </View>)}
    </View>}
    {options.map(frame => {
      const role = frame.id === earlier?.id ? t('progressPhotos.earlier') : frame.id === later?.id ? t('progressPhotos.later') : undefined;
      return <ListRow key={frame.id} title={formatWhen(language, frame.takenAt)} detail={role}
        onPress={() => onPick(frame.id)} />;
    })}
  </>;
}

export function ProgressPhotoCompare() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<ProgressPhotoFrame[]>([]);
  const [weights, setWeights] = useState<{ at: string; kg: number }[]>([]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [hidden, setHidden] = useState(false);
  const [pose, setPose] = useState<Pose>('front');
  const [picked, setPicked] = useState<{ earlierId: string; laterId: string } | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const [list, logged, units, hide] = await Promise.all([
      listProgressPhotoSummaries(), listLocalWeights(), getTypedSetting('units.weight'), getTypedSetting('hideNumbers'),
    ]);
    if (list.ok) { setPhotos(list.value.map(frameFromPhoto)); setError(false); }
    else setError(true);
    if (logged.ok) setWeights(logged.value.map(row => ({ at: row.at, kg: row.kg })));
    if (units.ok) setWeightUnit(units.value);
    if (hide.ok) setHidden(hide.value);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const options = comparePhotosForPose(photos, pose, photoDay);
  const chosen = picked && options.some(item => item.id === picked.earlierId) && options.some(item => item.id === picked.laterId)
    ? picked : defaultCompareIds(options);
  const earlier = options.find(item => item.id === chosen?.earlierId) ?? null;
  const later = options.find(item => item.id === chosen?.laterId) ?? null;
  // The list holds no image bytes; load only the two photos on screen.
  const [images, setImages] = useState<Record<string, string>>({});
  const earlierId = earlier?.id, laterId = later?.id;
  useEffect(() => {
    const wanted = [earlierId, laterId].filter((id): id is string => !!id && images[id] === undefined);
    if (wanted.length === 0) return;
    let live = true;
    void progressPhotoImages(wanted).then(result => {
      if (live && result.ok) setImages(current => ({ ...current, ...result.value }));
    });
    return () => { live = false; };
  }, [earlierId, laterId, images]);
  const withImage = (frame: ProgressPhotoFrame | null): ProgressPhotoFrame | null =>
    frame && frame.image.kind === 'jpeg' ? { ...frame, image: { kind: 'jpeg', base64: images[frame.id] ?? '' } } : frame;
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[3] }}>
      <Header mode="inline" title={t('progressPhotos.compare')} onBack={leave} />
      <Card>
        <ProgressPhotoCompareBody pose={pose} onPose={next => { setPose(next); setPicked(null); }}
          options={options} earlier={withImage(earlier)} later={withImage(later)} weightUnit={weightUnit} hidden={hidden}
          onPick={id => setPicked(current => {
            const base = current && options.some(item => item.id === current.earlierId) ? current : defaultCompareIds(options);
            if (!base) return current;
            return chooseComparePhoto(options, base.earlierId, base.laterId, id);
          })}
          weightFor={id => {
            const frame = options.find(item => item.id === id);
            return frame ? loggedWeightKgOnDay(weights, frame.takenAt, photoDay) : null;
          }} />
      </Card>
      {error && <>
        <Typography tone="secondary">{t('progressPhotos.loadError')}</Typography>
        <Button label={t('common.retry')} variant="neutral" onPress={() => void load()} />
      </>}
    </ScrollView>
  </Screen>;
}
