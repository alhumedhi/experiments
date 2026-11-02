# Setup: $0 version (no domain purchase)

| Piece | Free option | Status |
|---|---|---|
| Website | **Surge.sh** → `https://qalamcreative.surge.sh` (subdomain checked free on 2026-11-02) | Built (`site/`), deploys as soon as the Zoho email exists |
| Email | **Zoho Mail free personal account** → e.g. `qalamcreative@zohomail.com` | **You do this (3 min)**; needs a CAPTCHA + a one-time code |
| Dent Care mockup | `qalamcreative.surge.sh/concepts/dentcare/` | Built, unlisted (`noindex`) |

## 1. Zoho Mail account (you: ~3 minutes)

Zoho's signup has a CAPTCHA and sends a one-time code to your phone/email. Claude can't solve or bypass those, so this one step is yours.

1. Go to **zoho.com/mail** → **Sign up** → choose the **Personal Email** tab (this one needs no domain).
2. Name: `Qalam`. Username: `qalamcreative` (fallbacks: `qalam.studio`, `hello.qalam`).
3. Pick the **English** interface.
4. Verify the code and you're done. Then send me the address.
5. Settings → **Sender name**: `Qalam | قلم` (no personal name). Settings → **Signature**: `فريق قلم | Qalam · qalamcreative.surge.sh`.

Note: Zoho's free "Forever Free" *business* plan needs a domain you own, so without buying one the free personal `@zohomail.com` address is the route. Later, buying a ~$11/yr domain is the single biggest upgrade for trust and deliverability.

## 2. Website deploy (me, once I have the email)

```bash
qalam/site/build.sh qalamcreative@zohomail.com
```

```bash
surge qalam/site/dist qalamcreative.surge.sh
```

The Surge login uses the Zoho address. The site never shows a personal name.

## 3. Sending rules (free mailbox = be gentle)

- Free mailboxes have low daily send limits and lower reputation. **Max ~10 cold emails/day**, plain text, one link.
- Send manually from Zoho webmail, one at a time, starting with Dent Care.
- Use Zoho's free inbox for 2–3 days first (sign up to a few newsletters, reply to them) before cold sending.

## 4. "How do I add a payment method / registrar here?"

You can't. This Claude session has no checkout or wallet, and nothing here can spend money. If you ever buy the domain, you do it yourself in a browser (Cloudflare Registrar, ~$11/yr, free WHOIS privacy), then tell me. I'll handle DNS, connect it to the site, and move email to `hello@qalamcreative.com` via Zoho's free business plan.

## 5. Staying anonymous

- Emails are signed **فريق قلم / Qalam team**; no personal name, and no fake persona either (that backfires if discovered, and Gulf messaging rules expect an honestly identified sender).
- Zoho and Surge accounts use the Qalam address only.
- When a client wants to sign, the contract has to come from a legal entity (you as a freelancer, or a company). Plan that before deal #1.
