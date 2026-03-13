import app from "./app";
import { PORT } from "./config/env";

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});