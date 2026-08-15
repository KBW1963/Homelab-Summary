const axios = require("axios");

axios
  .get("http://127.0.0.1:32400/identity", { timeout: 5000 })
  .then((res) => console.log("Plex OK:", res.status))
  .catch((err) => console.error("Plex error:", err.code, err.message));

axios
  .get("http://127.0.0.1:8096/health", { timeout: 5000 })
  .then((res) => console.log("Jellyfin OK:", res.data))
  .catch((err) => console.error("Jellyfin error:", err.code, err.message));
