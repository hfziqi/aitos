# LinkArm Desktop Launcher

## Pure C++ + Windows API Implementation

No frameworks used, only depends on:
- Windows SDK (built-in)
- WebView2 (built-in on Windows 10/11)

## Build Steps

### 1. Install Dependencies

**CMake**
- Download: https://cmake.org/download/
- Ensure `cmake` is in PATH after installation

**Visual Studio Build Tools**
- Download: https://visualstudio.microsoft.com/downloads/
- Install "Desktop development with C++"

**WebView2 SDK**
- Download: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- Install to `C:/Program Files (x86)/Microsoft Edge WebView2`

### 2. Build LinkArm Web App

```bash
cd ../linkarm
npm run build
```

### 3. Copy Build Artifacts

```bash
# Windows PowerShell
Copy-Item -Recurse -Force ..\linkarm\dist\* .\app\
```

### 4. Build Launcher

```bash
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

### 5. Run

```bash
.\bin\Release\LinkArm.exe
```

## Directory Structure

```
linkarm-desktop/
├── src/
│   └── main.cpp          # Launcher source
├── include/
│   └── Launcher.h        # Header file
├── app/                  # LinkArm build output
│   ├── index.html
│   └── assets/
├── resources/            # Resource files
│   └── app.rc
├── CMakeLists.txt        # CMake configuration
└── README.md
```

## Bridge Atoms

| Atom | Function |
|-----|----------|
| exec | Execute system command |
| minimizeWindow | Minimize window |
| maximizeWindow | Maximize window |
| closeWindow | Close window |

## Design Principles

1. **Pure C++ + Windows API**: No frameworks used
2. **Minimal design**: Only provides the most basic capabilities
3. **Follows AITOS principles**: Other functionality achieved through atom composition