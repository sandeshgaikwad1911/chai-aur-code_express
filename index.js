import express from 'express';
import { PORT } from './configuration/config.js';

const app = express();
const port = PORT || 3001;
app.listen(()=>{
    console.log(`app is running on http://127.0.0.1:${port}`);
})