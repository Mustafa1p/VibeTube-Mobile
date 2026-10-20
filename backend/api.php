<?php
declare(strict_types=1);
// Public HTTP entry point. Search runtime and metadata caches stay outside public_html.
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
function extractSearch(array $args): array {
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
if ($action === 'health') reply(['service' => 'VibeTube media gateway', 'version' => 2,
    'runtime' => is_executable("$runtime/yt-dlp") && function_exists('proc_open'),
    'accountSignIn' => false, 'playback' => 'youtube-embed']);
if (in_array($action, ['video', 'media'], true)) reply(['error' => 'Custom media playback has been retired. Use the standard YouTube player.'], 410);
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
if ($action === 'avatar') {
    $channel = $_GET['channel'] ?? '';
    $video = $_GET['video'] ?? '';
    if (!is_string($channel) || !is_string($video)) reply(['error' => 'Invalid channel.'], 400);
    if ($channel !== '' && !preg_match('/^UC[\w-]{22}$/D', $channel)) reply(['error' => 'Invalid channel.'], 400);
    if ($channel === '' && !preg_match('/^[\w-]{11}$/D', $video)) reply(['error' => 'Invalid video.'], 400);
    $dir = "$runtime/avatars";
    if (!is_dir($dir)) mkdir($dir, 0700);
    $file = "$dir/" . ($channel !== '' ? $channel : $video) . '.json';
    if (is_file($file)) {
        $cached = json_decode(file_get_contents($file), true);
        if (is_array($cached) && filemtime($file) > time() - (!empty($cached['url']) ? 86400 : 60)) reply($cached);
    }
    // Fetch metadata from fixed YouTube origins only; never accept a caller URL.
    $fetch = function (string $url): ?string {
        $body = '';
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ['Cookie: SOCS=CAI'], // Anonymous rejection of optional Google consent cookies; no account session.
            CURLOPT_USERAGENT => 'Mozilla/5.0', CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$body) {
                if (strlen($body) + strlen($chunk) > 4000000) return 0;
                $body .= $chunk; return strlen($chunk);
            }]);
        $ok = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
        return $ok && $status === 200 ? $body : null;
    };
    $path = $channel !== '' ? '/channel/' . $channel : null;
    if (!$path) {
        $meta = json_decode($fetch('https://www.youtube.com/oembed?url=' . rawurlencode('https://www.youtube.com/watch?v=' . $video) . '&format=json') ?? '', true);
        $author = parse_url($meta['author_url'] ?? '');
        if (($author['host'] ?? '') === 'www.youtube.com' && preg_match('~^/(?:@[^/?#]{1,200}|channel/UC[\w-]{22}|user/[\w.-]{1,100}|c/[\w.-]{1,100})$~D', $author['path'] ?? '')) $path = $author['path'];
    }
    $html = $path ? $fetch('https://www.youtube.com' . $path) : null;
    $image = null;
    if ($html && preg_match('~<meta\s+property="og:image"\s+content="([^"]+)"~i', $html, $m)) {
        $candidate = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $p = parse_url($candidate);
        if (($p['scheme'] ?? '') === 'https' && in_array($p['host'] ?? '', ['yt3.googleusercontent.com', 'yt3.ggpht.com'], true) && !isset($p['user']) && !isset($p['pass']) && ($p['port'] ?? 443) === 443) $image = $candidate;
    }
    $payload = ['url' => $image];
    $files = glob("$dir/*.json") ?: [];
    usort($files, fn($a, $b) => filemtime($a) <=> filemtime($b));
    while (count($files) >= 300) unlink(array_shift($files));
    file_put_contents($file, json_encode($payload), LOCK_EX); chmod($file, 0600);
    reply($payload);
}
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
if (in_array($action, ['search', 'channel'], true)) {
    $q = $action === 'channel' ? ($_GET['video'] ?? '') : ($_GET['q'] ?? '');
    if ($action === 'channel' && (!is_string($q) || !preg_match('/^[\w-]{11}$/D', $q))) reply(['error' => 'Invalid channel video.'], 400);
    if (!is_string($q) || mb_strlen(trim($q)) < 1 || mb_strlen($q) > 200) reply(['error' => 'Enter a search up to 200 characters.'], 400);
    $page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
    if ($page === false) reply(['error' => 'Invalid results page.'], 400);
    $searchDir = "$runtime/search";
    if (!is_dir($searchDir)) mkdir($searchDir, 0700);
    $cache = "$searchDir/" . hash('sha256', $action . ':v5:' . $page . ':' . trim($q)) . '.json';
    if (is_file($cache) && filemtime($cache) > time() - 300) {
        $cached = json_decode(file_get_contents($cache), true);
        if (is_array($cached)) reply($cached);
    }
    $target = 'ytsearch' . ($page * 20) . ':' . trim($q);
    if ($action === 'channel') {
        $ch = curl_init('https://www.youtube.com/oembed?url=' . rawurlencode('https://www.youtube.com/watch?v=' . $q) . '&format=json');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true]);
        $raw = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
        $meta = $status === 200 && is_string($raw) ? json_decode($raw, true) : null;
        $author = parse_url($meta['author_url'] ?? '');
        if (($author['scheme'] ?? '') !== 'https' || ($author['host'] ?? '') !== 'www.youtube.com' ||
            !preg_match('~^/(?:@[A-Za-z0-9_.%\x{0080}-\x{FFFF}-]{1,200}|channel/UC[\w-]{22}|user/[\w.-]{1,100}|c/[\w.-]{1,100})$~uD', $author['path'] ?? ''))
            reply(['error' => 'This channel could not be resolved. Try another video from the channel.'], 502);
        $target = 'https://www.youtube.com' . $author['path'] . '/videos';
    }
    $d = extractSearch(['--yes-playlist', '--flat-playlist', '--playlist-start', (string)(($page - 1) * 20 + 1), '--playlist-end', (string)($page * 20), $target]);
    $items = [];
    foreach (array_slice($d['entries'] ?? [], 0, 20) as $v) {
        if (!preg_match('/^[\w-]{11}$/D', $v['id'] ?? '')) continue;
        $items[] = ['id' => $v['id'], 'title' => mb_substr($v['title'] ?? 'Video', 0, 300),
            'channel' => mb_substr($v['channel'] ?? $v['uploader'] ?? $d['channel'] ?? $d['uploader'] ?? $meta['author_name'] ?? 'YouTube', 0, 150),
            'channelId' => preg_match('/^UC[\w-]{22}$/D', $v['channel_id'] ?? $d['channel_id'] ?? '') ? ($v['channel_id'] ?? $d['channel_id']) : null, 'category' => 'Videos'];
    }
    $files = glob("$searchDir/*.json") ?: [];
    usort($files, fn($a, $b) => filemtime($a) <=> filemtime($b));
    while (count($files) >= 100) unlink(array_shift($files));
    $payload = ['items' => $items, 'page' => $page, 'hasMore' => count($items) === 20 && $page < 5];
    file_put_contents($cache, json_encode($payload), LOCK_EX);
    chmod($cache, 0600);
    reply($payload);
}
reply(['error' => 'Unknown endpoint.'], 404);
