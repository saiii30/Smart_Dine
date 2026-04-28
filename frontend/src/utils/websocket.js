const BASE_URL = import.meta.env.VITE_BACKEND_URL;
                 
if (!BASE_URL) {
  console.error("❌ VITE_BACKEND_URL is not defined");
}
else{
  console.log(BASE_URL)
}

const WS_URL = BASE_URL
  ? BASE_URL.replace("http://", "ws://").replace("https://", "wss://")
  : "";

export const createWebSocket = (path) => {
  const token = localStorage.getItem("token");

  const url = token
    ? `${WS_URL}${path}?token=${token}`
    : `${WS_URL}${path}`;

  return new WebSocket(url);
};