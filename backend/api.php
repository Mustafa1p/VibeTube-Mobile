<?php
declare(strict_types=1);
// Public HTTP entry point. Runtime binaries and signed media URLs stay outside public_html.
$runtime = getenv('VIBETUBE_RUNTIME') ?: dirname(__DIR__, 4) . '/vibetube-runtime';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://mustafa1p.github.io', 'https://vibetubemobile.ipxer.online', 'http://127.0.0.1:4175', 'http://127.0.0.1:5173'];
header('Vary: Origin');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if ($origin !== '') {
    if (!in_array($origin, $allowed, true)) { http_response_code(403); exit; }
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
    header('Access-Control-Allow-Headers: Range');
    header('Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) { http_response_code(405); exit; }
function reply(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function upstreamUrl(string $url): bool {
    $p = parse_url($url);
    return $p && ($p['scheme'] ?? '') === 'https' && !isset($p['user'], $p['pass'])
        && !isset($p['user']) && !isset($p['pass']) && ($p['port'] ?? 443) === 443
        && preg_match('/^[a-z0-9-]+\.googlevideo\.com$/D', $p['host'] ?? '') === 1;
}
function extractVideo(array $args): array {
    global $runtime;
    if (!function_exists('proc_open')) reply(['error' => 'The host disables the extraction runtime.'], 503);
    // At most two extraction processes across PHP workers. Never use shell commands or caller URLs.
    $lock = null;
    for ($i = 0; $i < 2; $i++) {
        $f = fopen("$runtime/worker-$i.lock", 'c');
        if ($f && flock($f, LOCK_EX | LOCK_NB)) { $lock = $f; break; }
        if ($f) fclose($f);
    }
    if (!$lock) reply(['error' => 'The server is busy. Try again shortly.'], 429);
    $cmd = array_merge(["$runtime/yt-dlp", '--ignore-config', '--no-cache-dir', '--js-runtimes',
        "node:$runtime/node-v22.23.3-linux-x64/bin/node", '--no-playlist', '--socket-timeout', '10',
        '--retries', '0', '--dump-single-json', '--skip-download'], $args);
    $p = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['file', '/dev/null', 'a']], $pipes,
        $runtime, ['TMPDIR' => $runtime, 'HOME' => $runtime, 'PATH' => '/usr/bin:/bin']);
    if (!is_resource($p)) reply(['error' => 'The extraction runtime could not start.'], 503);
    fclose($pipes[0]);
    stream_set_blocking($pipes[1], false);
    $out = ''; $start = microtime(true); $failed = false;
    do {
        $out .= stream_get_contents($pipes[1]);
        $state = proc_get_status($p);
        if (strlen($out) > 4000000 || microtime(true) - $start > 35) {
            proc_terminate($p, 9); $failed = true; break;
        }
        if (!$state['running']) break;
        usleep(50000);
    } while (true);
    $out .= stream_get_contents($pipes[1]);
    fclose($pipes[1]); proc_close($p); flock($lock, LOCK_UN); fclose($lock);
    $data = json_decode($out, true);
    if ($failed || !is_array($data)) reply(['error' => 'YouTube could not be reached from this server. The video may be restricted or the server IP blocked.'], 502);
    return $data;
}
$action = $_GET['action'] ?? 'health';
if ($action === 'health') reply(['service' => 'VibeTube media gateway', 'version' => 1,
    'runtime' => is_executable("$runtime/yt-dlp") && function_exists('proc_open'),
    'accountSignIn' => false, 'experimental' => true]);
if ($action === 'media') {
    $token = $_GET['token'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{48}$/D', $token)) reply(['error' => 'Invalid media ticket.'], 400);
    $file = "$runtime/tickets/$token.json";
    $ticket = is_file($file) ? json_decode(file_get_contents($file), true) : null;
    if (!$ticket || ($ticket['expires'] ?? 0) < time()) reply(['error' => 'Media ticket expired. Reload the video.'], 410);
    if (!upstreamUrl($ticket['url'] ?? '')) reply(['error' => 'Invalid upstream.'], 502);
    $range = $_SERVER['HTTP_RANGE'] ?? '';
    if ($range !== '' && !preg_match('/^bytes=(?:[0-9]+-[0-9]*|-[0-9]+)$/D', $range)) reply(['error' => 'Use one byte range.'], 416);
    $streamLock = null;
    for ($i = 0; $i < 6; $i++) {
        $f = fopen("$runtime/stream-$i.lock", 'c');
        if ($f && flock($f, LOCK_EX | LOCK_NB)) { $streamLock = $f; break; }
        if ($f) fclose($f);
    }
    if (!$streamLock) reply(['error' => 'All media streams are busy.'], 429);
    set_time_limit(180);
    while (ob_get_level()) ob_end_clean();
    $status = 502;
    $ch = curl_init($ticket['url']);
    curl_setopt_array($ch, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_TIMEOUT => 170, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER => array_filter(['User-Agent: Mozilla/5.0', $range !== '' ? "Range: $range" : '']),
        CURLOPT_NOBODY => $_SERVER['REQUEST_METHOD'] === 'HEAD',
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$status) {
            if (preg_match('/^HTTP\/\S+\s+(\d+)/', $line, $m)) {
                $status = (int)$m[1]; http_response_code(in_array($status, [200,206,416], true) ? $status : 502);
            } elseif (in_array($status, [200,206,416], true) && preg_match('/^(Content-Type|Content-Length|Content-Range|Accept-Ranges):/i', $line)) header(trim($line));
            return strlen($line);
        },
        CURLOPT_WRITEFUNCTION => function ($ch, $bytes) use (&$status) {
            if (!in_array($status, [200,206], true) || connection_aborted()) return 0;
            echo $bytes; flush(); return strlen($bytes);
        }]);
    curl_exec($ch); curl_close($ch); flock($streamLock, LOCK_UN); fclose($streamLock); exit;
}
// Per-IP extraction rate limit; no user queries or IP addresses are persisted in plaintext.
$bucket = "$runtime/rate-" . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
$buckets = glob("$runtime/rate-*") ?: [];
foreach ($buckets as $file) if (filemtime($file) < time() - 120) unlink($file);
if (count($buckets) >= 1000 && !is_file($bucket)) reply(['error' => 'Server capacity reached.'], 429);
$f = fopen($bucket, 'c+');
flock($f, LOCK_EX);
$rate = json_decode(stream_get_contents($f), true) ?: ['start' => time(), 'count' => 0];
if (time() - $rate['start'] > 60) $rate = ['start' => time(), 'count' => 0];
$rate['count']++;
ftruncate($f, 0); rewind($f); fwrite($f, json_encode($rate)); flock($f, LOCK_UN); fclose($f);
if ($rate['count'] > 90) reply(['error' => 'Please wait before making more requests.'], 429);
if ($action === 'suggest') {
    $q = $_GET['q'] ?? '';
    if (!is_string($q) || mb_strlen(trim($q)) < 2 || mb_strlen($q) > 100) reply(['suggestions' => []]);
    $lang = $_GET['lang'] ?? 'en';
    if (!is_string($lang) || !preg_match('/^[a-z]{2}(?:-[A-Za-z]{2})?$/D', $lang)) $lang = 'en';
    $ch = curl_init('https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=' . rawurlencode($lang) . '&q=' . rawurlencode(trim($q)));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 6, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    $d = is_string($raw) ? json_decode($raw, true) : null;
    if ($code !== 200 || !is_array($d[1] ?? null)) reply(['error' => 'Search suggestions are temporarily unavailable. You can still submit your search.'], 502);
    reply(['suggestions' => array_slice(array_values(array_filter($d[1], fn($v) => is_string($v) && mb_strlen($v) <= 150)), 0, 8)]);
}
if ($action === 'search') {
    $q = $_GET['q'] ?? '';
    if (!is_string($q) || mb_strlen(trim($q)) < 1 || mb_strlen($q) > 200) reply(['error' => 'Enter a search up to 200 characters.'], 400);
    $page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
    if ($page === false) reply(['error' => 'Invalid results page.'], 400);
    $searchDir = "$runtime/search";
    if (!is_dir($searchDir)) mkdir($searchDir, 0700);
    $cache = "$searchDir/" . hash('sha256', 'v2:' . $page . ':' . trim($q)) . '.json';
    if (is_file($cache) && filemtime($cache) > time() - 300) {
        $cached = json_decode(file_get_contents($cache), true);
        if (is_array($cached)) reply($cached);
    }
    $d = extractVideo(['--flat-playlist', '--playlist-start', (string)(($page - 1) * 20 + 1), 'ytsearch' . ($page * 20) . ':' . trim($q)]);
    $items = [];
    foreach (array_slice($d['entries'] ?? [], 0, 20) as $v) {
        if (!preg_match('/^[\w-]{11}$/D', $v['id'] ?? '')) continue;
        $items[] = ['id' => $v['id'], 'title' => mb_substr($v['title'] ?? 'Video', 0, 300),
            'channel' => mb_substr($v['channel'] ?? $v['uploader'] ?? 'YouTube', 0, 150), 'category' => 'Videos'];
    }
    $files = glob("$searchDir/*.json") ?: [];
    usort($files, fn($a, $b) => filemtime($a) <=> filemtime($b));
    while (count($files) >= 100) unlink(array_shift($files));
    $payload = ['items' => $items, 'page' => $page, 'hasMore' => count($items) === 20 && $page < 5];
    file_put_contents($cache, json_encode($payload), LOCK_EX);
    chmod($cache, 0600);
    reply($payload);
}
if ($action !== 'video') reply(['error' => 'Unknown endpoint.'], 404);
$id = $_GET['id'] ?? '';
if (!is_string($id) || !preg_match('/^[\w-]{11}$/D', $id)) reply(['error' => 'Invalid video ID.'], 400);
// Tickets are private, short lived and bounded; never expose an unrestricted URL proxy.
$dir = "$runtime/tickets";
if (!is_dir($dir)) mkdir($dir, 0700);
$tickets = glob("$dir/*.json") ?: [];
foreach ($tickets as $file) if (filemtime($file) < time() - 1800) unlink($file);
if (count(glob("$dir/*.json") ?: []) >= 100) reply(['error' => 'Media ticket capacity reached. Try again later.'], 429);
$d = extractVideo(['--format', 'best[ext=mp4][vcodec!=none][acodec!=none]', 'https://www.youtube.com/watch?v=' . $id]);
if (!upstreamUrl($d['url'] ?? '')) reply(['error' => 'No compatible MP4 is available.'], 422);
$token = bin2hex(random_bytes(24));
file_put_contents("$dir/$token.json", json_encode(['url' => $d['url'], 'expires' => time() + 1800]), LOCK_EX);
chmod("$dir/$token.json", 0600);
reply(['id' => $id, 'title' => mb_substr($d['title'] ?? 'Video', 0, 300),
    'channel' => mb_substr($d['channel'] ?? $d['uploader'] ?? 'YouTube', 0, 150),
    'height' => $d['height'] ?? null, 'duration' => $d['duration'] ?? null,
    'media' => 'api.php?action=media&token=' . $token, 'expiresIn' => 1800]);
