export interface Article {
  id: string;
  title: string;
  content: string;
  category: "cycle basics" | "pcos" | "endometriosis" | "pain management" | "mental health" | "perimenopause" | "teen";
  tags: string[];
  lastReviewed: string; // ISO date
  evidenceGrade: "RCT-supported" | "limited evidence" | "anecdotal" | "clinical consensus";
}

export const OFFLINE_ARTICLES: Article[] = [
  {
    id: "a1",
    title: "Understanding Your Menstrual Cycle",
    category: "cycle basics",
    tags: ["basics", "phases", "hormones"],
    lastReviewed: "2024-01-15T00:00:00Z",
    evidenceGrade: "clinical consensus",
    content: "Your cycle is divided into four main phases: Menstrual, Follicular, Ovulatory, and Luteal. Hormones like estrogen and progesterone drive physical and emotional changes. Tracking these phases helps you predict energy levels and mood shifts."
  },
  {
    id: "a2",
    title: "Heat Therapy for Cramps",
    category: "pain management",
    tags: ["cramps", "heat", "relief", "endo"],
    lastReviewed: "2024-02-10T00:00:00Z",
    evidenceGrade: "RCT-supported",
    content: "Applying localized heat (like a heating pad or hot water bottle) at 40°C (104°F) increases blood flow and relaxes uterine muscles. Clinical trials show it can be as effective as ibuprofen for primary dysmenorrhea."
  },
  {
    id: "a3",
    title: "Understanding PCOS and Insulin",
    category: "pcos",
    tags: ["pcos", "insulin", "metabolism"],
    lastReviewed: "2024-03-01T00:00:00Z",
    evidenceGrade: "clinical consensus",
    content: "Polycystic Ovary Syndrome (PCOS) is deeply linked to insulin resistance. Managing blood sugar through balanced meals heavily improves cycle regularity and reduces hormonal breakouts."
  },
  {
    id: "a4",
    title: "Navigating Endometriosis Flare-Ups",
    category: "endometriosis",
    tags: ["endo", "flares", "inflammation"],
    lastReviewed: "2024-03-05T00:00:00Z",
    evidenceGrade: "clinical consensus",
    content: "Endometriosis flares are severe inflammatory responses. Tracking triggers (like stress or lack of sleep) and employing anti-inflammatory interventions immediately can shorten flare duration."
  },
  {
    id: "a5",
    title: "Your Changing Body",
    category: "teen",
    tags: ["puberty", "basics"],
    lastReviewed: "2024-01-20T00:00:00Z",
    evidenceGrade: "clinical consensus",
    content: "As you go through puberty, it's completely normal for your period to be irregular. Your body is just adjusting to new hormones. Focus on sleeping well and staying hydrated."
  },
  {
    id: "a6",
    title: "Approaching Perimenopause",
    category: "perimenopause",
    tags: ["changes", "hot flashes", "night sweats"],
    lastReviewed: "2024-02-28T00:00:00Z",
    evidenceGrade: "clinical consensus",
    content: "Perimenopause can bring irregular cycles, hot flashes, and sleep disruptions as estrogen levels fluctuate. Tracking these changes helps your doctor customize your care."
  }
];

export const getFilteredArticles = (mode: string, query: string = "") => {
  let articles = OFFLINE_ARTICLES;

  if (mode === "teen") {
    // Restrict strictly for teens
    articles = articles.filter(a => a.category === "teen" || a.category === "cycle basics");
  } else {
    // Hide teen specific content from adults
    articles = articles.filter(a => a.category !== "teen");

    // Push condition specific ones to the top
    const conditionMap: Record<string, string> = {
      pcos: "pcos",
      endo: "endometriosis",
      peri: "perimenopause"
    };
    
    if (conditionMap[mode]) {
       articles = [...articles].sort((a, b) => {
          if (a.category === conditionMap[mode] && b.category !== conditionMap[mode]) return -1;
          if (a.category !== conditionMap[mode] && b.category === conditionMap[mode]) return 1;
          return 0;
       });
    }
  }

  if (query.trim() !== "") {
    const q = query.toLowerCase();
    articles = articles.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  return articles;
};
