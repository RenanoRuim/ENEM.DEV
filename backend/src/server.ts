import { createApp } from "./app.js";
import { getConfig } from "./config.js";

const config = getConfig();
const app = createApp(config);

app.listen(config.PORT, () => {
  console.log(`ENEM.DEV API listening on port ${config.PORT}.`);
});
