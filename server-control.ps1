param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'stop', 'open')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4318
$url = "http://127.0.0.1:$port/"
$runtime = Join-Path $root '.runtime'
$pidFile = Join-Path $runtime 'server.pid'
$outLog = Join-Path $runtime 'server.out.log'
$errLog = Join-Path $runtime 'server.err.log'

function Test-App {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Get-Listeners {
  return @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Get-NodePath {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    throw '未找到 Node.js。请先安装 Node.js，并确认 node 命令已加入 PATH。'
  }
  return $node.Source
}

function Start-App {
  if (Test-App) {
    Write-Host "服务已在运行：$url" -ForegroundColor Green
    return $true
  }

  $listeners = @(Get-Listeners)
  if ($listeners.Count -gt 0) {
    Write-Host "端口 $port 已被其他程序占用，无法启动。" -ForegroundColor Red
    Write-Host '请先关闭占用该端口的程序，或修改 server.js 的 PORT。'
    return $false
  }

  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  $nodePath = Get-NodePath

  try {
    $process = Start-Process `
      -FilePath $nodePath `
      -ArgumentList 'server.js' `
      -WorkingDirectory $root `
      -WindowStyle Hidden `
      -RedirectStandardOutput $outLog `
      -RedirectStandardError $errLog `
      -PassThru
  } catch {
    Write-Host "启动失败：$($_.Exception.Message)" -ForegroundColor Red
    return $false
  }

  Set-Content -Path $pidFile -Value $process.Id -Encoding Ascii

  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-App) {
      Write-Host "已启动：$url" -ForegroundColor Green
      Write-Host "运行日志：$runtime"
      return $true
    }
    if ($process.HasExited) { break }
  }

  Write-Host '服务进程已启动，但网页未能在预期时间内响应。' -ForegroundColor Yellow
  if (Test-Path $errLog) {
    $tail = Get-Content -Path $errLog -Tail 8 -ErrorAction SilentlyContinue
    if ($tail) {
      Write-Host '--- 错误日志 ---' -ForegroundColor DarkGray
      $tail | Write-Host
    }
  }
  return $false
}

function Stop-App {
  $listeners = @(Get-Listeners)
  $candidateIds = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)

  if (Test-Path $pidFile) {
    $saved = (Get-Content -Path $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($saved -match '^\d+$') {
      $candidateIds += [int]$saved
    }
  }

  $candidateIds = @($candidateIds | Sort-Object -Unique)
  $stopped = @()
  $skipped = @()

  foreach ($processId in $candidateIds) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if (-not $process) { continue }

    $isOurServer = ($process.Name -match '^node(\.exe)?$') -and ($process.CommandLine -match 'server\.js')
    if (-not $isOurServer) {
      $skipped += $processId
      continue
    }

    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      $stopped += $processId
    } catch {
      Write-Host "无法停止进程 $processId：$($_.Exception.Message)" -ForegroundColor Red
    }
  }

  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 250
    if (@(Get-Listeners).Count -eq 0 -and -not (Test-App)) { break }
  }

  $remaining = @(Get-Listeners)
  if ($remaining.Count -gt 0) {
    Write-Host "端口 $port 仍被占用，停止失败。" -ForegroundColor Red
    if ($skipped.Count -gt 0) {
      Write-Host "占用端口的不是本项目 server.js（PID: $($skipped -join ', ')），已跳过。"
    }
    return $false
  }

  if (Test-Path $pidFile) {
    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
  }

  if ($stopped.Count -gt 0) {
    Write-Host "服务已停止（PID: $($stopped -join ', ')）。" -ForegroundColor Green
  } else {
    Write-Host '服务当前未运行。' -ForegroundColor DarkGray
  }
  return $true
}

function Open-App {
  if (-not (Test-App)) {
    Write-Host '服务未运行，正在先启动服务...' -ForegroundColor Yellow
    if (-not (Start-App)) { return $false }
  }
  Start-Process $url
  Write-Host "已在默认浏览器打开：$url" -ForegroundColor Green
  return $true
}

try {
  $ok = switch ($Action) {
    'start' { Start-App }
    'stop'  { Stop-App }
    'open'  { Open-App }
  }
  if (-not $ok) { exit 1 }
} catch {
  Write-Host "操作失败：$($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
