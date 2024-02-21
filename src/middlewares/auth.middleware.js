import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken';

export const verifyJwt  = async(req, res, next)=>{

    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        console.log('token',token)

        if(!token){
            throw new ApiError(401, "You are not logged in!");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log('decodedToken', decodedToken);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if(!user){
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();

    } catch (error) {
        console.log('err', error)
        throw new ApiError(401, error?.message || "Invalid access token")
    }
}