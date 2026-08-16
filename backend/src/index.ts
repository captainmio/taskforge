import app from "./app.js";
import { env } from "./config/env.js";

const port = env.PORT;

app.listen(port, () => {
  console.log("=============================================");
  console.log(`==== SERVER IS NOW RUNNING AT PORT: ${port} ====`);
  console.log("=============================================");
});
