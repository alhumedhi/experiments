# Qalam (قلم): outbound workspace

A design studio that redesigns websites and products for businesses in the Arabic-speaking world.

| File | What it is |
|---|---|
| [`setup.md`](setup.md) | Domain + email setup (qalamcreative.com, hello@), deliverability, keeping the founder anonymous |
| [`prospects.md`](prospects.md) | Batch 1: 9 vetted prospects with the conversion problems found on each site |
| [`outreach/batch-01-drafts.md`](outreach/batch-01-drafts.md) | Arabic cold-email drafts, one per prospect, tailored by region. **Not sent; awaiting approval** |
| [`evidence/`](evidence/) | Mobile screenshots backing every claim in the emails |
| [`tools/`](tools/) | The scripts used to find and audit prospects (re-runnable for new batches) |

## How prospects are chosen

1. **Real business with real customers**: pulled from a clinic directory that lists Google review counts; batch 1 only includes businesses with 160 to 4,000+ reviews and ratings of 4.3 or higher.
2. **Website is key to conversion**: clinics win or lose bookings on the site (search → site → booking). Businesses whose "website" is just Instagram, Linktree, or WhatsApp were excluded.
3. **The site is actually bad**: every site was loaded in a real mobile browser (iPhone 13 profile, Arabic locale) and checked for: horizontal overflow, booking call-to-action above the fold, click-to-call and WhatsApp links, broken images, load time, Arabic/RTL support, and leftover template text. Screenshots were reviewed by eye.
4. **Not a chain**: big groups (Magrabi, Aster, Nahdi, Saba…) were excluded; their marketing is run by a central team or agency.

## Pipeline for the next batches

```
python3 tools/zavis.py sa/directory/riyadh/dental …   # pull listings + websites + review counts
xargs -n1 python3 tools/audit.py < urls.txt           # fast technical flags
node tools/shoot.js urls.txt shots.json               # real mobile render + UX checks + screenshots
```

Next sectors to scan (website = conversion): dermatology/cosmetic clinics, real-estate developers (Egypt, KSA), private schools & nurseries, furniture/kitchen showrooms, car rental, hotels & umrah travel agencies.
