{
  "targets": [
    {
      "target_name": "eric_addon",
      "sources": ["src/eric_addon.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "lib/include"
      ],
      "libraries": ["-L<(module_root_dir)/lib", "-lericapi"],
      "ldflags": ["-Wl,-rpath,<(module_root_dir)/lib"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "cflags_cc": ["-std=c++17", "-fexceptions"]
    }
  ]
}
