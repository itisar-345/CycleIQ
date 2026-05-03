import { CyclePhase, getPhaseForDay } from "../database";

export const generateSpecialistReportHtml = (
  cycles: any[],
  entries: any[],
  currentMode: string,
  redFlagPromptLogs: any[] = []
): string => {
  let html = `
    <html>
      <head>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 20px; color: #333; }
          h1 { color: #2A2422; }
          h2 { color: #666; font-size: 18px; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .card { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .stats { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .stat { text-align: center; background: #eee; padding: 10px; border-radius: 8px; flex: 1; margin: 0 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .highlight { color: #E74C3C; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>CycleIQ Specialist Report</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Clinical Focus Mode:</strong> ${currentMode.toUpperCase()}</p>
  `;

  // Basic Stats
  html += `
    <div class="stats">
      <div class="stat"><b>Cycles Logged</b><br/>${cycles.length}</div>
      <div class="stat"><b>Entries Logged</b><br/>${entries.length}</div>
    </div>
  `;

  // Condition Specific Analysis
  if (currentMode === "pcos") {
    html += `<h2>PCOS Irregularity & Metabolic Proxies</h2>`;
    const cycleLengths = cycles.filter(c => c.cycle_length).map(c => c.cycle_length);
    const avgLength = cycleLengths.length ? Math.round(cycleLengths.reduce((a,b)=>a+b,0)/cycleLengths.length) : 0;
    const variance = cycleLengths.length > 1 ? cycleLengths.reduce((a,b)=>a+Math.pow(b-avgLength,2),0)/(cycleLengths.length-1) : 0;
    
    html += `<ul>
      <li><b>Average Cycle Length:</b> ${avgLength} days</li>
      <li><b>Length Variance (StdDev):</b> ${Math.round(Math.sqrt(variance))} days</li>
    </ul>`;

    html += `<h3>Symptom Frequency by Cycle Phase</h3><table><tr><th>Phase</th><th>Acne/Skin Issues</th><th>Cravings</th><th>High Fatigue (>5)</th></tr>`;
    
    let acneCount = 0, cravingCount = 0, fatigueCount = 0;
    const phases: Record<string, {acne:number, crav:number, fat:number}> = { menstrual: { acne: 0, crav: 0, fat: 0 }, follicular: { acne: 0, crav: 0, fat: 0 }, ovulatory: { acne: 0, crav: 0, fat: 0 }, luteal: { acne: 0, crav: 0, fat: 0 } };
    
    entries.forEach(e => {
        let phase = 'luteal';
        if (e.cycle_id) {
            const thisCycle = cycles.find(c => c.id === e.cycle_id);
            if (thisCycle && thisCycle.start_date) {
                const dayOfCycle = Math.floor((new Date(e.logged_date).getTime() - new Date(thisCycle.start_date).getTime()) / 86400000) + 1;
                phase = getPhaseForDay(dayOfCycle, thisCycle.cycle_length || 28);
            }
        }
        
        let hasAcne = false;
        let hasCrav = false;
        if (e.extended_symptoms) {
            try {
                const ext = typeof e.extended_symptoms === 'string' ? JSON.parse(e.extended_symptoms) : e.extended_symptoms;
                if (ext.acne || ext.pcos?.acne?.severity > 0) { hasAcne = true; acneCount++; }
                if (ext.cravings || ext.pcos?.cravings?.int > 0) { hasCrav = true; cravingCount++; }
            } catch(err) {}
        }
        if (e.fatigue_score > 5) fatigueCount++;
        
        if (phases[phase]) {
           if (hasAcne) phases[phase].acne++;
           if (hasCrav) phases[phase].crav++;
           if (e.fatigue_score > 5) phases[phase].fat++;
        }
    });

    ['menstrual', 'follicular', 'ovulatory', 'luteal'].forEach(p => {
        html += `<tr><td style="text-transform:capitalize">${p}</td><td>${phases[p].acne} days</td><td>${phases[p].crav} days</td><td>${phases[p].fat} days</td></tr>`;
    });
    html += `<tr style="font-weight:bold"><td>Total</td><td>${acneCount}</td><td>${cravingCount}</td><td>${fatigueCount}</td></tr>`;
    html += `</table>`;

    html += `<h3>Medication & Symptom Overlay</h3><table><tr><th>Date</th><th>Logged Medication</th><th>Pain</th><th>Energy</th></tr>`;
    entries.filter(e => e.medication_log_encrypted).slice(0, 15).forEach(e => {
        html += `<tr><td>${e.logged_date.split("T")[0]}</td><td>Encrypted Log Present</td><td>${e.pain_score || "-"}</td><td>${e.energy_score || "-"}</td></tr>`;
    });
    if (!entries.some(e => e.medication_log_encrypted)) {
        html += `<tr><td colspan="4">No medications logged in this cycle.</td></tr>`;
    }
    html += `</table>`;
  }

  if (currentMode === "endo") {
    html += `<h2>Endometriosis Flare Calendar & Impairment</h2>`;
    
    let flareDays = 0, bedBound = 0, limited = 0;
    const flareEvents: any[] = [];
    
    entries.forEach(e => {
      if (e.flare_start) {
        flareDays++;
        if (e.pain_score >= 8) bedBound++;
        else if (e.pain_score >= 5) limited++;
        
        flareEvents.push({
           date: e.logged_date,
           pain: e.pain_score || "N/A",
           flow: e.flow_intensity || "None"
        });
      }
    });

    html += `<ul>
      <li><b>Total Documented Flare Days:</b> ${flareDays}</li>
      <li><b>Functional Impairment (Pain > 7):</b> <span class="highlight">${bedBound} days</span></li>
    </ul>`;

    html += `<h3>Flare Detail Log</h3><table><tr><th>Date</th><th>Peak Pain (0-10)</th><th>Flow Intensity</th></tr>`;
    flareEvents.slice(0, 15).forEach(f => {
       html += `<tr><td>${f.date.split("T")[0]}</td><td>${f.pain}</td><td>${f.flow}</td></tr>`;
    });
    if (flareEvents.length === 0) html += `<tr><td colspan="3">No flares recorded.</td></tr>`;
    html += `</table>`;

    html += `<h3>Bowel, Bladder & Heavy Flow</h3><table><tr><th>Date</th><th>Bowel</th><th>Bladder</th><th>Flow & Clots</th></tr>`;
    const complexSymptoms = entries.filter(e => {
       const ext = e.extended_symptoms ? (typeof e.extended_symptoms === 'string' ? JSON.parse(e.extended_symptoms) : e.extended_symptoms) : {};
       return ext.bowel || ext.bladder || e.flow_intensity === 'Heavy' || e.clots_size;
    });
    complexSymptoms.slice(0, 15).forEach(e => {
       const ext = e.extended_symptoms ? (typeof e.extended_symptoms === 'string' ? JSON.parse(e.extended_symptoms) : e.extended_symptoms) : {};
       html += `<tr>
         <td>${e.logged_date.split("T")[0]}</td>
         <td>${ext.bowel ? 'Yes' : '-'}</td>
         <td>${ext.bladder ? 'Yes' : '-'}</td>
         <td>${e.flow_intensity || '-'}${e.clots_size ? ` (Clots: ${e.clots_size})` : ''}</td>
       </tr>`;
    });
    if (complexSymptoms.length === 0) html += `<tr><td colspan="4">No complex symptoms recorded.</td></tr>`;
    html += `</table>`;

    html += `<h3>Red-Flag Prompt History</h3><table><tr><th>Date</th><th>Trigger</th><th>Prompt</th></tr>`;
    redFlagPromptLogs.slice(0, 15).forEach(log => {
       const trigger = String(log.trigger_type || "").replace(/_/g, " ");
       html += `<tr>
         <td>${String(log.logged_date || log.triggered_at).split("T")[0]}</td>
         <td style="text-transform:capitalize">${trigger}</td>
         <td><span class="highlight">${log.message}</span></td>
       </tr>`;
    });
    if (redFlagPromptLogs.length === 0) html += `<tr><td colspan="3">No red-flag prompts were shown during this report period.</td></tr>`;
    html += `</table>`;

    html += `<h3>Pain Score Trajectory</h3><table><tr><th>Month</th><th>Avg Pain (0-10)</th></tr>`;
    const monthlyPain: Record<string, { sum: number, count: number }> = {};
    entries.filter(e => e.pain_score !== null && e.pain_score !== undefined).forEach(e => {
       const month = e.logged_date.substring(0, 7);
       if (!monthlyPain[month]) monthlyPain[month] = { sum: 0, count: 0 };
       monthlyPain[month].sum += e.pain_score;
       monthlyPain[month].count++;
    });
    const sortedMonths = Object.keys(monthlyPain).sort((a,b)=>b.localeCompare(a));
    sortedMonths.slice(0, 3).forEach(m => {
       const avg = (monthlyPain[m].sum / monthlyPain[m].count).toFixed(1);
       html += `<tr><td>${m}</td><td>${avg}</td></tr>`;
    });
    if (sortedMonths.length === 0) html += `<tr><td colspan="2">No pain data recorded.</td></tr>`;
    html += `</table>`;
  }

  // Generic 3-month Pain Trajectory
  html += `<h2>Symptom Frequency by Cycle Day (Heatmap)</h2>`;
  // Build cycle-day buckets 1-35
  const cdBuckets: Record<number, { pain: number; mood: number; energy: number; count: number }> = {};
  for (let d = 1; d <= 35; d++) cdBuckets[d] = { pain: 0, mood: 0, energy: 0, count: 0 };
  entries.forEach(e => {
    if (!e.cycle_id) return;
    const thisCycle = cycles.find((c: any) => c.id === e.cycle_id);
    if (!thisCycle?.start_date) return;
    const cd = Math.floor((new Date(e.logged_date).getTime() - new Date(thisCycle.start_date).getTime()) / 86400000) + 1;
    if (cd >= 1 && cd <= 35) {
      cdBuckets[cd].pain += e.pain_score || 0;
      cdBuckets[cd].mood += e.mood_score || 0;
      cdBuckets[cd].energy += e.energy_score || 0;
      cdBuckets[cd].count++;
    }
  });
  html += `<table><tr><th>Cycle Day</th><th>Avg Pain</th><th>Avg Mood</th><th>Avg Energy</th><th>Phase</th></tr>`;
  const phaseLabel = (d: number) => d <= 5 ? 'Menstrual' : d <= 12 ? 'Follicular' : d <= 15 ? 'Ovulatory' : 'Luteal';
  const heatColor = (val: number, max: number) => {
    const pct = Math.min(val / max, 1);
    const r = Math.round(255 * pct);
    const g = Math.round(255 * (1 - pct));
    return `rgb(${r},${g},80)`;
  };
  for (let d = 1; d <= 35; d++) {
    const b = cdBuckets[d];
    if (b.count === 0) continue;
    const avgPain = (b.pain / b.count).toFixed(1);
    const avgMood = (b.mood / b.count).toFixed(1);
    const avgEnergy = (b.energy / b.count).toFixed(1);
    html += `<tr>
      <td>Day ${d}</td>
      <td style="background:${heatColor(b.pain / b.count, 10)}">${avgPain}</td>
      <td style="background:${heatColor(5 - b.mood / b.count, 5)}">${avgMood}/5</td>
      <td style="background:${heatColor(10 - b.energy / b.count, 10)}">${avgEnergy}/10</td>
      <td>${phaseLabel(d)}</td>
    </tr>`;
  }
  html += `</table>`;

  html += `<h2>Mood & Energy Trends with Cycle-Phase Overlay</h2><table><tr><th>Date</th><th>Phase</th><th>Mood (1-5)</th><th>Energy (0-10)</th><th>Brain Fog (0-10)</th></tr>`;
  entries.slice(0, 30).forEach(e => {
    let phase = '—';
    if (e.cycle_id) {
      const thisCycle = cycles.find((c: any) => c.id === e.cycle_id);
      if (thisCycle?.start_date) {
        const cd = Math.floor((new Date(e.logged_date).getTime() - new Date(thisCycle.start_date).getTime()) / 86400000) + 1;
        phase = getPhaseForDay(cd, thisCycle.cycle_length || 28);
      }
    }
    html += `<tr>
      <td>${e.logged_date.split('T')[0]}</td>
      <td style="text-transform:capitalize">${phase}</td>
      <td>${e.mood_score ?? '—'}</td>
      <td>${e.energy_score ?? '—'}</td>
      <td>${e.brain_fog_score ?? '—'}</td>
    </tr>`;
  });
  html += `</table>`;

  html += `<h2>Detailed Log (Rolling View)</h2><table><tr><th>Date</th><th>Pain</th><th>Mood</th><th>Sleep</th></tr>`;
  entries.slice(0, 30).forEach(e => {
      html += `<tr>
        <td>${e.logged_date.split("T")[0]}</td>
        <td>${e.pain_score ? e.pain_score : "-"}</td>
        <td>${e.mood_score ? e.mood_score : "-"}</td>
        <td>${e.sleep_hours ? e.sleep_hours + "h" : "-"}</td>
      </tr>`;
  });
  html += `</table>`;

  html += `<h2>User Appointment Notes</h2>
  <div class="card">
    <p><i>The patient can write custom notes, questions to ask the doctor, and current concerns here prior to sharing this document.</i></p>
    <br/><br/><br/>
  </div>
  </body></html>`;

  return html;
};
