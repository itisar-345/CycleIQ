# Clinical Review — Safeguarding, Red-Flag Prompts & Health Messaging

**Status:** Pending clinician sign-off
**Blocker for public release:** Yes
**Last updated:** October 2026

CycleIQ shows a small number of safety prompts. They are **signposting only** — they do not diagnose, triage or replace care. A qualified clinician (gynaecology / women's health) and a mental-health professional should review every item below before App Store / Play Store submission.

The app has two voices the user can choose: **chill** (casual, emoji) and **classic** (plain). Safety prompts carry the same information in both; please review **both** wordings. All wording is reproduced verbatim below.

---

## 1. Low-mood safeguarding prompt

| Parameter | Current behaviour | Where |
|-----------|-------------------|-------|
| Trigger | Today's mood = 1 (of 5) **and** mood = 1 on each of the 2 previous **calendar days** (lowest mood logged that day counts) | `utils/safetyRules.ts` (`shouldShowSafeguardingPrompt`, `countConsecutivePriorDays`), thresholds in `constants/safeguarding.ts` |
| A day with no log | Breaks the streak (not assumed low) | same |
| Delivery | In-app alert when the log is saved; never a push notification | `app/(tabs)/log.tsx` |
| Cooldown | 14 days between prompts | `SAFEGUARDING_PROMPT_COOLDOWN_DAYS` |
| Destination | Support screen: region-specific crisis lines with tap-to-call, emergency number, therapy directories | `app/education/resources.tsx` |

**Wording**

| Voice | Title | Body | Buttons |
|-------|-------|------|---------|
| chill | Hey, checking in 🫶 | You've had a few really hard days in a row. You don't have to carry this alone — want to see some people you can talk to? | Not right now · Show me support |
| classic | Checking in | You've logged several very difficult days in a row. You don't have to manage this alone. Would you like to see support options? | Not now · View support |

**Crisis lines shown (by device time zone)**

| Region | Lines |
|--------|-------|
| India | Tele-MANAS 14416 (24/7, multilingual); KIRAN 1800-599-0019; emergency 112 |
| US | 988 Suicide & Crisis Lifeline; emergency 911 |
| UK | Samaritans 116 123; emergency 999 |
| Australia | Lifeline 13 11 14; emergency 000 |
| Canada | 9-8-8 Suicide Crisis Helpline; emergency 911 |

Region is inferred from the device time zone (`getUserRegion` in `app/education/resources.tsx`), e.g. only `Europe/London` maps to the UK.
| Other / unknown | All of the above are listed; emergency text says "such as 112 or 911" |

### Questions for reviewer

1. Is mood = 1 on 3 consecutive calendar days an appropriate threshold (too sensitive / too lax)?
2. Should luteal-phase (PMS / PMDD) low mood be handled differently?
3. Should a crisis number appear directly in the alert, rather than one tap away?
4. Are the numbers and services above correct and appropriate for each region?
5. Teen mode: different threshold or wording?
6. Is a 14-day cooldown safe, or could it suppress a needed prompt?

### Sign-off

| Reviewer | Role | Date | Approved (Y/N) | Notes |
|----------|------|------|----------------|-------|
| | | | | |

---

## 2. Endometriosis red-flag prompts

| Trigger | Exact rule | Cooldown |
|---------|-----------|----------|
| Severe pain | Pain ≥ 8 today **and** highest pain ≥ 8 on each of the 2 previous calendar days (a day without a log breaks the streak) | 30 days |
| Complex symptoms | Any bowel symptom + shoulder pain (left/right/both) + heavy or very heavy flow, same day | 30 days |

Endometriosis mode only. Where: `utils/safetyRules.ts` (`evaluateEndoRedFlag`), called from `app/(tabs)/log.tsx` on save. Every prompt shown is recorded in `red_flag_prompt_logs` and included in the doctor PDF.

**Wording** (alert title is "Please check this out 💛" / "Please review"; body is the same in both voices):

- Severe pain: *"You've had severe pain (8 or higher) three days in a row. That's not something you should have to push through — please contact a healthcare provider."*
- Complex symptoms: *"You've logged bowel symptoms, shoulder pain and heavy flow on the same day. This combination is worth getting checked by a doctor — please don't brush it off."*

### Questions for reviewer

1. Are the thresholds and the 3-day window clinically appropriate?
2. Is bowel + shoulder + heavy flow a reasonable proxy to prompt review (e.g. for possible bowel / diaphragmatic involvement)?
3. Should any combination prompt **urgent** care rather than a routine appointment?

### Sign-off

| Reviewer | Role | Date | Approved (Y/N) | Notes |
|----------|------|------|----------------|-------|
| | | | | |

---

## 3. Absent-period prompts

**In-app alert on Home (PCOS mode, no period in progress).** Repeats at most every 7 days (`checkPCOSPromptCooldown` in `store/index.ts`). Where: `app/(tabs)/index.tsx`.

| Days since last period | Voice | Title | Body |
|------------------------|-------|-------|------|
| 90–119 | chill | it's been a minute 👀 | It's been N days since your last period. All good? Logging symptoms helps us (and your doctor) spot patterns. |
| 90–119 | classic | It's been a while | It has been N days since your last period. Logging symptoms can help identify patterns. |
| ≥ 120 | chill | checking in on you 💛 | It's been N days since your last period. Worth a quick chat with a healthcare provider, just to be safe 🫶 |
| ≥ 120 | classic | Time to check in | It has been N days since your last period. Please consider speaking with a healthcare provider. |

**Scheduled notifications (PCOS mode, counted from when they're scheduled).** Where: `utils/notifications.ts` (`schedulePcosNotifications`; classic text in `CLASSIC_COPY`).

| Day | chill | classic |
|-----|-------|---------|
| 35 (irregular pattern only) | day 35 check-in 💚: 35 days since your last period. Daily logs help us learn your pattern 📊 | Day 35 check-in: It's been 35 days since your last period. Daily logs help identify your pattern. |
| 60 | 60 days — checking in 💚: Still no period after 60 days. Worth bringing up with your doctor if that's unusual for you 🫶 | 60 days without a period: If this is unusual for you, it's worth mentioning to your doctor. |
| 90 | time for a doctor chat 💬: It's been 90 days without a period — please check in with a healthcare provider. Your report in the app can help 💜 | Please see your doctor: It has been 90 days without a period. Please contact a healthcare provider. Your CycleIQ report can help. |

**Any mode: amenorrhoea flag and > 60 days** (`scheduleRedFlagNotification`):
chill "please check in with a doctor 💛 — It's been N days without a period. That's worth a proper check-up — you can share your CycleIQ report 💜" /
classic "Medical check recommended — You haven't had a period for N days. Please see a healthcare provider; your CycleIQ report can help."

### Questions for reviewer

1. The in-app alert only recommends a provider at 120 days, while the notifications do so at 60/90 days. Which threshold is right, and should they be aligned?
2. Should pregnancy be mentioned as a possible cause?
3. Is a weekly repeat of the in-app alert appropriate?

### Sign-off

| Reviewer | Role | Date | Approved (Y/N) | Notes |
|----------|------|------|----------------|-------|
| | | | | |

---

## 4. Health tips in notifications

Around 50 scheduled tips (nutrition, heat, movement, supplements, PCOS lifestyle). Full text in both voices: `utils/notifications.ts` (chill inline, classic in `CLASSIC_COPY`). Claims are hedged ("may help"); supplement tips say to check with a doctor.

### Questions for reviewer

1. Any tip that is inaccurate, overstated or unsafe for some users (e.g. ibuprofen for people who can't take NSAIDs, supplements in pregnancy)?
2. Should ovulation messages state "not for contraception" in both voices (classic already does)?

### Sign-off

| Reviewer | Role | Date | Approved (Y/N) | Notes |
|----------|------|------|----------------|-------|
| | | | | |

---

## Release gate

Set `SAFEGUARDING_CLINICAL_REVIEW_REQUIRED = false` in `constants/safeguarding.ts` **only after** every sign-off row above is completed, and record any requested changes as issues.
