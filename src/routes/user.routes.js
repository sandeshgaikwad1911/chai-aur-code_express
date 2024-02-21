import express from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.route('/register').post(upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1}
]), registerUser);


router.route('/login').post(loginUser);

router.route('/logout').post(verifyJwt, logoutUser)

export default router;

/* 
    upload.single     => if want to ulpload single file in single field
    upload.array      => if want to ulpload multiple files in single field
    upload.fields     => we have two fields avtar and coverImage, and each field should contain one file only(maxCount: 1)
*/
