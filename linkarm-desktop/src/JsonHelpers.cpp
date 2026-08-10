#include "JsonHelpers.h"

#include <windows.h>
#include <cwchar>

namespace JsonHelpers {

const JsonValue* JsonValue::get(const std::wstring& key) const {
    if (type != Type::Object) return nullptr;
    for (const auto& [k, v] : object) {
        if (k == key) return v.get();
    }
    return nullptr;
}

namespace {

class Parser {
public:
    explicit Parser(const std::wstring& text) : text(text) {}

    bool parseRoot(JsonValue& out) {
        skipWs();
        if (!parseValue(out)) return false;
        skipWs();
        return pos == text.size();
    }

private:
    const std::wstring& text;
    size_t pos = 0;

    static int hexDigit(wchar_t c) {
        if (c >= L'0' && c <= L'9') return c - L'0';
        if (c >= L'a' && c <= L'f') return c - L'a' + 10;
        if (c >= L'A' && c <= L'F') return c - L'A' + 10;
        return -1;
    }

    void skipWs() {
        while (pos < text.size() && (text[pos] == L' ' || text[pos] == L'\t' ||
                                    text[pos] == L'\n' || text[pos] == L'\r')) pos++;
    }

    bool parseValue(JsonValue& out) {
        skipWs();
        if (pos >= text.size()) return false;
        wchar_t c = text[pos];
        if (c == L'{') return parseObject(out);
        if (c == L'[') return parseArray(out);
        if (c == L'"') return parseStringValue(out);
        if (c == L't' || c == L'f') return parseBool(out);
        if (c == L'n') return parseNull(out);
        return parseNumber(out);
    }

    bool parseString(std::wstring& out) {
        if (pos >= text.size() || text[pos] != L'"') return false;
        pos++;
        while (pos < text.size()) {
            wchar_t c = text[pos];
            if (c == L'"') {
                pos++;
                return true;
            }
            if (c != L'\\') {
                out += c;
                pos++;
                continue;
            }
            pos++;
            if (pos >= text.size()) return false;
            wchar_t e = text[pos++];
            switch (e) {
                case L'"': out += L'"'; break;
                case L'\\': out += L'\\'; break;
                case L'/': out += L'/'; break;
                case L'b': out += L'\b'; break;
                case L'f': out += L'\f'; break;
                case L'n': out += L'\n'; break;
                case L'r': out += L'\r'; break;
                case L't': out += L'\t'; break;
                case L'u': {
                    unsigned code = 0;
                    for (int i = 0; i < 4; i++) {
                        if (pos >= text.size()) return false;
                        int d = hexDigit(text[pos++]);
                        if (d < 0) return false;
                        code = code * 16 + (unsigned)d;
                    }
                    // Combine UTF-16 surrogate pairs (\uD83D\uDE00 -> one code point).
                    if (code >= 0xD800 && code <= 0xDBFF) {
                        unsigned low = 0;
                        bool lowOk = false;
                        if (pos + 1 < text.size() && text[pos] == L'\\' && text[pos + 1] == L'u') {
                            size_t save = pos + 2;
                            for (int i = 0; i < 4; i++) {
                                if (save >= text.size()) break;
                                int d = hexDigit(text[save++]);
                                if (d < 0) break;
                                low = low * 16 + (unsigned)d;
                                if (i == 3) lowOk = true;
                            }
                            if (lowOk && low >= 0xDC00 && low <= 0xDFFF) {
                                code = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00);
                                pos = save;
                            }
                        }
                    }
                    if (code > 0xFFFF) {
                        code -= 0x10000;
                        out += (wchar_t)(0xD800 + (code >> 10));
                        out += (wchar_t)(0xDC00 + (code & 0x3FF));
                    } else {
                        out += (wchar_t)code;
                    }
                    break;
                }
                default: return false;
            }
        }
        return false; // unterminated string
    }

    bool parseStringValue(JsonValue& out) {
        std::wstring s;
        if (!parseString(s)) return false;
        out.type = JsonValue::Type::String;
        out.stringValue = std::move(s);
        return true;
    }

    bool parseBool(JsonValue& out) {
        if (text.compare(pos, 4, L"true") == 0) {
            out.type = JsonValue::Type::Bool;
            out.boolValue = true;
            pos += 4;
            return true;
        }
        if (text.compare(pos, 5, L"false") == 0) {
            out.type = JsonValue::Type::Bool;
            out.boolValue = false;
            pos += 5;
            return true;
        }
        return false;
    }

    bool parseNull(JsonValue& out) {
        if (text.compare(pos, 4, L"null") == 0) {
            out.type = JsonValue::Type::Null;
            pos += 4;
            return true;
        }
        return false;
    }

    bool parseNumber(JsonValue& out) {
        size_t start = pos;
        if (pos < text.size() && text[pos] == L'-') pos++;
        bool hasDigits = false;
        while (pos < text.size() && text[pos] >= L'0' && text[pos] <= L'9') {
            pos++;
            hasDigits = true;
        }
        if (pos < text.size() && text[pos] == L'.') {
            pos++;
            while (pos < text.size() && text[pos] >= L'0' && text[pos] <= L'9') {
                pos++;
                hasDigits = true;
            }
        }
        if (pos < text.size() && (text[pos] == L'e' || text[pos] == L'E')) {
            pos++;
            if (pos < text.size() && (text[pos] == L'+' || text[pos] == L'-')) pos++;
            while (pos < text.size() && text[pos] >= L'0' && text[pos] <= L'9') pos++;
        }
        if (!hasDigits) {
            pos = start;
            return false;
        }
        out.type = JsonValue::Type::Number;
        out.numberValue = std::wcstod(text.substr(start, pos - start).c_str(), nullptr);
        return true;
    }

    bool parseObject(JsonValue& out) {
        pos++; // '{'
        JsonValue obj;
        obj.type = JsonValue::Type::Object;
        skipWs();
        if (pos < text.size() && text[pos] == L'}') {
            pos++;
            out = std::move(obj);
            return true;
        }
        while (true) {
            skipWs();
            std::wstring key;
            if (!parseString(key)) return false;
            skipWs();
            if (pos >= text.size() || text[pos] != L':') return false;
            pos++;
            auto value = std::make_unique<JsonValue>();
            if (!parseValue(*value)) return false;
            obj.object.emplace_back(std::move(key), std::move(value));
            skipWs();
            if (pos >= text.size()) return false;
            if (text[pos] == L',') {
                pos++;
                continue;
            }
            if (text[pos] == L'}') {
                pos++;
                out = std::move(obj);
                return true;
            }
            return false;
        }
    }

    bool parseArray(JsonValue& out) {
        pos++; // '['
        JsonValue arr;
        arr.type = JsonValue::Type::Array;
        skipWs();
        if (pos < text.size() && text[pos] == L']') {
            pos++;
            out = std::move(arr);
            return true;
        }
        while (true) {
            auto value = std::make_unique<JsonValue>();
            if (!parseValue(*value)) return false;
            arr.array.push_back(std::move(value));
            skipWs();
            if (pos >= text.size()) return false;
            if (text[pos] == L',') {
                pos++;
                continue;
            }
            if (text[pos] == L']') {
                pos++;
                out = std::move(arr);
                return true;
            }
            return false;
        }
    }
};

static std::string wstringToUtf8(const std::wstring& w) {
    if (w.empty()) return "";
    int len = WideCharToMultiByte(CP_UTF8, 0, w.c_str(), -1, nullptr, 0, nullptr, nullptr);
    if (len <= 1) return "";
    std::string s(len - 1, '\0');
    WideCharToMultiByte(CP_UTF8, 0, w.c_str(), -1, &s[0], len, nullptr, nullptr);
    return s;
}

} // namespace

bool parse(const std::wstring& text, JsonValue& out) {
    Parser parser(text);
    return parser.parseRoot(out);
}

std::string asString(const JsonValue& v) {
    if (v.type != JsonValue::Type::String) return "";
    return wstringToUtf8(v.stringValue);
}

bool asBool(const JsonValue& v) {
    return v.type == JsonValue::Type::Bool ? v.boolValue : false;
}

double asNumber(const JsonValue& v) {
    return v.type == JsonValue::Type::Number ? v.numberValue : 0;
}

std::string getString(const JsonValue& obj, const std::wstring& key) {
    const JsonValue* v = obj.get(key);
    return v ? asString(*v) : "";
}

bool getBool(const JsonValue& obj, const std::wstring& key) {
    const JsonValue* v = obj.get(key);
    return v ? asBool(*v) : false;
}

std::vector<std::string> getStringArray(const JsonValue& obj, const std::wstring& key) {
    std::vector<std::string> result;
    const JsonValue* v = obj.get(key);
    if (!v || v->type != JsonValue::Type::Array) return result;
    for (const auto& item : v->array) {
        result.push_back(asString(*item));
    }
    return result;
}

std::string escapeJson(const std::string& str) {
    std::string result;
    result.reserve(str.size());
    for (unsigned char c : str) {
        switch (c) {
            case '"': result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\b': result += "\\b"; break;
            case '\f': result += "\\f"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:
                if (c < 0x20) {
                    // Remaining control characters as \u00XX.
                    static const char hex[] = "0123456789abcdef";
                    result += "\\u00";
                    result += hex[(c >> 4) & 0xF];
                    result += hex[c & 0xF];
                } else {
                    result += (char)c;
                }
                break;
        }
    }
    return result;
}

std::wstring utf8ToWstring(const std::string& str) {
    if (str.empty()) return std::wstring();
    int wlen = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, nullptr, 0);
    std::wstring wstr(wlen, 0);
    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &wstr[0], wlen);
    if (!wstr.empty()) wstr.pop_back();
    return wstr;
}

}
