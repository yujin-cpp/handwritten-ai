# Test AI Server Pipeline: Transcribe -> Grade
# This script tests the full AI grading flow against the deployed Cloud Run server.

$SERVER = "https://handwritten-ai-server-1093390926434.us-central1.run.app"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AI Server Pipeline Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 0: Ping
Write-Host "[Step 0] Pinging server..." -ForegroundColor Yellow
try {
    $ping = Invoke-RestMethod -Uri "$SERVER/ping" -TimeoutSec 15
    Write-Host "  Server status: $($ping.status)" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: Server unreachable - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 1: Create a test image with handwritten-style text
# We'll use a simple white image with text drawn as a PNG for testing
Write-Host "`n[Step 1] Preparing test image..." -ForegroundColor Yellow

# Generate a simple test PNG with some text content using .NET
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(800, 600)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font("Arial", 18)
$brush = [System.Drawing.Brushes]::Black

# Simulate handwritten exam answers
$graphics.DrawString("Name: Juan Dela Cruz", $font, $brush, 50, 30)
$graphics.DrawString("Subject: History", $font, $brush, 50, 60)
$graphics.DrawString("", $font, $brush, 50, 100)
$graphics.DrawString("1. The Philippines was discovered by", $font, $brush, 50, 130)
$graphics.DrawString("   Ferdinand Magellan in 1521.", $font, $brush, 50, 160)
$graphics.DrawString("2. True", $font, $brush, 50, 200)
$graphics.DrawString("3. B", $font, $brush, 50, 240)
$graphics.DrawString("4. Jose Rizal", $font, $brush, 50, 280)
$graphics.DrawString("5. A", $font, $brush, 50, 320)

$graphics.Dispose()
$testImagePath = "$PSScriptRoot\test_exam.png"
$bitmap.Save($testImagePath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Host "  Test image created: $testImagePath" -ForegroundColor Green

# Step 2: Transcribe
Write-Host "`n[Step 2] Sending to /transcribe..." -ForegroundColor Yellow
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$fileBytes = [System.IO.File]::ReadAllBytes($testImagePath)
$fileEnc = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes)

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"test_exam.png`"",
    "Content-Type: image/png$LF",
    $fileEnc,
    "--$boundary",
    "Content-Disposition: form-data; name=`"mode`"$LF",
    "grade",
    "--$boundary",
    "Content-Disposition: form-data; name=`"rubric`"$LF",
    "History exam, 5 questions total.",
    "--$boundary--$LF"
) -join $LF

$transcribeStart = Get-Date
try {
    $transcribeResult = Invoke-RestMethod -Uri "$SERVER/transcribe" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines `
        -TimeoutSec 120
    $transcribeTime = ((Get-Date) - $transcribeStart).TotalSeconds
    
    Write-Host "  Status: SUCCESS" -ForegroundColor Green
    Write-Host "  Time: $([math]::Round($transcribeTime, 2))s" -ForegroundColor Gray
    Write-Host "  Legibility: $($transcribeResult.data.legibility)" -ForegroundColor Gray
    Write-Host "  Confidence: $($transcribeResult.data.confidence_score)" -ForegroundColor Gray
    
    $transcribedText = $transcribeResult.data.transcribed_text
    $preview = if ($transcribedText.Length -gt 200) { $transcribedText.Substring(0, 200) + "..." } else { $transcribedText }
    Write-Host "  Transcribed text (preview): $preview" -ForegroundColor White
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    # Try to get error body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "  Response: $errorBody" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Grade
Write-Host "`n[Step 3] Sending to /grade..." -ForegroundColor Yellow
$gradeBody = @{
    transcribed_text = $transcribedText
    context = "=== OBJECTIVE EXAM SETTINGS ===`nTotal exam score: 5`nMultiple Choice: ENABLED (2 items)`nTrue/False: ENABLED (1 items)`nIdentification: ENABLED (2 items)"
    mode = "grade"
    answer_key_url = ""
    reference_url = ""
    answer_key_urls = @()
    reference_urls = @()
    exam_settings = @{
        totalScore = 5
        professorInstructions = ""
        objectiveTypes = @{
            multipleChoice = @{ enabled = $true; items = 2 }
            trueFalse = @{ enabled = $true; items = 1 }
            identification = @{ enabled = $true; items = 2 }
        }
    }
} | ConvertTo-Json -Depth 5

$gradeStart = Get-Date
try {
    $gradeResult = Invoke-RestMethod -Uri "$SERVER/grade" `
        -Method POST `
        -ContentType "application/json" `
        -Body $gradeBody `
        -TimeoutSec 120
    $gradeTime = ((Get-Date) - $gradeStart).TotalSeconds
    
    Write-Host "  Status: SUCCESS" -ForegroundColor Green
    Write-Host "  Time: $([math]::Round($gradeTime, 2))s" -ForegroundColor Gray
    Write-Host "  Score: $($gradeResult.data.score) / $($gradeResult.data.total)" -ForegroundColor White
    Write-Host "  Grading Type: $($gradeResult.data.grading_type)" -ForegroundColor Gray
    Write-Host "  Confidence: $($gradeResult.data.confidence_score)" -ForegroundColor Gray
    
    $feedback = $gradeResult.data.feedback
    $feedbackPreview = if ($feedback.Length -gt 300) { $feedback.Substring(0, 300) + "..." } else { $feedback }
    Write-Host "  Feedback: $feedbackPreview" -ForegroundColor White
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "  Response: $errorBody" -ForegroundColor Red
    }
    exit 1
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PIPELINE TEST COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Transcribe: $([math]::Round($transcribeTime, 2))s" -ForegroundColor Gray
Write-Host "  Grade:      $([math]::Round($gradeTime, 2))s" -ForegroundColor Gray
Write-Host "  Total:      $([math]::Round($transcribeTime + $gradeTime, 2))s" -ForegroundColor Gray
Write-Host "  Result:     $($gradeResult.data.score)/$($gradeResult.data.total)" -ForegroundColor White
Write-Host ""

# Cleanup
Remove-Item $testImagePath -ErrorAction SilentlyContinue
