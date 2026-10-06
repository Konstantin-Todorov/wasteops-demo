<?php
// Logix lead endpoint — работи на споделен хостинг (SuperHosting).
// Записва всеки имейл в leads/leads.csv (отваря се директно в Excel)
// и изпраща демо линка от noreply@logix.bg чрез PHP mail().

header('Content-Type: application/json; charset=utf-8');

// ─── Настройки ────────────────────────────────────────────────────────────
$DEMO_URL  = 'https://wasteops-demo-production.up.railway.app/login';
$FROM_NAME = 'Logix';
$FROM_MAIL = 'noreply@logix.bg';   // създайте тази пощенска кутия в cPanel
// ──────────────────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$body   = json_decode(file_get_contents('php://input'), true) ?: [];
$email  = strtolower(trim($body['email'] ?? ''));
$source = substr(preg_replace('/[^a-z0-9_-]/i', '', $body['source'] ?? ''), 0, 40);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'Моля, въведете валиден имейл адрес.'], JSON_UNESCAPED_UNICODE);
  exit;
}

// ─── CSV хранилище (защитено от директен достъп) ─────────────────────────
$dir = __DIR__ . '/leads';
if (!is_dir($dir)) {
  mkdir($dir, 0755, true);
  file_put_contents($dir . '/.htaccess', "Require all denied\n");
}
$file = $dir . '/leads.csv';
if (!file_exists($file)) {
  // BOM + ; разделител → Excel отваря кирилицата и колоните коректно
  file_put_contents($file, "\xEF\xBB\xBF" . "Имейл;Източник;Изпратен имейл;Дата\n");
}

// ─── Изпращане на имейла ──────────────────────────────────────────────────
$year = date('Y');
$html = <<<HTML
<div style="margin:0;padding:32px 16px;background:#f4faf6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2efe7;">
    <div style="background:linear-gradient(135deg,#0e4a25,#041a0c);padding:36px 32px;text-align:center;">
      <p style="margin:0;color:#7df0a8;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Logix</p>
      <h1 style="margin:12px 0 0;color:#ffffff;font-size:26px;line-height:1.3;">Вашето демо е готово 🚛</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#1f3a2c;font-size:16px;line-height:1.6;">Здравейте,</p>
      <p style="margin:0 0 24px;color:#1f3a2c;font-size:16px;line-height:1.6;">
        Благодарим за интереса към <strong>Logix</strong> — платформата за логистика и полеви
        услуги с жива GPS карта, оптимизация на маршрути и автоматично фактуриране.
        Демото показва действаща конфигурация за сметоизвозване — същото ядро се настройва за
        доставки, дистрибуция, превоз на товари и сервизни екипи.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{$DEMO_URL}" style="display:inline-block;background:#25c06a;color:#03130a;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:12px;">Отвори демото →</a>
      </div>
      <p style="margin:0 0 12px;color:#1f3a2c;font-size:15px;line-height:1.6;">
        На страницата за вход просто <strong>изберете роля</strong> (диспечер, шофьор или клиент) —
        данните за достъп се попълват автоматично.
      </p>
      <div style="background:#f4faf6;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;color:#456a55;font-size:14px;line-height:1.8;">
          💡 <strong>Откъде да започнете:</strong><br/>
          1. Влезте като <strong>Диспечер</strong> и отворете „Карта“ — камионите се движат на живо.<br/>
          2. Отворете „Курсове“ и разгънете курс — вижте оптимизацията и спестените километри.<br/>
          3. Влезте като <strong>Шофьор</strong> от телефона си — това е приложението на екипа на терен.
        </p>
      </div>
      <p style="margin:24px 0 0;color:#456a55;font-size:14px;line-height:1.6;">
        Въпроси или искате персонално демо за вашата фирма? Отговорете на този имейл или ни се
        обадете на <a href="tel:+359894306704" style="color:#0e4a25;font-weight:700;text-decoration:none;">0894&nbsp;306&nbsp;704</a>.
      </p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #e2efe7;text-align:center;">
      <p style="margin:0;color:#8aa697;font-size:12px;">© {$year} Logix · Платформа за логистика и полеви услуги · Русе, България</p>
    </div>
  </div>
</div>
HTML;

$subject = '=?UTF-8?B?' . base64_encode('Вашият достъп до демото на Logix 🚛') . '?=';
$headers = "MIME-Version: 1.0\r\n"
  . "Content-Type: text/html; charset=UTF-8\r\n"
  . "From: =?UTF-8?B?" . base64_encode($FROM_NAME) . "?= <{$FROM_MAIL}>\r\n"
  . "Reply-To: {$FROM_MAIL}\r\n";

$sent = @mail($email, $subject, $html, $headers, "-f{$FROM_MAIL}") ? 1 : 0;

// ─── Запис в CSV ──────────────────────────────────────────────────────────
$row = str_replace(';', ',', $email) . ';' . $source . ';' . ($sent ? 'да' : 'не') . ';' . date('Y-m-d H:i:s') . "\n";
file_put_contents($file, $row, FILE_APPEND | LOCK_EX);

echo json_encode([
  'ok' => true,
  'message' => $sent
    ? 'Готово! Проверете пощата си — демо линкът пътува към вас.'
    : 'Записахме ви! Ще получите демо линка съвсем скоро.',
], JSON_UNESCAPED_UNICODE);
