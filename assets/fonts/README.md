# Bundled typefaces (SIL Open Font License 1.1)

- **Archivo SemiExpanded** Bold / ExtraBold: static TTFs from the font creator's upstream repository, `Omnibus-Type/Archivo`, directory `fonts/ttf/`.
- **Figtree** Regular / SemiBold / Bold: static TTFs from `erikdkennedy/figtree`, directory `fonts/ttf/`.
- License texts: the upstream Google Fonts `google/fonts` repository, `ofl/archivo/OFL.txt` and `ofl/figtree/OFL.txt`, reproduced unmodified in `licenses/`.

Google Fonts currently publishes **variable** TTFs for both families in those OFL folders; the static upstream builds are used deliberately because SDK 57 / RN 0.86 cannot reliably select Archivo's `wdth` axis on Android. Each weight is registered as a separate `expo-font` family. Files are packaged locally; no runtime font requests.
