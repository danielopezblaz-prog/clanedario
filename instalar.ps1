# Instala Clanedario como aplicación de escritorio en Windows:
#  - dibuja los iconos (clanedario.ico para Windows; icon-192/512.png para la app instalable)
#  - crea el acceso directo en el menú Inicio (buscable y anclable a la barra de tareas)
#  - deja otro acceso directo "Clanedario.lnk" en esta carpeta por si quieres copiarlo al escritorio
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = Join-Path $dir 'index.html'
$url = 'file:///' + ($html -replace '\\', '/')

# ---- navegador: Chrome si está, si no Edge ----
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$browser = if ($chrome) { $chrome } elseif ($edge) { $edge } else { throw 'No encuentro Chrome ni Edge.' }
$argStr = '--app="' + $url + '" --window-size=1320,860'

# ---- iconos ----
Add-Type -AssemblyName System.Drawing
function Draw-Icon([int]$size, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $c1 = [System.Drawing.Color]::FromArgb(255, 95, 176, 255)
  $c2 = [System.Drawing.Color]::FromArgb(255, 10, 91, 255)
  if ($maskable) {
    $full = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point(0, 0)), (New-Object System.Drawing.Point($size, $size)), $c1, $c2)
    $g.FillRectangle($full, 0, 0, $size, $size)
    $k = ($size / 256) * 0.78; $off = ($size - 256 * $k) / 2
  } else { $k = $size / 256; $off = 0 }
  $g.TranslateTransform($off, $off); $g.ScaleTransform($k, $k)
  if (-not $maskable) {
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point(0, 0)), (New-Object System.Drawing.Point(256, 256)), $c1, $c2)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $x = 8; $y = 8; $w = 240; $h = 240; $r = 58
    $path.AddArc($x, $y, 2 * $r, 2 * $r, 180, 90)
    $path.AddArc($x + $w - 2 * $r, $y, 2 * $r, 2 * $r, 270, 90)
    $path.AddArc($x + $w - 2 * $r, $y + $h - 2 * $r, 2 * $r, 2 * $r, 0, 90)
    $path.AddArc($x, $y + $h - 2 * $r, 2 * $r, 2 * $r, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
  }
  $white = [System.Drawing.Brushes]::White
  $bar = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bar.AddArc(48, 62, 22, 22, 90, 180); $bar.AddArc(186, 62, 22, 22, 270, 180); $bar.CloseFigure()
  $g.FillPath($white, $bar)
  $g.FillEllipse($white, 76, 38, 20, 20)
  $g.FillEllipse($white, 160, 38, 20, 20)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 26)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pts = [System.Drawing.Point[]]@((New-Object System.Drawing.Point(78, 150)), (New-Object System.Drawing.Point(112, 184)), (New-Object System.Drawing.Point(182, 112)))
  $g.DrawLines($pen, $pts)
  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $ms.ToArray(); $ms.Dispose(); $bmp.Dispose()
  return ,$bytes
}
$png256 = [byte[]](Draw-Icon 256 $false)
[System.IO.File]::WriteAllBytes((Join-Path $dir 'icon.png'), $png256)
[System.IO.File]::WriteAllBytes((Join-Path $dir 'icon-192.png'), [byte[]](Draw-Icon 192 $false))
[System.IO.File]::WriteAllBytes((Join-Path $dir 'icon-512.png'), [byte[]](Draw-Icon 512 $false))
[System.IO.File]::WriteAllBytes((Join-Path $dir 'icon-maskable-512.png'), [byte[]](Draw-Icon 512 $true))
$icoPath = Join-Path $dir 'clanedario.ico'
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)
$bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0)
$bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$png256.Length); $bw.Write([uint32]22)
$bw.Write($png256); $bw.Close(); $fs.Close()

# ---- accesos directos ----
$ws = New-Object -ComObject WScript.Shell
function Make-Lnk($p) {
  $s = $ws.CreateShortcut($p)
  $s.TargetPath = $browser
  $s.Arguments = $argStr
  $s.WorkingDirectory = $dir
  $s.IconLocation = "$icoPath,0"
  $s.Description = 'Clanedario: tareas, calendario y recordatorios'
  $s.Save()
}
$programs = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
foreach ($old in @((Join-Path $programs 'Agenda.lnk'), (Join-Path $dir 'Agenda.lnk'), (Join-Path $dir 'agenda.ico'), (Join-Path $programs 'Clawndario.lnk'), (Join-Path $dir 'Clawndario.lnk'), (Join-Path $dir 'clawndario.ico'))) { if (Test-Path $old) { Remove-Item $old } }
$startMenu = Join-Path $programs 'Clanedario.lnk'
Make-Lnk $startMenu
Make-Lnk (Join-Path $dir 'Clanedario.lnk')
Write-Host "Listo."
Write-Host "  Navegador: $browser"
Write-Host "  Menu Inicio: $startMenu"
Write-Host "  Acceso directo en la carpeta: $(Join-Path $dir 'Clanedario.lnk')"
Write-Host "Para tenerla en la barra de tareas: busca 'Clanedario' en Inicio, boton derecho, 'Anclar a la barra de tareas'."
