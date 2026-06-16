$Path = "E:\Solo\nightoffullmoon\client\cardv\Assets\AssetBundleCollectorSetting.asset"
$Text = [System.IO.File]::ReadAllText($Path)

$Keep = @("BootPackage", "DefaultPackage", "CommonPackage", "SoloPackage")
$count = 0

# Match each package block: PackageName through Active: line
$Regex = [regex]"(PackageName: (\w+Package)(?:\r?\n[^\r\n]*)*?\r?\n\s+Active:) 1"
$NewText = $Regex.Replace($Text, {
    param($m)
    $pkgName = $m.Groups[2].Value
    if ($script:Keep -contains $pkgName) {
        return $m.Value  # keep as-is
    }
    $script:count++
    return $m.Groups[1].Value + " 0"
})

if ($count -eq 0) {
    Write-Host "Nothing to change."
} else {
    Write-Host "Disabled $count packages."
    [System.IO.File]::WriteAllText($Path, $NewText, [System.Text.UTF8Encoding]::new($false))
}

# Verify
Write-Host ""
Get-Content $Path -Encoding UTF8 | Select-String "PackageName|Active:" | ForEach-Object { Write-Host $_ }
