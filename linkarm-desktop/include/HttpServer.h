#pragma once

#include <winsock2.h>
#include <string>
#include <atomic>
#include <thread>

// Minimal single-threaded HTTP/1.1 static file server.
// Serves `root` over 127.0.0.1 on an ephemeral port. Used by the launcher in
// release mode: WebView2 cannot load Vite's ES-module output from file://
// (CORS blocks external module scripts), so we navigate to a local HTTP URL.
class HttpServer {
public:
    HttpServer();
    ~HttpServer();

    // Start serving rootDir. No-op (returns true) if already running.
    bool Start(const std::wstring& rootDir);
    void Stop();
    unsigned short GetPort() const { return port; }

private:
    void ServeLoop();
    void HandleClient(SOCKET client);
    static void SendAll(SOCKET sock, const std::string& data);
    static void SendError(SOCKET client, int code);
    static std::string UrlDecode(const std::string& s);
    static std::string MimeType(const std::string& ext);

    std::atomic<bool> running{false};
    bool started = false;
    SOCKET listenSocket = INVALID_SOCKET;
    unsigned short port = 0;
    std::wstring root;
    std::thread worker;
};
