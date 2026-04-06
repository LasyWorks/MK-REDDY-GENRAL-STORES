# Honeypot Trap System Documentation

## Overview
The honeypot trap system is a security mechanism that detects and traps malicious bots, scrapers, and unauthorized crawlers without affecting legitimate users.

## How It Works

### 1. Honeypot Routes (Hidden Traps)
The following routes are created but NOT visible to normal users:
- `/admin` - Fake admin panel
- `/wp-admin` - WordPress admin trap
- `/config` - Configuration file trap
- `/backup` - Backup file trap
- `/database` - Database trap
- `/.git` - Git repository trap
- `/.env` - Environment file trap
- `/shell.php` - PHP shell trap
- `/xmlrpc.php` - XML-RPC trap
- `/api/internal/*` - Internal API trap

**Why these?** Bots automatically target these common vulnerable paths. If a bot tries to access them, it gets trapped and logged.

### 2. Honeypot Form Fields
Hidden form fields that bots auto-fill but real users never see:
- `website_url` - No user sees this field (CSS hidden)
- `user_email_confirm` - Hidden field
- `phone_confirm` - Hidden field
- `company_name` - Hidden field

If a bot auto-fills these, it signals automated form submission.

### 3. IP-Based Rate Limiting
- Tracks requests from each IP to honeypot routes
- After 50 requests to honeypot paths in 1 hour: IP is blocked
- Blocked IPs get 403 Forbidden response
- Blocks are persistent and logged

### 4. Bot Detection
Detects common bot user-agents:
- SEO scrapers: Ahrefs, Semrush, Majestic
- Search engines: Google, Bing, Yahoo, Baidu, Yandex
- Generic bots: curl, wget, Python, Java, etc.

## Implementation

### Using Honeypot Form Fields
```jsx
import { HoneypotField, checkHoneypot } from "@/components/common/HoneypotField";

export default function ContactForm() {
  const handleSubmit = (e) => {
    if (!checkHoneypot(e)) return; // Block if bot detected
    
    // Process form...
  };

  return (
    <form onSubmit={handleSubmit}>
      <HoneypotField /> {/* Add this to any form */}
      
      <input type="text" name="name" required />
      <input type="email" name="email" required />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Checking Honeypot Status
```bash
# Get honeypot statistics (localhost only)
curl http://localhost:3000/api/security/honeypot-stats
```

Response includes:
- Total traps triggered
- Unique IPs trapped
- List of blocked IPs
- Recent trap attempts
- Bot type breakdown

## How Bots Get Trapped

### Trap 1: Honeypot Routes
1. Bot scans site looking for common vulnerabilities
2. Bot tries `/admin` route
3. System detects and logs the attempt
4. Request redirected or returns 404
5. IP tracked

### Trap 2: Form Fields
1. Bot finds form on page
2. Bot auto-fills all visible AND hidden fields
3. HoneypotField detects the hidden field is filled
4. Form submission blocked
5. Request logged

### Trap 3: Rate Limiting
1. Bot makes 50+ requests to honeypot paths
2. System blocks the IP
3. All future requests from that IP get 403 Forbidden
4. IP added to blocklist

## Benefits

✅ **Detect Bots** - Know when/where bots are attacking
✅ **Block Scrapers** - SEO scrapers and content thieves get blocked
✅ **No User Impact** - Real users never see these routes
✅ **Collect Intelligence** - Learn attacker patterns
✅ **Automatic Blocking** - Repeat offenders auto-blocked
✅ **Zero False Positives** - Only catches actual bots

## What Gets Logged

Each trap logs:
- Timestamp (ISO 8601 format)
- Bot User-Agent (identifies the bot software)
- IP Address (location of bot)
- Path Accessed (which trap was triggered)
- HTTP Method (GET, POST, etc.)
- Referrer (where bot came from)

Example log entry:
```json
{
  "timestamp": "2026-04-06T20:30:15.000Z",
  "userAgent": "AhrefsBot/7.0",
  "ip": "192.168.1.100",
  "path": "/admin",
  "method": "GET",
  "referer": ""
}
```

## Blocked IPs Example

```json
{
  "192.168.1.100": {
    "ip": "192.168.1.100",
    "reason": "Too many honeypot trap requests (52)",
    "blocked_at": "2026-04-06T20:30:15.000Z",
    "requests": 52
  }
}
```

## Security Best Practices

1. **Never expose honeypot routes in robots.txt** - We want bots to find them organically
2. **Hide form fields with CSS** - No display, no opacity, position off-screen
3. **Use realistic field names** - `website_url`, `company_name` (what real forms have)
4. **Monitor logs regularly** - Check honeypot-stats API
5. **Review blocked IPs** - Investigate patterns

## Customization

### Add More Trap Routes
Create new files in `app/trap-name/page.jsx`:
```jsx
import { detectAndLogBot } from "@/lib/honeypot";
import { redirect } from "next/navigation";

export async function GET() {
  await detectAndLogBot("/trap-name");
  redirect("/");
}
```

### Adjust Blocking Threshold
Edit `frontend/middleware.js`:
```js
const MAX_REQUESTS_PER_IP = 50; // Change this value
const TIME_WINDOW = 60 * 60 * 1000; // Change time window
```

### Add More Honeypot Form Fields
Edit `HoneypotField.jsx` to add more hidden fields that match your forms.

## Logs Location

- **Trap logs**: `.honeypot-log.json` (in project root)
- **Blocked IPs**: `.blocked-ips.json` (in project root)

These files grow over time. Periodically review and clean them.

## Monitoring Dashboard

Access honeypot statistics via API:
```
GET /api/security/honeypot-stats
```

Only accessible from localhost. Returns:
- Total traps triggered
- Unique bot IPs
- Number of blocked IPs
- Recent 10 trap events
- Full blocked IPs list
- Breakdown by bot type

## Common Bots Detected

| Bot | Type | Blocked |
|-----|------|---------|
| Googlebot | Search Engine | No (whitelisted) |
| Bingbot | Search Engine | No (whitelisted) |
| AhrefsBot | SEO Scraper | Yes |
| SemrushBot | SEO Scraper | Yes |
| curl | Automated Tool | Yes |
| wget | Automated Tool | Yes |
| Python-requests | Scraper | Yes |

## Examples

### Example 1: Bot Tries Admin
```
Bot: AhrefsBot/7.0
Requests GET /admin
System: Detects honeypot route access
Result: Logs trap, redirects to homepage/404
IP tracking: 1 strike
```

### Example 2: Bot Fills Hidden Form
```
User submits form with hidden field filled
System: Validates honeypot fields
Field "website_url" has value "http://spam.com"
Result: Form rejected, logged as bot
Page: Shows same form again
```

### Example 3: Aggressive Bot
```
Bot makes 52 requests to different honeypot routes in 30 mins
System: Counts 52 hits to /admin, /wp-admin, /config, etc.
Threshold: 50 requests = block
Result: IP 192.168.1.100 added to blocklist
Future requests: All get 403 Forbidden
```

## Disable Temporarily

To disable honeypot protection temporarily:

1. Comment out honeypot routes in `/app` folder
2. Comment out `<HoneypotField />` in forms
3. Comment out middleware logic

To re-enable: Uncomment all the above.

---

**Status**: Active & Monitoring
**Last Updated**: April 6, 2026
**Maintenance**: Review logs weekly
