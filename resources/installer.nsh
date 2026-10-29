; Uninstall: remove what PaperChase AI set up outside its own folder.
; Skipped during updates: the installer then runs the old uninstaller first,
; and the bridge + Claude registration must survive that.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ; Claude Code MCP registration (ignored if Claude Code is not installed).
    nsExec::Exec 'cmd /c claude mcp remove paperchase -s user'
    ; Bridge strategy inside ATAS. ATAS keeps running fine without it.
    Delete "$APPDATA\ATAS\Strategies\ATAS.McpBridge.dll"
  ${endIf}
!macroend
