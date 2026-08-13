import express from 'express';

const app = express();
const port = process.env.APP_PORT || 3000;

app.listen(port, () => {
    console.log(`=============================================`)
    console.log(`==== SERVER IS NOW RUNNING AT PORT: ${port} ====`)
    console.log(`=============================================`)
})

