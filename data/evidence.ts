/**
 * Evidence library behind every lifestyle suggestion, warning and tip in the app.
 * Summaries and grading rationale: docs/EVIDENCE_REVIEW.md. Clinical sign-off pending
 * (docs/CLINICAL_REVIEW.md §5). Add a source here before citing it anywhere in the UI.
 */

/**
 * How much weight a suggestion can carry:
 * - guideline: an international guideline or consensus statement recommends it
 * - strong:    consistent meta-analyses of randomised trials
 * - moderate:  meta-analyses with benefit but small or heterogeneous trials
 * - limited:   few / low-quality trials, or observational associations only
 */
export type EvidenceGrade = "guideline" | "strong" | "moderate" | "limited";

export interface EvidenceSource {
  /** Short citation shown in the app. */
  citation: string;
  url: string;
}

export const EVIDENCE_SOURCES = {
  who2020: {
    citation: "Bull et al. WHO 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med 2020",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/7719906/",
  },
  pcosGuideline2023: {
    citation: "Teede et al. International evidence-based guideline for PCOS, 2023 (Monash CRE WHiRL, ESHRE, ASRM, Endocrine Society)",
    url: "https://www.westernsydney.edu.au/nicmhri/news/2023-international-pcos-guideline-empowering-doctors-and-patients",
  },
  pcosExercise2024: {
    citation: "Exercise in the management of PCOS: a position statement, 2024",
    url: "https://repository.lsu.edu/clinical_research_pubs/309",
  },
  inositolReview: {
    citation: "Inositol for PCOS: systematic review and meta-analysis informing the 2023 guideline (30 trials, 2,230 women)",
    url: "https://researchers.westernsydney.edu.au/en/publications/inositol-for-polycystic-ovary-syndrome-pcos-guidelines-a-systemat/",
  },
  vitDPcos2018: {
    citation: "Łagowska et al. Vitamin D supplementation and insulin resistance in PCOS: meta-analysis of RCTs. Nutrients 2018",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6266903/",
  },
  vitDPcos2015: {
    citation: "He et al. Vitamin D supplementation in PCOS: meta-analysis (no metabolic benefit found). 2015",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4488802",
  },
  paluchSteps2022: {
    citation: "Paluch et al. Daily steps and all-cause mortality: meta-analysis of 15 cohorts. Lancet Public Health 2022",
    url: "https://discovery.ucl.ac.uk/id/eprint/10170017/1/1-s2.0-S2468266721003029-main.pdf",
  },
  dingSteps2025: {
    citation: "Ding et al. Daily steps and health outcomes: dose-response meta-analysis. Lancet Public Health 2025",
    url: "https://sydney.edu.au/content/corporate/news-opinion/news/2025/07/24/rethink-the-10000-a-day-step-goal-study-suggests.html",
  },
  cochraneExerciseDysmenorrhoea: {
    citation: "Armour et al. Exercise for dysmenorrhoea. Cochrane Database Syst Rev 2019 (12 trials, 854 women)",
    url: "https://www.cochrane.org/CD004142",
  },
  vitDDysmenorrhoea: {
    citation: "Vitamin D supplementation for dysmenorrhoea: meta-analysis with trial sequential analysis. Nutrients 2024",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11013696/",
  },
  omega3Dysmenorrhoea: {
    citation: "Mohammadi et al. Omega-3 fatty acids and primary dysmenorrhoea: systematic review and meta-analysis of RCTs",
    url: "https://pubmed.ncbi.nlm.nih.gov/35059756/",
  },
  gingerDysmenorrhoea: {
    citation: "Negi et al. Ginger for primary dysmenorrhea: systematic review and meta-analysis. Cureus 2021",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8021506/",
  },
  calciumPms: {
    citation: "Thys-Jacobs et al. Calcium carbonate and the premenstrual syndrome: multicentre RCT (n = 466). Am J Obstet Gynecol 1998",
    url: "https://oadoi.org/10.1016/s0002-9378(98)70377-1",
  },
  b6Pms: {
    citation: "Wyatt et al. Vitamin B6 in premenstrual syndrome: systematic review. BMJ 1999",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC27878",
  },
  eshreEndo2022: {
    citation: "Becker et al. ESHRE guideline: endometriosis. Hum Reprod Open 2022",
    url: "https://pubmed.ncbi.nlm.nih.gov/35350465/",
  },
  redMeatEndo: {
    citation: "Yamamoto et al. Red meat, poultry and fish intake and endometriosis risk, Nurses' Health Study II (81,908 women). Am J Obstet Gynecol 2018",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6066416/",
  },
  endoNutritionScoping: {
    citation: "Nutrition interventions in the treatment of endometriosis: a scoping review",
    url: "https://digital.library.adelaide.edu.au/items/0217835e-e03e-46af-8f37-e6ac88a31846",
  },
  endoExercise2024: {
    citation: "Physical activity and exercise in women with endometriosis: systematic review and meta-analysis (6 RCTs). 2024",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11824993/",
  },
  ironHmbAustralia: {
    citation: "Monash University. Iron insufficiency among young Australian women (ferritin < 30 µg/L in 34.8%)",
    url: "https://www.monash.edu/medicine/sphpm/womenshealth/research/findings/iron-insufficiency-among-young-australian-women",
  },
  ironHmbFatigue: {
    citation: "Prevalence and impacts of heavy menstrual bleeding on anaemia, fatigue and quality of life. 2019",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6500811/",
  },
  odsIron: {
    citation: "NIH Office of Dietary Supplements. Iron fact sheet for health professionals",
    url: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/",
  },
  namsNonhormone2023: {
    citation: "The 2023 nonhormone therapy position statement of The North American Menopause Society. Menopause 2023",
    url: "https://menopause.org/wp-content/uploads/press-release/nonhormone-therapy-position-statement-release.pdf",
  },
  namsOsteoporosis2021: {
    citation: "Management of osteoporosis in postmenopausal women: 2021 position statement of NAMS. Menopause 2021",
    url: "https://www.medicinesresources.nhs.uk/management-of-osteoporosis-in-postmenopausal-women-the-2021-position-statement-of-the-north-american-menopause-society.html",
  },
  sleepAdults: {
    citation: "Watson et al. Recommended amount of sleep for a healthy adult: AASM / SRS consensus. Sleep 2015",
    url: "https://sleepreviewmag.com/sleep-health/prevailing-attitudes/aasm-srs-adults-7-hours-sleep-per-night-necessity/",
  },
  sleepTeens: {
    citation: "Paruthi et al. Recommended amount of sleep for paediatric populations: AASM consensus. J Clin Sleep Med 2016",
    url: "https://aasm.org/resources/pdf/pressroom/teen-sleep-duration-recommendation.pdf",
  },
  sleepInsulin: {
    citation: "Sleep disturbances and insulin resistance (review). Diabet Med 2011",
    url: "https://pubmed.ncbi.nlm.nih.gov/21950773/",
  },
  // ── food ──
  whoHealthyDiet: {
    citation: "WHO. Healthy diet fact sheet (≥ 400 g fruit & vegetables a day; free sugars < 10% of energy; limit trans fats)",
    url: "https://www.who.int/publications/m/item/healthy-diet-factsheet394",
  },
  reynoldsFibre: {
    citation: "Reynolds et al. Carbohydrate quality and human health: systematic reviews and meta-analyses (185 cohorts, 58 trials). Lancet 2019",
    url: "https://doi.org/10.1016/S0140-6736(18)31809-9",
  },
  pcosCarbQuality: {
    citation: "Optimizing carbohydrate quality for women with PCOS: low-GI and high-fibre diets and insulin resistance (review of RCTs)",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12213572/",
  },
  wcrfRedMeat: {
    citation: "World Cancer Research Fund. Limit red and processed meat (≤ ~3 portions / 350–500 g cooked a week; little if any processed)",
    url: "https://www.wcrf.org/dietandcancer/limit-red-and-processed-meat/",
  },
  nhsFish: {
    citation: "NHS. Fish and shellfish: at least 2 portions a week, 1 of them oily",
    url: "https://www.nhs.uk/live-well/eat-well/food-types/fish-and-shellfish-nutrition/",
  },
  missmerFatEndo: {
    citation: "Missmer et al. Dietary fat and endometriosis risk, Nurses' Health Study II (70,709 women): omega-3 −22%, trans fat +48%. Hum Reprod 2010",
    url: "https://www.sciencedaily.com/releases/2010/03/100323212146.htm",
  },
  harrisFruitEndo: {
    citation: "Harris et al. Fruit and vegetable consumption and endometriosis risk (70,835 women): citrus −22%. Hum Reprod 2018",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6018917/",
  },
  alcoholEndo: {
    citation: "Li Piani et al. Alcohol consumption and endometriosis risk: systematic review and meta-analysis. Sci Rep 2022",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9645754/",
  },
  alcoholPms: {
    citation: "Fernández et al. Premenstrual syndrome and alcohol consumption: systematic review and meta-analysis (19 studies). BMJ Open 2018",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5905748",
  },
  calciumFoodPms: {
    citation: "Bertone-Johnson et al. Calcium and vitamin D intake from food and risk of PMS, Nurses' Health Study II. Arch Intern Med 2005",
    url: "https://jamanetwork.com/journals/jamainternalmedicine/article-abstract/486599",
  },
  efsaCaffeine: {
    citation: "EFSA. Scientific opinion on the safety of caffeine (up to 400 mg/day safe for healthy adults; 200 mg in pregnancy). 2015",
    url: "https://www.efsa.europa.eu/sites/default/files/corporate_publications/files/efsaexplainscaffeine150527.pdf",
  },
  hseHotFlushes: {
    citation: "HSE (Ireland). Hot flushes: spicy food, caffeine and alcohol can trigger them",
    url: "https://www2.hse.ie/conditions/hot-flushes",
  },
  // ── supplements ──
  uspstfFolicAcid2023: {
    citation: "US Preventive Services Task Force. Folic acid to prevent neural tube defects: 0.4–0.8 mg daily for anyone who plans to or could become pregnant (grade A). JAMA 2023",
    url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/folic-acid-for-the-prevention-of-neural-tube-defects-preventive-medication",
  },
  stoffelIron2017: {
    citation: "Stoffel et al. Iron absorption from oral iron supplements given on consecutive versus alternate days: two open-label randomised trials in iron-depleted women. Lancet Haematol 2017",
    url: "https://doi.org/10.1016/S2352-3026(17)30182-5",
  },
  whoIronMenstruating2011: {
    citation: "WHO. Guideline: intermittent iron and folic acid supplementation in menstruating women. 2011",
    url: "https://www.who.int/publications/i/item/9789241502023",
  },
  nhsVitaminD: {
    citation: "NHS. Vitamin D: 10 µg (400 IU) a day from October to early March, all year for dark skin, covered skin or little time outdoors; adult upper limit 100 µg",
    url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/",
  },
  acogPmd2023: {
    citation: "ACOG Clinical Practice Guideline No. 7. Management of premenstrual disorders (calcium 1,000–1,200 mg/day: conditional, low-quality evidence). Obstet Gynecol 2023",
    url: "https://doi.org/10.1097/AOG.0000000000005426",
  },
  tgaB6: {
    citation: "Therapeutic Goods Administration (Australia). Health supplements containing vitamin B6 can cause peripheral neuropathy, including at doses under 50 mg",
    url: "https://www.tga.gov.au/news/safety-alerts/health-supplements-containing-vitamin-b6-can-cause-peripheral-neuropathy",
  },
  zincDysmenorrhoea2024: {
    citation: "Hsu et al. Zinc supplementation for primary dysmenorrhoea: systematic review and meta-analysis (6 RCTs, 739 women; high heterogeneity). Nutrients 2024",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11643716/",
  },
  odsZinc: {
    citation: "NIH Office of Dietary Supplements. Zinc fact sheet (adult upper limit 40 mg/day; excess causes copper deficiency)",
    url: "https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/",
  },
  odsB12: {
    citation: "NIH Office of Dietary Supplements. Vitamin B12 fact sheet (plant foods contain none unless fortified)",
    url: "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/",
  },
  cochraneSupplementsDysmenorrhoea: {
    citation: "Pattanittum et al. Dietary supplements for dysmenorrhoea. Cochrane Database Syst Rev 2016 (no high-quality evidence for any supplement)",
    url: "https://www.cochrane.org/CD002124",
  },
  vitexPms: {
    citation: "Verkaik et al. Vitex agnus castus for premenstrual syndrome: systematic review and meta-analysis (high risk of bias; exploratory). Am J Obstet Gynecol 2017",
    url: "https://repub.eur.nl/pub/99226",
  },
  nacPcos: {
    citation: "Thakker et al. N-acetylcysteine for PCOS: systematic review and meta-analysis of RCTs (8 trials, 910 women). Obstet Gynecol Int 2015",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4306416/",
  },
  curcuminReview2025: {
    citation: "Curcumin for premenstrual syndrome and dysmenorrhoea: systematic review of 10 RCTs (too heterogeneous to pool). 2025",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12639325/",
  },
} satisfies Record<string, EvidenceSource>;

export type EvidenceSourceId = keyof typeof EVIDENCE_SOURCES;

/** Targets used by the guidance rules, each tied to its source. */
export const ACTIVITY_TARGETS = {
  /** WHO 2020 / PCOS guideline 2023: adults, moderate-intensity minutes per week. */
  adultWeeklyMinutes: 150,
  /** PCOS position statement: extra health benefit. */
  pcosExtraBenefitWeeklyMinutes: 250,
  /** WHO 2020: adolescents, average minutes per day. */
  teenDailyMinutes: 60,
  /** WHO 2020: muscle-strengthening days per week (adults). */
  strengthDaysPerWeek: 2,
  /** Ding 2025: most benefit reached around 7,000 steps/day. */
  dailySteps: 7000,
} as const;

export const SLEEP_TARGETS = { adultHours: 7, teenHours: 8 } as const;

/** Food targets, each tied to its source. Day counts are per 7 logged days. */
export const FOOD_TARGETS = {
  /** WHO: ≥ 400 g ≈ 5 portions of fruit and vegetables a day. */
  fruitVegPortions: 5,
  /** WCRF: about 3 portions of red meat a week at most. */
  redMeatDaysPerWeek: 3,
  /** WCRF: little if any processed meat. */
  processedMeatDaysPerWeek: 1,
  /** EFSA: 400 mg ≈ 4 cups of coffee a day. */
  caffeineDrinks: 4,
  /** Fried / fast food or sugary drinks on this many days a week triggers a suggestion. */
  frequentDaysPerWeek: 3,
  /** Wholegrains / calcium / iron foods: suggest when eaten on fewer than half of logged days. */
  dailyFoodShare: 0.5,
} as const;

/** Monash survey: > 2 heavy days per period was associated with low ferritin. */
export const HEAVY_DAYS_FOR_IRON_CHECK = 3;
