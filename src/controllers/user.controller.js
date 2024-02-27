import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken';
import util from 'util'
import fs from 'fs'
import mongoose from 'mongoose';

const generateAccessAndRefreshTokens = async(userId)=>{

    try {

        const user = await User.findById(userId).select("-password");

        const accessToken = await user.generateAccessToken() // method  defined in the User model
        const refreshToken = await user.generateRefreshToken() // method defined in the User model

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return { accessToken: accessToken, refreshToken: refreshToken }

    } catch (error) {
        // console.log('err', error)
        throw new ApiError(500, 'something went wrong while generating accessToken and refreshToken')
    }

};

// **********************************************************************************************************

export const registerUser = asyncErrorHandler(async(req, res, next)=>{

    const {fullname, email, username, password} = req.body;

    if(!fullname || !email || !username || !password){
       throw new ApiError(400, 'Please provide all the fields', )
    }
    
    const existedUser = await User.findOne({$or: [ {username}, {email} ]});
    if(existedUser){
        throw new ApiError(409, 'This Email or Username is already in use');
    }

    const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    const avtarLocalPath = req.files?.avatar?.[0]?.path;
    // console.log('avtr local path =>', avtarLocalPath)
    // console.log('cover local path =>', coverImageLocalPath);
       /* 
            coverImage is name of our file,
            avtar is name of file.
            see our register route, which has upload middleware and our user model we have same fields

            req.files is from multer,
            if we have single file to upload, then req.file
            if we have multiple file to upload,  then req.files
        */ 

        /* 
            we get the file first on our local server from computer memeory. and send the file path to cloudinary server
        */
    if(!avtarLocalPath){
        throw new ApiError(400, 'Please provide an avtar image');
    }


    const avatar = await uploadOnCloudinary(avtarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    // console.log('avatar', avatar)
    // console.log('coverImage', coverImage)

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

        fs.unlink(avtarLocalPath, (err)=>{
            if(err){
                throw new ApiError(500, "something went wrong while deleting temporary uploaded file");
            }
        }) //deleting the temporary uploaded avtarLocalPath file after saving to cloudinary.

        fs.unlink(coverImageLocalPath, (err)=>{
            if(err){
                throw new ApiError(500, "something went wrong while deleting temporary uploaded file");
            }
        }) //deleting the temporary uploaded coverImageLocalPath file after saving to cloudinary.
        

    const createdUser = await User.findById(newUser._id).select('-password -refreshToken');

    if(!createdUser){
        throw new ApiError(500, "something went wrong while register new user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, 'User registered successfully')
    )

});

// **********************************************************************************************************

export const loginUser = asyncErrorHandler(async(req, res, next)=>{

    const { email, username, password} = req.body;

    if(!(email || username)){
        throw new ApiError(400,"Email or Username is missing!");
    }

    const user = await User.findOne({$or: [{username}, {email}]});

    
    if(!user){
        throw new ApiError(404, "username or email does not exist");
    }
    // compare passwords
    // we created instance method  in the model so we can use it here.
    const isValidPassword = await user.compareDBPassword(password);

    if(!isValidPassword){
        throw new ApiError(401, "Invalid Password");
    }


   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
   

   const loginUser = await User.findById(user._id).select("-password -refreshToken");
    
   const cookieOptions = {
        httpOnly : true,
        secure: true
   }

   return res.status(200)
   .cookie("accessToken", accessToken , cookieOptions)
   .cookie("refreshToken", refreshToken, cookieOptions)
   .json( new ApiResponse(200, {user: loginUser, accessToken, refreshToken}, "user login successfully"))

});

// **********************************************************************************************************

export const refreshAccessToken = async(req, res, next)=>{

    // when user login, it sends refreshTokne, accessToken as data , also as cookie

    try {
        const inComingRefreshToken = req.headers.authorization || req.cookies.refreshToken || req.body.refreshToken 

        // console.log('inRT', inComingRefreshToken);

        if(!inComingRefreshToken){
            throw new ApiError(401, "unauthorized request");
        }

        let token;

        if(inComingRefreshToken && inComingRefreshToken.startsWith("Bearer")){
            token = inComingRefreshToken.split(" ")[1]
        }else{
            token = inComingRefreshToken;
        }
        // console.log('tok', token);

        const decodedToken = await util.promisify(jwt.verify)(token, process.env.REFRESH_TOKEN_SECRET);
        // console.log('decoTok', decodedToken);

        const user = await User.findById(decodedToken._id).select("-password");
        if(!user){
            throw new ApiError(403, 'No such user found');
        }
        // console.log('userr', user);

        if(user?.refreshToken !== token){
            throw new ApiError(401, 'Invalid refreshToken');
        }

        // generate a new accessToken and refreshToken

        const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshTokens(user._id);

        // console.log('newAcc', newAccessToken)
        // console.log('newRef', newRefreshToken)

        user.refreshToken = newRefreshToken;

        const cookieOptions = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
            .cookie('accessToken', newAccessToken , cookieOptions)
            .cookie('refreshToken', newRefreshToken, cookieOptions)
            .json(new ApiResponse(200, {accessToken: newAccessToken, refreshToken: newRefreshToken}, "Access Token Refreshed successfully, using saved refreshToken from DB"))


    } catch (error) {
        // console.log('err', error)
        return res.status(400).json(new ApiResponse(401, {}, error.message))
    }

};

// **********************************************************************************************************

export const logoutUser = asyncErrorHandler(async(req, res, next)=>{

    // await User.findByIdAndUpdate(req.user._id, {$unset: {refreshToken: 1}}, {new: true});  // this removes field from document.

    await User.findByIdAndUpdate(req.user._id, {$set: {refreshToken: ""}}, {new: true});

    const cookieOptions = {
        httpOnly : true,
        secure: true
   };

   return res.status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logout successfully"));

});

// ********************************************************************************************************

export const changeCurrentPassword = asyncErrorHandler(async(req, res, next)=>{
    
    const {oldPassword, newPassword, confirmPassword } = req.body;

    if(newPassword != confirmPassword){
        throw new ApiError(400, 'New Password and Confirm Password does not match')
    }

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(401, "unauthorized request");
    }

    const isValidPassword = await user.compareDBPassword(oldPassword);
    if(!isValidPassword){
        throw new ApiError(400, "Invalid old password")
    }
    
    user.password = newPassword;
    await user.save({validateBeforeSave: false});
    return res.status(200).json(new ApiResponse(200, {}, "password changed successfully."));
    
});

// ********************************************************************************************************

export const getCurrentUser = asyncErrorHandler((req, res, next)=>{
    const { password, ...currentUser} = req.user._doc;
    return res.status(200).json(new ApiResponse(200, currentUser));
});

// ********************************************************************************************************

const filterReqObjectToUpdateProfile = (obj, ...allowedFields)=>{
    // console.log('obj', obj)
    // console.log('allowedFields', allowedFields)
    let newObj = {};
    Object.keys(obj).forEach((el)=>{
        // console.log('el', el)
        if(allowedFields.includes(el)){
            newObj[el] = obj[el]
            console.log('first', obj[el])
        }
    })
    return newObj
}

export const updateProfile = asyncErrorHandler(async(req, res, next)=>{
    let filteredObj = filterReqObjectToUpdateProfile(req.body, "fullname", "username");
    // console.log('filteredObj', filteredObj)     
    // here we want to update only fullname and username, if any other field is included in req.body, it will be simply ignored
    // const updatedUser = await User.findByIdAndUpdate(req.user?._id, filteredObj, {runValidators: true, new: true}).select("-password");
    const updatedUser = await User.findByIdAndUpdate(req.user?._id, {$set: {...filteredObj}}, {runValidators: true, new: true}).select("-password");
    return res.status(200).json(new ApiResponse(200, updatedUser, "user updated successfully"))
});

// ********************************************************************************************************

export const updateUserAvtar = asyncErrorHandler(async(req, res, next)=>{
    // console.log('req.file', req.file);
    const avtarLocalPath = req.file?.path;
    // console.log('avtarLocalPath', avtarLocalPath);
    if(!avtarLocalPath){
        throw new ApiError(400, "Avtar file is missing.")
    }

    const avatar = await uploadOnCloudinary(avtarLocalPath);
    // console.log('avtar', avatar)
    if(!avatar?.url){
        throw new ApiError(400, "Error while uploading avatar.")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {$set: {avatar: avatar?.url}}, {new: true}).select("-password -refreshToken");
    
    fs.unlinkSync(avtarLocalPath, (err)=>{
        if(err){
            throw new ApiError(400, 'error while deleting temporary avtar file')
        }
    })  
    // deleting file upoladed to servers local path after uploading to user

    res.status(200).json(
        new ApiResponse(200, user, "avtar Image upldated successfully.")
    )

    
});

// ********************************************************************************************************

export const getUserChannelProfile = asyncErrorHandler(async(req, res, next)=>{
    const {username} = req.params;
    if(!username){
        throw new ApiError(400,"Username is missing");
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField:  "_id",
                foreignField:"channel",
                as :"subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField:  "_id",
                foreignField:"subscriber",
                as :"subscribedTo"
            }
        },
        {
            $addFields: {
                countSubscribers: {$size: "$subscribers"},
                countChannelSubscribedTo: {$size: "$subscribedTo"},
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname:  1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                countSubscribers:  1,
                countChannelSubscribedTo: 1,
                isSubscribed: 1
            }
        }
    ]);
    console.log('channel =>', channel)

    if(!channel?.length){
        throw new ApiError(404, 'chanel does not exists')
    }

    return res.status(200).json(new ApiResponse(200, channel, 'User channel fetched succesfully'))
})

// ********************************************************************************************************

export  const getWatchHistory = asyncErrorHandler(async(req, res, next)=>{
    const user = await User.aggregate([
        {
            $match: {
                // _id: req.user?._id   // deos not work here.
                /* 
                    mongoDB _id is like => _id : ObjectId("65d45d3d052093de500ae852");
                    but because of mongoose we get  it as a string so we need to convert it back to ObjectId()
                */ 
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },

        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",

                // it's called subpipeline.
                pipeline: [
                    {
                        $lookup: {
                            from:"users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",

                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }

    ]);

    console.log('user =>', user)

    if(!user){
        throw new ApiError(400, 'cant find user')
    }
    return res.status(200).json(new ApiResponse(200, user, 'watch history fetched successfully.'))
})

