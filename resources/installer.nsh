; Uninstall: remove what PaperChase AI set up outside its own folder.
!macro customUnInstall
  ; Claude Code MCP registration (ignored if Claude Code is not installed).
  nsExec::Exec 'cmd /c claude mcp remove paperchase -s user'
  ; Bridge strategy inside ATAS. ATAS keeps running fine without it.
  Delete "$APPDATA\ATAS\Strategies\ATAS.McpBridge.dll"
!macroend
