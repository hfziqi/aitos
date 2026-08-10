#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <objbase.h>
#include <rpc.h>
#include <rpcndr.h>
#include <string>
#include <functional>
#include <memory>
#include <filesystem>
#include <shellapi.h>
#include <shlobj.h>
#include <dwmapi.h>

#include "Launcher.h"
#include "WebView2.h"
#include "HttpServer.h"
#include "Bridge.h"
#include "resource.h"

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

Launcher::Launcher() : hInstance(nullptr), hWnd(nullptr), webviewController(nullptr), webview(nullptr), devMode(false), devPort(5173) {}

Launcher::~Launcher() {
    httpServer.Stop();
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
    wcex.hIcon = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_APP_ICON));
    wcex.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wcex.lpszMenuName = nullptr;
    wcex.lpszClassName = CLASS_NAME;
    wcex.hIconSm = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_APP_ICON));

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
        // Release mode: Vite's output is ES modules, which file:// pages cannot
        // load (CORS blocks external module scripts). Serve app/ over a local
        // HTTP server on 127.0.0.1.
        if (!httpServer.Start(appPath + L"\\app")) {
            MessageBox(nullptr, L"Failed to start local server for app/", L"Error", MB_OK | MB_ICONERROR);
            PostMessage(hWnd, WM_CLOSE, 0, 0);
            return false;
        }
        htmlPath = L"http://127.0.0.1:" + std::to_wstring(httpServer.GetPort()) + L"/index.html";
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
        case WM_BRIDGE_CALLBACK: {
            BridgeResult* result = reinterpret_cast<BridgeResult*>(lParam);
            if (result) {
                if (instance && instance->webview) {
                    InvokeBridgeCallback(instance->webview, *result);
                }
                delete result;
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
