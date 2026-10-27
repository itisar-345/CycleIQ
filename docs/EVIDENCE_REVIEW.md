# Evidence Review — Food, Nutrients, Exercise and Steps

**Status:** Pending clinician sign-off (see [CLINICAL_REVIEW.md §5](CLINICAL_REVIEW.md))
**Last updated:** October 2026

This is the research behind CycleIQ's lifestyle suggestions, warnings and tips. It covers what helps with regular cycles, PCOS / PCOD, endometriosis, period pain, PMS and perimenopause, which nutrient deficiencies matter, and how much activity is worth aiming for. Each source is in [`data/evidence.ts`](../data/evidence.ts), and the rules that use them are in [`utils/lifestyleGuidance.ts`](../utils/lifestyleGuidance.ts).

It is a structured review of guidelines and meta-analyses, not a systematic review. Guidelines and pooled trials were preferred over single studies, and the app says so whenever evidence is weak.

## Evidence grades used in the app

| Grade | Meaning | App wording |
|---|---|---|
| Guideline | An international guideline or consensus statement recommends it | "Guideline recommendation" |
| Strong | Consistent meta-analyses of randomised trials | "Strong evidence" |
| Moderate | Meta-analyses show benefit, but trials are small or heterogeneous | "Moderate evidence" |
| Limited | Few or low-quality trials, or observational links only | "Limited evidence" |

---

## 1. Exercise and daily steps

| Question | Finding | Grade | Source |
|---|---|---|---|
| How much activity, adults? | **150–300 min/week** moderate (or 75–150 vigorous), plus muscle-strengthening on **2+ days/week** | Guideline | [WHO 2020](https://pmc.ncbi.nlm.nih.gov/articles/7719906/) |
| How much, teenagers? | An average of **60 min/day** of moderate-to-vigorous activity | Guideline | [WHO 2020](https://pmc.ncbi.nlm.nih.gov/articles/7719906/) |
| PCOS | Same baseline: 150–300 min moderate or 75–150 vigorous, plus 2 non-consecutive strength days. **250 min moderate / 150 vigorous** for added benefit. Benefits apply regardless of weight change | Guideline | [PCOS guideline 2023](https://www.westernsydney.edu.au/nicmhri/news/2023-international-pcos-guideline-empowering-doctors-and-patients); [PCOS exercise position statement 2024](https://repository.lsu.edu/clinical_research_pubs/309) |
| Daily steps | Mortality risk falls up to **6,000–8,000 steps/day (60+)** and **8,000–10,000 (under 60)**, then levels off | Moderate | [Paluch, Lancet Public Health 2022](https://discovery.ucl.ac.uk/id/eprint/10170017/1/1-s2.0-S2468266721003029-main.pdf) |
| Daily steps (newest) | **7,000 vs 2,000 steps/day**: 47% lower all-cause mortality, 38% less dementia, 22% fewer depressive symptoms. Most benefit is reached by ~7,000; 10,000 isn't necessary | Moderate (GRADE moderate for most outcomes) | [Ding, Lancet Public Health 2025](https://sydney.edu.au/content/corporate/news-opinion/news/2025/07/24/rethink-the-10000-a-day-step-goal-study-suggests.html) |
| Period pain | Exercise reduces menstrual pain intensity (12 trials, 854 women). Benefit is unclear after stopping and beyond age 25 | Moderate (low-quality trials) | [Cochrane, Armour 2019](https://www.cochrane.org/CD004142) |
| Endometriosis | 6 RCTs (251 women) suggest better quality of life and possibly less pain; trials are small and pain outcomes inconsistent | Limited | [Meta-analysis 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11824993/) |
| Hot flushes | Exercise is **not recommended** as a hot-flush treatment (it didn't reliably help), though it stays important for bone and heart health | Guideline | [Menopause Society 2023](https://menopause.org/wp-content/uploads/press-release/nonhormone-therapy-position-statement-release.pdf) |

**Used in the app:** a weekly 150-minute target (60 a day for teens), a 250-minute next step for PCOS, strength twice a week, a 7,000-step daily target, and exercise as a period-pain strategy.

## 2. Nutrient deficiencies

| Nutrient | Finding | Grade | Source |
|---|---|---|---|
| **Iron** | Heavy periods are a leading cause of low iron. In young Australian women, **34.8%** had ferritin < 30 µg/L, and low ferritin was linked to **more than 2 heavy days** per period. Among women with heavy bleeding, 43–72% were iron deficient, depending on the ferritin cut-off. Low iron causes fatigue | Moderate | [Monash survey](https://www.monash.edu/medicine/sphpm/womenshealth/research/findings/iron-insufficiency-among-young-australian-women); [HMB, anaemia & fatigue](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6500811/) |
| Iron absorption | Heme iron (meat, fish) is absorbed at 15–35%, plant iron at 2–20%. **Vitamin C** improves plant-iron absorption; **tea, coffee, calcium and phytates** reduce it. Reference intake: 18 mg/day for ages 19–50 (15 mg for 14–18, 8 mg for 51+) | Guideline (reference values) | [NIH ODS iron fact sheet](https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/) |
| **Vitamin D** (PCOS) | Deficiency is common in PCOS and linked to worse glucose control. Supplementation trials are **mixed**: one meta-analysis found better insulin resistance, another found no benefit | Limited | [Łagowska 2018](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6266903/); [He 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4488802) |
| **Vitamin D** (period pain) | Two meta-analyses (8 and 11 RCTs) show less pain in **primary** dysmenorrhoea, but not secondary (e.g. endometriosis). Heterogeneity is high | Moderate | [Meta-analysis 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11013696/); [2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10343446/) |
| **Omega-3** | Meta-analyses show less period pain and less painkiller use; trial quality is mixed | Moderate | [Mohammadi](https://pubmed.ncbi.nlm.nih.gov/35059756/) |
| **Calcium** (PMS) | 1,200 mg/day reduced PMS symptoms by 48% vs 30% on placebo (n = 466). The placebo response was large and later trials are mixed | Moderate | [Thys-Jacobs 1998](https://oadoi.org/10.1016/s0002-9378(98)70377-1) |
| **Calcium & vitamin D** (around menopause) | About **1,200 mg calcium** and **800–1,000 IU vitamin D** daily, plus exercise, to protect bone | Guideline | [Menopause Society 2021](https://www.medicinesresources.nhs.uk/management-of-osteoporosis-in-postmenopausal-women-the-2021-position-statement-of-the-north-american-menopause-society.html) |
| **Vitamin B6** (PMS) | Possible benefit (OR 2.32), but most trials are low quality | Limited | [Wyatt, BMJ 1999](https://pmc.ncbi.nlm.nih.gov/articles/PMC27878) |
| **Magnesium** (PMS / cramps) | Insufficient evidence | Limited | [B6 / Mg reviews](https://www.ncbi.nlm.nih.gov/books/NBK72353/) |

**Used in the app:** an iron-check warning when heavy flow and tiredness occur together, iron-food guidance after heavy periods, vitamin D and omega-3 mentioned (with "ask first") for painful periods, calcium foods for premenstrual low mood, and calcium + vitamin D for bone in perimenopause. Supplement tips and doses are covered in §6. Teens get no supplement content.

## 3. Foods and diets

| Condition | Finding | Grade | Source |
|---|---|---|---|
| **PCOS** | **No specific diet** has been shown to beat others. Healthy eating plus activity is recommended. Low-GI, high-fibre eating has modest support for insulin resistance. Where weight loss is appropriate, 5–10% improves outcomes | Guideline / limited | [PCOS guideline 2023](https://www.westernsydney.edu.au/nicmhri/news/2023-international-pcos-guideline-empowering-doctors-and-patients); [BDA](https://bda.uk.com/foodfacts/polycystic_ovary_syndrome_pcos) |
| PCOS: inositol | **Limited and inconclusive** (30 trials, 2,230 women). Fewer GI side effects than metformin, but metformin does better on some outcomes | Limited | [Inositol review for the 2023 guideline](https://researchers.westernsydney.edu.au/en/publications/inositol-for-polycystic-ovary-syndrome-pcos-guidelines-a-systemat/) |
| **Endometriosis** | ESHRE could make **no firm diet recommendation**. In Nurses' Health Study II (81,908 women), **more than 2 servings of red meat a day** carried **56% higher risk** than ≤ 1 serving/week. Replacing it with fish, eggs or shellfish was linked to lower risk. This is about risk of developing endometriosis, not symptom relief | Limited (observational) | [ESHRE 2022](https://pubmed.ncbi.nlm.nih.gov/35350465/); [Yamamoto 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6066416/) |
| Endometriosis: gut symptoms | A **low-FODMAP** diet improved GI symptoms and quality of life in small studies (poor quality) | Limited | [Scoping review](https://digital.library.adelaide.edu.au/items/0217835e-e03e-46af-8f37-e6ac88a31846) |
| **Period pain: ginger** | As effective as NSAIDs in 2 small trials each in two meta-analyses; quality is poor | Limited | [Negi 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8021506/); [2016](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4871956/) |
| **Hot flushes** | Soy foods and extracts, equol and herbal supplements are **not recommended**. Effective options: hormone therapy (most effective), CBT, clinical hypnosis, SSRIs/SNRIs, gabapentin, fezolinetant | Guideline | [Menopause Society 2023](https://menopause.org/wp-content/uploads/press-release/nonhormone-therapy-position-statement-release.pdf) |

## 4. Sleep

| Finding | Grade | Source |
|---|---|---|
| Adults need **7+ hours** a night | Guideline (consensus) | [AASM / SRS, Watson 2015](https://sleepreviewmag.com/sleep-health/prevailing-attitudes/aasm-srs-adults-7-hours-sleep-per-night-necessity/) |
| Teenagers (13–18) need **8–10 hours** | Guideline (consensus) | [AASM, Paruthi 2016](https://aasm.org/resources/pdf/pressroom/teen-sleep-duration-recommendation.pdf) |
| Short or poor sleep and sleep apnoea contribute to **insulin resistance**, which is relevant to PCOS; PCOS guidance includes screening for sleep apnoea | Moderate | [Diabet Med 2011](https://pubmed.ncbi.nlm.nih.gov/21950773/); [OSA & PCOS review](https://research.aston.ac.uk/en/publications/obstructive-sleep-apnoea-and-polycystic-ovary-syndrome-a-comprehe) |

## 5. Food and drink: targets and links to cycle conditions

These drive the personal food suggestions, which use the optional **Food & drink** card in the Daily Log (adults only).

| Food / drink | Target or finding | Grade | Source |
|---|---|---|---|
| **Fruit & vegetables** | **≥ 400 g (about 5 portions) a day**, not counting potatoes | Guideline | [WHO healthy diet](https://www.who.int/publications/m/item/healthy-diet-factsheet394) |
| Fruit & endometriosis | Higher fruit intake, especially **citrus (−22%)**, was linked to lower endometriosis risk (70,835 women); total vegetables showed no link | Limited (observational) | [Harris 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6018917/) |
| **Fibre, wholegrains, pulses** | Highest vs lowest fibre intake: **15–30% lower** all-cause and cardiovascular mortality, coronary disease, stroke, type 2 diabetes and colorectal cancer (185 cohorts, 58 trials; fibre evidence moderate) | Moderate | [Reynolds, Lancet 2019](https://doi.org/10.1016/S0140-6736(18)31809-9) |
| Fibre / low-GI & PCOS | High-fibre and low-GI diets reduced fasting glucose and insulin resistance in RCTs. An earlier 10-RCT meta-analysis found no clear winner beyond energy balance | Moderate | [Carbohydrate quality in PCOS](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12213572/) |
| **Calcium foods** & PMS | ~1,200 mg calcium + vitamin D from food (about **4 servings a day** of low-fat dairy or fortified foods): **~40% lower PMS risk** (nested case-control in NHS II). The authors call it preliminary | Moderate | [Bertone-Johnson 2005](https://jamanetwork.com/journals/jamainternalmedicine/article-abstract/486599) |
| **Oily fish / omega-3** | **2 fish portions a week, 1 oily**. In endometriosis, the highest omega-3 intake was linked to **−22%** risk; omega-3 trials show less period pain | Guideline / limited | [NHS fish](https://www.nhs.uk/live-well/eat-well/food-types/fish-and-shellfish-nutrition/); [Missmer 2010](https://www.sciencedaily.com/releases/2010/03/100323212146.htm) |
| **Trans fats** (fried / fast food) | WHO: limit trans fats. Endometriosis: highest trans-fat intake **+48%** risk (sources: fast-food fries, margarine, crackers); saturated fat showed no link | Guideline / limited | [WHO](https://www.who.int/publications/m/item/healthy-diet-factsheet394); [Missmer 2010](https://www.sciencedaily.com/releases/2010/03/100323212146.htm) |
| **Red & processed meat** | **≤ ~3 portions (350–500 g cooked) of red meat a week**, little if any processed meat. Endometriosis: > 2 servings a day **+56%** risk vs ≤ 1 a week | Guideline / limited | [WCRF](https://www.wcrf.org/dietandcancer/limit-red-and-processed-meat/); [Yamamoto 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6066416/) |
| **Sugary drinks** | Free sugars **< 10% of energy (~12 teaspoons a day)**, ideally < 5%. PCOS: observational links only | Guideline | [WHO](https://www.who.int/publications/m/item/healthy-diet-factsheet394) |
| **Caffeine** | Up to **400 mg a day (~4 coffees)** is safe for healthy adults; **200 mg in pregnancy**. Endometriosis: no clear link (8-study meta-analysis); hot flushes: a commonly reported trigger | Guideline | [EFSA 2015](https://www.efsa.europa.eu/sites/default/files/corporate_publications/files/efsaexplainscaffeine150527.pdf); [HSE](https://www2.hse.ie/conditions/hot-flushes) |
| **Alcohol** | PMS: any drinking **OR 1.45**, heavy drinking **OR 1.79** (19 studies, 47,000+ women; reverse causation possible). Endometriosis: moderate intake OR 1.22. Hot flushes: a commonly reported trigger | Limited (observational) | [Fernández, BMJ Open 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5905748); [Li Piani 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9645754/); [HSE](https://www2.hse.ie/conditions/hot-flushes) |
| **Iron-rich foods** | See §2. Food first, with vitamin C; tea and coffee away from meals | Guideline | [NIH ODS](https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/) |

**What the food log records** (all optional): fruit and vegetable portions (0–5+); whether you had wholegrains or pulses, iron-rich food, calcium-rich food, oily fish, red meat, processed meat, fried or fast food, or sugary drinks; caffeinated drinks (0–5+); and alcoholic drinks (0–3+). It is stored in the day's `extended_symptoms` JSON. Nothing is saved unless at least one food question is answered. On a day with any food answer, an unticked food counts as "not eaten that day". There are no calories, portion sizes or weights.

---

## How the app uses this

### Suggestions and warnings (Insights tab → "Suggestions for you")

Built from the last 1–11 weeks of logs. Each card shows its grade and tappable sources.

| Id | When it shows | Kind |
|---|---|---|
| `iron-check` | **3+ heavy-flow days** in 45 days **and** 3+ very tired days (fatigue ≥ 7 or energy ≤ 3) in 14 days. Suggests asking about a ferritin test | Warning |
| `iron-foods` | 3+ heavy-flow days, no tiredness. Covers iron foods and absorption, and suggests mentioning heavy periods to a doctor | Suggestion |
| `activity-below` / `activity-met` | Weekly active minutes vs 150 (4+ logged days out of 7). PCOS: next step 250 | Suggestion / Positive |
| `activity-teen` | Teens averaging < 60 min/day | Suggestion |
| `strength` | 4+ active days in 14, none of them strength. Not shown to teens | Suggestion |
| `steps-below` / `steps-met` | Average steps vs 7,000 (4+ logged days out of 7) | Suggestion / Positive |
| `sleep-short` | Average sleep < 7 h (teens < 8 h), 4+ logged nights. PCOS adds the insulin link | Suggestion |
| `pain-period` / `pain-endo` | Pain ≥ 6 on 2+ bleeding days in 45 days | Suggestion |
| `pms-mood` | Mood ≤ 2 of 5 on 3+ days within the 7 days before a logged period | Suggestion |
| `pcos-food`, `pcos-supplements` | PCOS mode (supplements: not teens) | Learn |
| `endo-food`; `endo-gut` | Endometriosis mode; gut tips when bowel symptoms were logged in 30 days | Learn; Suggestion |
| `peri-hot-flashes`; `peri-bone` | 3+ hot-flush / night-sweat days in 14; always in perimenopause mode | Suggestion; Learn |
| `food-fruit-veg` / `food-fruit-veg-met` | Average fruit & veg portions vs 5 (4+ food-logged days in 7). Endometriosis adds the citrus link | Suggestion / Positive |
| `food-fibre` | Wholegrains or pulses on fewer than half of food-logged days. PCOS adds insulin resistance | Suggestion |
| `food-calcium` | Calcium-rich food on fewer than half of days, **only** with the premenstrual low-mood pattern or in perimenopause | Suggestion |
| `food-oily-fish` | No oily fish across 7+ food-logged days in 14 | Suggestion |
| `food-red-meat` | Red meat on 4+ days, or processed meat on 2+ days, in a week. Endometriosis: graded limited | Suggestion |
| `food-fried`; `food-sugary-drinks` | On 3+ days in a week. Endometriosis adds trans fats; PCOS adds blood sugar | Suggestion |
| `food-caffeine` | Average > 4 caffeinated drinks a day. Perimenopause adds the hot-flush trigger | Suggestion |
| `food-alcohol` | Alcohol on 3+ days in a week (PMS link; endometriosis / perimenopause additions) | Suggestion |
| `food-flush-triggers` | Perimenopause: on at least half of 3+ hot-flush days, alcohol or 3+ caffeinated drinks were also logged | Suggestion |
| Iron cross-link | `iron-check` / `iron-foods` add how often iron-rich food was logged, when that's under half the days | (in the iron item) |

### Safety rules

- **Signposting, not diagnosis.** Warnings suggest talking to a healthcare provider.
- **Unlogged days are not zeros.** Activity, step and sleep rules need 4 logged days out of 7.
- **No activity nudges** during a flare or when pain ≥ 7 was logged in the last 3 days.
- **No weight-loss messaging**, and no supplement content for teens. Supplement doses appear only where a guideline or regulator states one (§6).
- **No calorie, portion-size or weight tracking.** Food tips are about adding or swapping foods, and the food card is not shown to teens.
- Only a warning or a personal suggestion can become a notification (one at a time, next morning, `lifestyle-tip`). A warning always wins; otherwise suggestions **rotate daily**, so food, sleep and activity tips each get a turn. General education never does. Discreet notifications hide the wording as usual. The setting is under You → Notifications.

### Tip notifications corrected to match the evidence

| Id | Before | After |
|---|---|---|
| `pd1-pm` | Epsom salts help muscles relax | Heat is one of the best-supported ways to ease cramps (there's no good evidence for Epsom salts) |
| `pd2-pm` | Magnesium snacks "may help cramps — science-approved" | Ginger: small trials found it comparable to common painkillers (magnesium evidence is insufficient) |
| `anti-inflam-food` | Salmon, berries, greens "may calm inflammation" | Omega-3 foods; trials link omega-3 to less period pain |
| `endo-pre3` | Turmeric, ginger etc. may help | No diet is proven for endometriosis; omega-3s and vegetables are a reasonable choice |
| `pcos-supplement-am` | "Inositol has the most research for PCOS" | The 2023 guideline found the evidence limited and inconclusive |
| `pcos-supplement-d14` | Spearmint "may lower androgens" | A few very small studies only; not well established |
| `pcos-hair-d10` | Rosemary oil scalp massage | Scalp massage; evidence is limited |

## 6. Supplements

Rules live in [`utils/supplementGuidance.ts`](../utils/supplementGuidance.ts). **Adults only.** A dose is named only where a guideline or regulator names one (folic acid, vitamin D, calcium, zinc's upper limit). Iron is never suggested without a blood test. Food first wherever food can cover it.

| Supplement | Finding | Grade | Source |
|---|---|---|---|
| **Folic acid** | **400–800 µg daily** for anyone who plans to or could become pregnant, from at least a month before conception (grade A, reaffirmed 2023) | Guideline | [USPSTF 2023](https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/folic-acid-for-the-prevention-of-neural-tube-defects-preventive-medication) |
| **Iron** | Only when tests show low iron. 60 mg on **alternate days** was absorbed better than daily (21.8% vs 16.3%, two small RCTs; hepcidin). WHO recommends intermittent iron + folic acid for menstruating women where anaemia is ≥ 20% | Moderate / guideline (population) | [Stoffel 2017](https://doi.org/10.1016/S2352-3026(17)30182-5); [WHO 2011](https://www.who.int/publications/i/item/9789241502023); [NIH ODS](https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/) |
| **Vitamin D** | **10 µg (400 IU)** daily October–March, all year with dark skin, covered skin or little time outdoors; adult upper limit 100 µg | Guideline | [NHS](https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/) |
| **Calcium** (PMS) | **1,000–1,200 mg/day**: ACOG conditional recommendation, low-quality evidence. Taken daily; benefit by cycle 3 in the main trial | Moderate | [ACOG 2023](https://doi.org/10.1097/AOG.0000000000005426); [Thys-Jacobs 1998](https://oadoi.org/10.1016/s0002-9378(98)70377-1) |
| **Zinc** (period pain) | 6 RCTs, 739 women: less pain (g = −1.54) but I² = 94%, publication bias likely; benefit after ≥ 2 months; ~7 mg may suffice. Adult upper limit 40 mg (copper deficiency) | Limited | [Hsu 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11643716/); [NIH ODS](https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/) |
| **Vitamin B6** | Possible PMS benefit, poor trials. TGA: peripheral neuropathy **below 50 mg/day**, no safe minimum identified; often hidden in magnesium products | Limited + safety | [TGA](https://www.tga.gov.au/news/safety-alerts/health-supplements-containing-vitamin-b6-can-cause-peripheral-neuropathy) |
| **Magnesium, B1, ginger, fish oil** | Cochrane: no high-quality evidence for any supplement for period pain; very limited evidence for B1, ginger, zinc, fish oil | Limited | [Cochrane 2016](https://www.cochrane.org/CD002124) |
| **Vitamin B12** | Plant foods contain none unless fortified; vegans need fortified foods or a supplement | Guideline | [NIH ODS](https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/) |
| **Chasteberry (vitex)** | Large pooled PMS effect, but high risk of bias and heterogeneity; authors call it exploratory. Hormonal: avoid with contraception, fertility treatment, pregnancy | Limited | [Verkaik 2017](https://repub.eur.nl/pub/99226) |
| **Turmeric (curcumin)** | 10 small RCTs, too heterogeneous to pool; 6 positive | Limited | [Review 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12639325/) |
| **NAC** (PCOS) | Better ovulation / pregnancy vs placebo, worse than metformin (8 RCTs, 910 women) | Limited | [Thakker 2015](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4306416/) |

### Supplement notifications

One notification per applicable tip, at its offset from the predicted period start; a passed slot moves to the next cycle. Setting: You → Notifications → Supplement suggestions.

| Id | When it applies | When it's sent |
|---|---|---|
| `supp-folic-acid` | All adults except perimenopause mode | Period day 7, 09:00 |
| `supp-iron` | 3+ heavy days in 45 | Period day 2, 12:00 |
| `supp-period-pain` | Pain ≥ 6 on 2+ bleeding days in 45; not endometriosis mode (vitamin D didn't help secondary dysmenorrhoea) | 5 days before, 18:00 |
| `supp-calcium-pms` | Premenstrual low-mood pattern | 10 days before, 18:00 |
| `supp-vitamin-d` | October–March (April–September for southern-hemisphere time zones); not perimenopause | Period day 14, 09:00 |
| `supp-peri-bone` | Perimenopause mode | Period day 7, 09:00 |

The A–Z guide on Insights (`guide-*`) is education only and never notified.

## Gaps and caveats

- Most nutrition evidence comes from small trials or observational cohorts. Large, well-designed trials are missing for almost every food or supplement claim here.
- Step-count studies measure mortality and chronic disease in general populations, not menstrual outcomes.
- The NIH ODS iron page blocked automated access, so its absorption figures come from pages quoting it, and the reference intakes (18 / 15 / 8 mg) are the standard published values, not re-read here. Re-check both during clinical review. The same applies to the parts of the 2023 PCOS guideline that were only available through summaries.
- The thresholds (3 heavy days, 3 tired days, pain ≥ 6, 7 days before a period) are reasonable proxies, not validated screening tools. They need clinician review.
