#pragma once

#include <windows.h>
#include <objbase.h>
#include <rpc.h>
#include <rpcndr.h>
#include <string>
#include <functional>
#include <memory>

#include "WebView2.h"

template<typename T>
class ComPtr {
public:
    ComPtr() : ptr(nullptr) {}
    ComPtr(T* p) : ptr(p) {}
    ~ComPtr() { if (ptr) ptr->Release(); }
    
    ComPtr(const ComPtr&) = delete;
    ComPtr& operator=(const ComPtr&) = delete;
    
    ComPtr(ComPtr&& other) noexcept : ptr(other.ptr) { other.ptr = nullptr; }
    ComPtr& operator=(ComPtr&& other) noexcept {
        if (this != &other) {
            if (ptr) ptr->Release();
            ptr = other.ptr;
            other.ptr = nullptr;
        }
        return *this;
    }
    
    T** operator&() { return &ptr; }
    T* operator->() { return ptr; }
    T* get() { return ptr; }
    bool operator!() { return ptr == nullptr; }
    operator bool() { return ptr != nullptr; }
    
private:
    T* ptr;
};

class Launcher {
public:
    Launcher();
    ~Launcher();

    bool Initialize(HINSTANCE hInstance, int nCmdShow);
    int Run();
    void SetDevMode(bool mode) { devMode = mode; }
    void SetDevPort(int port) { devPort = port; }

private:
    bool CreateMainWindow();
    bool InitializeWebView();
    void SetupBridge();
    std::wstring GetAppPath();
    std::wstring GetLocalDataPath();

    static LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);

    HINSTANCE hInstance;
    HWND hWnd;
    ICoreWebView2Controller* webviewController;
    ICoreWebView2* webview;
    bool devMode;
    int devPort;

    static Launcher* instance;
    static const wchar_t* CLASS_NAME;
    static const int DEFAULT_WIDTH = 1000;
    static const int DEFAULT_HEIGHT = 680;
};
