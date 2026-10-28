import * as ImageManipulator from 'expo-image-manipulator';
import type {ImagePickerAsset} from 'expo-image-picker';

/** Only the re-encoded JPEG is previewed and transmitted. The conversion writes
 * a new cache file and discards original EXIF/GPS metadata. Never copy input EXIF. */
export type CleanHikuPhoto={uri:string;width:number;height:number;base64:string;mimeType:'image/jpeg'};
export const PHOTO_LONG_EDGE=1024;
export const PHOTO_JPEG_QUALITY=0.7;
export function resizeForPhoto(width:number,height:number):{width?:number;height?:number}{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
  throw new Error('Invalid photo dimensions');
 if(Math.max(width,height)<=PHOTO_LONG_EDGE)return {};
 return width>=height?{width:PHOTO_LONG_EDGE}:{height:PHOTO_LONG_EDGE};
}
export async function sanitizeHikuPhoto(asset:Pick<ImagePickerAsset,'uri'|'width'|'height'>)
 :Promise<CleanHikuPhoto>{
 if(!asset.uri.startsWith('file://'))throw new Error('Photo is not a local file');
 const size=resizeForPhoto(asset.width,asset.height);
 // SDK 57 contextual API renders a fresh bitmap and saveAsync re-encodes it;
 // the original picker EXIF/location is never retained in the generated JPEG.
 const context=ImageManipulator.ImageManipulator.manipulate(asset.uri);
 if(Object.keys(size).length)context.resize(size);
 const image=await context.renderAsync();
 const resized=await image.saveAsync({
  compress:PHOTO_JPEG_QUALITY,format:ImageManipulator.SaveFormat.JPEG,base64:true,
 });
 if(!resized.base64||!resized.uri||!resized.uri.startsWith('file://')||
  resized.width>PHOTO_LONG_EDGE||resized.height>PHOTO_LONG_EDGE||
  resized.base64.length>12_000_000)throw new Error('Could not sanitize photo');
 return {uri:resized.uri,width:resized.width,height:resized.height,
  base64:resized.base64,mimeType:'image/jpeg'};
}
