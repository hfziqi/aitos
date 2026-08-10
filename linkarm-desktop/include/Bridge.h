#pragma once

#include <windows.h>
#include <string>
#include <functional>

#include "WebView2.h"

// SimpleCallback: minimal COM callback base shared by all WebView2 handlers.
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

// ─── async bridge callback ───────────────────────────────────────────────────
// Long-running bridge operations (exec, disk I/O) run on worker threads so the
// UI never blocks. WebView2 COM calls must happen on the UI thread, so results
// are marshaled back via PostMessage and executed in WndProc.
#define WM_BRIDGE_CALLBACK (WM_APP + 1)

struct BridgeResult {
    std::wstring callbackId;
    std::wstring resultJson;
};

void InvokeBridgeCallback(ICoreWebView2* webview, const BridgeResult& r);

// Callable from any thread; silently drops the result if the window is gone.
void PostBridgeResult(HWND hWnd, const std::wstring& callbackId, const std::wstring& resultJson);
