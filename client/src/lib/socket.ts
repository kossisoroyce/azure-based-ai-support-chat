export function createWebSocket() {
  const host = window.location.host;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${host}/ws`;
  console.log('Connecting to WebSocket:', wsUrl);

  const socket = new WebSocket(wsUrl);
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second delay

  socket.addEventListener("open", () => {
    console.log("WebSocket connection established");
    reconnectAttempts = 0; // Reset attempts on successful connection
  });

  socket.addEventListener("close", (event) => {
    console.log("WebSocket connection closed", event.code, event.reason);

    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
      console.log(`Attempting to reconnect in ${delay}ms...`);
      setTimeout(() => {
        reconnectAttempts++;
        const newSocket = createWebSocket();
        // Replace the current socket instance with the new one
        Object.assign(socket, newSocket.socket);
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  });

  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return {
    socket,
    send: (type: string, payload: any) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, payload }));
      } else {
        console.warn("WebSocket is not open, message not sent:", { type, payload });
      }
    },
    onMessage: (callback: (data: any) => void) => {
      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      });
    },
    onError: (callback: (error: any) => void) => {
      socket.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
        callback(error);
      });
    },
  };
}