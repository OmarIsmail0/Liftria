import * as ImageManipulator from 'expo-image-manipulator';
import {sanitizeHikuPhoto,resizeForPhoto,PHOTO_JPEG_QUALITY} from '../photo';
const resize=jest.fn();
const saveAsync=jest.fn(async()=>({uri:'file:///cache/converted.jpg',
 width:1024,height:768,base64:'AQIDBA=='}));
const renderAsync=jest.fn(async()=>({saveAsync}));
const manipulate=jest.fn(()=>({resize,renderAsync}));
jest.mock('expo-image-manipulator',()=>({
 ImageManipulator:{manipulate:jest.fn()},
 SaveFormat:{JPEG:'jpeg'},
}));
beforeEach(()=>{
 jest.clearAllMocks();
 (ImageManipulator.ImageManipulator.manipulate as jest.Mock).mockImplementation(manipulate);
});
test('downscales longer edge to 1024 and renders JPEG quality 0.7 with no original EXIF',async()=>{
 const result=await sanitizeHikuPhoto({uri:'file:///original.jpg',width:4032,height:3024});
 expect(manipulate).toHaveBeenCalledWith('file:///original.jpg');
 expect(resize).toHaveBeenCalledWith({width:1024});
 expect(renderAsync).toHaveBeenCalledTimes(1);
 expect(saveAsync).toHaveBeenCalledWith({compress:PHOTO_JPEG_QUALITY,format:'jpeg',base64:true});
 expect(result).toEqual({uri:'file:///cache/converted.jpg',width:1024,height:768,
  base64:'AQIDBA==',mimeType:'image/jpeg'});
 expect(resizeForPhoto(3000,4000)).toEqual({height:1024});
});
test('small images skip resizing but still render/re-encode as JPEG to strip metadata',async()=>{
 await sanitizeHikuPhoto({uri:'file:///original.png',width:640,height:480});
 expect(manipulate).toHaveBeenCalledWith('file:///original.png');
 expect(resize).not.toHaveBeenCalled();
 expect(renderAsync).toHaveBeenCalledTimes(1);
 expect(saveAsync).toHaveBeenCalledWith({compress:0.7,format:'jpeg',base64:true});
});
test('rejects invalid dimensions and remote images instead of uploading them raw',async()=>{
 expect(()=>resizeForPhoto(0,100)).toThrow();
 await expect(sanitizeHikuPhoto({uri:'https://example.com/image.jpg',width:100,height:100})).rejects.toThrow();
 expect(manipulate).not.toHaveBeenCalled();
});
test('sanitized output must remain local and at most 1024px/12 MB',async()=>{
 saveAsync.mockResolvedValueOnce({uri:'file:///cache/oversized.jpg',width:1500,height:1000,base64:'AQID'});
 await expect(sanitizeHikuPhoto({uri:'file:///original.jpg',width:4000,height:3000})).rejects.toThrow();
 saveAsync.mockResolvedValueOnce({uri:'https://cdn.example/photo.jpg',width:1024,height:768,base64:'AQID'});
 await expect(sanitizeHikuPhoto({uri:'file:///original.jpg',width:4000,height:3000})).rejects.toThrow();
});
