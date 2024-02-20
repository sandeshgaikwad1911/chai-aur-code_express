import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './db/dbConnection.js';

import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({
    limit: '16kb',
}));

// urlencoded menas if data is from url
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

app.use(express.static("public"))

app.use(cookieParser());    
// add and access cookie in user browser.

//  import routes
import userRoutes from './routes/user.routes.js'

app.use('/api/v1/users', userRoutes);

const port = process.env.PORT || 3001;

app.listen(port, ()=>{
    connectDB();
    console.log(`app is running on http://127.0.0.1:${port}`);
})