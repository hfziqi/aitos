#include <windows.h>
#include <objbase.h>
#include <rpc.h>
#include <rpcndr.h>
#include <string>
#include <functional>
#include <memory>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <shellapi.h>
#include <shlobj.h>
#include <dwmapi.h>

#include "Launcher.h"
#include "WebView2.h"

#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "dwmapi.lib")

#ifndef DWMWA_WINDOW_CORNER_PREFERENCE
#define DWMWA_WINDOW_CORNER_PREFERENCE 33
#endif

Launcher* Launcher::instance = nullptr;
const wchar_t* Launcher::CLASS_NAME = L"LinkArmWindowClass";

template<typename I, typename... Args>
class SimpleCallback : public I {
public:
    using FuncType = std::function<HRESULT(Args...)>;
    
    SimpleCallback(FuncType f) : func(f), refCount(1) {}
    
    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
        if (riid == __uuidof(I) || riid == IID_IUnknown) {
            *ppv = this;
            AddRef();
            return S_OK;
        }
        *ppv = nullptr;
        return E_NOINTERFACE;
    }
    
    ULONG STDMETHODCALLTYPE AddRef() override { return InterlockedIncrement(&refCount); }
    ULONG STDMETHODCALLTYPE Release() override {
        LONG c = InterlockedDecrement(&refCount);
        if (c == 0) delete this;
        return c;
    }
    
protected:
    FuncType func;
    LONG refCount;
};

class EnvCompletedHandler : public SimpleCallback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler, HRESULT, ICoreWebView2Environment*> {
public:
    EnvCompletedHandler(FuncType f) : SimpleCallback(f) {}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT result, ICoreWebView2Environment* env) override { return func(result, env); }
};

class ControllerCompletedHandler : public SimpleCallback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler, HRESULT, ICoreWebView2Controller*> {
public:
    ControllerCompletedHandler(FuncType f) : SimpleCallback(f) {}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT result, ICoreWebView2Controller* controller) override { return func(result, controller); }
};

class ScriptCompletedHandler : public SimpleCallback<ICoreWebView2AddScriptToExecuteOnDocumentCreatedCompletedHandler, HRESULT, LPCWSTR> {
public:
    ScriptCompletedHandler(FuncType f) : SimpleCallback(f) {}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT result, LPCWSTR id) override { return func(result, id); }
};

class MessageReceivedHandler : public SimpleCallback<ICoreWebView2WebMessageReceivedEventHandler, ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs*> {
public:
    MessageReceivedHandler(FuncType f) : SimpleCallback(f) {}
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) override { return func(sender, args); }
};

class ExecuteScriptHandler : public SimpleCallback<ICoreWebView2ExecuteScriptCompletedHandler, HRESULT, LPCWSTR> {
public:
    ExecuteScriptHandler(FuncType f) : SimpleCallback(f) {}
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT result, LPCWSTR resultObjectAsJson) override { return func(result, resultObjectAsJson); }
};

Launcher::Launcher() : hInstance(nullptr), hWnd(nullptr), webviewController(nullptr), webview(nullptr), devMode(false), devPort(5173) {}

Launcher::~Launcher() {
    if (webviewController) {
        webviewController->Close();
        webviewController->Release();
        webviewController = nullptr;
    }
    if (webview) {
        webview->Release();
        webview = nullptr;
    }
}

bool Launcher::Initialize(HINSTANCE hInstance, int nCmdShow) {
    this->hInstance = hInstance;
    instance = this;

    if (!CreateMainWindow()) {
        MessageBox(nullptr, L"Failed to create window", L"Error", MB_OK | MB_ICONERROR);
        return false;
    }

    ShowWindow(hWnd, nCmdShow);
    UpdateWindow(hWnd);

    if (!InitializeWebView()) {
        MessageBox(nullptr, L"Failed to initialize WebView2. Please ensure WebView2 Runtime is installed.", L"Error", MB_OK | MB_ICONERROR);
        return false;
    }

    return true;
}

bool Launcher::CreateMainWindow() {
    WNDCLASSEXW wcex = {};
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = WndProc;
    wcex.cbClsExtra = 0;
    wcex.cbWndExtra = 0;
    wcex.hInstance = hInstance;
    wcex.hIcon = LoadIcon(nullptr, IDI_APPLICATION);
    wcex.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wcex.lpszMenuName = nullptr;
    wcex.lpszClassName = CLASS_NAME;
    wcex.hIconSm = LoadIcon(nullptr, IDI_APPLICATION);

    if (!RegisterClassExW(&wcex)) {
        return false;
    }

    UINT dpi = GetDpiForSystem();
    int scaledWidth = MulDiv(DEFAULT_WIDTH, dpi, 96);
    int scaledHeight = MulDiv(DEFAULT_HEIGHT, dpi, 96);

    hWnd = CreateWindowW(
        CLASS_NAME,
        L"LinkArm",
        WS_POPUP | WS_MINIMIZEBOX | WS_MAXIMIZEBOX,
        CW_USEDEFAULT, CW_USEDEFAULT,
        scaledWidth, scaledHeight,
        nullptr, nullptr, hInstance, nullptr
    );

    if (hWnd) {
        DWM_WINDOW_CORNER_PREFERENCE cornerPref = DWMWCP_ROUND;
        DwmSetWindowAttribute(hWnd, DWMWA_WINDOW_CORNER_PREFERENCE, &cornerPref, sizeof(cornerPref));
    }

    return hWnd != nullptr;
}

bool Launcher::InitializeWebView() {
    std::wstring appPath = GetAppPath();
    std::wstring htmlPath;
    
    if (devMode) {
        htmlPath = L"http://localhost:" + std::to_wstring(devPort);
    } else {
        htmlPath = L"file:///" + appPath + L"/app/index.html";
    }

    HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(
        nullptr,
        appPath.c_str(),
        nullptr,
        new EnvCompletedHandler([this, htmlPath](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
            if (FAILED(result)) {
                PostMessage(hWnd, WM_CLOSE, 0, 0);
                return result;
            }

            return env->CreateCoreWebView2Controller(
                hWnd,
                new ControllerCompletedHandler([this, htmlPath](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                    if (FAILED(result)) {
                        PostMessage(hWnd, WM_CLOSE, 0, 0);
                        return result;
                    }

                    webviewController = controller;
                    webviewController->AddRef();
                    
                    HRESULT hr = webviewController->get_CoreWebView2(&webview);
                    if (FAILED(hr) || !webview) {
                        PostMessage(hWnd, WM_CLOSE, 0, 0);
                        return hr;
                    }
                    webview->AddRef();

                    RECT bounds;
                    GetClientRect(hWnd, &bounds);
                    webviewController->put_Bounds(bounds);

                    SetupBridge();

                    return webview->Navigate(htmlPath.c_str());
                })
            );
        })
    );

    if (FAILED(hr)) {
        return false;
    }

    return true;
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

            if (message.find(L"\"type\":\"exec\"") != std::wstring::npos) {
                auto getStringValue = [](const std::wstring& json, const std::wstring& key) -> std::string {
                    std::wstring searchKey = L"\"" + key + L"\":";
                    size_t pos = json.find(searchKey);
                    if (pos == std::wstring::npos) return "";

                    pos += searchKey.length();
                    while (pos < json.length() && (json[pos] == L' ' || json[pos] == L'\t')) pos++;

                    if (json[pos] == L'"') {
                        pos++;
                        size_t endPos = json.find(L'"', pos);
                        if (endPos != std::wstring::npos) {
                            std::wstring value = json.substr(pos, endPos - pos);
                            std::string result;
                            int len = WideCharToMultiByte(CP_UTF8, 0, value.c_str(), -1, nullptr, 0, nullptr, nullptr);
                            result.resize(len - 1);
                            WideCharToMultiByte(CP_UTF8, 0, value.c_str(), -1, &result[0], len, nullptr, nullptr);
                            return result;
                        }
                    }
                    return "";
                };

                auto getArrayValues = [](const std::wstring& json, const std::wstring& key) -> std::vector<std::string> {
                    std::vector<std::string> result;
                    std::wstring searchKey = L"\"" + key + L"\":";
                    size_t pos = json.find(searchKey);
                    if (pos == std::wstring::npos) return result;

                    pos += searchKey.length();
                    while (pos < json.length() && (json[pos] == L' ' || json[pos] == L'\t')) pos++;

                    if (json[pos] == L'[') {
                        pos++;
                        while (pos < json.length()) {
                            while (pos < json.length() && (json[pos] == L' ' || json[pos] == L'\t' || json[pos] == L',' || json[pos] == L'\n' || json[pos] == L'\r')) pos++;
                            if (json[pos] == L']') break;
                            if (json[pos] == L'"') {
                                pos++;
                                size_t endPos = json.find(L'"', pos);
                                if (endPos != std::wstring::npos) {
                                    std::wstring value = json.substr(pos, endPos - pos);
                                    std::string strValue;
                                    int len = WideCharToMultiByte(CP_UTF8, 0, value.c_str(), -1, nullptr, 0, nullptr, nullptr);
                                    strValue.resize(len - 1);
                                    WideCharToMultiByte(CP_UTF8, 0, value.c_str(), -1, &strValue[0], len, nullptr, nullptr);
                                    result.push_back(strValue);
                                    pos = endPos + 1;
                                } else break;
                            } else break;
                        }
                    }
                    return result;
                };

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

                std::string command = getStringValue(message, L"command");
                std::string callbackId = getStringValue(message, L"callbackId");
                std::string cwd = getStringValue(message, L"cwd");
                std::vector<std::string> args = getArrayValues(message, L"args");

                std::string fullCommand = command;
                for (const auto& arg : args) {
                    fullCommand += " " + arg;
                }
                
                fullCommand = expandEnvVars(fullCommand);
                cwd = expandEnvVars(cwd);
                
                std::string shellCommand = "powershell.exe -NoProfile -Command \"[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8; " + fullCommand + " | Out-String\"";
                
                OutputDebugStringA("[Bridge] shellCommand: ");
                OutputDebugStringA(shellCommand.c_str());
                OutputDebugStringA("\n");
                
                SECURITY_ATTRIBUTES sa;
                sa.nLength = sizeof(SECURITY_ATTRIBUTES);
                sa.bInheritHandle = TRUE;
                sa.lpSecurityDescriptor = nullptr;

                HANDLE hReadPipe, hWritePipe;
                CreatePipe(&hReadPipe, &hWritePipe, &sa, 0);
                SetHandleInformation(hReadPipe, HANDLE_FLAG_INHERIT, 0);

                STARTUPINFOA si = {};
                si.cb = sizeof(STARTUPINFOA);
                si.dwFlags = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
                si.hStdOutput = hWritePipe;
                si.hStdError = hWritePipe;
                si.wShowWindow = SW_HIDE;

                PROCESS_INFORMATION pi = {};

                std::string workingDir = cwd.empty() ? "" : cwd;
                std::vector<char> cwdBuffer(workingDir.begin(), workingDir.end());
                cwdBuffer.push_back('\0');
                LPSTR cwdPtr = workingDir.empty() ? nullptr : cwdBuffer.data();

                std::vector<char> cmdBuffer(shellCommand.begin(), shellCommand.end());
                cmdBuffer.push_back('\0');

                BOOL success = CreateProcessA(
                    nullptr,
                    cmdBuffer.data(),
                    nullptr, nullptr, TRUE,
                    CREATE_NO_WINDOW,
                    nullptr, cwdPtr,
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
                    stderr_result = "Failed to execute command";
                    exitCode = 1;
                }

                CloseHandle(hReadPipe);

                auto escapeJson = [](const std::string& str) -> std::string {
                    std::string result;
                    for (char c : str) {
                        switch (c) {
                            case '"': result += "\\\""; break;
                            case '\\': result += "\\\\"; break;
                            case '\n': result += "\\n"; break;
                            case '\r': result += "\\r"; break;
                            case '\t': result += "\\t"; break;
                            default: result += c; break;
                        }
                    }
                    return result;
                };

                auto utf8ToWstring = [](const std::string& str) -> std::wstring {
                    if (str.empty()) return std::wstring();
                    int wlen = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, nullptr, 0);
                    std::wstring wstr(wlen, 0);
                    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &wstr[0], wlen);
                    if (!wstr.empty()) wstr.pop_back();
                    return wstr;
                };

                std::wstring callbackIdW(callbackId.begin(), callbackId.end());
                std::string escapedStdout = escapeJson(stdout_result);
                std::string escapedStderr = escapeJson(stderr_result);
                
                std::wstring stdoutW = utf8ToWstring(escapedStdout);
                std::wstring stderrW = utf8ToWstring(escapedStderr);

                std::wstring resultJson = L"{\"stdout\":\"" + stdoutW + L"\",\"stderr\":\"" + stderrW + L"\",\"exitCode\":" + std::to_wstring(exitCode) + L"}";

                std::wstring script = L"if(window.__aitos_callbacks__&&window.__aitos_callbacks__['" + callbackIdW + L"']){window.__aitos_callbacks__['" + callbackIdW + L"'](" + resultJson + L");delete window.__aitos_callbacks__['" + callbackIdW + L"'];}";

                instance->webview->ExecuteScript(
                    script.c_str(),
                    new ExecuteScriptHandler([](HRESULT result, LPCWSTR resultObjectAsJson) -> HRESULT {
                        return S_OK;
                    })
                );
            }
            else if (message.find(L"\"type\":\"writeLocal\"") != std::wstring::npos ||
                     message.find(L"\"type\":\"readLocal\"") != std::wstring::npos ||
                     message.find(L"\"type\":\"listLocal\"") != std::wstring::npos ||
                     message.find(L"\"type\":\"removeLocal\"") != std::wstring::npos) {
                
                auto getStringValue = [](const std::wstring& json, const std::wstring& key) -> std::string {
                    std::wstring searchKey = L"\"" + key + L"\":";
                    size_t pos = json.find(searchKey);
                    if (pos == std::wstring::npos) return "";

                    pos += searchKey.length();
                    while (pos < json.length() && (json[pos] == L' ' || json[pos] == L'\t')) pos++;

                    if (json[pos] == L'"') {
                        pos++;
                        size_t endPos = json.find(L'"', pos);
                        if (endPos != std::wstring::npos) {
                            std::wstring value = json.substr(pos, endPos - pos);
                            std::string result;
                            int len = WideCharToMultiByte(CP_UTF8, 0, value.c_str(), -1, nullptr, 0, nullptr, nullptr);
                            result.resize(len - 1);
                            WideCharToMultiByte(CP_UTF8, 0, value.c_str(), -1, &result[0], len, nullptr, nullptr);
                            return result;
                        }
                    }
                    return "";
                };

                auto getEscapedStringValue = [](const std::wstring& json, const std::wstring& key) -> std::string {
                    std::wstring searchKey = L"\"" + key + L"\":";
                    size_t pos = json.find(searchKey);
                    if (pos == std::wstring::npos) return "";

                    pos += searchKey.length();
                    while (pos < json.length() && (json[pos] == L' ' || json[pos] == L'\t')) pos++;

                    if (json[pos] == L'"') {
                        pos++;
                        std::wstring wresult;
                        while (pos < json.length()) {
                            if (json[pos] == L'\\' && pos + 1 < json.length()) {
                                pos++;
                                switch (json[pos]) {
                                    case L'n': wresult += L'\n'; break;
                                    case L'r': wresult += L'\r'; break;
                                    case L't': wresult += L'\t'; break;
                                    case L'"': wresult += L'"'; break;
                                    case L'\\': wresult += L'\\'; break;
                                    default: wresult += json[pos]; break;
                                }
                            } else if (json[pos] == L'"') {
                                break;
                            } else {
                                wresult += json[pos];
                            }
                            pos++;
                        }
                        std::string result;
                        int len = WideCharToMultiByte(CP_UTF8, 0, wresult.c_str(), -1, nullptr, 0, nullptr, nullptr);
                        result.resize(len - 1);
                        WideCharToMultiByte(CP_UTF8, 0, wresult.c_str(), -1, &result[0], len, nullptr, nullptr);
                        return result;
                    }
                    return "";
                };

                auto utf8ToWstring = [](const std::string& str) -> std::wstring {
                    if (str.empty()) return std::wstring();
                    int wlen = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, nullptr, 0);
                    std::wstring wstr(wlen, 0);
                    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &wstr[0], wlen);
                    if (!wstr.empty()) wstr.pop_back();
                    return wstr;
                };

                auto escapeJson = [](const std::string& str) -> std::string {
                    std::string result;
                    for (char c : str) {
                        switch (c) {
                            case '"': result += "\\\""; break;
                            case '\\': result += "\\\\"; break;
                            case '\n': result += "\\n"; break;
                            case '\r': result += "\\r"; break;
                            case '\t': result += "\\t"; break;
                            default: result += c; break;
                        }
                    }
                    return result;
                };

                std::string type = getStringValue(message, L"type");
                std::string callbackId = getStringValue(message, L"callbackId");
                std::string key = getStringValue(message, L"key");
                std::string scope = getStringValue(message, L"scope");
                std::string value = getEscapedStringValue(message, L"value");

                std::filesystem::path userGraphsPath = std::filesystem::path(instance->GetLocalDataPath());
                std::filesystem::create_directories(userGraphsPath);

                std::wstring resultJson;
                bool success = false;
                std::string error;

                try {
                    if (type == "writeLocal") {
                        std::filesystem::path filePath = userGraphsPath / utf8ToWstring(key);
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
                        std::filesystem::path filePath = userGraphsPath / utf8ToWstring(key);
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
                        std::filesystem::path dirPath = userGraphsPath / utf8ToWstring(scope);
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
                                keysJson += "\"" + escapeJson(fullKey) + "\"";
                            }
                        }
                        keysJson += "]";
                        value = keysJson;
                        success = true;
                    }
                    else if (type == "removeLocal") {
                        std::filesystem::path filePath = userGraphsPath / utf8ToWstring(key);
                        if (std::filesystem::exists(filePath)) {
                            std::filesystem::remove(filePath);
                            success = true;
                        } else {
                            error = "Data not found";
                        }
                    }
                } catch (const std::exception& e) {
                    error = e.what();
                }

                if (success) {
                    if (type == "readLocal") {
                        resultJson = L"{\"success\":true,\"value\":\"" + utf8ToWstring(escapeJson(value)) + L"\"}";
                    } else if (type == "listLocal") {
                        resultJson = L"{\"success\":true,\"keys\":" + utf8ToWstring(value) + L"}";
                    } else {
                        resultJson = L"{\"success\":true}";
                    }
                } else {
                    resultJson = L"{\"success\":false,\"error\":\"" + utf8ToWstring(escapeJson(error)) + L"\"}";
                }

                std::wstring callbackIdW(callbackId.begin(), callbackId.end());
                std::wstring script = L"if(window.__aitos_callbacks__&&window.__aitos_callbacks__['" + callbackIdW + L"']){window.__aitos_callbacks__['" + callbackIdW + L"'](" + resultJson + L");delete window.__aitos_callbacks__['" + callbackIdW + L"'];}";

                instance->webview->ExecuteScript(
                    script.c_str(),
                    new ExecuteScriptHandler([](HRESULT result, LPCWSTR resultObjectAsJson) -> HRESULT {
                        return S_OK;
                    })
                );
            }
            else if (message.find(L"\"type\":\"minimizeWindow\"") != std::wstring::npos) {
                ShowWindow(instance->hWnd, SW_MINIMIZE);
            }
            else if (message.find(L"\"type\":\"maximizeWindow\"") != std::wstring::npos) {
                if (IsZoomed(instance->hWnd)) {
                    ShowWindow(instance->hWnd, SW_RESTORE);
                } else {
                    ShowWindow(instance->hWnd, SW_MAXIMIZE);
                }
            }
            else if (message.find(L"\"type\":\"closeWindow\"") != std::wstring::npos) {
                PostMessage(instance->hWnd, WM_CLOSE, 0, 0);
            }
            else if (message.find(L"\"type\":\"startWindowDrag\"") != std::wstring::npos) {
                ReleaseCapture();
                SendMessage(instance->hWnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            }

            return S_OK;
        }),
        nullptr
    );
}

std::wstring Launcher::GetAppPath() {
    wchar_t buffer[MAX_PATH];
    GetModuleFileNameW(nullptr, buffer, MAX_PATH);

    std::filesystem::path exePath(buffer);
    return exePath.parent_path().wstring();
}

std::wstring Launcher::GetLocalDataPath() {
    wchar_t* localAppData = nullptr;
    HRESULT hr = SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &localAppData);
    
    if (SUCCEEDED(hr) && localAppData) {
        std::filesystem::path dataPath = std::filesystem::path(localAppData) / L"linkarm";
        CoTaskMemFree(localAppData);
        return dataPath.wstring();
    }
    
    if (localAppData) {
        CoTaskMemFree(localAppData);
    }
    
    return GetAppPath();
}

LRESULT CALLBACK Launcher::WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
    switch (message) {
        case WM_NCHITTEST: {
            LRESULT hit = DefWindowProc(hWnd, message, wParam, lParam);
            if (hit == HTCLIENT) {
                POINT pt;
                pt.x = (int)(short)LOWORD(lParam);
                pt.y = (int)(short)HIWORD(lParam);
                ScreenToClient(hWnd, &pt);
                
                RECT clientRect;
                GetClientRect(hWnd, &clientRect);
                
                int resizeBorder = 8;
                int titleBarHeight = 32;
                
                if (pt.y < titleBarHeight && pt.x > resizeBorder && pt.x < clientRect.right - resizeBorder) {
                    return HTCAPTION;
                }
                
                if (pt.x < resizeBorder && pt.y < resizeBorder) return HTTOPLEFT;
                if (pt.x > clientRect.right - resizeBorder && pt.y < resizeBorder) return HTTOPRIGHT;
                if (pt.x < resizeBorder && pt.y > clientRect.bottom - resizeBorder) return HTBOTTOMLEFT;
                if (pt.x > clientRect.right - resizeBorder && pt.y > clientRect.bottom - resizeBorder) return HTBOTTOMRIGHT;
                
                if (pt.x < resizeBorder) return HTLEFT;
                if (pt.x > clientRect.right - resizeBorder) return HTRIGHT;
                if (pt.y < resizeBorder) return HTTOP;
                if (pt.y > clientRect.bottom - resizeBorder) return HTBOTTOM;
            }
            return hit;
        }
        case WM_SIZE: {
            if (instance && instance->webviewController) {
                RECT bounds;
                GetClientRect(hWnd, &bounds);
                instance->webviewController->put_Bounds(bounds);
            }
            return 0;
        }
        case WM_DESTROY: {
            PostQuitMessage(0);
            return 0;
        }
        default:
            return DefWindowProc(hWnd, message, wParam, lParam);
    }
}

int Launcher::Run() {
    MSG msg;
    while (GetMessage(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    return (int)msg.wParam;
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPWSTR lpCmdLine, int nCmdShow) {
    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    
    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) {
        return 1;
    }

    Launcher launcher;
    
    std::wstring cmdLine(lpCmdLine);
    if (cmdLine.find(L"--dev") != std::wstring::npos) {
        launcher.SetDevMode(true);
    }
    
    size_t portPos = cmdLine.find(L"--port=");
    if (portPos != std::wstring::npos) {
        size_t start = portPos + 7;
        size_t end = cmdLine.find(L' ', start);
        if (end == std::wstring::npos) end = cmdLine.length();
        std::wstring portStr = cmdLine.substr(start, end - start);
        try {
            launcher.SetDevPort(std::stoi(portStr));
        } catch (...) {
            launcher.SetDevPort(5173);
        }
    }

    if (!launcher.Initialize(hInstance, nCmdShow)) {
        CoUninitialize();
        return 1;
    }

    int result = launcher.Run();

    CoUninitialize();
    return result;
}
