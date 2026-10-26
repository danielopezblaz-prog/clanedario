# Pone Clanedario en el inicio de Windows (se abre solo al iniciar sesion). Si ya esta, lo quita.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $dir 'Clanedario.lnk'
$dst = Join-Path ([Environment]::GetFolderPath('Startup')) 'Clanedario.lnk'
if (-not (Test-Path $src)) { Write-Host 'Primero ejecuta instalar.ps1 para crear Clanedario.lnk'; exit 1 }
if (Test-Path $dst) { Remove-Item $dst; Write-Host "Quitado del inicio de Windows ($dst)" }
else { Copy-Item $src $dst; Write-Host "Clanedario se abrira solo al iniciar sesion ($dst)" }
