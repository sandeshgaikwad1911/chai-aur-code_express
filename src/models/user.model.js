import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "username can not be blank"],
        unique: true,
        lowercase: true,
        trim: true,
        index: true     //indexing is optional but recommended as it will improve the search performance of data retrieval operations
    },
    email: {
        type: String,
        required: [true, "email can not be blank"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true,  //indexing is optional but recommended as it will improve the search performance of data retrieval operations
    },
    avatar: {
        type: String, // cloudinary url
        required: [true, 'Please provide avtar image']
    },
    coverImage: {
        type: String, // cloudinary url
    },
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, "password is required!"],
        // select: false,  // hide this field while querying the database
    },
    refreshToken: {
        type: String
    }

},{timestamps: true});


userSchema.pre("save", async function(next){
    if(!this.isModified("password")){
        return next();   
    }
    this.password = await bcrypt.hash(this.password, 12)
    next();
})

userSchema.methods.compareDBPassword = async function(pswd){
    return await bcrypt.compare(pswd, this.password);      // returns true or false
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model('User', userSchema);