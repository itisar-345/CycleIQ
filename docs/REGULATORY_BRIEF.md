# Regulatory Brief — for counsel review

**Purpose:** background for (1) an FDA Software as a Medical Device (SaMD) classification risk assessment and (2) a US COPPA / EU GDPR-K review of teen mode. This is a factual description of what the app does, prepared by the engineering team. It is **not** legal advice and does not reach conclusions — those are for counsel.

**Status:** Awaiting counsel review · **Prepared:** October 2026

---

## 1. Product summary

CycleIQ is a menstrual-cycle and symptom tracker for general cycle tracking, PCOS, PCOD, endometriosis, perimenopause, teens and people coming off hormonal contraception. All data is stored only on the user's device (encrypted). There is no account, no server, no analytics and no advertising.

## 2. Functions relevant to SaMD assessment

| Function | What it does | Intended-use framing in the app |
|----------|--------------|---------------------------------|
| Period prediction | Estimates next period date and a likely window from the user's past cycle lengths (statistical, on-device). Shows a confidence percentage and average past error. | "Not medical advice" shown on the Home and Insights prediction cards |
| Ovulation / fertile-window estimate | Ovulation estimated as 14 days before the predicted period; shown as a phase on the calendar and in optional notifications | Classic-voice notification states it is "an estimate and not suitable for contraception"; **chill voice does not yet** (see §5) |
| Symptom correlations ("insights") | Spearman correlations across the user's own logs, with multiple-comparison correction | "Shows association, not causation"; mental-health cards add a "not a clinical assessment" note |
| Endometriosis red-flag prompts | Suggests contacting a provider after severe pain on 3 consecutive days, or a specific symptom combination | Signposting only; see `docs/CLINICAL_REVIEW.md` |
| Low-mood safeguarding prompt | After 3 consecutive very-low mood days, offers crisis / support resources | Signposting only |
| Absent-period prompts | Suggests seeing a provider after 60 / 90 days without a period (PCOS) | Signposting only |
| Doctor-ready PDF reports | Summaries of logged data for the user to share with a clinician | User-initiated export |

The app does **not**: diagnose any condition, recommend or adjust medication doses, claim contraceptive efficacy, or connect to any clinician or server.

### Questions for counsel

1. Do any of the functions above (in particular the red-flag prompts, the PCOS/endometriosis condition modes, or ovulation estimates) bring the app within FDA device regulation, or are they covered by enforcement discretion / general-wellness policy?
2. Is the current "not medical advice" framing sufficient, and where else should it appear?
3. Any implications of marketing claims in the store listing (draft in `docs/STORE_SUBMISSION.md`)?
4. EU MDR / UK MHRA considerations if distributed there?

## 3. Teen mode — COPPA / GDPR-K

| Aspect | Current behaviour |
|--------|-------------------|
| Current state | A simplified teen log exists in code (`isTeen` in `store/index.ts`, used by `app/(tabs)/log.tsx`), but **no screen currently turns it on**, and the app does not ask for age. Teen mode is effectively disabled. |
| Age gate | **None.** The app neither asks for nor verifies age, and does not block under-13 users |
| Parental consent | **None** |
| Data collected | Same health data for every user, stored only on the device; never transmitted by the app |
| Sharing | Only via user-initiated export / share sheet |
| Marketing | Onboarding copy mentions "teen" as one example of irregular cycles; the store listing draft does not target teens |

**Decision needed before teen mode is exposed:** counsel's answers below determine whether an age question, age gate or parental-consent flow must be built first.

### Questions for counsel

1. Given no data leaves the device and there is no account, do COPPA's verifiable-parental-consent requirements apply? Does that change if teen mode is marketed to under-13s?
2. For the EU (GDPR Art. 8, age of digital consent 13–16 by member state) and UK Children's Code: is consent required for on-device-only processing of health data?
3. Should the app add an age gate at onboarding, and what should happen for users under 13?
4. Store age rating implications (App Store "Medical/Treatment Information", Play Families policy).

## 4. Data protection summary

- Storage: SQLCipher-encrypted SQLite; sensitive notes additionally AES-256-GCM; key in iOS Keychain / Android Keystore via SecureStore.
- No network calls for core features; no third-party SDKs that transmit data.
- Optional read-only Apple Health / Health Connect import (sleep, steps, exercise).
- App lock and discreet notifications available.
- Export (JSON/CSV/PDF) and full delete are user-controlled.

## 5. Known gaps the team will fix based on counsel's advice

- Add a "not for contraception" statement wherever ovulation is shown, in both voices.
- Add an age gate / parental-consent flow if required.
- Final wording of disclaimers in onboarding and the store listing.

## Sign-off

| Area | Counsel | Date | Outcome / required changes |
|------|---------|------|-----------------------------|
| FDA SaMD classification | | | |
| COPPA / GDPR-K (teen mode) | | | |
