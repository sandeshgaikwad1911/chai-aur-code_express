import express from "express";
import { changeCurrentPassword, loginUser, logoutUser, refreshAccessToken, registerUser, getCurrentUser, updateProfile, updateUserAvtar, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route('/register').post(upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1}
]), registerUser);



router.route('/login').post(loginUser);

router.route('/change-password').post(verifyJwt, changeCurrentPassword)

router.route('/logout').post(verifyJwt, logoutUser);

router.route('/refresh-access-Token').post(refreshAccessToken);

router.route('/current-user').get(verifyJwt, getCurrentUser);

router.route('/update-profile').patch(verifyJwt, updateProfile);

router.route('/update-avtar').patch(verifyJwt, upload.single('avatar'), updateUserAvtar);

router.route('/channel/:username').get(verifyJwt, getUserChannelProfile);

router.route('/watch-history').get(verifyJwt, getWatchHistory);

export default router;
/* 
    upload.single     => if want to ulpload single file in single field
    upload.array      => if want to ulpload multiple files in single field
    upload.fields     => we have two fields avtar and coverImage, and each field should contain one file only(maxCount: 1)
*/
