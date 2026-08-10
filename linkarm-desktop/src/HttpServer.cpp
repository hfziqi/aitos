#include "HttpServer.h"
#include <ws2tcpip.h>
#include <windows.h>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <vector>

#pragma comment(lib, "ws2_32.lib")

HttpServer::HttpServer() {}

HttpServer::~HttpServer() {
    Stop();
}

bool HttpServer::Start(const std::wstring& rootDir) {
    if (running) {
        return true;
    }

    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        return false;
    }

    listenSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (listenSocket == INVALID_SOCKET) {
        WSACleanup();
        return false;
    }

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = 0; // ephemeral port

    if (bind(listenSocket, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == SOCKET_ERROR) {
        closesocket(listenSocket);
        listenSocket = INVALID_SOCKET;
        WSACleanup();
        return false;
    }

    int addrLen = sizeof(addr);
    if (getsockname(listenSocket, reinterpret_cast<sockaddr*>(&addr), &addrLen) == SOCKET_ERROR) {
        closesocket(listenSocket);
        listenSocket = INVALID_SOCKET;
        WSACleanup();
        return false;
    }
    port = ntohs(addr.sin_port);

    if (listen(listenSocket, 8) == SOCKET_ERROR) {
        closesocket(listenSocket);
        listenSocket = INVALID_SOCKET;
        WSACleanup();
        return false;
    }

    root = rootDir;
    started = true;
    running = true;
    worker = std::thread(&HttpServer::ServeLoop, this);
    return true;
}

void HttpServer::Stop() {
    if (!running) {
        return;
    }
    running = false;
    if (listenSocket != INVALID_SOCKET) {
        closesocket(listenSocket); // unblocks accept()
        listenSocket = INVALID_SOCKET;
    }
    if (worker.joinable()) {
        worker.join();
    }
    if (started) {
        WSACleanup();
        started = false;
    }
}

void HttpServer::ServeLoop() {
    while (running) {
        SOCKET client = accept(listenSocket, nullptr, nullptr);
        if (client == INVALID_SOCKET) {
            break; // socket closed by Stop()
        }
        HandleClient(client);
        closesocket(client);
    }
}

void HttpServer::HandleClient(SOCKET client) {
    char buf[8192];
    int n = recv(client, buf, sizeof(buf) - 1, 0);
    if (n <= 0) {
        return;
    }
    buf[n] = '\0';

    std::string request(buf);
    size_t eol = request.find("\r\n");
    if (eol == std::string::npos) {
        eol = request.find('\n');
    }
    std::string requestLine = (eol == std::string::npos) ? request : request.substr(0, eol);

    std::istringstream lineStream(requestLine);
    std::string method, target, version;
    lineStream >> method >> target >> version;
    if (target.empty()) {
        SendError(client, 400);
        return;
    }

    size_t queryPos = target.find('?');
    if (queryPos != std::string::npos) {
        target = target.substr(0, queryPos);
    }
    target = UrlDecode(target);

    // Split into segments, rejecting path traversal ("..").
    std::vector<std::wstring> segments;
    std::istringstream targetStream(target);
    std::string segment;
    while (std::getline(targetStream, segment, '/')) {
        if (segment.empty() || segment == ".") {
            continue;
        }
        if (segment == "..") {
            SendError(client, 403);
            return;
        }
        // Convert UTF-8 segment to wide for Windows file APIs.
        int wideLen = MultiByteToWideChar(CP_UTF8, 0, segment.c_str(), (int)segment.size(), nullptr, 0);
        std::wstring wideSegment(wideLen, L'\0');
        if (wideLen > 0) {
            MultiByteToWideChar(CP_UTF8, 0, segment.c_str(), (int)segment.size(), &wideSegment[0], wideLen);
        }
        segments.push_back(wideSegment);
    }

    std::wstring full = root;
    for (const auto& seg : segments) {
        full += L"\\" + seg;
    }

    std::error_code ec;
    if (std::filesystem::is_directory(full, ec)) {
        full += L"\\index.html";
    }

    if (ec || !std::filesystem::exists(full, ec)) {
        SendError(client, 404);
        return;
    }

    std::ifstream file(full, std::ios::binary);
    if (!file) {
        SendError(client, 404);
        return;
    }
    std::ostringstream bodyStream;
    bodyStream << file.rdbuf();
    std::string body = bodyStream.str();

    // Extension (lowercased) from the last dot of the URL path.
    std::string ext;
    size_t lastSlash = target.find_last_of('/');
    size_t dot = target.find_last_of('.');
    if (dot != std::string::npos && (lastSlash == std::string::npos || dot > lastSlash)) {
        ext = target.substr(dot);
        for (auto& c : ext) {
            c = (char)tolower((unsigned char)c);
        }
    }

    std::ostringstream response;
    response << "HTTP/1.1 200 OK\r\n";
    response << "Content-Type: " << MimeType(ext) << "\r\n";
    response << "Content-Length: " << body.size() << "\r\n";
    response << "Connection: close\r\n";
    response << "Cache-Control: no-cache\r\n";
    response << "\r\n";
    SendAll(client, response.str());
    SendAll(client, body);
}

void HttpServer::SendAll(SOCKET sock, const std::string& data) {
    size_t sent = 0;
    while (sent < data.size()) {
        int n = send(sock, data.data() + sent, (int)(data.size() - sent), 0);
        if (n == SOCKET_ERROR || n == 0) {
            return;
        }
        sent += (size_t)n;
    }
}

void HttpServer::SendError(SOCKET client, int code) {
    const char* reason = (code == 404) ? "Not Found" : (code == 403) ? "Forbidden" : "Bad Request";
    std::string body = "<html><body><h1>" + std::to_string(code) + " " + reason + "</h1></body></html>";
    std::ostringstream response;
    response << "HTTP/1.1 " << code << " " << reason << "\r\n";
    response << "Content-Type: text/html; charset=utf-8\r\n";
    response << "Content-Length: " << body.size() << "\r\n";
    response << "Connection: close\r\n\r\n";
    SendAll(client, response.str());
    SendAll(client, body);
}

std::string HttpServer::UrlDecode(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] == '%' && i + 2 < s.size()) {
            auto hex = [](char c) -> int {
                if (c >= '0' && c <= '9') return c - '0';
                if (c >= 'a' && c <= 'f') return c - 'a' + 10;
                if (c >= 'A' && c <= 'F') return c - 'A' + 10;
                return -1;
            };
            int high = hex(s[i + 1]);
            int low = hex(s[i + 2]);
            if (high >= 0 && low >= 0) {
                out += (char)(high * 16 + low);
                i += 2;
                continue;
            }
        }
        out += s[i];
    }
    return out;
}

std::string HttpServer::MimeType(const std::string& ext) {
    if (ext == ".html" || ext == ".htm") return "text/html; charset=utf-8";
    if (ext == ".js" || ext == ".mjs") return "text/javascript; charset=utf-8";
    if (ext == ".css") return "text/css; charset=utf-8";
    if (ext == ".json") return "application/json; charset=utf-8";
    if (ext == ".png") return "image/png";
    if (ext == ".jpg" || ext == ".jpeg") return "image/jpeg";
    if (ext == ".gif") return "image/gif";
    if (ext == ".svg") return "image/svg+xml";
    if (ext == ".webp") return "image/webp";
    if (ext == ".ico") return "image/x-icon";
    if (ext == ".woff") return "font/woff";
    if (ext == ".woff2") return "font/woff2";
    if (ext == ".ttf") return "font/ttf";
    if (ext == ".map") return "application/json";
    return "application/octet-stream";
}
