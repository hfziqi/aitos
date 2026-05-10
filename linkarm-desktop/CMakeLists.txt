cmake_minimum_required(VERSION 3.15)
project(LinkArmDesktop VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

add_executable(LinkArm WIN32
    src/main.cpp
)

target_include_directories(LinkArm PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/webview2/build/native/include
)

target_compile_definitions(LinkArm PRIVATE
    UNICODE
    _UNICODE
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(LinkArm PRIVATE
    shell32
    ole32
    oleaut32
    version
    user32
    gdi32
    advapi32
)

target_link_directories(LinkArm PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/webview2/build/native/x64
)

target_link_libraries(LinkArm PRIVATE WebView2Loader.dll.lib)

set_target_properties(LinkArm PROPERTIES
    OUTPUT_NAME "LinkArm"
)

install(TARGETS LinkArm RUNTIME DESTINATION .)
install(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/app DESTINATION .)
install(FILES ${CMAKE_CURRENT_SOURCE_DIR}/webview2/build/native/x64/WebView2Loader.dll DESTINATION .)
