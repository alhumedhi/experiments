# Setup: domain, email, anonymity

Status (checked 2026-11-02): **qalamcreative.com is unregistered**; the .com registry (Verisign RDAP) returns 404 for it.

> I can't complete purchases myself: there's no payment method or registrar account in this environment, and buying things should stay in your hands. Everything below takes about 20 minutes, and nothing in it needs your real name to be public.

## 1. Domain: Cloudflare Registrar (~$11/yr)

Cloudflare sells at wholesale cost with no markup on renewal. It's the cheapest .com over time (~$10.5 to $11/yr; the .com wholesale price went up on 1 Nov 2026). WHOIS privacy is free and on by default, so your name and address are redacted.

1. Create a Cloudflare account (use a fresh email, not your personal one, if you want the account itself separated).
2. Dashboard → **Domain Registration → Register Domains** → `qalamcreative.com` → pay.
3. Registrant contact: Cloudflare requires real details (ICANN rule) but **redacts them publicly**. Do not enter fake details; that can get the domain suspended.

Alternative: Porkbun (~$11/yr flat, free WHOIS privacy). Avoid registrars with cheap first years and $18+ renewals (e.g. Namecheap, GoDaddy).

## 2. Email: hello@qalamcreative.com, free

**Recommended: Zoho Mail "Forever Free"**: up to 5 mailboxes on 1 custom domain, 5 GB each, $0. (Free plan is web + mobile app; upgrade to Mail Lite at $1/user/mo if you need IMAP/Outlook.)

1. zoho.com/mail → Pricing → **Forever Free** → sign up with `qalamcreative.com`.
2. Verify domain (TXT record in Cloudflare DNS).
3. Create mailboxes: `hello@` (outbound + replies). Optionally `studio@` as an alias.
4. Add the DNS records Zoho shows you in Cloudflare:
   - **MX**: `mx.zoho.com` (10), `mx2.zoho.com` (20), `mx3.zoho.com` (50)
   - **SPF** (TXT @): `v=spf1 include:zoho.com ~all`
   - **DKIM** (TXT `zmail._domainkey`): generated in Zoho Admin → Email Authentication
   - **DMARC** (TXT `_dmarc`): `v=DMARC1; p=none; rua=mailto:hello@qalamcreative.com`

Free fallback if Zoho's free plan isn't offered in your region: Cloudflare Email Routing (free inbound forwarding to any inbox) + Gmail "Send mail as" via an SMTP relay. It works, but deliverability is weaker.

## 3. Deliverability rules for cold outbound

- **Warm up first**: 2 weeks of light, normal use before cold sending. Then start at ~10 emails/day and grow to ~30/day max from one mailbox.
- Plain text, no images or attachments, **at most 1 link** (your site), no tracking pixels in the first touch.
- Every email has an opt-out line (included in the drafts).
- Optional, safer at scale: buy a second domain for cold email (e.g. `qalamstudio.co`) so the main domain's reputation is never at risk.
- Put up a one-page site at qalamcreative.com before sending. Prospects will check it. Cloudflare Pages hosts it for free; I can build it (Arabic-first, RTL).

## 4. Keeping you out of it

- WHOIS: redacted by Cloudflare/Porkbun (above).
- Emails are signed **«فريق قلم» / Qalam team**, never a personal name. I have **not** invented a fake founder persona: if a prospect later finds out a "person" never existed, it kills trust, and in Saudi Arabia/the UAE it can create problems with commercial-messaging rules that require you to identify the sender honestly. The brand is the sender.
- Zoho account + Cloudflare account: register with a dedicated email (e.g. a new Gmail used only for Qalam).
- When a client signs, the contract/invoice must come from a legal entity (you as a freelancer or a company). Plan for that before the first deal: a freelance permit (KSA "Freelance" document, UAE free-zone freelance licence) keeps it in the business's name.
