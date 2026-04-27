/**
 * N-API wrapper for the ELSTER ERiC shared library (libericapi.so).
 *
 * The ERiC library must be placed at native/eric-binding/lib/libericapi.so
 * and its headers at native/eric-binding/lib/include/ericapi.h before
 * building with `npm run build:native`.
 *
 * Download ERiC from: https://www.elster.de/elsterweb/softwareprodukt/eric
 * A valid ELSTER developer registration is required.
 *
 * Each exported function wraps a synchronous ERiC call in an Napi::AsyncWorker
 * so the Node.js event loop is never blocked during ERiC I/O operations.
 */

#include <napi.h>
#include <string>
#include <stdexcept>

// ─── ERiC type stubs (replaced by real ericapi.h at build time) ──────────────
// When building without the actual ERiC SDK, define a minimal set of stubs
// so that the module compiles. In production, include <ericapi.h> instead.
#ifndef ERICAPI_H
typedef void* ERIC_ZERTIFIKAT_HANDLE;
typedef int   ERIC_FEHLER_CODE;

#define ERIC_OK 0
#define ERIC_GLOBAL_INIT_FEHLER 610001003

// Stub declarations — real implementations from libericapi.so are resolved at
// dynamic-link time when the .so is present.
extern "C" {
  ERIC_FEHLER_CODE EricInitialisierung(const char* logPath, const char* pluginPath);
  void             EricBeende();
  ERIC_FEHLER_CODE EricCreateKey(const char* certPath, const char* password,
                                  ERIC_ZERTIFIKAT_HANDLE* outHandle);
  void             EricCloseKey(ERIC_ZERTIFIKAT_HANDLE handle);
  ERIC_FEHLER_CODE EricSende(const char* xmlData, const char* datenartVersion,
                              ERIC_ZERTIFIKAT_HANDLE certHandle,
                              char** ppServerResponse);
  void             EricFreeSpeicher(char* pSpeicher);
}
#endif
// ─────────────────────────────────────────────────────────────────────────────

// Global certificate handle — ERiC is not re-entrant; one handle per process.
static ERIC_ZERTIFIKAT_HANDLE g_certHandle = nullptr;
static bool                   g_initialized = false;

// ─── Init ─────────────────────────────────────────────────────────────────────

class InitWorker : public Napi::AsyncWorker {
public:
  InitWorker(Napi::Function& callback, std::string logPath)
      : Napi::AsyncWorker(callback), logPath_(std::move(logPath)) {}

  void Execute() override {
    ERIC_FEHLER_CODE rc = EricInitialisierung(logPath_.c_str(), nullptr);
    if (rc != ERIC_OK) {
      SetError("EricInitialisierung failed: " + std::to_string(rc));
      return;
    }
    g_initialized = true;
    returnCode_ = rc;
  }

  void OnOK() override {
    Callback().Call({Env().Null(), Napi::Number::New(Env(), returnCode_)});
  }

private:
  std::string logPath_;
  int returnCode_ = 0;
};

Napi::Value Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::string logPath = info[0].As<Napi::String>().Utf8Value();
  Napi::Function cb = info[1].As<Napi::Function>();
  auto* worker = new InitWorker(cb, logPath);
  worker->Queue();
  return env.Undefined();
}

// ─── Shutdown ─────────────────────────────────────────────────────────────────

Napi::Value Shutdown(const Napi::CallbackInfo& info) {
  if (g_certHandle != nullptr) {
    EricCloseKey(g_certHandle);
    g_certHandle = nullptr;
  }
  if (g_initialized) {
    EricBeende();
    g_initialized = false;
  }
  return info.Env().Undefined();
}

// ─── CreateKey ────────────────────────────────────────────────────────────────

class CreateKeyWorker : public Napi::AsyncWorker {
public:
  CreateKeyWorker(Napi::Function& callback,
                  std::string certPath,
                  std::string password)
      : Napi::AsyncWorker(callback),
        certPath_(std::move(certPath)),
        password_(std::move(password)) {}

  void Execute() override {
    ERIC_FEHLER_CODE rc = EricCreateKey(certPath_.c_str(), password_.c_str(),
                                         &g_certHandle);
    if (rc != ERIC_OK) {
      SetError("EricCreateKey failed: " + std::to_string(rc));
    }
    returnCode_ = rc;
  }

  void OnOK() override {
    Callback().Call({Env().Null(), Napi::Number::New(Env(), returnCode_)});
  }

private:
  std::string certPath_;
  std::string password_;
  int returnCode_ = 0;
};

Napi::Value CreateKey(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::string certPath = info[0].As<Napi::String>().Utf8Value();
  std::string password  = info[1].As<Napi::String>().Utf8Value();
  Napi::Function cb     = info[2].As<Napi::Function>();
  auto* worker = new CreateKeyWorker(cb, certPath, password);
  worker->Queue();
  return env.Undefined();
}

// ─── Sende (sign + transmit XML to ELSTER) ────────────────────────────────────

class SendeWorker : public Napi::AsyncWorker {
public:
  SendeWorker(Napi::Function& callback,
              std::string xmlData,
              std::string datenartVersion)
      : Napi::AsyncWorker(callback),
        xmlData_(std::move(xmlData)),
        datenartVersion_(std::move(datenartVersion)) {}

  void Execute() override {
    if (!g_certHandle) {
      SetError("EricSende called before EricCreateKey");
      return;
    }
    char* pResponse = nullptr;
    returnCode_ = EricSende(xmlData_.c_str(), datenartVersion_.c_str(),
                             g_certHandle, &pResponse);
    if (pResponse) {
      response_ = std::string(pResponse);
      EricFreeSpeicher(pResponse);
    }
  }

  void OnOK() override {
    Callback().Call({
      Env().Null(),
      Napi::Number::New(Env(), returnCode_),
      Napi::String::New(Env(), response_),
    });
  }

private:
  std::string xmlData_;
  std::string datenartVersion_;
  int         returnCode_ = 0;
  std::string response_;
};

Napi::Value Sende(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::string xmlData         = info[0].As<Napi::String>().Utf8Value();
  std::string datenartVersion = info[1].As<Napi::String>().Utf8Value();
  Napi::Function cb           = info[2].As<Napi::Function>();
  auto* worker = new SendeWorker(cb, xmlData, datenartVersion);
  worker->Queue();
  return env.Undefined();
}

// ─── Module registration ──────────────────────────────────────────────────────

Napi::Object RegisterModule(Napi::Env env, Napi::Object exports) {
  exports.Set("init",      Napi::Function::New(env, Init));
  exports.Set("shutdown",  Napi::Function::New(env, Shutdown));
  exports.Set("createKey", Napi::Function::New(env, CreateKey));
  exports.Set("sende",     Napi::Function::New(env, Sende));
  return exports;
}

NODE_API_MODULE(eric_addon, RegisterModule)
