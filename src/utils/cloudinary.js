import fs from 'fs';
import {v2 as cloudinary} from 'cloudinary';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


export const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null;

        // upload file on cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"   // image or video or anything, we choose auto
        })
        // file uploaded;
        console.log('file uploaded successfylly on cloudinary', cloudinaryResponse.url)
        return cloudinaryResponse;
    } catch (error) {
        fs.unlinkSync(localFilePath);// remove locally save temporary file if upload operation got failed.
        return null;
    }
}
