<?php
/**
 * GCS Contact Form Handler
 * Deploy on YunoHost VPS — receives POST from Cloudflare Pages frontend.
 *
 * Required setup:
 *   1. Set TURNSTILE_SECRET below (from Cloudflare dashboard > Turnstile)
 *   2. Ensure YunoHost Postfix is configured for gcs.sv domain
 *   3. Set ALLOWED_ORIGIN to your Cloudflare Pages URL
 */

// ── Configuration ──────────────────────────────────────────────────────────────
define('TURNSTILE_SECRET', 'YOUR_TURNSTILE_SECRET_KEY');   // Cloudflare Turnstile secret
define('ALLOWED_ORIGIN',   'https://gcs.sv');              // Cloudflare Pages domain
define('MAIL_TO',          'services@gcs.sv');
define('MAIL_FROM_NAME',   'GCS Website');
define('MAIL_FROM_ADDR',   'noreply@gcs.sv');
define('RATE_LIMIT_FILE',  '/tmp/gcs_contact_rate.json');
define('RATE_LIMIT_MAX',   5);                             // max submissions per IP per hour
define('MIN_SUBMIT_TIME',  3000);                          // minimum ms between load and submit

// ── CORS ───────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === ALLOWED_ORIGIN || $origin === str_replace('https://', 'https://www.', ALLOWED_ORIGIN)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Method not allowed', 405);
}

// ── Parse input ────────────────────────────────────────────────────────────────
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    respond(false, 'Invalid request', 400);
}

$name    = trim($data['name']    ?? '');
$email   = trim($data['email']   ?? '');
$phone   = trim($data['phone']   ?? '');
$service = trim($data['service'] ?? '');
$message = trim($data['message'] ?? '');
$cfToken = trim($data['cf-turnstile-response'] ?? '');
$timer   = intval($data['_timer'] ?? 0);

// ── Validation ─────────────────────────────────────────────────────────────────
if ($name === '' || $email === '' || $message === '') {
    respond(false, 'Please fill in all required fields.', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Invalid email address.', 422);
}

// Timing check — reject if submitted too fast (bots)
if ($timer > 0) {
    $elapsed = (time() * 1000) - $timer;
    // Allow some clock skew but catch instant submissions
    if ($elapsed > 0 && $elapsed < MIN_SUBMIT_TIME) {
        respond(false, 'Please wait a moment before submitting.', 429);
    }
}

// ── Rate limiting by IP ────────────────────────────────────────────────────────
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!checkRateLimit($ip)) {
    respond(false, 'Too many submissions. Please try again later.', 429);
}

// ── Turnstile verification ─────────────────────────────────────────────────────
if (TURNSTILE_SECRET !== 'YOUR_TURNSTILE_SECRET_KEY' && $cfToken !== '') {
    $tsResult = verifyTurnstile($cfToken, $ip);
    if (!$tsResult) {
        respond(false, 'Spam check failed. Please refresh and try again.', 403);
    }
}

// ── Sanitize for email ─────────────────────────────────────────────────────────
$name    = sanitize($name);
$phone   = sanitize($phone);
$service = sanitize($service);
$message = sanitize($message);

// Service label map
$serviceLabels = [
    'permitting'  => 'Permitting & Management',
    'engineering' => 'Engineering & Design',
    'residential' => 'Residential Construction',
    'commercial'  => 'Commercial Construction',
    'equipment'   => 'Heavy Equipment Rental',
    'other'       => 'Other',
];
$serviceLabel = $serviceLabels[$service] ?? $service;

// ── Build and send email ───────────────────────────────────────────────────────
$subject = "GCS Contact: {$name}" . ($serviceLabel ? " — {$serviceLabel}" : '');

$body  = "New contact form submission from gcs.sv\n";
$body .= "═══════════════════════════════════════\n\n";
$body .= "Name:    {$name}\n";
$body .= "Email:   {$email}\n";
$body .= "Phone:   " . ($phone ?: '—') . "\n";
$body .= "Service: " . ($serviceLabel ?: '—') . "\n\n";
$body .= "Message:\n{$message}\n\n";
$body .= "═══════════════════════════════════════\n";
$body .= "Submitted: " . date('Y-m-d H:i:s T') . "\n";
$body .= "IP: {$ip}\n";

$headers  = "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM_ADDR . ">\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: GCS-Contact-Form/1.0\r\n";

$sent = mail(MAIL_TO, $subject, $body, $headers);

if ($sent) {
    respond(true, 'Message sent successfully.');
} else {
    error_log("GCS contact form: mail() failed for {$email}");
    respond(false, 'Failed to send message. Please try again later.', 500);
}

// ── Helper functions ───────────────────────────────────────────────────────────

function respond($ok, $msg, $code = 200) {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'error' => $ok ? null : $msg]);
    exit;
}

function sanitize($str) {
    return htmlspecialchars(strip_tags($str), ENT_QUOTES, 'UTF-8');
}

function verifyTurnstile($token, $ip) {
    $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'secret'   => TURNSTILE_SECRET,
            'response' => $token,
            'remoteip' => $ip,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);

    if (!$resp) return false;
    $result = json_decode($resp, true);
    return ($result['success'] ?? false) === true;
}

function checkRateLimit($ip) {
    $file = RATE_LIMIT_FILE;
    $data = [];

    if (file_exists($file)) {
        $raw = file_get_contents($file);
        $data = json_decode($raw, true) ?: [];
    }

    $now  = time();
    $hour = 3600;

    // Clean entries older than 1 hour
    if (isset($data[$ip])) {
        $data[$ip] = array_filter($data[$ip], function ($ts) use ($now, $hour) {
            return ($now - $ts) < $hour;
        });
    }

    $count = count($data[$ip] ?? []);
    if ($count >= RATE_LIMIT_MAX) {
        return false;
    }

    $data[$ip][] = $now;
    file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}
