# Clinical Review — Safeguarding & Red-Flag Prompts

**Status:** Pending clinician sign-off  
**Blocker for public release:** Yes  
**Last updated:** June 2026

CycleIQ includes in-app safeguarding and red-flag prompts. These are **signposting only** — not diagnostic tools. A qualified clinician or mental-health professional must review the parameters below before App Store / Play Store submission.

---

## 1. Low-mood safeguarding prompt

| Parameter | Current value | Config location |
|-----------|---------------|-----------------|
| Trigger | `mood_score === 1` for 3 consecutive log days | `constants/safeguarding.ts` |
| Delivery | In-app `Alert` only (no push notification) | `app/(tabs)/log.tsx` |
| Cooldown | 14 days between prompts | `store/index.ts` → `checkSafeguardCooldown` |
| Destination | `/education/resources` (crisis lines, therapy directories) | `constants/safeguarding.ts` |
| Reset | Counter resets when mood > 1 on a log day | `app/(tabs)/log.tsx` |

### Questions for reviewer

1. Is 3 consecutive days at mood=1 an appropriate threshold, or too sensitive / too lax?
2. Should PMS-related low mood in luteal phase be treated differently?
3. Is routing to bundled education resources sufficient, or should a crisis hotline number appear in the alert body?
4. Should teen mode (`isTeen`) use a different threshold or copy?

### Sign-off

| Reviewer | Role | Date | Approved (Y/N) | Notes |
|----------|------|------|----------------|-------|
| | | | | |

---

## 2. Endometriosis red-flag prompts

| Trigger | Condition | Cooldown |
|---------|-----------|----------|
| Severe pain | `pain_score >= 8` for 3 consecutive days | 30 days |
| Complex symptoms | Bowel symptoms + shoulder pain + heavy flow same day | 30 days |

Config: `app/(tabs)/log.tsx`  
Logs: `red_flag_prompt_logs` table (included in exported PDF reports)

### Questions for reviewer

1. Are pain thresholds and consecutive-day counts clinically appropriate for endo?
2. Is the bowel + shoulder + heavy flow combination a valid red-flag proxy?

### Sign-off

| Reviewer | Role | Date | Approved (Y/N) | Notes |
|----------|------|------|----------------|-------|
| | | | | |

---

## 3. PCOS amenorrhea prompts

| Trigger | Message framing |
|---------|-----------------|
| 90 days since last period | Gentle check-in |
| 120 days since last period | Suggest healthcare provider contact |

Config: `app/(tabs)/index.tsx`  
Cooldown: 7 days (`checkPCOSPromptCooldown`)

### Sign-off

| Reviewer | Role | Date | Approved (Y/N) | Notes |
|----------|------|------|----------------|-------|
| | | | | |

---

## Release gate

Set `SAFEGUARDING_CLINICAL_REVIEW_REQUIRED = false` in `constants/safeguarding.ts` **only after** all sign-off rows above are completed.
