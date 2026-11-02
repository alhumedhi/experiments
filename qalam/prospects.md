# Batch 1: prospects (clinics, KSA · Kuwait · Qatar)

Audited 2026-11-02 on a real mobile browser (iPhone 13 profile). Review counts are Google's, via the Zavis clinic directory.
Priority: **A** = clear revenue leak + reachable by email · **B** = strong leak, reach via WhatsApp/Instagram/phone.

| # | Business | City | Google reviews | Site | Contact | Pri |
|---|---|---|---|---|---|---|
| 1 | مجمع عيادات دنت كير لطب الأسنان (Dent Care), est. 2006 | Riyadh, Olaya | 1,230 · 4.5★ | dentcaresaudi.com | support@dentcaresaudi.com | A |
| 2 | مجمع عيادات عالم الطب (Medical World Polyclinic) | Riyadh, Al Taawun + Malaz | 1,313 · 4.6★ | medicalworld.com.sa | m.shafik@mw.com.sa (listed on site) · 920002278 | A |
| 3 | مجمع عيادات تباشير الطبية (Tabashir) | Jeddah | 943 · 4.8★ | tabashirclinics.com | info@tabashirclinics.com | A |
| 4 | مركز كلينك الطبي (Klinik Medical Center) | Kuwait, Salmiya | 162 · 4.7★ | klinik.com.kw | info@klinik.com.kw | A |
| 5 | مركز اللؤلؤة لطب الأسنان (Al-Loaloah Dental) | Kuwait, Jabriya | 229 · 4.7★ | al-loaloah.com | socialmedial@al-loaloah.com | A |
| 6 | مجمع الدوحة التخصصي للأسنان والجلدية | Doha, Al Muntazah | 985 · 4.9★ | dohadentalcenter.com | info@dohadentalcenter.com | A |
| 7 | مجمع دنت الطبي (Dent Medical Complex) | Riyadh | 4,069 · 4.3★ | dent-sa.com | WhatsApp +966 50 991 9924 · IG @dent.sa (no public email) | B |
| 8 | مجمع عيادات د. مها دحلان (MD Clinics) | Jeddah | 1,183 · 4.8★ | mahadahlan.com | No public email: phone/IG via Google Maps | B |
| 9 | عيادات جرين دنت (Green Dent) | Jeddah | 739 · 4.7★ | greendent.com.sa | WhatsApp +966 54 440 7607 · IG @green_dent_sa | B |

---

## Findings per prospect

### 1. Dent Care, Riyadh ([evidence](evidence/dentcare-mobile.jpg))
- The offers (implants from 4,000 SAR, 20% off aligners) are **inside a small poster image**: unreadable on a phone and invisible to Google.
- A large heading literally reads **"dentcaresaudi"** (the domain name); the page title in Google is "الصفحة الرئيسية - dentcaresaudi.com".
- **Three competing booking buttons** ("لحجز موعد أضغط هنا", "تحديد موعد", "سجل بياناتك الآن"), so it's unclear which one books.
- The hero text sits over a busy building photo and is barely legible; empty white strip at the top on mobile.
- Took ~28 s to fully load in our test.

### 2. Medical World, Riyadh ([evidence](evidence/medicalworld-mobile.jpg))
- The page's main heading (H1, what Google reads first) is **"(English) Welcome to our new website"**, leftover placeholder text.
- An embedded feed shows **"Tweets by @TwitterDev"**: Twitter's sample account, not theirs.
- **No booking button anywhere on the homepage**; only two floating WhatsApp bubbles, which **cover the "about us" text** on mobile.
- The hero slider crops their own CBAHI accreditation logo.

### 3. Tabashir, Jeddah ([evidence](evidence/tabashir-mobile.jpg))
- On mobile the visitor sees **only a loading screen** (logo + dots) for a long time; the full page took ~27 s to load in our test.
- English-first site title/menu ("Home - Tabashir Medical Clinics") for an Arabic-speaking Jeddah audience.
- No tap-to-call link on the homepage.

### 4. Klinik Medical Center, Salmiya ([evidence](evidence/klinik-mobile.jpg))
- The **homepage is just a slider and a footer**: no services, doctors, prices or booking. The whole page is one screen tall.
- The **WhatsApp icon links to whatsapp.com**, not to a chat with the clinic.
- The Arabic headline "جمـــال التطـور" is broken by stretched kashida letters; the hero image is a swimmer.
- No tap-to-call; the phone number only appears on the contact page.

### 5. Al-Loaloah Dental, Jabriya ([evidence](evidence/alloaloah-mobile.jpg))
- The browser tab / Google result reads **"al-loaloah – Just another WordPress site"** (WordPress default tagline).
- Entire site is **English-only** for a Kuwaiti audience.
- Hero slider shows an empty loading box on mobile; ~17 s to load in our test.

### 6. Doha Specialized Dental & Dermatology ([evidence](evidence/dohadental-mobile.jpg))
- First thing on mobile: "Welcome To Our Official Website" + a **6-field English form** (date in US mm/dd/yyyy format).
- The floating WhatsApp button **covers the email field** of that form.
- No Arabic booking path, in Qatar. The page source also still contains "Just another WordPress site".

### 7. Dent Medical Complex, Riyadh ([evidence](evidence/dent-sa-mobile.jpg))
- Booking requires **choose department → choose service → "search"** before any time slot appears.
- On scroll, the **sticky header slides over the booking form**.
- Page is **wider than the phone** (445 px vs 390 px), so it wobbles sideways.
- Laser packages use an e-commerce "add to cart" flow, while the rest of the site pushes WhatsApp: two separate conversion paths.

### 8. MD Clinics (Dr. Maha Dahlan), Jeddah ([evidence](evidence/mahadahlan-desktop.jpg))
- The **entire site is down**: it shows the hosting provider's English "Deployment Paused" error (Vercel). Every Google Maps/Instagram visitor lands on it.
- ⚠️ Re-check right before sending; this may get fixed any day. If it's back up, re-audit instead.

### 9. Green Dent, Jeddah ([evidence](evidence/greendent-mobile.jpg))
- Mobile homepage stays a **dark screen with a spinner**; 50 of 117 images failed to load in our test.
- The "حجز موعد" tab is rotated sideways on the screen edge.
- Its 404 page shows the theme's default English text "Hey there mate! Your lost treasure is not found here…".

---

### Excluded after review
- **Uranus Dental (uranus.com.sa, 1,244 reviews)**: appeared "under maintenance", but the block may be on our network side. Could not confirm, so skipped.
- Several clinics flagged by the scanner (Kings Dental, Naseem, Lari, Reviva, View Clinic) only failed through our proxy; not real evidence.
- Sites that are fine (Asnan Tower, Zayan, Dima, Horizon, My Clinic, etc.): no strong conversion problem to point at.
