// TenderCards — forward new Gmail messages to Supabase webhook
// v2: tracks individual message IDs (not threads) to support replies / grouped mails
const WEBHOOK_URL = 'https://uyxfyywjhblnivihnsxq.supabase.co/functions/v1/inbound-email';
const API_KEY = '8bd6a8709f7cf0ce8ed3cd6c4363f68a4a9c86f367e0aea784ad06ee8fbe4308';
const LABEL_NAME = 'Aanvragen';

function forwardToSupabase() {
  const label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) {
    console.log('Label "' + LABEL_NAME + '" niet gevonden. Maak aan in Gmail.');
    return;
  }

  // Get processed message IDs from script properties (persistent store)
  const props = PropertiesService.getScriptProperties();
  const processedRaw = props.getProperty('PROCESSED_MESSAGE_IDS') || '[]';
  const processed = new Set(JSON.parse(processedRaw));

  const threads = label.getThreads(0, 50);
  let forwarded = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const msg of messages) {
      const id = msg.getId();
      if (processed.has(id)) continue;

      const payload = {
        from: msg.getFrom(),
        from_email: extractEmail(msg.getFrom()),
        from_name: extractName(msg.getFrom()),
        subject: msg.getSubject(),
        text: msg.getPlainBody(),
        html: msg.getBody(),
        date: msg.getDate().toISOString(),
      };

      try {
        const res = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-api-key': API_KEY },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        });
        if (res.getResponseCode() === 200) {
          processed.add(id);
          forwarded++;
          console.log('✓ Forwarded: ' + msg.getSubject() + ' — from ' + msg.getFrom());
        } else {
          console.error('Fail ' + res.getResponseCode() + ': ' + res.getContentText());
        }
      } catch (e) {
        console.error('Error: ' + e);
      }
    }
  }

  // Keep last 500 message IDs to avoid storage bloat
  const arr = Array.from(processed);
  const trimmed = arr.slice(-500);
  props.setProperty('PROCESSED_MESSAGE_IDS', JSON.stringify(trimmed));

  console.log('Done. Forwarded ' + forwarded + ' new messages. Tracking ' + trimmed.length + ' message IDs.');
}

function extractEmail(from) {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}
function extractName(from) {
  const m = from.match(/^([^<]+)</);
  return m ? m[1].trim().replace(/^"|"$/g, '') : '';
}

// Manual reset (run once if you want to re-forward all labeled mails)
function resetProcessed() {
  PropertiesService.getScriptProperties().deleteProperty('PROCESSED_MESSAGE_IDS');
  console.log('Reset done — next run will forward all labeled mails.');
}
