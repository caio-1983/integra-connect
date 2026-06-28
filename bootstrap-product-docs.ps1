# bootstrap-product-docs.ps1

$root = "docs\integra-connect"

$dirs = @(
"$root",
"$root\product",
"$root\architecture",
"$root\decisions",
"$root\specs",
"$root\roadmap",
"$root\development",
"$root\changelog",
"$root\prompts",
"$root\assets"
)

foreach($d in $dirs){
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

Write-Host "Estrutura do Product Handbook criada."
