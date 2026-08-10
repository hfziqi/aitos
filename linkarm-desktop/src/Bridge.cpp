#define WIN32_LEAN_AND_MEAN
#include "Launcher.h"
#include "Bridge.h"
#include "JsonHelpers.h"

#include <thread>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <vector>
#include <cstdlib>
#include <shellapi.h>

void InvokeBridgeCallback(ICoreWebView2* webview, const BridgeResult& r) {
    if (!webview) return;
    std::wstring script =
        L"if(window.__aitos_callbacks__&&window.__aitos_callbacks__['" + r.callbackId +
        L"']){window.__aitos_callbacks__['" + r.callbackId +
        L"'](" + r.resultJson + L");delete window.__aitos_callbacks__['" + r.callbackId + L"'];}";
    webview->ExecuteScript(script.c_str(), new ExecuteScriptHandler([](HRESULT result, LPCWSTR id) -> HRESULT {
        return S_OK;
    }));
}

// Callable from any thread; silently drops the result if the window is gone.
void PostBridgeResult(HWND hWnd, const std::wstring& callbackId, const std::wstring& resultJson) {
    BridgeResult* result = new BridgeResult{ callbackId, resultJson };
    if (!PostMessage(hWnd, WM_BRIDGE_CALLBACK, 0, reinterpret_cast<LPARAM>(result))) {
        delete result;
    }
}

void Launcher::SetupBridge() {
    if (!webview) return;

    std::wstring bridgeScript = LR"(
        window.__aitos_bridge__ = {
            async exec(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'exec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'exec',
                        callbackId: callbackId,
                        command: input.command,
                        args: input.args || [],
                        cwd: input.cwd || null
                    });
                });
            },
            async writeLocal(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'writeLocal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'writeLocal',
                        callbackId: callbackId,
                        key: input.key,
                        value: input.value
                    });
                });
            },
            async readLocal(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'readLocal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'readLocal',
                        callbackId: callbackId,
                        key: input.key
                    });
                });
            },
            async listLocal(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'listLocal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'listLocal',
                        callbackId: callbackId,
                        scope: input.scope || ''
                    });
                });
            },
            async removeLocal(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'removeLocal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'removeLocal',
                        callbackId: callbackId,
                        key: input.key
                    });
                });
            },
            async renameLocal(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'renameLocal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'renameLocal',
                        callbackId: callbackId,
                        oldKey: input.oldKey,
                        newKey: input.newKey
                    });
                });
            },
            async mkdirLocal(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'mkdirLocal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'mkdirLocal',
                        callbackId: callbackId,
                        key: input.key
                    });
                });
            },
            async openFile(input) {
                return new Promise((resolve, reject) => {
                    const callbackId = 'openFile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__aitos_callbacks__ = window.__aitos_callbacks__ || {};
                    window.__aitos_callbacks__[callbackId] = resolve;
                    window.chrome.webview.postMessage({
                        type: 'openFile',
                        callbackId: callbackId,
                        key: input.key,
                        app: input.app || null
                    });
                });
            },
            async minimizeWindow() {
                window.chrome.webview.postMessage({ type: 'minimizeWindow' });
            },
            async maximizeWindow() {
                window.chrome.webview.postMessage({ type: 'maximizeWindow' });
            },
            async closeWindow() {
                window.chrome.webview.postMessage({ type: 'closeWindow' });
            },
            async startWindowDrag() {
                window.chrome.webview.postMessage({ type: 'startWindowDrag' });
            }
        };
    )";

    webview->AddScriptToExecuteOnDocumentCreated(
        bridgeScript.c_str(),
        new ScriptCompletedHandler([](HRESULT result, LPCWSTR id) -> HRESULT {
            return S_OK;
        })
    );

    webview->add_WebMessageReceived(
        new MessageReceivedHandler([](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
            if (!instance || !instance->webview) return S_OK;

            LPWSTR messageRaw = nullptr;
            args->get_WebMessageAsJson(&messageRaw);
            if (!messageRaw) return S_OK;

            std::wstring message(messageRaw);
            CoTaskMemFree(messageRaw);

            JsonHelpers::JsonValue doc;
            if (!JsonHelpers::parse(message, doc)) return S_OK;

            std::string type = JsonHelpers::getString(doc, L"type");
            std::string callbackId = JsonHelpers::getString(doc, L"callbackId");

            if (type == "exec") {
                auto expandEnvVars = [](const std::string& str) -> std::string {
                    std::string result;
                    size_t i = 0;
                    while (i < str.length()) {
                        if (str[i] == '%' && i + 1 < str.length()) {
                            size_t end = str.find('%', i + 1);
                            if (end != std::string::npos && end > i + 1) {
                                std::string varName = str.substr(i + 1, end - i - 1);
                                char* envValue = getenv(varName.c_str());
                                if (envValue) {
                                    result += envValue;
                                } else {
                                    result += str.substr(i, end - i + 1);
                                }
                                i = end + 1;
                                continue;
                            }
                        }
                        result += str[i];
                        i++;
                    }
                    return result;
                };

                // Windows command-line quoting for an argument containing spaces
                // or quotes (double trailing backslashes, escape embedded quotes).
                auto quoteArg = [](const std::string& arg) -> std::string {
                    if (arg.empty()) return "\"\"";
                    if (arg.find_first_of(" \t\"") == std::string::npos) return arg;
                    std::string out = "\"";
                    size_t n = arg.size();
                    for (size_t i = 0; i < n; i++) {
                        size_t backslashes = 0;
                        while (i < n && arg[i] == '\\') {
                            backslashes++;
                            i++;
                        }
                        if (i == n) {
                            out.append(backslashes * 2, '\\'); // double trailing backslashes before closing quote
                            break;
                        }
                        if (arg[i] == '"') {
                            out.append(backslashes * 2 + 1, '\\');
                            out += '"';
                        } else {
                            out.append(backslashes, '\\');
                            out += arg[i];
                        }
                    }
                    out += '"';
                    return out;
                };

                // cmd.exe and console tools emit ANSI (system code page) output;
                // convert raw bytes to UTF-8 for the JSON response.
                auto ansiBytesToUtf8 = [](const std::string& bytes) -> std::string {
                    if (bytes.empty()) return "";
                    int wlen = MultiByteToWideChar(CP_ACP, 0, bytes.c_str(), (int)bytes.size(), nullptr, 0);
                    if (wlen <= 0) return bytes;
                    std::wstring wstr(wlen, L'\0');
                    MultiByteToWideChar(CP_ACP, 0, bytes.c_str(), (int)bytes.size(), &wstr[0], wlen);
                    int ulen = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), nullptr, 0, nullptr, nullptr);
                    std::string out(ulen, '\0');
                    WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), &out[0], ulen, nullptr, nullptr);
                    return out;
                };

                std::string command = JsonHelpers::getString(doc, L"command");
                std::string cwd = JsonHelpers::getString(doc, L"cwd");
                std::vector<std::string> args = JsonHelpers::getStringArray(doc, L"args");
                HWND hwnd = instance->hWnd;

                // exec may run for a long time; run it on a worker thread so the
                // UI thread (and the WebView) never blocks.
                std::thread([hwnd, command, callbackId, cwd, args, expandEnvVars, quoteArg, ansiBytesToUtf8]() {
                    // CreateProcess does not expand %VAR%; expand per argument.
                    std::string exe = expandEnvVars(command);
                    std::vector<std::string> expandedArgs;
                    for (const auto& arg : args) {
                        expandedArgs.push_back(expandEnvVars(arg));
                    }
                    std::string workCwd = expandEnvVars(cwd);

                    // Build the command line with proper Windows quoting (no interpreter).
                    std::string cmdLine = quoteArg(exe);
                    for (const auto& arg : expandedArgs) {
                        cmdLine += " " + quoteArg(arg);
                    }

                    SECURITY_ATTRIBUTES sa;
                    sa.nLength = sizeof(SECURITY_ATTRIBUTES);
                    sa.bInheritHandle = TRUE;
                    sa.lpSecurityDescriptor = nullptr;

                    HANDLE hReadPipe, hWritePipe;
                    CreatePipe(&hReadPipe, &hWritePipe, &sa, 0);
                    SetHandleInformation(hReadPipe, HANDLE_FLAG_INHERIT, 0);

                    std::wstring wCmd = JsonHelpers::utf8ToWstring(cmdLine);
                    std::wstring wDir = JsonHelpers::utf8ToWstring(workCwd);

                    STARTUPINFOW si = {};
                    si.cb = sizeof(STARTUPINFOW);
                    si.dwFlags = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
                    si.hStdOutput = hWritePipe;
                    si.hStdError = hWritePipe;
                    si.wShowWindow = SW_HIDE;

                    PROCESS_INFORMATION pi = {};

                    std::vector<wchar_t> cmdBuffer(wCmd.begin(), wCmd.end());
                    cmdBuffer.push_back(L'\0');

                    BOOL success = CreateProcessW(
                        nullptr,
                        cmdBuffer.data(),
                        nullptr, nullptr, TRUE,
                        CREATE_NO_WINDOW,
                        nullptr,
                        wDir.empty() ? nullptr : wDir.c_str(),
                        &si, &pi
                    );

                    std::string stdout_result;
                    std::string stderr_result;
                    int exitCode = 0;

                    if (success) {
                        CloseHandle(hWritePipe);

                        char buffer[4096];
                        DWORD bytesRead;
                        while (ReadFile(hReadPipe, buffer, sizeof(buffer) - 1, &bytesRead, nullptr) && bytesRead > 0) {
                            buffer[bytesRead] = '\0';
                            stdout_result += buffer;
                        }

                        WaitForSingleObject(pi.hProcess, INFINITE);
                        GetExitCodeProcess(pi.hProcess, reinterpret_cast<LPDWORD>(&exitCode));

                        CloseHandle(pi.hProcess);
                        CloseHandle(pi.hThread);
                    } else {
                        CloseHandle(hWritePipe);
                        stderr_result = "Failed to execute command";
                        exitCode = 1;
                    }

                    CloseHandle(hReadPipe);

                    // Console tools emit ANSI (system code page) output.
                    stdout_result = ansiBytesToUtf8(stdout_result);
                    stderr_result = ansiBytesToUtf8(stderr_result);

                    std::wstring callbackIdW(callbackId.begin(), callbackId.end());
                    std::string escapedStdout = JsonHelpers::escapeJson(stdout_result);
                    std::string escapedStderr = JsonHelpers::escapeJson(stderr_result);

                    std::wstring stdoutW = JsonHelpers::utf8ToWstring(escapedStdout);
                    std::wstring stderrW = JsonHelpers::utf8ToWstring(escapedStderr);

                    std::wstring resultJson = L"{\"stdout\":\"" + stdoutW + L"\",\"stderr\":\"" + stderrW + L"\",\"exitCode\":" + std::to_wstring(exitCode) + L"}";
                    PostBridgeResult(hwnd, callbackIdW, resultJson);
                }).detach();
            }
            else if (type == "writeLocal" || type == "readLocal" || type == "listLocal" || type == "removeLocal" ||
                     type == "renameLocal" || type == "mkdirLocal" || type == "openFile") {

                std::string key = JsonHelpers::getString(doc, L"key");
                std::string scope = JsonHelpers::getString(doc, L"scope");
                std::string value = JsonHelpers::getString(doc, L"value");
                std::string oldKey = JsonHelpers::getString(doc, L"oldKey");
                std::string newKey = JsonHelpers::getString(doc, L"newKey");
                std::string app = JsonHelpers::getString(doc, L"app");
                std::wstring dataPath = instance->GetLocalDataPath();
                HWND hwnd = instance->hWnd;

                // Disk I/O on a worker thread so the UI thread never blocks.
                std::thread([hwnd, type, callbackId, key, scope, value, dataPath, oldKey, newKey, app]() mutable {
                    std::filesystem::path userGraphsPath(dataPath);
                    std::filesystem::create_directories(userGraphsPath);

                    std::wstring resultJson;
                    bool success = false;
                    std::string error;

                    try {
                        if (type == "writeLocal") {
                            std::filesystem::path filePath = userGraphsPath / JsonHelpers::utf8ToWstring(key);
                            std::filesystem::create_directories(filePath.parent_path());
                            std::ofstream file(filePath, std::ios::binary);
                            if (file.is_open()) {
                                file << value;
                                file.close();
                                success = true;
                            } else {
                                error = "Failed to write local data";
                            }
                        }
                        else if (type == "readLocal") {
                            std::filesystem::path filePath = userGraphsPath / JsonHelpers::utf8ToWstring(key);
                            if (std::filesystem::exists(filePath)) {
                                std::ifstream file(filePath, std::ios::binary);
                                if (file.is_open()) {
                                    std::stringstream buffer;
                                    buffer << file.rdbuf();
                                    value = buffer.str();
                                    file.close();
                                    success = true;
                                } else {
                                    error = "Failed to read local data";
                                }
                            } else {
                                error = "Data not found";
                            }
                        }
                        else if (type == "listLocal") {
                            std::filesystem::path dirPath = userGraphsPath / JsonHelpers::utf8ToWstring(scope);
                            std::string keysJson = "[";
                            if (std::filesystem::exists(dirPath) && std::filesystem::is_directory(dirPath)) {
                                bool first = true;
                                for (const auto& entry : std::filesystem::recursive_directory_iterator(dirPath)) {
                                    if (!first) keysJson += ",";
                                    first = false;
                                    std::filesystem::path relativePath = std::filesystem::relative(entry.path(), dirPath);
                                    std::string keyName;
                                    int len = WideCharToMultiByte(CP_UTF8, 0, relativePath.wstring().c_str(), -1, nullptr, 0, nullptr, nullptr);
                                    keyName.resize(len - 1);
                                    WideCharToMultiByte(CP_UTF8, 0, relativePath.wstring().c_str(), -1, &keyName[0], len, nullptr, nullptr);
                                    for (char& c : keyName) {
                                        if (c == '\\') c = '/';
                                    }
                                    std::string fullKey = scope + keyName;
                                    keysJson += "\"" + JsonHelpers::escapeJson(fullKey) + "\"";
                                }
                            }
                            keysJson += "]";
                            value = keysJson;
                            success = true;
                        }
                        else if (type == "removeLocal") {
                            std::filesystem::path filePath = userGraphsPath / JsonHelpers::utf8ToWstring(key);
                            if (std::filesystem::exists(filePath)) {
                                std::filesystem::remove_all(filePath); // file or folder tree
                                success = true;
                            } else {
                                error = "Data not found";
                            }
                        }
                        else if (type == "renameLocal") {
                            std::filesystem::path oldPath = userGraphsPath / JsonHelpers::utf8ToWstring(oldKey);
                            std::filesystem::path newPath = userGraphsPath / JsonHelpers::utf8ToWstring(newKey);
                            if (std::filesystem::exists(oldPath)) {
                                std::filesystem::create_directories(newPath.parent_path());
                                std::filesystem::rename(oldPath, newPath);
                                success = true;
                            } else {
                                error = "Data not found";
                            }
                        }
                        else if (type == "mkdirLocal") {
                            std::filesystem::path dirPath = userGraphsPath / JsonHelpers::utf8ToWstring(key);
                            std::filesystem::create_directories(dirPath);
                            success = true;
                        }
                        else if (type == "openFile") {
                            std::filesystem::path filePath = userGraphsPath / JsonHelpers::utf8ToWstring(key);
                            if (std::filesystem::exists(filePath)) {
                                std::wstring appW = app.empty() ? L"" : JsonHelpers::utf8ToWstring(app);
                                // Open with the given app (app as executable, file as params)
                                // or with the system default when no app is given.
                                LONG_PTR h = reinterpret_cast<LONG_PTR>(ShellExecuteW(
                                    nullptr, L"open",
                                    appW.empty() ? filePath.wstring().c_str() : appW.c_str(),
                                    appW.empty() ? nullptr : filePath.wstring().c_str(),
                                    nullptr, SW_SHOWNORMAL));
                                success = (h > 32);
                                if (!success) error = "Failed to open file";
                            } else {
                                error = "Data not found";
                            }
                        }
                    } catch (const std::exception& e) {
                        error = e.what();
                    }

                    if (success) {
                        if (type == "readLocal") {
                            resultJson = L"{\"success\":true,\"value\":\"" + JsonHelpers::utf8ToWstring(JsonHelpers::escapeJson(value)) + L"\"}";
                        } else if (type == "listLocal") {
                            resultJson = L"{\"success\":true,\"keys\":" + JsonHelpers::utf8ToWstring(value) + L"}";
                        } else {
                            resultJson = L"{\"success\":true}";
                        }
                    } else {
                        resultJson = L"{\"success\":false,\"error\":\"" + JsonHelpers::utf8ToWstring(JsonHelpers::escapeJson(error)) + L"\"}";
                    }

                    std::wstring callbackIdW(callbackId.begin(), callbackId.end());
                    PostBridgeResult(hwnd, callbackIdW, resultJson);
                }).detach();
            }
            else if (type == "minimizeWindow") {
                ShowWindow(instance->hWnd, SW_MINIMIZE);
            }
            else if (type == "maximizeWindow") {
                if (IsZoomed(instance->hWnd)) {
                    ShowWindow(instance->hWnd, SW_RESTORE);
                } else {
                    ShowWindow(instance->hWnd, SW_MAXIMIZE);
                }
            }
            else if (type == "closeWindow") {
                PostMessage(instance->hWnd, WM_CLOSE, 0, 0);
            }
            else if (type == "startWindowDrag") {
                ReleaseCapture();
                SendMessage(instance->hWnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            }
            return S_OK;
        }),
        nullptr
    );
}
