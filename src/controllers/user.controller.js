import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken';
import util from 'util'

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
    console.log('avtr local path =>', avtarLocalPath)
    console.log('cover local path =>', coverImageLocalPath);
       // avtar is name of file. see our register route, which has upload middleware and our user model we have same fields
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

    const createdUser = await User.findById(newUser._id).select('-password -refreshToken');

    if(!createdUser){
        throw new ApiError(500, "something went wrong while register a user!")
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
    
    await User.findByIdAndUpdate(req.user._id, {$set: {refreshToken: ""}}, {new: true})

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




