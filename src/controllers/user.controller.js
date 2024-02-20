import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const registerUser = asyncErrorHandler(async(req, res, next)=>{

    const {fullname, email, username, password} = req.body;

    if(!fullname || !email || !username || !password){
       throw new ApiError(400, 'Please provide all the fields', )
    }
    
    const existedUser = await User.findOne({$or: [{username}, {email}]});
    if(existedUser){
        throw new ApiError(409, 'This Email or Username is already in use');
    }

    const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    const avtarLocalPath = req.files?.avatar?.[0]?.path;
    console.log('avtr local path =>', avtarLocalPath)
    console.log('cover local path =>', coverImageLocalPath);
       // avtar is name of file. see our register route, which has upload middleware and our user model we have same fields
    if(!avtarLocalPath){
        throw new ApiError(400, 'Please provide an avtar image');
    }


    const avatar = await uploadOnCloudinary(avtarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    console.log('avatar', avatar)
    console.log('coverImage', coverImage)

    if(!avatar){
        throw new ApiError(400,'Error while Uploading Avatar Image');
    }
    

    const newUser = await User.create({
        fullname,
        email,
        password,
        avatar: avatar?.url,
        coverImage: coverImage?.url || " ",
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(newUser._id).select('-password -refreshToken');
    if(!createdUser){
        throw new ApiError(500, "something went wrong while register a user!")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, 'User registered successfully')
    )

});


