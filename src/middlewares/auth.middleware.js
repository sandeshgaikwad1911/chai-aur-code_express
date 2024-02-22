import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken';
import util from 'util'
import { ApiResponse } from "../utils/ApiResponse.js";

export const verifyJwt  = async(req, res, next)=>{

    try {

        const testToken = req.headers.authorization || req.cookies.accessToken;
        // console.log('testToken',testToken)

        if(!testToken){
            throw new ApiError(401, "You are not logged in!");
        }

        let token;

        if(testToken && testToken.startsWith("Bearer")){
            token = testToken.split(" ")[1]
        }else{
            token  = testToken
        }

        // console.log('token',token)

        if(!token){
            throw new ApiError(401, "You are not logged in!");
        }

        const decodedToken = await util.promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);
        // console.log('decodedToken', decodedToken);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if(!user){
            throw new ApiError(401, "Invalid access token");
        }
        // on req object we created property user => req.user and assign value of user object =>    req.user = user;
        req.user = user;
        next();

    } catch (error) {
        // console.log('error', error)
        return res.status(400).json(new ApiResponse(401, {}, "you are not login user"))
}
}