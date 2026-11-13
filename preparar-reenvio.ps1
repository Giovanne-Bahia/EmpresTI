$ErrorActionPreference = 'Stop'
$workspacePath = $PSScriptRoot
$outputBase = Join-Path $workspacePath '.verification'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputPath = Join-Path $outputBase "reenvio-$stamp"
$sourceStage = Join-Path $outputPath 'projeto'
$docsStage = Join-Path $outputPath 'documentacao'
New-Item -ItemType Directory -Path $sourceStage, $docsStage -Force | Out-Null

# Lista positiva: nunca copiar .git, envs reais, caches ou node_modules.
$rootFiles = @('AGENTS.md', 'README.md', 'ENTREGA.md', 'preparar-reenvio.ps1', '.env.example', '.gitignore', '.vercelignore', '.prettierrc.json', 'package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.js', 'prisma.config.ts', 'tailwind.config.ts', 'postcss.config.js', 'eslint.config.mjs', 'vitest.config.mts', 'vitest.integration.config.mts', 'vitest.setup.ts', 'playwright.config.ts')
$paths = & git -C $workspacePath -c core.quotepath=false ls-files -co --exclude-standard
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível listar os arquivos do projeto.' }
$paths = @($paths | Sort-Object -Unique | Where-Object {
    ($rootFiles -contains $_ -or $_ -match '^(src|public|prisma|docs|rules|tests)/' -or $_ -match '^\.cursor/(hooks/|agents/|skills/|hooks\.json$)' -or $_ -match '^\.codex/(agents/|hooks\.json$)' -or $_ -match '^\.github/workflows/' -or $_ -eq '.husky/pre-commit') -and
    ($_ -eq '.env.example' -or $_ -notmatch '(^|/)\.env') -and
    $_ -notmatch '(^|/)(node_modules|\.git|\.verification|\.image-cache|test-results|playwright-report)/'
})
$manifest = @()
foreach ($relativePath in $paths) {
    $inputPath = Join-Path $workspacePath $relativePath
    $item = Get-Item -LiteralPath $inputPath
    if ($item.PSIsContainer -or $item.LinkType) { throw "Arquivo não regular: $relativePath" }
    $destinationPath = Join-Path $sourceStage $relativePath
    New-Item -ItemType Directory -Path (Split-Path $destinationPath) -Force | Out-Null
    Copy-Item -LiteralPath $inputPath -Destination $destinationPath
    if ($relativePath -match '^(docs|rules)/' -or $relativePath -in @('AGENTS.md', 'README.md', 'ENTREGA.md')) {
        $docsDestination = Join-Path $docsStage $relativePath
        New-Item -ItemType Directory -Path (Split-Path $docsDestination) -Force | Out-Null
        Copy-Item -LiteralPath $inputPath -Destination $docsDestination
    }
    $manifest += [pscustomobject]@{ path = $relativePath; sha256 = (Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$revision = (& git -C $workspacePath rev-parse HEAD).Trim()
$receipt = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    baseCommit = $revision
    includesUncommittedChanges = [bool](& git -C $workspacePath status --porcelain)
    acceptanceByProfessor = 'pending'
    published = $false
    warning = 'Pacote local de preparação. Não comprova aceite, publicação, aprovação de fotos ou fechamento integral das specs.'
    files = $manifest
}
$receiptPath = Join-Path $outputPath 'manifesto-pacote.json'
$receipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $receiptPath -Encoding utf8
Copy-Item -LiteralPath $receiptPath -Destination (Join-Path $sourceStage 'manifesto-pacote.json')
$docsReceipt = [ordered]@{}
foreach ($entry in $receipt.GetEnumerator()) { $docsReceipt[$entry.Key] = $entry.Value }
$docsReceipt.files = @($manifest | Where-Object { $_.path -match '^(docs|rules)/' -or $_.path -in @('AGENTS.md', 'README.md', 'ENTREGA.md') })
$docsReceipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $docsStage 'manifesto-pacote.json') -Encoding utf8
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archives = @()
foreach ($kind in @('projeto', 'documentacao')) {
    $archivePath = Join-Path $outputPath "empresti-$kind.zip"
    [IO.Compression.ZipFile]::CreateFromDirectory((Join-Path $outputPath $kind), $archivePath)
    $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        foreach ($entry in $archive.Entries) {
            $name = $entry.FullName.Replace('\', '/')
            if ($name -match '(^|/)(\.git|node_modules|\.verification|\.image-cache)/' -or ($name -match '(^|/)\.env' -and $name -ne '.env.example')) { throw 'Conteúdo proibido encontrado no pacote.' }
        }
    } finally { $archive.Dispose() }
    $archives += [pscustomobject]@{ name = [IO.Path]::GetFileName($archivePath); sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$archives | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'sha256-arquivos.json') -Encoding utf8
Write-Output "Pacotes locais gerados em: $outputPath"
Write-Output "Arquivos do projeto: $($paths.Count). Não houve commit, push, deploy ou envio ao professor."
