import multer from "multer";

const storage  = multer.diskStorage({
    destination: function(req, file, cb) {
        // console.log('file',file);
        cb(null, "./public/temp");      // path of server file storage
    },
    filename: function(req, file, cb){
        // console.log('file',file);
        // cb(null, file.originalname);
        cb(null, `${Date.now()}-${file.originalname}`);
    }

});

export const upload = multer({storage: storage});