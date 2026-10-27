import * as ImageManipulator from 'expo-image-manipulator';
import {sanitizeHikuPhoto,resizeForPhoto,PHOTO_JPEG_QUALITY} from '../photo';
jest.mock('expo-image-manipulator',()=>({
 manipulateAsync:jest.fn(async()=>({uri:'file:///cache/converted.jpg',
   width:1024,height:768,base64:'AQIDBA=='})),
 SaveFormat:{JPEG:'jpeg'},
}));
const mocked=ImageManipulator.manipulateAsync as jest.Mock;
test('downscales larger edge to 1024 and re-encodes JPEG at quality 0.7 without EXIF',async()=>{
 const result=await sanitizeHikuPhoto({uri:'file:///original.jpg',width:4032,height:3024});
 expect(mocked).toHaveBeenCalledWith('file:///original.jpg',
  [{resize:{width:1024}}],{compress:PHOTO_JPEG_QUALITY,format:'jpeg',base64:true});
 expect(result).toEqual({uri:'file:///cache/converted.jpg',width:1024,height:768,
  base64:'AQIDBA==',mimeType:'image/jpeg'});
 expect(resizeForPhoto(3000,4000)).toEqual({height:1024});
});
test('small images still pass through JPEG re-encode to strip original metadata',async()=>{
 await sanitizeHikuPhoto({uri:'file:///original.png',width:640,height:480});
 expect(mocked).toHaveBeenLastCalledWith('file:///original.png',[],{
  compress:0.7,format:'jpeg',base64:true});
});
test('rejects invalid dimensions and remote images instead of uploading them raw',async()=>{
 expect(()=>resizeForPhoto(0,100)).toThrow();
 await expect(sanitizeHikuPhoto({uri:'https://example.com/image.jpg',width:100,height:100})).rejects.toThrow();
});
