#pragma once

#include <string>
#include <vector>
#include <memory>
#include <utility>

namespace JsonHelpers {

// Minimal JSON value tree produced by a recursive-descent parser.
// Covers the full JSON grammar (object / array / string / number / bool / null)
// so bridge messages are read correctly instead of by substring matching.
struct JsonValue {
    enum class Type { Null, Bool, Number, String, Array, Object };
    Type type = Type::Null;
    bool boolValue = false;
    double numberValue = 0;
    std::wstring stringValue;
    std::vector<std::unique_ptr<JsonValue>> array;
    std::vector<std::pair<std::wstring, std::unique_ptr<JsonValue>>> object;

    // Object member lookup; returns nullptr when missing or not an object.
    const JsonValue* get(const std::wstring& key) const;
};

// Parse a JSON document (wide string). Returns false on any syntax error.
// On success `out` holds the root value.
bool parse(const std::wstring& text, JsonValue& out);

// Accessors (safe on null / type mismatch; return defaults).
std::string asString(const JsonValue& v);  // UTF-8 string value, "" for others
bool asBool(const JsonValue& v);           // bool value, false for others
double asNumber(const JsonValue& v);       // number value, 0 for others

// Object member accessors (default when the member is missing or mismatched).
std::string getString(const JsonValue& obj, const std::wstring& key);
bool getBool(const JsonValue& obj, const std::wstring& key);
std::vector<std::string> getStringArray(const JsonValue& obj, const std::wstring& key);

// Escape a UTF-8 string so it can be embedded in a JSON response body.
std::string escapeJson(const std::string& str);

// UTF-8 -> UTF-16.
std::wstring utf8ToWstring(const std::string& str);

}
