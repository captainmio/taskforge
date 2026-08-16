import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("=============================================");
  console.log(`==== SERVER IS NOW RUNNING AT PORT: ${port} ====`);
  console.log("=============================================");
});
