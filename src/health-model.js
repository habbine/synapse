/*
 * SYNAPSE - health model
 * Team 3S (Synapse Space Systems), Paris
 * Written with AI assistance (Claude, Anthropic); directed and reviewed by Team 3S.
 *
 * Copyright 2026 Team 3S (Synapse Space Systems)
 * Licensed under the Apache License, Version 2.0 (see LICENSE).
 *
 * This file holds every threshold, band and hazard mapping used by the app.
 * It has no DOM dependency so it can be unit-tested under Node.
 *
 * PROVENANCE RULE: every band carries an `origin`:
 *   'nasa'        - a value stated in a NASA technical standard or NASA brief
 *   'clinical'    - a published terrestrial clinical reference range
 *   'operational' - a triage split chosen by Team 3S, NOT from any standard
 *   'none'        - no verified threshold exists; trend only
 * Nothing in this file may carry a number that is not traceable to `sources`.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.HealthModel = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. SOURCES
   * ------------------------------------------------------------------ */

  var sources = {
    hrp_hazards: {
      kind: 'nasa',
      cite: 'NASA Human Research Program, "The Human Body in Space: the five hazards of human spaceflight"',
      url: 'https://www.nasa.gov/hrp/hazards'
    },
    std3001v1: {
      kind: 'nasa',
      cite: 'NASA-STD-3001, Volume 1, Revision C, Spaceflight Human-System Standard: Crew Health (2023-09-15)',
      url: 'https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf'
    },
    ochmo_rad: {
      kind: 'nasa',
      cite: 'NASA OCHMO Technical Brief OCHMO-TB-020, Design for Ionizing Radiation Protection',
      url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf'
    },
    ochmo_std_overview: {
      kind: 'nasa',
      cite: 'NASA OCHMO, Human Spaceflight and Aviation Standards overview briefing (Francisco, 2021)',
      url: 'https://www.nasa.gov/sites/default/files/atoms/files/ochmo_standards_overview_sept_15_2021_francisco.pdf'
    },
    ochmo_co2: {
      kind: 'nasa',
      cite: 'NASA OCHMO Technical Brief OCHMO-TB-004, Carbon Dioxide (CO2); cites NASA-STD-3001 Vol 2 Rev D [V2 6004]',
      url: 'https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/'
    },
    law_co2: {
      kind: 'peer-reviewed',
      cite: 'Law J, Van Baalen M, Foy M, Mason SS, Mendez C, Wear ML, Meyers VE, Alexander D. Relationship between carbon dioxide levels and reported headaches on the International Space Station. J Occup Environ Med. 2014;56(5):477-83. PMID 24806559, doi:10.1097/JOM.0000000000000158',
      url: 'https://pubmed.ncbi.nlm.nih.gov/24806559/'
    },
    law_co2_ops: {
      kind: 'nasa',
      cite: 'Law J, Alexander D. CO2 on the International Space Station: an operations update. NASA NTRS 20150019624 (24-hour average controlled to 4.0 mmHg since 2010; symptoms reported from 2.3 mmHg)',
      url: 'https://ntrs.nasa.gov/citations/20150019624'
    },
    barger_sleep: {
      kind: 'peer-reviewed',
      cite: 'Barger LK, Flynn-Evans EE, Kubey A, Walsh L, Ronda JM, Wang W, Wright KP Jr, Czeisler CA. Prevalence of sleep deficiency and use of hypnotic drugs in astronauts before, during, and after spaceflight: an observational study. Lancet Neurol. 2014;13(9):904-12. PMID 25127232, doi:10.1016/S1474-4422(14)70122-X',
      url: 'https://pubmed.ncbi.nlm.nih.gov/25127232/'
    },
    scott_countermeasures: {
      kind: 'peer-reviewed',
      cite: 'Scott JM, Feiveson AH, English KL, Spector ER, Sibonga JD, Dillon EL, Ploutz-Snyder L, Everett ME. Effects of exercise countermeasures on multisystem function in long duration spaceflight astronauts. npj Microgravity. 2023;9(1):11. PMID 36737441',
      url: 'https://pubmed.ncbi.nlm.nih.gov/36737441/'
    },
    ochmo_exercise: {
      kind: 'nasa',
      cite: 'NASA OCHMO-TB-031 Exercise Overview (ISS exercise prescription, average 600 min/week/crewmember)',
      url: 'https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/'
    },
    smith_bone: {
      kind: 'peer-reviewed',
      cite: 'Smith SM, Abrams SA, Davis-Street JE, Heer M, O\'Brien KO, Wastney ME, Zwart SR. Fifty years of human space travel: implications for bone and calcium research. Annu Rev Nutr. 2014;34:377-400. PMID 24995691, doi:10.1146/annurev-nutr-071813-105440 (heavy resistance exercise plus good nutritional and vitamin D status reduced loss of bone mineral density on long-duration ISS missions)',
      url: 'https://pubmed.ncbi.nlm.nih.gov/24995691/'
    },
    brunstetter_sans: {
      kind: 'nasa',
      cite: 'Brunstetter T. Introduction to Spaceflight Associated Neuro-ocular Syndrome (SANS) and its risk to NASA astronauts. NASA NTRS 20170009173',
      url: 'https://ntrs.nasa.gov/citations/20170009173'
    },
    osdr_osd941: {
      kind: 'nasa',
      cite: 'Moreira NCS, Coelho LBV, Petroski LPP, Almeida SS, '
          + 'Gaudio LPM, Nascimento LL, Lee J-H, Rehen S, Tsu B, Fischer JSdG, Carvalho PC, Martins AMA, Herai RH, Muotri AR. '
          + '"Spaceflight reshapes Alzheimer\'s disease-associated molecular programs in human brain '
          + 'organoids". NASA Open Science Data Repository, OSD-941 (GeneLab GLDS-769), Version 1, '
          + 'released 2026-10-26. Licence CC0-1.0. doi:10.26030/twtb-sc40',
      url: 'https://doi.org/10.26030/twtb-sc40'
    },
    osdr_eda_rr1: {
      kind: 'nasa',
      cite: 'NASA Open Science Data Repository, Environmental Data Application: Rodent Research 1 (SpaceX CRS-4) '
          + 'Radiation Table, Telemetry Table and Summary Table, International Space Station, 2014-09-20 to 2014-11-01. '
          + 'Downloaded 2026-11-14. Shown in My health, Trends; used for no threshold.',
      url: 'https://visualization.osdr.nasa.gov/eda'
    },
    osdr: {
      kind: 'nasa',
      cite: 'NASA Open Science Data Repository (OSDR) / GeneLab - open, FAIR spaceflight biology, radiation dosimetry (RadLab) and environmental telemetry data. "There are no restrictions on the use of this data."',
      url: 'https://osdr.nasa.gov/bio/repo/'
    },
    nasa_sm: {
      kind: 'nasa',
      cite: 'NASA, Spaceflight Standard Measures: Characterizing How Humans Adapt in Space (Human Research Program, Clement G, principal investigator)',
      url: 'https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space'
    },
    ntrs_sm: {
      kind: 'nasa',
      cite: 'Clement GR, Mullenax CA, Wood SJ, Zwart SR, Crucian BE, Lee S, Ott CM. Spaceflight Standard Measures [presentation]. Human Research Program Investigators\' Workshop, Galveston TX, 27-30 January 2020. NASA NTRS 20200001281 (JSC-E-DAA-TN77371)',
      url: 'https://ntrs.nasa.gov/citations/20200001281'
    },
    figure_origin: {
      kind: 'clinical',
      cite: 'The body figure in this tool is an original 3D model by Team 3S, built from simple solids, standing with the arms at the sides and the palms toward the thighs, and scaled to the crew record. '
          + 'What was checked: the bone counts and the main muscle groups against the SEER Training Modules, and rib attachment, the parts of the breastbone, sacrum, hip bone, thigh bone, forearm, lower leg and ankle against OpenStax Anatomy and Physiology (both listed here). '
          + 'What was not: shapes, sizes and body proportions are schematic and were not measured from, or checked against, an atlas plate or an anthropometric data set; the smaller muscles drawn (tensor fasciae latae, iliotibial band, sartorius, the outer lower-leg muscles, infraspinatus, base of the thumb) and the organ, vessel and nerve layers were placed from general knowledge only. '
          + 'Anatomical facts are not subject to copyright; particular illustrations are, so no third-party plate is traced, copied or embedded.',
      url: 'https://www.opensource.org/licenses/Apache-2.0'
    },
    seer_anatomy: {
      kind: 'clinical',
      cite: 'SEER Training Modules: Anatomy & Physiology - Axial Skeleton (80 bones); Appendicular Skeleton (126 bones); Muscles of the Upper Extremity; Muscles of the Lower Extremity. '
          + 'U.S. National Institutes of Health, National Cancer Institute. Cited 15 November 2026. '
          + 'Checked for the body figure: 7 neck, 12 chest and 5 lower-back vertebrae, sacrum, coccyx, breastbone and 24 ribs; the bones of each limb; and the named muscle groups (trapezius, serratus anterior, pectoralis major, latissimus dorsi, deltoid, biceps, triceps, brachioradialis, gluteal, quadriceps, hamstrings, tibialis anterior, gastrocnemius, soleus). Nothing is reproduced.',
      url: 'https://training.seer.cancer.gov/anatomy/'
    },
    openstax_ap: {
      kind: 'clinical',
      cite: 'OpenStax, Anatomy and Physiology 2e, sections 7.3 The Vertebral Column, 7.4 The Thoracic Cage, 8.2 Bones of the Upper Limb, 8.3 The Pelvic Girdle and Pelvis, 8.4 Bones of the Lower Limb. Rice University. '
          + 'Access for free at https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction. Read 15 November 2026. '
          + 'Checked for the body figure: the sacrum as five fused vertebrae; ribs 1 to 7 reaching the breastbone, 8 to 10 joining the rib above, 11 and 12 floating; the breastbone in three parts; '
          + 'the hip bone (ilium, pubis, the opening below, the joint between the two pubic bones); the head, neck and greater trochanter of the thigh bone; the kneecap; '
          + 'the radius on the thumb side of the forearm; the shin bone on the inner side with the inner ankle bone, the fibula on the outer side with the outer ankle bone; the talus and heel bone. No text or figure is reproduced.',
      url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-introduction'
    },
    aha_bp_2025: {
      kind: 'peer-reviewed',
      cite: 'Jones DW, Ferdinand KC, Taler SJ, et al. 2025 AHA/ACC Guideline for the Prevention, Detection, Evaluation and Management of High Blood Pressure in Adults. '
          + 'Hypertension 2025;82(10):e212-e316. PMID 40811516. Retires and replaces the 2017 ACC/AHA guideline. The bands in this tool were taken from the AHA public page; '
          + 'this team has confirmed the guideline citation but has not re-read its full text against each band.',
      url: 'https://doi.org/10.1161/HYP.0000000000000249'
    },
    norsk_bp: {
      kind: 'peer-reviewed',
      cite: 'Norsk P, Asmar A, Damgaard M, Christensen NJ. Fluid shifts, vasodilatation and ambulatory blood pressure reduction during long duration spaceflight. '
          + 'J Physiol 2015;593(3):573-84. PMID 25774397. Eight male astronauts; 24-hour ambulatory pressure 8 to 10 mmHg lower on the ISS than before flight.',
      url: 'https://doi.org/10.1113/jphysiol.2014.284869'
    },
    stahn_cbt: {
      kind: 'peer-reviewed',
      cite: 'Stahn AC, Werner A, Opatz O, et al. Increased core body temperature in astronauts during long-duration space missions. Sci Rep 2017;7(1):16180. PMID 29170507. '
          + 'Resting core temperature rose by about 1 C over 2.5 months in flight.',
      url: 'https://doi.org/10.1038/s41598-017-15560-w'
    },
    niven_thermo: {
      kind: 'peer-reviewed',
      cite: 'Niven DJ, Gaudet JE, Laupland KB, Mrklas KJ, Roberts DJ, Stelfox HT. Accuracy of peripheral thermometers for estimating temperature: a systematic review and meta-analysis. '
          + 'Ann Intern Med 2015;163(10):768-77. PMID 26571241. 75 studies, 8682 patients; limits of agreement with core temperature outside +/-0.5 C.',
      url: 'https://doi.org/10.7326/M15-1150'
    },
    ada_soc_2026: {
      kind: 'peer-reviewed',
      cite: 'American Diabetes Association Professional Practice Committee. 2. Diagnosis and Classification of Diabetes: Standards of Care in Diabetes-2026. '
          + 'Diabetes Care 2026;49(Suppl 1):S27-S49. PMID 41358893. The bands in this tool were taken from the ADA public page; this team has confirmed the citation but has not re-read its full text.',
      url: 'https://doi.org/10.2337/dc26-S002'
    },
    hortensius_glucose: {
      kind: 'peer-reviewed',
      cite: 'Hortensius J, Slingerland RJ, Kleefstra N, et al. Self-monitoring of blood glucose: the use of the first or the second drop of blood. Diabetes Care 2011;34(3):556-60. PMID 21289231.',
      url: 'https://doi.org/10.2337/dc10-1694'
    },
    watson_sleep: {
      kind: 'peer-reviewed',
      cite: 'Watson NF, Badr MS, Belenky G, et al. Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society on the Recommended Amount of Sleep '
          + 'for a Healthy Adult: Methodology and Discussion. Sleep 2015;38(8):1161-83. PMID 26194576.',
      url: 'https://doi.org/10.5665/sleep.4886'
    },
    lee_sans: {
      kind: 'peer-reviewed',
      cite: 'Lee AG, Mader TH, Gibson CR, Tarver W, Rabiei P, Riascos RF, Galdamez LA, Brunstetter T. Spaceflight associated neuro-ocular syndrome (SANS) and the neuro-ophthalmologic '
          + 'effects of microgravity: a review and an update. NPJ Microgravity 2020;6:7. PMID 32047839.',
      url: 'https://doi.org/10.1038/s41526-020-0097-9'
    },
    mader_sans: {
      kind: 'peer-reviewed',
      cite: 'Mader TH, Gibson CR, Pass AF, et al. Optic disc edema, globe flattening, choroidal folds, and hyperopic shifts observed in astronauts after long-duration space flight. '
          + 'Ophthalmology 2011;118(10):2058-69. PMID 21849212. Retrospective series of 7 astronauts, plus questionnaires from about 300.',
      url: 'https://doi.org/10.1016/j.ophtha.2011.06.021'
    },
    niddk_dx: {
      kind: 'clinical',
      cite: 'National Institute of Diabetes and Digestive and Kidney Diseases (US National Institutes of Health). Diabetes Tests and Diagnosis. Cross-check of the fasting plasma glucose bands; matches.',
      url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis'
    },
    niddk_tests_pro: {
      kind: 'clinical',
      cite: 'National Institute of Diabetes and Digestive and Kidney Diseases. Diabetes and Prediabetes Tests (for health professionals): diagnosis requires a laboratory test; meter results are not suitable.',
      url: 'https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/diabetes/diabetes-prediabetes'
    },
    cdc_sleep: {
      kind: 'clinical',
      cite: 'US Centers for Disease Control and Prevention. About Sleep and Your Heart Health: most adults need at least 7 hours of sleep each night. Cross-check of the 7 hour anchor; matches.',
      url: 'https://www.cdc.gov/heart-disease/about/sleep-and-heart-health.html'
    },
    nasem_rad: {
      kind: 'peer-reviewed',
      cite: 'National Academies of Sciences, Engineering, and Medicine. Space Radiation and Astronaut Health: Managing and Communicating Cancer Risks. Washington, DC: National Academies Press, 2021. '
          + 'Independent consensus report on the 600 mSv career limit; notes NASA standards are generally more restrictive than those of other space agencies. Cited by link only.',
      url: 'https://www.nationalacademies.org/read/26155/chapter/2'
    },
    aha_bp: {
      kind: 'clinical',
      cite: 'ACC/AHA blood pressure categories for adults (normal, elevated, stage 1, stage 2, hypertensive crisis)',
      url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings'
    },
    aha_hr: {
      kind: 'clinical',
      cite: 'American Heart Association: normal adult resting heart rate 60-100 bpm',
      url: 'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse'
    },
    cdc_fever: {
      kind: 'clinical',
      cite: 'CDC Yellow Book 2026, Post-Travel Evaluation of the Ill Traveler (Huits R, Hamer DH, Libman M). Used for the fever threshold of at least 38.0 C (100.4 F). The earlier Yellow Book 2024 chapter URL no longer resolves (checked 2026-11-15), and this team did not find the 38.0 C wording in the current chapter text it could read, so the threshold is a widely used clinical convention that remains to be re-confirmed against a primary source.',
      url: 'https://www.cdc.gov/yellow-book/hcp/post-travel-evaluation/post-travel-evaluation-of-the-ill-traveler.html'
    },
    ada_glucose: {
      kind: 'clinical',
      cite: 'American Diabetes Association fasting plasma glucose: normal 70-99 mg/dL, 100-125 mg/dL impaired fasting glucose, >=126 mg/dL diabetes range, <70 mg/dL hypoglycaemia',
      url: 'https://diabetes.org/about-diabetes/diagnosis'
    },
    nasa_google_cmoda: {
      kind: 'landscape',
      cite: 'Jones A. NASA and Google test AI medical assistant for astronaut missions to the moon and Mars. Space.com, 17 August 2025. News report quoting a Google statement of 8 August 2025: proof of concept for a Crew Medical Officer Digital Assistant (CMO-DA), a clinical decision support system. Secondary source (press).',
      url: 'https://www.space.com/technology/nasa-and-google-test-ai-medical-assistant-for-astronaut-missions-to-the-moon-and-mars'
    },
    ntrs_ai_hrp: {
      kind: 'landscape',
      cite: 'Le T. NASA Human Research Program\'s Continue Using of AI Technology to Mitigate Exploration Medical Risk [presentation]. Aerospace Medical Association 96th Annual Scientific Meeting, Denver CO, 17-22 May 2026. NASA NTRS 20260001797. Abstract: NASA worked with data scientists from Google, Microsoft and Ejenta to integrate a Butterfly iQ3 ultrasound device into a multi-vector data stream system.',
      url: 'https://ntrs.nasa.gov/citations/20260001797'
    },
    ejenta_nasa: {
      kind: 'landscape',
      cite: 'Ejenta. Intelligent Systems to Support Crew Health and Performance During Earth-Independent Medical Operations. Ejenta news, 8 October 2025. Vendor statement: with Google and TRISH support, the NASA HRP AI team optimised an open-source large language model on Google Vertex AI using space medicine resources. Vendor source, not independently verified.',
      url: 'https://www.ejenta.com/news/ejenta-nasa-ai-collaboration'
    },
    baylor_trish_2023: {
      kind: 'landscape',
      cite: 'Baylor College of Medicine. TRISH selects healthcare and data management projects for spaceflights [news release]. Houston TX, 1 November 2023. The Translational Research Institute for Space Health, with consortium partners MIT and Caltech, announced projects with Ejenta and TrialX, supported by the NASA Human Research Program.',
      url: 'https://www.bcm.edu/news/trish-selects-healthcare-and-data-management-projects-for-spaceflights'
    },
    csa_astroskin: {
      kind: 'landscape',
      cite: 'Canadian Space Agency. Astroskin, the Bio-Monitor wearable (Carre Technologies, Hexoskin), no date. Agency description of the garment-based vital-sign monitor. The page loaded in an earlier check but returned a network error on 2026-11-15; the older bio-monitor.asp address is blocked to automated readers and was not used.',
      url: 'https://www.csa-asc.gc.ca/eng/sciences/astroskin.asp'
    },
    ntrs_biosensor: {
      kind: 'landscape',
      cite: 'Toscano W, Cowings P, Sullivan P, Martin A, Roy J, Krihak M, Winther S, Hanson A, Shaw T. Wearable Biosensor Monitor to Support Autonomous Crew Health and Readiness to Perform [presentation]. Human Research Program Investigators\' Workshop, Galveston TX, 23-26 January 2017. NASA NTRS 20190001996. Astroskin prototype: shirt and headband sensors for vital signs, sleep and activity; NASA and CSA testing since 2014.',
      url: 'https://ntrs.nasa.gov/citations/20190001996'
    },
    trialx_go: {
      kind: 'landscape',
      cite: 'TrialX. TrialX GO: A Key Innovation in Space Health Research & Remote Data Collection. TrialX blog, 13 May 2025. Vendor statement: offline-capable health data platform developed with TRISH as part of the HERMES initiative. Vendor source, not independently verified.',
      url: 'https://trialx.com/https-trialx-com-trialx-go-space-health-research-remote-data-collection-innovation/'
    }
  };

  /* ------------------------------------------------------------------ *
   * 2. HAZARDS  (NASA HRP five hazards of human spaceflight)
   * ------------------------------------------------------------------ */

  var hazards = [
    {
      id: 'radiation',
      name: 'Space radiation',
      plain: 'Galactic cosmic rays and solar particle events pass through the hull and through you. You cannot see or feel the dose, so it has to be measured and added up.',
      indicators: ['rad_career', 'rad_event'],
      sources: ['hrp_hazards', 'ochmo_rad', 'ochmo_std_overview', 'osdr_eda_rr1']
    },
    {
      id: 'isolation',
      name: 'Isolation and confinement',
      plain: 'A small crew, a small volume and a long time. This shows up first in sleep and in mood, before it shows up in performance.',
      indicators: ['sleep', 'mood'],
      sources: ['hrp_hazards', 'barger_sleep']
    },
    {
      id: 'distance',
      name: 'Distance from Earth',
      plain: 'The further you are, the longer a question takes to reach a flight surgeon and come back. Care becomes something the crew starts on its own.',
      indicators: [],
      sources: ['hrp_hazards']
    },
    {
      id: 'gravity',
      name: 'Gravity fields',
      plain: 'Without loading, bone and muscle are lost and fluid shifts headward. That drives the exercise prescription, and it is linked to the eye changes called SANS.',
      indicators: ['exercise', 'bp_sys', 'bp_dia', 'hr', 'vision', 'mass'],
      sources: ['hrp_hazards', 'scott_countermeasures', 'brunstetter_sans']
    },
    {
      id: 'environment',
      name: 'Hostile closed environment',
      plain: 'A sealed cabin recycles its own air and carries its own microbes. CO2 builds up unless it is scrubbed, and immune function changes in flight.',
      indicators: ['co2', 'temp'],
      sources: ['hrp_hazards', 'ochmo_co2']
    }
  ];

  /* ------------------------------------------------------------------ *
   * 3. ENVIRONMENTS
   *
   * Two independent constraints, because they come apart. Signal delay
   * decides how fast you can ASK for help. Care access decides whether
   * anyone can REACH you. Mars has both. A polar station in winter has
   * instant comms and no evacuation at all. A spacecraft in LEO has
   * instant comms and a docked return vehicle. Self-reliance is set by
   * the worse of the two, which is why one engine serves both space and
   * terrestrial remote operations.
   *
   * Signal delays for ISS and the Moon are light-time, which is geometry,
   * not a medical standard. The Mars figure is NASA HRP's. Care access is
   * a category on purpose: this team has no verified source for a precise
   * evacuation time in any of these settings, so it does not state one.
   * ------------------------------------------------------------------ */

  var CARE = {
    hours: { id: 'hours', label: 'Evacuation possible in hours', rank: 0 },
    days: { id: 'days', label: 'Evacuation takes days', rank: 1 },
    none: { id: 'none', label: 'No evacuation available', rank: 2 }
  };

  var environments = {
    iss: {
      id: 'iss', name: 'ISS / low Earth orbit', domain: 'space', owDelaySec: 1,
      delayNote: 'Effectively real time. A flight surgeon is reachable on a scheduled private medical conference or on request.',
      careAccess: 'hours',
      careNote: 'A return vehicle is docked. Deorbit for a medical emergency is possible, though it ends the increment.',
      gcrDailyLimit: null, gravity: 'microgravity'
    },
    transit: {
      id: 'transit', name: 'Deep-space transit', domain: 'space', owDelaySec: 1200,
      delayNote: 'Up to about 20 minutes each way at Mars distance, so roughly 40 minutes before any answer arrives (NASA HRP).',
      careAccess: 'none',
      careNote: 'There is no abort to definitive care. Whatever happens is treated by the crew, with what is aboard.',
      gcrDailyLimit: 1.3, gravity: 'microgravity'
    },
    lunar: {
      id: 'lunar', name: 'Lunar surface base', domain: 'space', owDelaySec: 1.3,
      delayNote: 'About 1.3 seconds each way (light-time over 384,400 km). Conversation is possible with a slight lag.',
      careAccess: 'days',
      careNote: 'Return is measured in days and depends on the launch window and a ready vehicle.',
      gcrDailyLimit: 0.8, gravity: '1/6 g'
    },
    mars: {
      id: 'mars', name: 'Mars surface base', domain: 'space', owDelaySec: 1200,
      delayNote: 'Up to about 20 minutes each way, so roughly 40 minutes round trip, and there are communication blackouts (NASA HRP).',
      careAccess: 'none',
      careNote: 'Return is tied to a launch window measured in months. For medical purposes there is no evacuation.',
      gcrDailyLimit: 0.8, gravity: '3/8 g'
    },
    /* A hypothetical destination. There is no verified radiation environment,
       gravity value or evacuation profile for an exoplanet surface, so this
       context states that plainly and applies no environmental threshold at
       all. Body-based indicators still work, because the body does not change
       when the destination is speculative. An operator may enter mission
       parameters, and anything derived from them is marked operator-supplied
       rather than verified. */
    hypothetical: {
      id: 'hypothetical', name: 'Hypothetical destination (operator-defined)', domain: 'space', owDelaySec: 1200,
      delayNote: 'Unknown. Treated as Earth-independent, because for any destination beyond Mars that is the safe assumption rather than an optimistic one.',
      careAccess: 'none',
      careNote: 'Assumed to be none. No evacuation profile exists for a destination that has not been flown.',
      gcrDailyLimit: null, gravity: 'operator-defined',
      unverified: true
    },
    /* Terrestrial analogues. Same engine, same provenance discipline. The
       radiation and CO2 indicators simply go unused, and care access does
       the work that signal delay does in deep space. */
    earth: {
      id: 'earth', name: 'Earth surface (reference)', domain: 'earth', owDelaySec: 1,
      delayNote: 'Normal terrestrial communications. A clinician is reachable without delay.',
      careAccess: 'hours',
      careNote: 'Ordinary access to care. This context exists so that a crewmember’s preflight and postflight readings sit in the same record as their in-flight ones.',
      gcrDailyLimit: null, gravity: '1 g'
    },
    polar: {
      id: 'polar', name: 'Polar station, winter', domain: 'earth', owDelaySec: 1,
      delayNote: 'Satellite link, so a clinician can be reached in near real time.',
      careAccess: 'none',
      careNote: 'Through the winter season, flights in and out are not possible. Care is whatever the station and the crew can do on site.',
      gcrDailyLimit: null, gravity: '1 g'
    },
    vessel: {
      id: 'vessel', name: 'Vessel at sea', domain: 'earth', owDelaySec: 1,
      delayNote: 'Satellite telemedicine is reachable, subject to bandwidth.',
      careAccess: 'days',
      careNote: 'Diversion to a port, or a helicopter transfer within range of a coast, is measured in days on an ocean passage.',
      gcrDailyLimit: null, gravity: '1 g'
    },
    offshore: {
      id: 'offshore', name: 'Offshore platform or remote site', domain: 'earth', owDelaySec: 1,
      delayNote: 'Connectivity is normally good enough for telemedicine.',
      careAccess: 'hours',
      careNote: 'Medical evacuation by helicopter is possible in hours, but it is weather-dependent and costly, so the decision to call it is the thing that needs supporting.',
      gcrDailyLimit: null, gravity: '1 g'
    }
  };

  /* ------------------------------------------------------------------ *
   * 4. INDICATORS
   * ------------------------------------------------------------------ */

  var BANDS = { ok: 0, watch: 1, alert: 2, info: -1, unknown: -2 };

  function band(name, label, why, action, escalate) {
    return { band: name, bandLabel: label, why: why, action: action, escalate: !!escalate };
  }

  var indicators = [
    {
      id: 'bp_sys',
      capture: 'device',
      label: 'Blood pressure, systolic',
      unit: 'mmHg',
      system: 'cardio',
      min: 60, max: 260, step: 1,
      cadence: 'weekly',
      why: 'The higher number: the pressure while the heart contracts. In flight, fluid shifts headward and the cardiovascular system is unloaded, so your in-flight numbers can drift away from your preflight baseline.',
      how: 'Sit or restrain yourself still for five minutes first. Cuff on bare upper arm at heart level. Do not take it straight after exercise, caffeine or an EVA.',
      origin: 'clinical',
      originNote: 'Bands are the ACC/AHA adult categories. There is no separate published in-flight blood pressure band, so read these against your own preflight baseline. Limits of this choice: these are US categories (European guidelines draw the lines differently), written for diagnosing hypertension on Earth from repeated readings, not for a single in-flight reading. In the one study of 24-hour blood pressure on the ISS (Norsk 2015, eight male astronauts) pressure in flight ran 8 to 10 mmHg below the same person on the ground, so a reading these bands call normal can still be high for you.',
      sources: ['aha_bp', 'aha_bp_2025', 'norsk_bp'],
      evaluate: function (v) {
        if (v > 180) return band('alert', 'Severe range', 'Above 180 mmHg systolic is the ACC/AHA severe range.', 'Rest five minutes and repeat. If it is still above 180, contact the flight surgeon now and do not wait for the next scheduled conference.', true);
        if (v >= 140) return band('alert', 'Stage 2 range', '140 mmHg or above is the ACC/AHA stage 2 category.', 'Repeat on two further days. Report at the next private medical conference, sooner if you have headache, chest discomfort or vision change.', true);
        if (v >= 130) return band('watch', 'Stage 1 range', '130-139 mmHg is the ACC/AHA stage 1 category.', 'Recheck daily for three days and log it. Mention it at the next private medical conference.', false);
        if (v >= 120) return band('watch', 'Elevated', '120-129 mmHg is the ACC/AHA elevated category.', 'Keep logging weekly. No action needed on its own.', false);
        if (v < 90) return band('watch', 'Low', 'Below 90 mmHg systolic, which is worth noting if you also feel light-headed.', 'Check hydration and recent fluid intake. Report if you feel faint, especially after exercise or a suit run.', false);
        return band('ok', 'Normal range', 'Below 120 mmHg is the ACC/AHA normal category.', 'Nothing to do. Keep the weekly log going.', false);
      }
    },
    {
      id: 'bp_dia',
      capture: 'device',
      label: 'Blood pressure, diastolic',
      unit: 'mmHg',
      system: 'cardio',
      min: 30, max: 160, step: 1,
      cadence: 'weekly',
      why: 'The lower number: the pressure while the heart rests between beats.',
      how: 'Recorded from the same measurement as the systolic value.',
      origin: 'clinical',
      originNote: 'ACC/AHA adult categories.',
      sources: ['aha_bp', 'aha_bp_2025', 'norsk_bp'],
      evaluate: function (v) {
        if (v > 120) return band('alert', 'Severe range', 'Above 120 mmHg diastolic is the ACC/AHA severe range.', 'Rest five minutes and repeat. If still above 120, contact the flight surgeon now.', true);
        if (v >= 90) return band('alert', 'Stage 2 range', '90 mmHg or above is the ACC/AHA stage 2 category.', 'Repeat on two further days and report at the next private medical conference.', true);
        if (v >= 80) return band('watch', 'Stage 1 range', '80-89 mmHg is the ACC/AHA stage 1 category.', 'Recheck daily for three days and log it.', false);
        if (v < 50) return band('watch', 'Low', 'Below 50 mmHg diastolic.', 'Check hydration. Report if you feel light-headed.', false);
        return band('ok', 'Normal range', 'Below 80 mmHg is the ACC/AHA normal category.', 'Nothing to do.', false);
      }
    },
    {
      id: 'hr',
      capture: 'device',
      label: 'Resting heart rate',
      unit: 'bpm',
      system: 'cardio',
      min: 25, max: 220, step: 1,
      cadence: 'daily',
      why: 'Beats per minute at rest. A resting rate that climbs over several days, with nothing else to explain it, is an early and non-specific sign of infection, dehydration, poor sleep or deconditioning.',
      how: 'Measure before you get up and before exercise or caffeine. Count for a full 60 seconds, or read it from a chest strap.',
      origin: 'clinical+operational',
      originNote: 'The 60-100 bpm normal range is the AHA adult reference. The split between watch and alert outside that range is a Team 3S triage choice, not a published standard. Trained crew often sit below 60 bpm when healthy.',
      sources: ['aha_hr'],
      evaluate: function (v) {
        if (v > 110) return band('alert', 'High', 'Above 110 bpm at rest. The AHA calls anything above 100 bpm at rest tachycardia.', 'Check that you are genuinely at rest and rested. Take your temperature and check hydration. If it persists across two readings, contact the flight surgeon.', true);
        if (v > 100) return band('watch', 'Above normal range', 'Above the AHA normal range of 60-100 bpm.', 'Repeat when properly at rest. Take your temperature and log fluid intake.', false);
        if (v < 45) return band('alert', 'Low', 'Below 45 bpm at rest. The AHA calls anything below 60 bpm bradycardia, which is common in trained people, but this is below that again.', 'If you feel faint, breathless or unusually tired, contact the flight surgeon. If you are highly trained and feel completely well, log it and compare against your preflight baseline.', true);
        if (v < 60) return band('watch', 'Below normal range', 'Below the AHA normal range of 60-100 bpm, which is common in trained crew.', 'Compare against your own preflight baseline. No action if this is normal for you and you feel well.', false);
        return band('ok', 'Normal range', 'Within the AHA normal range of 60-100 bpm.', 'Nothing to do.', false);
      }
    },
    {
      id: 'temp',
      capture: 'device',
      label: 'Body temperature',
      unit: 'degC',
      system: 'immune',
      min: 33, max: 42, step: 0.1,
      cadence: 'daily',
      why: 'Immune function changes in spaceflight and latent viruses can reactivate, so a fever matters more here than it would on the ground. A closed cabin also spreads an infection through the whole crew quickly.',
      how: 'Oral or tympanic thermometer. Not straight after exercise, a hot drink or an EVA.',
      origin: 'clinical+operational',
      originNote: 'The fever threshold of 38.0 C is the CDC definition. The 37.5-37.9 C watch band and the 35.0 C low cut-off are Team 3S triage choices. Two things make this band weaker in flight than on Earth. Resting core temperature has been measured about 1 C higher after two and a half months on the ISS (Stahn 2017), so a reading in the watch band may simply be your in-flight normal. And mouth, ear and armpit thermometers can disagree with core temperature by more than half a degree (Niven 2015, 75 studies). Compare with your own in-flight baseline, and treat a single reading as a prompt, not a finding. The 38.0 C line does not allow for where the reading was taken, and sites do not agree with each other (Niven 2015), so always measure at the same site as your baseline.',
      sources: ['cdc_fever', 'stahn_cbt', 'niven_thermo'],
      evaluate: function (v) {
        if (v >= 39.0) return band('alert', 'High fever', '39.0 C or above.', 'Contact the flight surgeon now. Start the crew infection protocol: isolate where the vehicle allows it, mask, separate your hygiene and food items, and record who you have been in close contact with.', true);
        if (v >= 38.0) return band('alert', 'Fever', '38.0 C or above meets the CDC definition of fever.', 'Report to the flight surgeon. Begin the crew infection protocol and log symptoms every six hours. In a closed cabin, assume the rest of the crew is exposed.', true);
        if (v >= 37.5) return band('watch', 'Slightly raised', '37.5-37.9 C, below the CDC fever threshold but above a typical resting value.', 'Recheck in four hours. Note any sore throat, cough, rash or wound.', false);
        if (v < 35.0) return band('alert', 'Low', 'Below 35.0 C, which is the level at which terrestrial guidance says to seek care.', 'Confirm the thermometer and the measurement route. If the reading is real, contact the flight surgeon now and check cabin and suit thermal settings.', true);
        return band('ok', 'Normal range', 'No fever by the CDC definition.', 'Nothing to do.', false);
      }
    },
    {
      id: 'glucose',
      capture: 'device',
      label: 'Fasting blood glucose',
      unit: 'mg/dL',
      system: 'metabolic',
      min: 30, max: 500, step: 1,
      cadence: 'monthly',
      why: 'Spaceflight has been associated with reduced insulin sensitivity, and the in-flight diet and activity pattern are both unusual. This is a slow indicator: the trend over a mission matters more than any single reading.',
      how: 'Eight hours without food. Finger-stick glucometer, logged with the time of your last meal.',
      origin: 'clinical',
      originNote: 'ADA fasting plasma glucose bands. These are diagnostic categories for terrestrial clinical use, not spaceflight standards, and a single reading does not diagnose anything. The ADA criteria are defined on venous plasma in a laboratory; a fingertip meter reads capillary blood and is less exact, so a meter reading near a boundary cannot place you on either side of it. The US National Institutes of Health says the same: diagnosis requires a laboratory test and meter results are not suitable.',
      sources: ['ada_glucose', 'ada_soc_2026', 'hortensius_glucose', 'niddk_dx', 'niddk_tests_pro'],
      evaluate: function (v) {
        if (v < 70) return band('alert', 'Low', 'Below 70 mg/dL is the ADA threshold for hypoglycaemia.', 'Take fast-acting carbohydrate now and retest in 15 minutes. Do not start an EVA or any critical task. Report it.', true);
        if (v >= 126) return band('alert', 'Diabetes range', '126 mg/dL or above is the ADA diabetes range on a fasting sample.', 'Confirm you were genuinely fasting, then repeat on another day. Report to the flight surgeon: this needs a confirmed second sample, not a single reading.', true);
        if (v >= 100) return band('watch', 'Impaired fasting glucose range', '100-125 mg/dL is the ADA impaired fasting glucose range.', 'Repeat at the next scheduled draw. Mention it at the next private medical conference.', false);
        return band('ok', 'Normal range', '70-99 mg/dL is the ADA normal fasting range.', 'Nothing to do.', false);
      }
    },
    {
      id: 'sleep',
      capture: 'device',
      label: 'Sleep last night',
      unit: 'h',
      system: 'behavioural',
      min: 0, max: 14, step: 0.25,
      cadence: 'daily',
      why: 'NASA schedules 8.5 hours of sleep per night, but across more than 4,200 in-flight nights the measured average was about 6 hours, and crews reached 7 hours or more on only 24% of ISS nights. Short sleep degrades exactly the cognitive performance that a Mars crew has to rely on.',
      how: 'Hours actually asleep, not hours in the sleep station. Read it from actigraphy if you are wearing it.',
      origin: 'nasa+peer-reviewed',
      originNote: 'The 8.5 hour schedule and the ~6 hour observed average are from NASA and Barger 2014. The 7 hour anchor used for the bands here is the threshold Barger 2014 measured against, not a NASA requirement. Barger 2014 is observational (wrist actigraphy on shuttle and ISS crews, mostly men) and shows what crews slept, not what they needed; the adult sleep recommendation itself is the AASM and Sleep Research Society consensus (Watson 2015).',
      sources: ['barger_sleep', 'watson_sleep', 'cdc_sleep'],
      evaluate: function (v) {
        if (v < 5) return band('alert', 'Severely short', 'Under 5 hours, well below both the 8.5 hour schedule and the ~6 hour in-flight average.', 'Protect the next sleep period: no task slips into it. Review light exposure and caffeine timing. Report if this is the third short night in a row, before it becomes a performance problem on a critical task.', true);
        if (v < 6) return band('watch', 'Short', 'Under 6 hours, which is below the measured in-flight average.', 'Check what cut it short: noise, light, workload, a slam-shift. Fix the controllable one tonight.', false);
        if (v < 7) return band('watch', 'Below target', '6-7 hours. Crews reached 7 hours or more on only 24% of ISS nights, so this is common, not harmless.', 'Keep the sleep period intact and log again tomorrow.', false);
        if (v > 11) return band('watch', 'Unusually long', 'Over 11 hours.', 'Note it alongside mood and temperature. Long sleep with low mood or fever is worth reporting.', false);
        return band('ok', 'At or above 7 hours', '7 hours or more, which was achieved on under a quarter of ISS nights.', 'Nothing to do. This is the good case.', false);
      }
    },
    {
      id: 'mood',
      effortMin: 1,   /* Team 3S planning estimate, not measured. See EFFORT_NOTE. */
      capture: 'self',
      label: 'Mood and stress self-check',
      unit: 'scale 1-5',
      system: 'behavioural',
      min: 1, max: 5, step: 1,
      cadence: 'daily',
      why: 'Isolation and confinement is one of the five NASA hazards, and behavioural health conditions are among the risks it carries. A daily one-tap rating is not a diagnosis: it exists so that a downward run of several days is visible to you before it is visible to anyone else.',
      how: '1 is very low, 3 is neutral, 5 is very good. Rate today, not the mission.',
      origin: 'operational',
      originNote: 'This scale and its bands are a Team 3S design choice. No NASA standard defines a numeric mood threshold, and this is a self-tracking prompt, not a validated psychological instrument.',
      sources: ['hrp_hazards'],
      evaluate: function (v) {
        if (v <= 2) return band('watch', 'Low', 'A low self-rating today.', 'One low day is ordinary. Use the crew support you already have: a private psychological conference, a family call, or simply telling a crewmate. If low days are stacking up, raise it rather than waiting for a scheduled slot.', false);
        if (v === 3) return band('ok', 'Neutral', 'A neutral self-rating.', 'Nothing to do.', false);
        return band('ok', 'Good', 'A good self-rating.', 'Nothing to do.', false);
      }
    },
    {
      id: 'co2',
      capture: 'device',
      label: 'Cabin CO2 partial pressure',
      unit: 'mmHg',
      system: 'head',
      domains: ['space'],
      min: 0, max: 12, step: 0.1,
      cadence: 'daily',
      why: 'In a sealed cabin, CO2 builds up unless it is scrubbed. On ISS, crews reported symptoms at levels long thought safe: fatigue and fullness in the head from about 2.3 mmHg, and headaches above about 3.0 mmHg. 19 of 49 astronauts in one analysis reported headaches, and each 1 mmHg rise doubled the odds of one.',
      how: 'Read it from the cabin air monitor, not from your body. Log the 24-hour average if the system gives you one.',
      origin: 'nasa',
      originNote: 'NASA-STD-3001 Vol 2 Rev D [V2 6004] limits the one-hour average to no more than 3 mmHg. NASA OCHMO states that keeping 7-day average CO2 below 2.5 mmHg is what holds headache risk under 1%. Note the mismatch this tool does not hide: both published limits are averages, over one hour and over seven days, while the reading shown here is a spot value. A single spot value above 3 mmHg is not by itself a breach of [V2 6004]; it is a reason to look at the trend. Law 2014 found the odds of a reported headache doubled for each 1 mmHg rise, and Law 2015 reports crew symptoms from 2.3 mmHg upward, which is why this tool flags earlier than the standard does.',
      sources: ['ochmo_co2', 'law_co2', 'law_co2_ops'],
      evaluate: function (v) {
        if (v > 3.0) return band('alert', 'Above the NASA-STD-3001 limit', 'Above 3 mmHg, which exceeds the [V2 6004] one-hour average limit. Headaches have been reported in this range.', 'This is a vehicle problem, not a personal one. Report the level, check the CO2 removal assembly status, improve air mixing where you are working, and avoid stacking demanding cognitive tasks until it comes down.', true);
        if (v >= 2.5) return band('watch', 'Above the headache-risk target', '2.5-3.0 mmHg. Still inside the [V2 6004] limit, but above the 2.5 mmHg 7-day average that NASA links to under 1% headache risk.', 'Log any headache or fullness in the head against this number. Check scrubber performance and whether you are working in a pocket of poor circulation.', false);
        if (v >= 2.3) return band('watch', 'Symptom onset range', 'From about 2.3 mmHg, ISS crews have reported fatigue and fullness in the head.', 'Note symptoms alongside the level. No vehicle action needed yet.', false);
        return band('ok', 'Within target', 'Below 2.3 mmHg, under both the NASA limit and the headache-risk target.', 'Nothing to do.', false);
      }
    },
    {
      id: 'rad_career',
      capture: 'device',
      label: 'Career radiation dose to date',
      unit: 'mSv',
      system: 'whole',
      domains: ['space'],
      min: 0, max: 1200, step: 1,
      cadence: 'weekly',
      why: 'NASA caps an individual career effective dose at less than 600 mSv, set to hold the mean excess risk of cancer death at 3% above baseline. This limit is the same for all ages and sexes. It is a career budget, so what you spend on this mission is gone for every future one.',
      how: 'Read it from your personal dosimeter plus your recorded career total. This is a cumulative figure, not a rate.',
      origin: 'nasa',
      originNote: 'NASA-STD-3001 Vol 1 [V1 4030]: career effective dose shall be less than 600 mSv. The 50% and 80% band splits used here are Team 3S planning choices, not NASA thresholds.',
      sources: ['std3001v1', 'ochmo_rad', 'nasem_rad'],
      evaluate: function (v) {
        var pct = (v / 600) * 100;
        var p = Math.round(pct);
        if (v >= 600) return band('alert', 'At or above the career limit', p + '% of the 600 mSv career limit in [V1 4030].', 'Stop and report. Dose budget decisions at this level are not a crew call: they belong to the flight surgeon and the programme.', true);
        if (pct >= 80) return band('alert', 'Above 80% of the career limit', p + '% of the 600 mSv career limit.', 'Flag to the flight surgeon for mission planning. Apply ALARA deliberately: minimise time in less shielded modules and during EVAs where the task allows.', true);
        if (pct >= 50) return band('watch', 'Above half the career limit', p + '% of the 600 mSv career limit.', 'Keep logging. Worth knowing before you accept further long-duration assignments.', false);
        return band('ok', 'Within budget', p + '% of the 600 mSv career limit.', 'Nothing to do. Keep applying ALARA.', false);
      }
    },
    {
      id: 'rad_event',
      capture: 'device',
      label: 'Dose from this solar particle event',
      unit: 'mSv',
      system: 'whole',
      domains: ['space'],
      min: 0, max: 600, step: 1,
      cadence: 'event',
      why: 'A solar particle event delivers a large dose in hours, not months. NASA limits a crewmember to an effective dose of less than 250 mSv from the design reference event, specifically to avoid acute effects such as nausea, vomiting and fatigue.',
      how: 'Read the event dose from the area monitor or your personal dosimeter during and after the event.',
      origin: 'nasa',
      originNote: 'NASA-STD-3001 Vol 1 [V1 4031]: short-term limit of 250 mSv per solar particle event. The 60% watch split is a Team 3S planning choice.',
      sources: ['std3001v1', 'ochmo_rad', 'nasem_rad'],
      evaluate: function (v) {
        if (v >= 250) return band('alert', 'At or above the per-event limit', 'At or above the 250 mSv per-event limit in [V1 4031].', 'Stay in the storm shelter. Report immediately and start logging for acute symptoms: nausea, vomiting, fatigue. This is a reportable exceedance.', true);
        if (v >= 150) return band('alert', 'Approaching the per-event limit', 'Above 150 mSv against a 250 mSv per-event limit.', 'Remain in the best-shielded volume until the event is declared over. Report the running total.', true);
        if (v > 0) return band('watch', 'Event in progress', 'Below 150 mSv against the 250 mSv per-event limit.', 'Shelter as directed and keep logging the running total.', false);
        return band('ok', 'No event dose logged', 'Nothing recorded for the current event.', 'Nothing to do.', false);
      }
    },
    {
      id: 'exercise',
      capture: 'device',
      label: 'Exercise completed today',
      unit: 'min',
      system: 'musculo',
      min: 0, max: 300, step: 5,
      cadence: 'daily',
      why: 'Without loading, bone and muscle are lost. ISS crews train about 600 minutes a week across resistive and aerobic devices, and astronauts with access to the advanced resistive device, together with adequate energy intake and vitamin D status, returned with bone mineral density close to preflight. Exercise is the countermeasure, not a fitness hobby.',
      how: 'Total minutes of resistive plus aerobic exercise actually completed today.',
      origin: 'peer-reviewed+operational',
      originNote: 'The ~600 min/week figure (range 450-720) is from Scott 2023 on 46 ISS crewmembers, and is also the figure in NASA OCHMO-TB-031. Exercise is prescribed about 6 days a week, not 7, so the ~100 min figure used here is that weekly total divided by six training days. Sources disagree on actual daily minutes: Scott 2023 reports about 110 min/day, while NASA/SP-20250000273 describes about 27 min aerobic plus 30-60 min resistive inside a 2.5 h block, the remainder being setup and stow. The weekly total is the figure the sources agree on, so it is the one to judge against. Real prescriptions are individual and are set by the ground.',
      sources: ['scott_countermeasures', 'ochmo_exercise', 'smith_bone'],
      evaluate: function (v) {
        if (v === 0) return band('watch', 'None logged', 'No exercise logged today. The ISS pattern is about 6 training days a week, so one zero day may be the scheduled rest day.', 'If this was the rest day, nothing is wrong. If the session was cut for operations, say so in the log and reschedule it: bone and muscle respond to the weekly dose, not to any single day.', false);
        if (v < 60) return band('watch', 'Well below a training day', 'Under 60 minutes on a training day, against about 100 minutes for a full session.', 'Add the resistive session if that is what was dropped: it is the part tied to bone.', false);
        if (v < 85) return band('watch', 'Below a full session', 'Under about 100 minutes, the ~600 min/week ISS total spread over 6 training days.', 'Close the gap over the week. The weekly total is what the evidence is based on.', false);
        return band('ok', 'In line with the ISS pattern', 'In line with the ~600 min/week ISS total spread over 6 training days.', 'Nothing to do. This is the single most protective thing on this list.', false);
      }
    },
    {
      id: 'vision',
      effortMin: 3,   /* Team 3S planning estimate, not measured. See EFFORT_NOTE. */
      capture: 'self',
      label: 'Vision self-check',
      unit: 'result',
      system: 'head',
      kind: 'categorical',
      options: [
        { value: 0, label: 'No change', band: 'ok' },
        { value: 1, label: 'Near vision harder than before', band: 'watch' },
        { value: 2, label: 'Amsler grid distortion, or new blind spot', band: 'alert' }
      ],
      cadence: 'weekly',
      why: 'Long-duration flight produces a set of eye and optic nerve changes called Spaceflight Associated Neuro-ocular Syndrome. In one ISS series, 48% of crew reported reduced near visual acuity after long-duration flight, and NASA treats SANS as a critical risk for a Mars mission. Crews carry "space anticipation glasses" for exactly this.',
      how: 'NASA uses distance and near acuity, an Amsler grid on a laptop, ocular ultrasound and OCT on orbit. This app runs the Amsler grid part: cover one eye, look at the centre dot, and report any line that bends or any patch that disappears. Repeat for the other eye.',
      origin: 'nasa',
      originNote: 'The screening items mirror the on-orbit vision exam described by NASA (Brunstetter). This is a screening prompt, not a diagnosis: diagnosis needs the imaging that only the ground or on-board OCT can provide. Peer-reviewed basis: Mader 2011 (the original series of seven astronauts) and Lee 2020 (review). The Brunstetter item is a NASA presentation, not a peer-reviewed paper.',
      sources: ['brunstetter_sans', 'lee_sans', 'mader_sans'],
      evaluate: function (v) {
        if (v >= 2) return band('alert', 'New distortion or blind spot', 'A bent line or a missing patch on the Amsler grid is a positive screen, not a normal finding.', 'Report to the flight surgeon and request the full ocular protocol: acuity, ultrasound and OCT. Note which eye and when it started. Do not wait for the next scheduled conference.', true);
        if (v >= 1) return band('watch', 'Near vision harder', 'Reduced near acuity is the most commonly reported SANS symptom, affecting 48% of crew in one long-duration series.', 'Log it with the date. Try your anticipation glasses and record which power helps. Report at the next private medical conference.', false);
        return band('ok', 'No change', 'Negative screen this week.', 'Nothing to do. Repeat weekly.', false);
      }
    },
    {
      id: 'sit_stand',
      effortMin: 2,   /* Team 3S planning estimate, not measured. See EFFORT_NOTE. */
      capture: 'self',
      label: 'Sit-to-stand test',
      unit: 's',
      system: 'musculo',
      min: 0, max: 120, step: 0.1,
      cadence: 'weekly',
      why: 'One of the sensorimotor functional tests NASA collects. You rise from a seated position and hold still for ten seconds. After time without gravity, standing up and staying steady is harder, and that is exactly the capability needed on a planetary surface or after landing.',
      how: 'Time from the moment you start rising until you are upright and stationary. Then hold still for ten seconds. Record the seconds taken to rise.',
      origin: 'none',
      originNote: 'No verified numeric threshold is applied. NASA uses this test, but this team has not verified a published cut-off, so it is reported against the crewmember\u2019s own preflight time rather than given a band.',
      sources: ['ntrs_sm', 'nasa_sm'],
      evaluate: function () {
        return band('info', 'Trend only', 'No threshold is applied, because no verified cut-off is held for this test.', 'Compare against your own preflight time. Report a sustained increase to the flight surgeon.', false);
      }
    },
    {
      id: 'tandem_walk',
      effortMin: 2,   /* Team 3S planning estimate, not measured. See EFFORT_NOTE. */
      capture: 'self',
      label: 'Tandem walk, eyes closed',
      unit: 'steps',
      system: 'musculo',
      min: 0, max: 30, step: 1,
      cadence: 'weekly',
      why: 'The second sensorimotor test NASA collects: walking heel-to-toe with the eyes closed. It isolates balance from vision, which is the sense that compensates when the inner ear has adapted to weightlessness.',
      how: 'Walk heel-to-toe in a straight line with your eyes closed. Record how many consecutive steps you manage before stepping off the line or opening your eyes.',
      origin: 'none',
      originNote: 'No verified numeric threshold is applied. Reported against the crewmember\u2019s own preflight performance, not a published cut-off.',
      sources: ['ntrs_sm', 'nasa_sm'],
      evaluate: function () {
        return band('info', 'Trend only', 'No threshold is applied, because no verified cut-off is held for this test.', 'Compare against your own preflight count. A falling count over weeks is worth reporting.', false);
      }
    },
    {
      id: 'immune_sx',
      effortMin: 3,   /* Team 3S planning estimate, not measured. See EFFORT_NOTE. */
      capture: 'self',
      label: 'Immune symptom check',
      unit: 'result',
      system: 'immune',
      kind: 'categorical',
      options: [
        { value: 0, label: 'Nothing to report', band: 'ok' },
        { value: 1, label: 'Rash, allergy or hypersensitivity', band: 'watch' },
        { value: 2, label: 'Infection, or a wound healing slowly', band: 'watch' }
      ],
      cadence: 'weekly',
      why: 'NASA pairs its immune blood work with a questionnaire covering allergies, rashes, hypersensitivities, infections and slow wound healing. Immune function changes in flight and latent viruses can reactivate, and these are the signs a crewmember can see without a laboratory.',
      how: 'Check skin, any wounds, and anything that feels like an allergy or infection. Report what you see, not what you think it means.',
      origin: 'nasa',
      originNote: 'The items mirror the immunology questionnaire in NASA Spaceflight Standard Measures. The bands are a Team 3S reporting choice: no questionnaire score is published, so nothing is scored, only flagged.',
      sources: ['ntrs_sm', 'nasa_sm'],
      evaluate: function (v) {
        if (v >= 2) return band('watch', 'Infection or slow healing', 'Infection and delayed wound healing are the immune findings NASA asks crews to report.', 'Report it with the date it started. Take your temperature now and again in four hours, and keep the wound clean and covered.', true);
        if (v >= 1) return band('watch', 'Skin or allergy finding', 'Rashes and hypersensitivities are on the NASA immunology questionnaire.', 'Log where it is and when it started. Photograph it if the crew medical kit allows. Mention it at the next private medical conference.', false);
        return band('ok', 'Nothing to report', 'Negative check this week.', 'Nothing to do. Repeat weekly.', false);
      }
    },
    {
      id: 'mass',
      capture: 'device',
      label: 'Body mass',
      unit: 'kg',
      system: 'metabolic',
      min: 30, max: 160, step: 0.1,
      cadence: 'weekly',
      why: 'Energy intake is part of the bone countermeasure: the ISS bone results depended on adequate energy intake and vitamin D status alongside resistive exercise. Sustained mass loss suggests the crew is not eating enough to make the exercise count.',
      how: 'Use the on-board mass measurement device at the same point in the day each week.',
      origin: 'none',
      originNote: 'No verified numeric threshold. NASA-STD-3001 defines permissible outcome limits, but this team has not verified a specific percentage, so this indicator is shown as a trend only and deliberately carries no band. Do not read a colour into it.',
      sources: ['smith_bone'],
      evaluate: function () {
        return band('info', 'Trend only', 'No threshold is applied, because this team has not verified a published in-flight limit for mass change.', 'Watch the direction over weeks against your own preflight baseline. Report a sustained downward trend to the flight surgeon together with your food logs.', false);
      }
    }
  ];

  /* ------------------------------------------------------------------ *
   * NASA SPACEFLIGHT STANDARD MEASURES COVERAGE
   *
   * NASA's own core dataset has six areas. This map states, for each one this build measures in,
   * what NASA collects and what this tool actually captures — including
   * the four areas it cannot capture at all. Claiming coverage of a
   * blood assay or a microbiome sequence would be the same fabrication
   * as inventing a threshold, so the gaps are listed as gaps.
   * ------------------------------------------------------------------ */

  var standardMeasures = [
    {
      id: 'bhp', name: 'Behavioural health and performance',
      nasa: 'A questionnaire on waking covering sleep quality and quantity, and one before sleep covering mood, team cohesion and crew habitability. A ten-test computerised Cognition battery. Activity and light exposure from a wrist sensor.',
      ours: ['sleep', 'mood'],
      coverage: 'partial',
      gap: 'No Cognition battery and no team or habitability questions. The battery is a validated instrument, not something to approximate, and interpreting it would be a clinical judgement this configuration does not make.',
      challengeRisk: 'Behavioural health conditions',
      sources: ['nasa_sm', 'ntrs_sm']
    },
    {
      id: 'cardio', name: 'Cardiovascular',
      nasa: 'Blood pressure and heart rate, plus carotid intima-media thickness measured before and after flight.',
      ours: ['bp_sys', 'bp_dia', 'hr'],
      coverage: 'partial',
      gap: 'No carotid intima-media thickness. That is an ultrasound measurement needing a trained operator and image interpretation, which would move this product into regulated medical-device software.',
      challengeRisk: 'Cardiovascular events',
      sources: ['ntrs_sm', 'nasa_sm']
    },
    {
      id: 'sensorimotor', name: 'Sensorimotor',
      nasa: 'Functional tests of movement and balance, including a Sit-to-Stand test and a Tandem Walk performed heel-to-toe with eyes open and closed, alongside heart rate and blood pressure.',
      ours: ['sit_stand', 'tandem_walk'],
      coverage: 'partial',
      gap: 'Body kinematics are not captured, which needs motion tracking. The two functional tests themselves need no hardware, so they are here, scored against the crewmember’s own preflight performance rather than any published cut-off.',
      challengeRisk: 'Altered gravity, balance and mobility',
      sources: ['ntrs_sm', 'nasa_sm']
    },
    {
      id: 'immunology', name: 'Cellular profile and immunology',
      nasa: 'Blood and saliva samples for cellular profile, with a questionnaire on allergies, rashes, hypersensitivities, infections and wound healing.',
      ours: ['temp', 'immune_sx'],
      coverage: 'partial',
      gap: 'No cellular assay. Blood and saliva analysis needs laboratory hardware that is not aboard. The questionnaire is here because it needs none.',
      challengeRisk: 'Immune system changes',
      sources: ['ntrs_sm', 'nasa_sm']
    },
    {
      id: 'biochemistry', name: 'Biochemistry',
      nasa: 'Blood and urine analytes covering nutrition, bone turnover, liver function and stress markers.',
      ours: ['glucose', 'mass'],
      coverage: 'minimal',
      gap: 'Only a finger-stick glucose and body mass. The full panel needs venous draws and analysers. Bone turnover markers in particular cannot be approximated from anything measurable here, so bone loss is tracked through the exercise countermeasure instead of directly.',
      challengeRisk: 'Bone density loss, inadequate nutrition',
      sources: ['ntrs_sm', 'nasa_sm']
    }
  ];

  function coverageOf(id) {
    for (var i = 0; i < standardMeasures.length; i++) {
      if (standardMeasures[i].id === id) return standardMeasures[i];
    }
    return null;
  }

  var systems = [
    { id: 'head', name: 'Head, eyes and cabin air', plain: 'Vision changes and the effects of cabin CO2.' },
    { id: 'cardio', name: 'Heart and circulation', plain: 'Blood pressure and resting heart rate.' },
    { id: 'musculo', name: 'Bone and muscle', plain: 'Loading, and the exercise that protects it.' },
    { id: 'immune', name: 'Immune and infection', plain: 'Temperature, and spread within a closed cabin.' },
    { id: 'metabolic', name: 'Metabolic and nutrition', plain: 'Glucose and body mass.' },
    { id: 'behavioural', name: 'Sleep and behavioural health', plain: 'Sleep duration and daily mood self-check.' },
    { id: 'whole', name: 'Whole-body radiation', plain: 'Career dose budget and solar particle events.' }
  ];

  /* ------------------------------------------------------------------ *
   * 5. LOOKUPS AND EVALUATION
   * ------------------------------------------------------------------ */

  function getIndicator(id) {
    for (var i = 0; i < indicators.length; i++) {
      if (indicators[i].id === id) return indicators[i];
    }
    return null;
  }

  function getSystem(id) {
    for (var i = 0; i < systems.length; i++) {
      if (systems[i].id === id) return systems[i];
    }
    return null;
  }

  function getHazard(id) {
    for (var i = 0; i < hazards.length; i++) {
      if (hazards[i].id === id) return hazards[i];
    }
    return null;
  }


/* ---- solar particle environment ------------------------------------
 * The one part of a crewmember's environment that changes hour to hour and
 * is published openly in real time. NOAA SWPC flies high-energy proton
 * detectors on the GOES satellites and serves the integral flux as JSON at
 * services.swpc.noaa.gov/json/goes/ with no key. The NOAA S-scale maps that
 * flux onto severity, and S3 is where a significant radiation hazard to
 * crew on EVA begins.
 *
 * This function is pure: it classifies a flux value. Fetching belongs to
 * the caller, so the classification can be tested without a network and
 * cannot silently invent a value when the link to the ground is down.
 */
var SPE_SCALE = [
  { s:'S5', min:100000, label:'Extreme',  eva:'no',      crew:'Shelter in the most shielded volume available and stay there. EVA is out of the question.' },
  { s:'S4', min:10000,  label:'Severe',   eva:'no',      crew:'Move to the most shielded volume. No EVA. Expect the event dose to climb fast.' },
  { s:'S3', min:1000,   label:'Strong',   eva:'no',      crew:'Significant radiation hazard on EVA. Defer or cut short any excursion and move inboard.' },
  { s:'S2', min:100,    label:'Moderate', eva:'review',  crew:'Minor radiation risk on EVA. Review any planned excursion with the flight surgeon before going out.' },
  { s:'S1', min:10,     label:'Minor',    eva:'ok',      crew:'No biological effect expected. Worth knowing before planning an excursion.' },
  { s:'S0', min:0,      label:'Quiet',    eva:'ok',      crew:'Background. Nothing to act on.' }
];

/* flux: integral proton flux >=10 MeV in pfu (protons cm^-2 s^-1 sr^-1).
 * Pass null or undefined when the value is unknown; the result says so
 * rather than defaulting to quiet. */
function spaceWeather(flux, observedAt, env){
  if(flux === null || flux === undefined || !isFinite(flux)){
    return {
      known: false, s: null, label: 'Unknown', flux: null, observedAt: observedAt || null,
      band: 'unknown',
      why: 'No reading. The solar particle environment is not known right now, which is not the same as it being quiet.',
      action: 'Treat radiation planning on the last known figure and its time, not on silence.',
      representative: false
    };
  }
  var row = SPE_SCALE.filter(function(r){ return flux >= r.min; })[0] || SPE_SCALE[SPE_SCALE.length - 1];

  /* GOES measures at geosynchronous orbit, inside Earth's magnetosphere's
     reach. For a vehicle in low Earth orbit it is a good proxy; beyond the
     magnetosphere it is an indication of solar activity, not of the dose
     where the crew actually is. Saying so is the difference between using
     the data and misusing it. */
  var near = (env === 'iss' || env === 'earth' || env === 'polar' || env === 'vessel' || env === 'offshore');
  var band = flux >= 1000 ? 'alert' : flux >= 100 ? 'watch' : flux >= 10 ? 'info' : 'ok';

  return {
    known: true,
    s: row.s,
    label: row.label,
    flux: flux,
    observedAt: observedAt || null,
    eva: row.eva,
    band: band,
    why: 'GOES measured ' + flux + ' pfu at or above 10 MeV. The NOAA S-scale puts that at ' + row.s + ', ' + row.label.toLowerCase() + '.',
    action: row.crew,
    representative: near,
    caveat: near
      ? 'Measured at geosynchronous orbit, which is a reasonable proxy for this vehicle.'
      : 'Measured at geosynchronous orbit near Earth. Beyond the magnetosphere this indicates solar activity, not the dose where this crew is: it is a warning that an event is under way, not a measurement of their exposure.'
  };
}

  function indicatorsForSystem(sysId) {
    return indicators.filter(function (ind) { return ind.system === sysId; });
  }

  /**
   * Does this indicator apply in this environment? An indicator with no
   * `domains` applies everywhere. Cabin CO2 and spaceflight radiation do
   * not apply on a ship or at a polar station, so they are hidden there
   * rather than shown as perpetually missing data.
   */
  function appliesTo(indicatorOrId, environmentId) {
    var ind = typeof indicatorOrId === 'string' ? getIndicator(indicatorOrId) : indicatorOrId;
    if (!ind) return false;
    var env = environments[environmentId] || environments.iss;
    if (!ind.domains) return true;
    return ind.domains.indexOf(env.domain) !== -1;
  }

  function activeIndicators(environmentId) {
    return indicators.filter(function (ind) { return appliesTo(ind, environmentId); });
  }

  /**
   * Evaluate a single reading. Returns null when the indicator is unknown.
   * A null/undefined/non-finite value yields band 'unknown' rather than a guess.
   */
  /* ---- self-challenge ------------------------------------------------
   * A challenge feature inside a health monitor can work directly against
   * the monitor. "Beat your record" pushes hardest on the days the record
   * is saying recover, and the population this runs on — isolated, confined,
   * no evacuation — is exactly the one that pushes through warning signs
   * because the mission needs them.
   *
   * So two rules hold this to something defensible:
   *
   * 1. It is a CONSISTENCY game, never an intensity game. Everything it
   *    counts is "did you show up": sessions done, days moved, length of
   *    streak. It never asks for a longer or harder session than last time,
   *    and it never sets a training target derived from a health reading.
   *    That line is also the regulatory one: withholding a challenge
   *    because of a measurement is wellness, prescribing intensity from a
   *    measurement is clinical decision support.
   *
   * 2. It WITHHOLDS when the record says recover. Short sleep, an open
   *    alert, or activity already running above this person's own norm, and
   *    there is no target to chase that day. Completing a recovery day
   *    still counts for the streak, so resting is never punished.
   *
   * It never compares one crewmember with another. Ranking people who
   * cannot get away from each other turns a private record into a social
   * one, and that is a crew problem, not a feature.
   */
  function bestStreak(log, todayIso) {
    /* Longest run of complete, moved days anywhere in the record. Streak
       length is the one personal best that is safe to maximise: a longer
       streak means showing up more often, not training harder. */
    var dailyIds = indicators.filter(function (i) { return i.cadence === 'daily'; })
                             .map(function (i) { return i.id; });
    var days = Object.keys(log || {}).sort();
    var best = 0, run = 0, prev = null;
    days.forEach(function (d) {
      var e = log[d];
      var complete = dailyIds.every(function (id) {
        return e[id] !== undefined && e[id] !== null && e[id] !== '';
      });
      var moved = Number(e.exercise) > 0;
      var contiguous = prev === null || daysBetween(prev, d) === 1;
      if (complete && moved && contiguous) run += 1;
      else if (complete && moved) run = 1;
      else run = 0;
      if (run > best) best = run;
      prev = d;
    });
    return best;
  }

  /* ---- challenges the crewmember sets themselves ---------------------
   * Who sets the target is the whole distinction. This software may never
   * derive a training target from a health reading \u2014 that is clinical
   * decision support. A person choosing their own goal is not that; it is
   * their plan, and the app's job is to count it honestly and to get out of
   * the way on the days their own record says rest.
   *
   * So custom challenges are allowed to be about volume, which the built-in
   * ones are not. What the app still never does is PROPOSE a bigger one.
   * It will tell you that you beat your own best week. It will not suggest
   * next week's should be larger.
   */
  var DISCIPLINES = [
    { id:'strength', name:'Muscle strengthening',
      note:'Resistive work. On ISS this is the ARED; the point is loading bone and muscle that microgravity unloads.' },
    { id:'cardio', name:'Cardio',
      note:'Treadmill or cycle ergometer. Aerobic capacity falls measurably without it.' },
    { id:'mobility', name:'Mobility and flexibility',
      note:'Range of motion, often neglected and the usual source of niggles after a long EVA.' },
    { id:'balance', name:'Balance and coordination',
      note:'Sensorimotor work. Relevant to standing up and staying steady after a gravity transition.' }
  ];
  function getDiscipline(id){
    return DISCIPLINES.filter(function (x) { return x.id === id; })[0] || null;
  }

  var OBJECTIVES = [
    { id:'sessions', name:'Sessions a week', unit:'sessions',
      note:'Counts times you showed up, whatever the session was.' },
    { id:'days',     name:'Days a week',     unit:'days',
      note:'Counts separate days, so two sessions in one day still count once.' },
    { id:'minutes',  name:'Minutes a week',  unit:'min',
      note:'Counts total time. You set the number; the app never raises it for you.' }
  ];

  /* Sessions are stored per day as _sessions:[{d:disciplineId,m:minutes}].
     The plain `exercise` total is kept alongside so every existing reading,
     band and trend goes on working untouched. */
  function sessionsOn(log, iso, disciplineId) {
    var day = (log && log[iso]) || {};
    var list = day._sessions || [];
    return disciplineId ? list.filter(function (x) { return x.d === disciplineId; }) : list;
  }

  function weekTotals(log, def, todayIso, weeks) {
    weeks = weeks || 6;
    var out = [];
    for (var w = weeks - 1; w >= 0; w--) {
      var end = shiftDay(todayIso, -7 * w);
      var have = 0, dayHits = 0;
      for (var i = 0; i < 7; i++) {
        var iso = shiftDay(end, -i);
        var ss = sessionsOn(log, iso, def.discipline);
        if (!ss.length) continue;
        dayHits += 1;
        if (def.type === 'sessions') have += ss.length;
        else if (def.type === 'minutes') {
          ss.forEach(function (x) { have += Number(x.m) || 0; });
        }
      }
      if (def.type === 'days') have = dayHits;
      out.push({ endsOn: end, value: Math.round(have), current: w === 0 });
    }
    return out;
  }

  function challengeProgress(log, def, todayIso) {
    var weeks = weekTotals(log, def, todayIso, 6);
    var cur = weeks[weeks.length - 1];
    var past = weeks.slice(0, -1);
    var best = 0;
    past.forEach(function (w) { if (w.value > best) best = w.value; });
    var target = Number(def.target) || 0;
    return {
      have: cur.value, target: target,
      pct: target > 0 ? Math.min(1, cur.value / target) : 0,
      done: target > 0 && cur.value >= target,
      weeks: weeks, best: best,
      beatBest: past.length > 0 && cur.value > best,
      unit: (OBJECTIVES.filter(function (o) { return o.id === def.type; })[0] || {}).unit || ''
    };
  }

  /* Reactive, and deliberately narrow. It reports what happened; it never
     proposes a bigger target, and on a withheld day it says the opposite of
     "almost there", because pressing someone toward a goal on a day the
     record says recover is the exact failure this whole tab is built to
     avoid. */
  function encouragement(progress, withheld) {
    if (withheld) {
      return { tone:'rest',
        text:'Paused today. Your record says recover, so this one is not counting against you.' };
    }
    if (progress.done && progress.beatBest) {
      return { tone:'best',
        text:'Best week yet \u2014 ' + progress.have + ' ' + progress.unit +
             ', past your previous best of ' + progress.best + '.' };
    }
    if (progress.done) {
      return { tone:'done',
        text:'Done for the week: ' + progress.have + ' of ' + progress.target + ' ' + progress.unit + '.' };
    }
    var left = Math.max(0, progress.target - progress.have);
    if (progress.pct >= 0.75) {
      return { tone:'close',
        text:'Almost there \u2014 ' + left + ' ' + progress.unit + ' to go.' };
    }
    if (progress.have === 0) {
      return { tone:'start', text:'Nothing logged for this one yet this week.' };
    }
    return { tone:'going',
      text: progress.have + ' of ' + progress.target + ' ' + progress.unit + ' so far this week.' };
  }

  /* ---- sleep regularity -----------------------------------------------
   * How close this crewmember's bedtimes have been to each other, which is
   * not the same question as how long they slept. A crew on a shifting
   * timeline can sleep enough every night and still be scattered, and the
   * scatter is what the circadian literature cares about.
   *
   * Defined here rather than borrowed: it is the mean absolute deviation of
   * bedtime from this person's own median bedtime, expressed against a
   * 90-minute window. Nothing is read off a published scale, so the figure
   * is reported as what it is \u2014 a description of their own spread \u2014 and
   * carries no band.
   */
  function sleepRegularity(log, todayIso, days) {
    days = days || 7;
    var beds = [];
    for (var i = 0; i < days; i++) {
      var d = log[shiftDay(todayIso, -i)];
      if (d && typeof d._bed === 'number') beds.push(d._bed);
    }
    if (beds.length < 3) {
      return { enough: false, pct: null,
        text: 'Three nights or more are needed before a spread means anything.' };
    }
    var sorted = beds.slice().sort(function (a, b) { return a - b; });
    var med = sorted[Math.floor(sorted.length / 2)];
    var dev = 0;
    beds.forEach(function (b) { dev += Math.abs(b - med); });
    dev = dev / beds.length;
    var pct = Math.max(0, Math.min(100, Math.round(100 - (dev / 90) * 100)));
    return {
      enough: true, pct: pct, medianBed: med, meanDeviation: Math.round(dev), nights: beds.length,
      /* The spread is measured; expressing it against a 90-minute window to
         make a percentage is our choice, so the percentage carries no more
         authority than the minutes it came from. */
      origin: 'none',
      originNote: 'The spread in minutes is measured. Turning it into a percentage ' +
                  'uses a 90-minute window chosen by this team, not a published scale.',
      text: 'Across ' + beds.length + ' nights your bedtime sat within about '
            + Math.round(dev) + ' minutes of your usual one.'
    };
  }

  /* Minutes past midnight into a clock string, wrapping past midnight so a
     23:40 bedtime and an 07:10 wake read correctly on the same night. */
  function clockOf(mins) {
    if (typeof mins !== 'number' || !isFinite(mins)) return null;
    var m = ((Math.round(mins) % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), r = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (r < 10 ? '0' : '') + r;
  }

  function nightShape(day) {
    if (!day || !day._sleepStages) return null;
    var bed = typeof day._bed === 'number' ? day._bed : null;
    var total = 0, deep = 0, light = 0, rem = 0, awake = 0, toSleep = 0, seen = false;
    day._sleepStages.forEach(function (seg) {
      total += seg.m;
      /* 'deep'/'light' are the older two-stage records; N3 is slow-wave
         sleep and N1+N2 are the light stages, so both vocabularies land
         in the same totals and an old record still reads correctly. */
      if (seg.s === 'n3' || seg.s === 'deep') { deep += seg.m; seen = true; }
      else if (seg.s === 'rem') { rem += seg.m; seen = true; }
      else if (seg.s === 'n1' || seg.s === 'n2' || seg.s === 'light') { light += seg.m; seen = true; }
      else { awake += seg.m; if (!seen) toSleep += seg.m; }
    });
    return {
      bed: bed, wake: bed === null ? null : bed + total,
      bedText: clockOf(bed), wakeText: bed === null ? null : clockOf(bed + total),
      total: total, deep: deep, light: light, rem: rem, awake: awake, toSleep: toSleep,
      stages: day._sleepStages
    };
  }

  /* ---- saying it in the right words, for the right distance ----------
   * The environment already decides which indicators exist. It did not
   * decide what the advice SAYS, which meant an offshore platform was told
   * to raise a reading "at the next private medical conference" \u2014 a
   * spaceflight term that does not exist there \u2014 and a Mars crew twenty
   * minutes from an answer got the same words as an ISS crew that can be
   * home in hours. The terrestrial deployments are the whole argument for
   * this being a product rather than a demo, so that gap mattered.
   *
   * Two separate things are fixed here, deliberately kept apart:
   *
   *   speakFor()   swaps VOCABULARY by domain. Same clinical content, the
   *                words used where the crewmember actually is.
   *   escalation() adds what to do about getting HELP, chosen by the
   *                self-reliance rank that selfRelianceLevel() already
   *                computed from signal delay and evacuation access.
   *
   * What a person does for themselves \u2014 recheck, protect the sleep period,
   * review light exposure \u2014 is identical everywhere, because physiology
   * does not care where you are. Only the help clause moves.
   */
  var VOCAB = [
    [/\bflight surgeon\b/gi,              'duty doctor'],
    [/\bprivate medical conference\b/gi,  'scheduled medical call'],
    [/\bthe ground\b/gi,                  'your support team'],
    [/\bmission control\b/gi,             'your operations room'],
    [/\bthe vehicle\b/gi,                 'the station']
  ];

  function speakFor(text, env) {
    var e = typeof env === 'string' ? environments[env] : env;
    if (!text || !e || e.domain === 'space') return text || '';
    var out = String(text);
    VOCAB.forEach(function (pair) { out = out.replace(pair[0], pair[1]); });
    return out;
  }

  function escalation(env) {
    var e = typeof env === 'string' ? environments[env] : env;
    if (!e) return null;
    var rank = selfRelianceLevel(e);
    var far = e.owDelaySec >= 60;
    var who = e.domain === 'space' ? 'the flight surgeon' : 'the duty doctor';

    if (rank === 0) {
      return { rank: rank, label: 'Help is close',
        text: 'Report it on the next contact. ' + who.charAt(0).toUpperCase() + who.slice(1)
              + ' can answer the same day, and evacuation is possible within hours if it comes to that.' };
    }
    if (rank === 1) {
      return { rank: rank, label: 'Help takes days',
        text: 'Raise it at the next scheduled contact rather than waiting to see. Evacuation from here '
              + 'takes days, so a decision made early is worth more than a better picture made late.' };
    }
    return { rank: rank, label: 'No evacuation',
      text: 'There is no evacuation from here. Decide on board with what you have'
            + (far ? ', and remember a question takes ' + formatDelay(e.owDelaySec) + ' to answer' : '')
            + '. Send it anyway, so the record exists and ' + who + ' can follow it.' };
  }

  function challenge(log, todayIso, env, opts) {
    opts = opts || {};
    log = log || {};
    var day = log[todayIso] || {};
    var hold = [];

    /* --- the gate. Any one of these and nothing is offered today. --- */
    var sl = Number(day.sleep);
    if (isFinite(sl) && sl > 0 && sl < 6) {
      hold.push({
        id: 'sleep',
        why: 'You logged ' + sl + ' h of sleep. Training through short sleep is how an ' +
             'ordinary week becomes an injury, and the gain is not there to be had anyway.'
      });
    }

    /* Only an alert about THIS PERSON withholds a target. An environmental
       alert \u2014 cabin CO2, accumulated dose \u2014 says something about the
       vehicle, not about whether they are recovered, and it can stand for
       weeks. Gating on it would park the feature permanently in recovery
       mode, and a gate that never opens is not a safeguard: it is a dead
       screen that teaches the crewmember to stop looking. Those alerts are
       surfaced here instead, and handled where they belong. */
    var environmental = { co2:1, rad_career:1, rad_event:1 };
    var noted = [];
    (opts.results || []).forEach(function (r) {
      if (r.band !== 'alert') return;
      if (environmental[r.id]) { noted.push(r); return; }
      hold.push({
        id: 'alert:' + r.id,
        why: (r.label || r.id) + ' is outside its expected range today. That gets dealt with before anything ' +
             'is added on top of it.'
      });
    });

    var dev = activityDeviation(log, todayIso, opts);
    if (dev.enough && dev.direction === 'above' && (dev.band === 'watch' || dev.band === 'alert')) {
      hold.push({
        id: 'ramp',
        why: 'Activity is already running above your own norm. A target on top of that is ' +
             'the wrong direction; holding steady is the discipline that counts.'
      });
    }

    if (hold.length) {
      return {
        offered: false,
        recovery: true,
        hold: hold,
        streak: streak(log, todayIso),
        best: bestStreak(log, todayIso),
        noted: noted,
        /* Resting must count, or the streak quietly punishes it and the
           gate becomes something to avoid triggering. */
        title: 'Today is a recovery day',
        text: 'No target today. Taking the day does not break your streak \u2014 it is ' +
              'part of it.',
        deviation: dev
      };
    }

    /* --- what is on offer. Showing up, in three sizes. --- */
    var moved = Number(day.exercise) > 0;
    var week = series(log, 'exercise', 7);
    var daysMoved = week.filter(function (p) { return Number(p.value) > 0; }).length;
    var cur = streak(log, todayIso), best = bestStreak(log, todayIso);

    var items = [
      { id: 'today', title: 'Finish today\u2019s session',
        note: 'Any session you had planned. The clock is in this tab.',
        done: moved, have: moved ? 1 : 0, need: 1, unit: 'session' },
      { id: 'week', title: 'Move on six days this week',
        note: 'Six of seven is the shape of a normal training week, not a stretch goal.',
        done: daysMoved >= 6, have: daysMoved, need: 6, unit: 'days' },
      { id: 'streak', title: best > cur ? 'Reach your longest run of complete days'
                                        : 'Extend your longest run of complete days',
        note: best > cur
          ? 'Your longest is ' + best + ' days. This counts complete days, not hard ones.'
          : 'You are at your longest run. Every day from here sets it.',
        done: best > 0 && cur >= best, have: cur, need: Math.max(best, cur, 1), unit: 'days' }
    ];

    return {
      offered: true,
      recovery: false,
      hold: [],
      items: items,
      noted: noted,
      streak: cur,
      best: best,
      title: 'Open challenges',
      text: 'All of these are about showing up. Nothing here asks for more than the ' +
            'session you already had planned.',
      deviation: dev
    };
  }

  function evaluate(id, value) {
    var ind = getIndicator(id);
    if (!ind) return null;
    var out = {
      id: id,
      label: ind.label,
      unit: ind.unit,
      system: ind.system,
      origin: ind.origin,
      originNote: ind.originNote,
      sources: ind.sources,
      value: value
    };
    if (value === null || value === undefined || value === '' || !isFinite(Number(value))) {
      out.band = 'unknown';
      out.bandLabel = 'Not logged';
      out.why = 'No value recorded.';
      out.action = 'Log a value to get an assessment.';
      out.escalate = false;
      return out;
    }
    var res = ind.evaluate(Number(value));
    out.band = res.band;
    out.bandLabel = res.bandLabel;
    out.why = res.why;
    out.action = res.action;
    out.escalate = res.escalate;
    return out;
  }

  function worstBand(bandNames) {
    var worst = 'unknown';
    var worstRank = -3;
    for (var i = 0; i < bandNames.length; i++) {
      var r = BANDS[bandNames[i]];
      if (r === undefined) continue;
      if (r > worstRank) { worstRank = r; worst = bandNames[i]; }
    }
    return worst;
  }

  /**
   * Evaluate a whole day's readings object {indicatorId: value}.
   */
  function evaluateDay(readings) {
    readings = readings || {};
    var results = [];
    for (var i = 0; i < indicators.length; i++) {
      var id = indicators[i].id;
      if (Object.prototype.hasOwnProperty.call(readings, id)) {
        results.push(evaluate(id, readings[id]));
      } else {
        results.push(evaluate(id, null));
      }
    }
    return results;
  }

  function systemStatus(results) {
    var out = {};
    for (var s = 0; s < systems.length; s++) {
      var sysId = systems[s].id;
      var bandsHere = results
        .filter(function (r) { return r.system === sysId && r.band !== 'unknown' && r.band !== 'info'; })
        .map(function (r) { return r.band; });
      out[sysId] = bandsHere.length ? worstBand(bandsHere) : 'unknown';
    }
    return out;
  }

  /**
   * Hazard load: for each of the five NASA hazards, the worst band among the
   * indicators mapped to it. 'distance' has no indicators; it is driven by the
   * selected environment's signal delay instead.
   */
  function hazardStatus(results, environmentId) {
    var env = environments[environmentId] || environments.iss;
    var out = [];
    for (var h = 0; h < hazards.length; h++) {
      var hz = hazards[h];
      var mapped = results.filter(function (r) { return hz.indicators.indexOf(r.id) !== -1; });
      var scored = mapped.filter(function (r) { return r.band !== 'unknown' && r.band !== 'info'; });
      var st;
      if (hz.id === 'distance') {
        var lvl = selfRelianceLevel(env);
        st = lvl === 2 ? 'watch' : 'ok';
      } else {
        st = scored.length ? worstBand(scored.map(function (r) { return r.band; })) : 'unknown';
      }
      out.push({
        id: hz.id,
        name: hz.name,
        plain: hz.plain,
        band: st,
        drivers: scored.filter(function (r) { return r.band === 'alert' || r.band === 'watch'; }),
        logged: scored.length,
        mapped: hz.indicators.length,
        sources: hz.sources
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 6. EARTH-INDEPENDENCE BRIEFING
   * ------------------------------------------------------------------ */

  function formatDelay(sec) {
    if (sec < 2) return 'about ' + (sec < 1.5 ? '1' : '1.3') + ' s each way';
    if (sec < 120) return 'about ' + Math.round(sec) + ' s each way';
    return 'up to about ' + Math.round(sec / 60) + ' min each way';
  }

  /**
   * Self-reliance level, 0-2. The worse of the two constraints: how long an
   * answer takes, and whether anyone can reach you at all.
   *   0 - support is available and evacuation is available
   *   1 - one of the two is degraded
   *   2 - you are on your own for this one
   */
  function selfRelianceLevel(env) {
    var askRank = env.owDelaySec >= 60 ? 2 : 0;
    var reachRank = (CARE[env.careAccess] || CARE.hours).rank;
    return Math.max(askRank, reachRank);
  }

  /**
   * Split the current findings into what the crew starts now versus what
   * needs the ground, and say plainly how far away the ground is.
   */
  function briefing(results, environmentId) {
    var env = environments[environmentId] || environments.iss;
    var alerts = results.filter(function (r) { return r.band === 'alert'; });
    var watches = results.filter(function (r) { return r.band === 'watch'; });
    var escalations = results.filter(function (r) { return r.escalate && (r.band === 'alert' || r.band === 'watch'); });
    var rt = env.owDelaySec * 2;
    var level = selfRelianceLevel(env);
    var care = CARE[env.careAccess] || CARE.hours;
    var posture;
    if (level === 0) posture = 'Ground support and evacuation are both available. Report, then follow direction.';
    else if (level === 1) posture = 'Partly on your own. Start care yourself and expect to continue it for a while.';
    else posture = 'Earth-independent. Assume you treat this yourself, to completion.';
    return {
      environment: env.name,
      domain: env.domain,
      gravity: env.gravity,
      delayOneWay: env.owDelaySec,
      delayText: formatDelay(env.owDelaySec),
      delayNote: env.delayNote,
      roundTripText: rt < 10 ? 'an answer comes back in seconds' : 'no answer before about ' + Math.round(rt / 60) + ' min',
      careAccess: care.id,
      careLabel: care.label,
      careNote: env.careNote,
      selfReliance: level,
      posture: posture,
      earthIndependent: level === 2,
      alerts: alerts,
      watches: watches,
      escalations: escalations,
      gcrDailyLimit: env.gcrDailyLimit
    };
  }

  /* ------------------------------------------------------------------ *
   * 6a. EDUCATION
   *
   * Plain explanations of the conditions this tool actually watches for.
   * Every entry names its sources, and no entry exists for a condition
   * this team cannot cite. A gap in the library is left as a gap: the
   * crew's own medical procedures cover what is not here, and inventing
   * an explainer to fill a hole would undo the point of the library.
   * ------------------------------------------------------------------ */

  var education = [
    {
      id: 'bone_muscle',
      title: 'Bone and muscle loss',
      also: 'Disuse atrophy, spaceflight bone loss',
      indicators: ['exercise', 'mass'],
      what: 'Bone and muscle keep their strength by being loaded. In weightlessness there is nothing to push against, so the body gives up tissue it is not using. It is not a disease. It is the body doing exactly what it does on Earth when a limb is in a cast, only applied to all of you at once.',
      why: 'Without gravity there is no load through the legs, hips and spine. Bone resorption rises while formation stays flat or falls, and lower-body muscle loses mass and strength over weeks.',
      evidence: 'Astronauts with access to the advanced resistive exercise device, with adequate energy intake and vitamin D status, came back from ISS missions with bone mineral density close to preflight. ISS crews train roughly 600 minutes a week across resistive and aerobic devices.',
      doing: [
        'Do the resistive session. It is the part tied to bone, so if only one session fits the timeline, make it that one.',
        'Squat, deadlift and heel raise load the hip and spine, which are the sites that matter most.',
        'Eat the full meal plan. The bone result depended on energy intake and vitamin D as well as the exercise.',
        'Log a missed session with its reason, so the ground sees the cause and not just the gap.'
      ],
      ground: 'Pain during or after loading. Any sudden drop in what you can lift. A sustained fall in body mass.',
      sources: ['smith_bone', 'scott_countermeasures', 'hrp_hazards']
    },
    {
      id: 'sans',
      title: 'Vision changes in flight',
      also: 'Spaceflight Associated Neuro-ocular Syndrome, SANS',
      indicators: ['vision'],
      what: 'A set of changes to the eye and optic nerve that appear during long missions: the back of the eye can flatten, the optic disc can swell, and near vision often gets harder. Crews carry spare glasses for it.',
      why: 'The leading explanation is the headward fluid shift of weightlessness, with no diurnal relief because you cannot stand up in space. The mechanism is still not settled, which is itself worth knowing.',
      evidence: 'In one long-duration series, 48% of crew reported reduced near visual acuity after flight. NASA treats SANS as a critical risk for a Mars mission. On orbit it is watched with acuity tests, an Amsler grid, ocular ultrasound and OCT.',
      doing: [
        'Do the weekly Amsler check properly: one eye at a time, looking at the centre dot.',
        'Report any line that bends or any patch that disappears. That is a positive screen, not a normal finding.',
        'Use the anticipation glasses and record which power helps.'
      ],
      ground: 'Any new distortion or blind spot. Request the full ocular protocol rather than waiting for the next scheduled conference.',
      sources: ['brunstetter_sans', 'lee_sans', 'mader_sans']
    },
    {
      id: 'co2',
      title: 'Cabin carbon dioxide',
      also: 'CO2 headache, elevated ppCO2',
      indicators: ['co2'],
      what: 'In a sealed cabin, the CO2 you breathe out builds up unless it is scrubbed. Long before it is dangerous it makes people tired, fuzzy-headed and prone to headaches.',
      why: 'There is no outside air to dilute it. Removal depends entirely on hardware, and pockets of poor circulation can sit well above the cabin average.',
      evidence: 'ISS crews have reported fatigue and fullness in the head from about 2.3 mmHg, and headaches above about 3.0 mmHg. In one analysis 19 of 49 astronauts reported headaches, and each 1 mmHg rise doubled the odds of one. NASA-STD-3001 limits the one-hour average to 3 mmHg.',
      doing: [
        'Treat it as a vehicle problem, because it is one. Report the level.',
        'Check the CO2 removal assembly status and improve air mixing where you are working.',
        'Avoid stacking demanding cognitive work until it comes down.',
        'Log any headache against the number, so the link is visible in the record.'
      ],
      ground: 'Any reading above 3 mmHg, and any headache that does not settle when the level falls.',
      sources: ['ochmo_co2', 'law_co2', 'law_co2_ops']
    },
    {
      id: 'radiation',
      title: 'Space radiation exposure',
      also: 'Galactic cosmic rays, solar particle events',
      indicators: ['rad_career', 'rad_event'],
      what: 'Radiation you cannot see or feel, arriving constantly as galactic cosmic rays and in bursts during solar particle events. It is measured and added up rather than sensed.',
      why: 'Outside the Earth’s magnetic field there is far less shielding. Galactic cosmic rays are hard to stop; shielding helps more against solar particle events.',
      evidence: 'NASA caps an individual career effective dose at less than 600 mSv, set to hold the mean excess risk of cancer death at 3% above baseline, the same limit for all ages and sexes. A single solar particle event is limited to 250 mSv to avoid acute effects such as nausea, vomiting and fatigue.',
      doing: [
        'Apply ALARA deliberately: minimise time in less shielded modules where the task allows it.',
        'During an event, stay in the storm shelter until it is declared over.',
        'Keep the dosimeter reporting. A gap in the reading is a gap in your career record, and dose accrues either way.'
      ],
      ground: 'Any event dose approaching 250 mSv, and any career total past 80% of the limit, which is a mission-planning conversation.',
      sources: ['std3001v1', 'ochmo_rad', 'nasem_rad']
    },
    {
      id: 'sleep',
      title: 'Sleep in spaceflight',
      also: 'Sleep deficiency, circadian misalignment',
      indicators: ['sleep'],
      what: 'Crews are scheduled plenty of sleep and reliably get less. It is the most common unaddressed problem in spaceflight, and it degrades exactly the judgement a crew has to rely on.',
      why: 'Light at the wrong times, noise, workload, rapid schedule shifts around docking, and the ordinary difficulty of sleeping somewhere strange.',
      evidence: 'NASA schedules 8.5 hours a night. Across more than 4,200 in-flight nights the measured average was about 6 hours, and crews reached 7 hours or more on only 24% of ISS nights. Sleep deficiency had already built up during training, before launch.',
      doing: [
        'Protect the sleep period: do not let a task slip into it.',
        'Review light exposure in the hours before sleep, and caffeine timing.',
        'Note what cut it short, so the fixable cause is visible rather than guessed at.'
      ],
      ground: 'Three short nights in a row, before it becomes a performance problem on a critical task.',
      sources: ['barger_sleep', 'watson_sleep', 'cdc_sleep']
    },
    {
      id: 'immune',
      title: 'Infection in a closed cabin',
      also: 'Immune changes, crew illness',
      indicators: ['temp'],
      what: 'Immune function changes in flight and latent viruses can reactivate, so an infection matters more here than it would on the ground. A sealed cabin also shares it with the whole crew quickly.',
      why: 'The stress of spaceflight alters immune regulation, and a closed environment recycles its own air and microbes.',
      evidence: 'NASA lists hostile closed environments among the five hazards of human spaceflight, with immune system changes among the health risks that follow from them.',
      doing: [
        'Take the temperature and log it rather than guessing from how you feel.',
        'Start the crew infection protocol at the first fever: isolate where the vehicle allows, mask, separate hygiene and food items.',
        'Record close contacts. In a sealed volume, assume the rest of the crew is exposed.'
      ],
      ground: 'Any temperature of 38.0 C or above, and anything above 39.0 C immediately.',
      sources: ['hrp_hazards', 'cdc_fever']
    },
    {
      id: 'isolation',
      title: 'Isolation and confinement',
      also: 'Behavioural health in long missions',
      indicators: ['mood', 'sleep'],
      what: 'A small crew, a small volume, a long time, and no way to walk away from any of it. It shows up in sleep and mood before it shows up in performance.',
      why: 'Isolation and confinement is one of the five hazards NASA names, and behavioural health conditions are among the risks it carries.',
      evidence: 'NASA treats behavioural health as a monitored risk on long-duration missions and builds countermeasures around lighting, scheduling and crew support rather than treating it as a personal matter.',
      doing: [
        'Use the daily check honestly. One low day is ordinary; a run of them is the thing worth seeing.',
        'Use the support that already exists: a private psychological conference, a family call, or telling a crewmate.',
        'Raise it rather than waiting for a scheduled slot if the low days are stacking up.'
      ],
      ground: 'Whenever you want it. This is also the one area whose notes stay out of the automatic downlink.',
      sources: ['hrp_hazards']
    },
    {
      id: 'neuro_spaceflight',
      title: 'Why neurological function is watched on long missions',
      also: 'Brain tissue flown on the ISS',
      indicators: ['mood', 'vision', 'tandem_walk'],
      what: 'Human cortical organoids - small pieces of brain tissue grown from human stem '
          + 'cells - were cultured on the International Space Station for 40 days on SpaceX-30, '
          + 'alongside identical tissue kept on the ground.',
      why: 'It is the reason this tool asks about cognition, vision and balance at all on a long '
         + 'mission, rather than treating them as things that only matter once something feels wrong.',
      evidence: 'NASA OSDR dataset OSD-941 reports that spaceflight reshaped metabolic and '
              + 'synaptic programmes relevant to Alzheimer\'s disease biology in that tissue, '
              + 'including altered glycolytic activity and changes in amyloid-beta processing '
              + 'and tau phosphorylation. READ THE LIMITS WITH THE FINDING: this is cultured '
              + 'tissue, not a crewmember, and nothing in it describes any individual. Three of '
              + 'the four cell lines carry familial Alzheimer\'s mutations, so they model that '
              + 'disease rather than a typical astronaut. The authors call the findings '
              + 'exploratory, the biological sample is about three per group, and the direction '
              + 'of the amyloid and tau changes varied between genetic backgrounds. It tells you '
              + 'why to watch. It says nothing about what any reading of yours means, and '
              + 'nothing here prevents or treats any disease.',
      doing: [
        'Keep taking the weekly balance and vision checks even when nothing feels wrong: the point is the trend, not any single result.',
        'Report a change you notice yourself, in your own words, through Record my journey.',
        'Raise anything persistent at the next private medical conference.'
      ],
      ground: 'Nothing here is a reason to act on its own. It is background for why the schedule asks.',
      sources: ['osdr_osd941', 'osdr', 'hrp_hazards']
    }
  ];

  function getEducation(id) {
    for (var i = 0; i < education.length; i++) { if (education[i].id === id) return education[i]; }
    return null;
  }

  /** The explainers that touch a given indicator, for a "learn more" link. */
  function educationFor(indicatorId) {
    return education.filter(function (e) { return e.indicators.indexOf(indicatorId) !== -1; });
  }

  /* ------------------------------------------------------------------ *
   * 6b. HARDWARE
   *
   * A missing reading must never look like a normal one. Every sensor
   * reports when it was last heard from, and silence is itself a finding:
   * the system says "not connected" or "stale", never a last-known value
   * dressed up as current.
   * ------------------------------------------------------------------ */

  var sensors = [
    { id: 'wearable', name: 'Wearable band', feeds: ['hr'], staleHours: 2,
      plain: 'Heart rate, variability, SpO₂ and skin temperature.' },
    { id: 'sleep_watch', name: 'Sleep watch', feeds: ['sleep'], staleHours: 30,
      plain: 'Wrist actigraph, worn through the night. It reports the night once a day.' },
    { id: 'pulse_ox', name: 'Pulse oximeter', feeds: [], staleHours: 744,
      plain: 'Fingertip clip for a spot check of blood oxygen. No reading from it is banded in this tool.' },
    { id: 'exercise_hw', name: 'Exercise machines', feeds: ['exercise'], staleHours: 72,
      plain: 'The resistive device, treadmill and cycle log each session; those minutes are the exercise figure.' },
    { id: 'bp_cuff', name: 'Blood-pressure cuff', feeds: ['bp_sys', 'bp_dia'], staleHours: 192,
      plain: 'Used weekly, so it is expected to be quiet between sessions.' },
    { id: 'thermometer', name: 'Thermometer', feeds: ['temp'], staleHours: 30,
      plain: 'Daily, and more often when anything is raised.' },
    { id: 'glucometer', name: 'Glucometer', feeds: ['glucose'], staleHours: 744,
      plain: 'Monthly fasting sample.' },
    { id: 'mass_device', name: 'Mass measurement device', feeds: ['mass'], staleHours: 192,
      plain: 'Weekly, at the same point in the day.' },
    { id: 'cabin_monitor', name: 'Cabin air monitor', feeds: ['co2'], staleHours: 3, domains: ['space'],
      plain: 'CO₂ partial pressure. This one is continuous, so silence matters quickly.' },
    { id: 'dosimeter', name: 'Personal dosimeter', feeds: ['rad_career', 'rad_event'], staleHours: 26, domains: ['space'],
      plain: 'Radiation dose. Dose accrues whether or not it is being read, so a gap is a gap in the career record.' },
    { id: 'suit_telemetry', name: 'Suit telemetry', feeds: [], staleHours: 1, domains: ['space'], evaOnly: true,
      plain: 'Live only during an EVA.' }
  ];

  function getSensor(id) {
    for (var i = 0; i < sensors.length; i++) { if (sensors[i].id === id) return sensors[i]; }
    return null;
  }

  function sensorsFor(environmentId, evaActive) {
    var env = environments[environmentId] || environments.iss;
    return sensors.filter(function (s) {
      if (s.domains && s.domains.indexOf(env.domain) === -1) return false;
      if (s.evaOnly && !evaActive) return false;
      return true;
    });
  }

  /**
   * state: { sensorId: { connected: bool, lastSeen: epoch ms } }
   * Anything absent from `state` is reported as never heard from, not as fine.
   */
  function sensorStatus(state, nowMs, environmentId, evaActive) {
    state = state || {};
    nowMs = nowMs || Date.now();
    return sensorsFor(environmentId, evaActive).map(function (s) {
      var rec = state[s.id];
      var out = { id: s.id, name: s.name, plain: s.plain, feeds: s.feeds, staleHours: s.staleHours };
      if (!rec) {
        out.band = 'watch';
        out.status = 'Never connected';
        out.action = 'Pair ' + s.name.toLowerCase() + ' before relying on the readings it feeds.';
        out.ageHours = null;
        return out;
      }
      if (rec.connected === false) {
        out.band = 'alert';
        out.status = 'Not connected';
        out.action = 'Reconnect ' + s.name.toLowerCase() + '. Until it is back, the readings it feeds are not being collected, and nothing here is estimating them.';
        out.ageHours = rec.lastSeen ? (nowMs - rec.lastSeen) / 3600000 : null;
        return out;
      }
      var age = rec.lastSeen ? (nowMs - rec.lastSeen) / 3600000 : null;
      out.ageHours = age;
      if (age === null) {
        out.band = 'watch';
        out.status = 'Connected, nothing received';
        out.action = 'Take one reading to confirm the link is working.';
      } else if (age > s.staleHours * 2) {
        out.band = 'alert';
        out.status = 'Silent for ' + fmtAge(age);
        out.action = 'Check ' + s.name.toLowerCase() + '. Silence this long is a hardware problem, not a quiet patch.';
      } else if (age > s.staleHours) {
        out.band = 'watch';
        out.status = 'Last heard ' + fmtAge(age) + ' ago';
        out.action = 'Overdue. Take a reading, or check the link.';
      } else {
        out.band = 'ok';
        out.status = 'Reporting, last heard ' + fmtAge(age) + ' ago';
        out.action = 'Nothing to do.';
      }
      return out;
    });
  }

  function fmtAge(h) {
    if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min';
    if (h < 48) return Math.round(h) + ' h';
    return Math.round(h / 24) + ' days';
  }

  /* ------------------------------------------------------------------ *
   * 6c. ACTIVITY DEVIATION
   *
   * Compared against this crewmember's own recent norm, never a
   * population. The output is descriptive: it says the activity has moved
   * and by how much. It does not name a cause and it does not name a
   * condition, because an exercise log cannot support either.
   * ------------------------------------------------------------------ */

  function activityDeviation(log, todayIso, opts) {
    opts = opts || {};
    var recentDays = opts.recentDays || 3;
    var baseDays = opts.baseDays || 14;
    var pts = series(log, 'exercise', recentDays + baseDays);
    if (pts.length < recentDays + 4) {
      return { enough: false, band: 'unknown',
        text: 'Not enough logged yet to compare against this crewmember’s own norm.' };
    }
    var recent = pts.slice(-recentDays);
    var base = pts.slice(0, pts.length - recentDays);
    function mean(a) {
      var s = 0; for (var i = 0; i < a.length; i++) s += a[i].value; return s / a.length;
    }
    var rm = mean(recent), bm = mean(base);
    if (bm === 0) {
      return { enough: false, band: 'unknown', recentMean: rm, baseMean: bm,
        text: 'No activity in the baseline period, so there is nothing to compare against.' };
    }
    var pct = ((rm - bm) / bm) * 100;
    var mag = Math.abs(pct);
    var dir = pct < 0 ? 'below' : 'above';
    /* The 25% and 50% cut-offs below are OURS. No published source puts a
       line at those numbers for in-flight exercise volume, so they carry
       the same provenance tag as body mass and the functional tests: the
       comparison against this crewmember's own norm is real, the band
       label on it is a convention we chose. Saying so is cheaper than
       being caught implying a standard that does not exist. */
    var out = { enough: true, recentMean: Math.round(rm), baseMean: Math.round(bm),
      pct: Math.round(pct), direction: dir, recentDays: recentDays, baseDays: base.length,
      origin: 'none',
      originNote: 'The percentage is measured against this crewmember\u2019s own ' +
                  'baseline. The 25% and 50% cut-offs that turn it into a band are ' +
                  'this team\u2019s convention, not a published threshold.' };
    if (mag < 25) {
      out.band = 'ok';
      out.text = 'Activity over the last ' + recentDays + ' days is in line with this crewmember’s own norm.';
      out.action = 'Nothing to do.';
    } else if (mag < 50) {
      out.band = 'watch';
      out.text = 'Activity over the last ' + recentDays + ' days is ' + Math.round(mag) + '% ' + dir +
        ' their own ' + base.length + '-day norm of about ' + Math.round(bm) + ' minutes a day.';
      out.action = dir === 'below'
        ? 'Worth noting. If the timeline caused it, record that; if nothing explains it, mention it at the next private medical conference.'
        : 'Worth noting. A sharp rise is as much a change as a drop, and it is worth saying whether it was intended.';
    } else {
      out.band = 'alert';
      out.text = 'Activity over the last ' + recentDays + ' days is ' + Math.round(mag) + '% ' + dir +
        ' their own ' + base.length + '-day norm of about ' + Math.round(bm) + ' minutes a day.';
      out.action = dir === 'below'
        ? 'A change this size is worth reporting, together with whatever explains it. The number says the activity moved; it does not say why, and this system will not guess.'
        : 'A change this size is worth reporting. Check that sleep and recovery are holding up alongside it.';
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 6d. TRIAGE
   *
   * A band says how far from normal a reading is. It does not say how
   * soon somebody has to move, and those are different questions: a
   * blood glucose of 60 and a fasting glucose of 130 are both outside
   * the band, but only one of them affects whether the crewmember is
   * conscious in ten minutes.
   *
   * Urgency here is set by three things, in this order:
   *   1. how fast harm arrives if nothing is done
   *   2. whether the exposure is still accruing while you read the screen
   *   3. whether acting now actually changes the outcome
   *
   * Every rule below carries its reason. This table is the thing a
   * clinical safety officer signs off, which is why it lives in one
   * place rather than being scattered through the thresholds.
   * ------------------------------------------------------------------ */

  /* Urgency carries its own visual channel, separate from the band.
     Band answers "how far from normal"; urgency answers "how soon".
     They are different questions, so they must not share a palette:
     "Today" is blue rather than green, because green anywhere on this
     screen means in range, and an action point is never in range.
     Each level also differs in fill and in wording, so the meaning
     survives colour-blindness, a monochrome print and red cabin
     lighting. Colour is never the only carrier. */
  var URGENCY = {
    now:   { key: 'now',   rank: 0, label: 'NOW',          colour: '#FF3B3B', fill: 'solid',
             horizon: 'Minutes. Do this before anything else on the list.' },
    hours: { key: 'hours', rank: 1, label: 'WITHIN HOURS', colour: '#FF8A3D', fill: 'solid',
             horizon: 'Today, and before the next sleep period.' },
    today: { key: 'today', rank: 2, label: 'TODAY',        colour: '#4FB8FF', fill: 'outline',
             horizon: 'Before the day is out, or at the next scheduled slot.' },
    note:  { key: 'note',  rank: 3, label: 'NOTE IT',      colour: '#7D8AA6', fill: 'outline',
             horizon: 'Nothing to do now. It matters as a trend.' }
  };

  function urgencyOf(r) {
    if (!r || r.band === 'unknown' || r.band === 'info') return pack('note', 'No action attaches to this.');
    var v = Number(r.value);

    if (r.band === 'alert') {
      switch (r.id) {
        case 'rad_event':
          return pack('now', 'Dose is accruing while this is on screen. Every minute outside shelter adds to it.');
        case 'glucose':
          if (v < 70) return pack('now', 'Low blood glucose affects consciousness and judgement within minutes.');
          return pack('today', 'A high fasting sample needs a repeat on another day, not action in the next hour.');
        case 'temp':
          if (v >= 39 || v < 35) return pack('now', 'A temperature this far out is a physiological emergency, not a trend.');
          return pack('hours', 'Fever in a sealed cabin spreads to the crew. Start the protocol today.');
        case 'bp_sys':
          if (v > 180) return pack('now', 'The severe range carries a risk of immediate harm.');
          return pack('hours', 'Stage 2 needs confirming and reporting, but not in the next ten minutes.');
        case 'bp_dia':
          if (v > 120) return pack('now', 'The severe range carries a risk of immediate harm.');
          return pack('hours', 'Stage 2 needs confirming and reporting, but not in the next ten minutes.');
        case 'hr':
          return pack('now', 'A resting rate this far out can precede collapse, and it is quick to re-check.');
        case 'co2':
          return pack('hours', 'A vehicle fault that is degrading cognition right now, but it is fixed by the scrubber, not by the crewmember’s body.');
        case 'vision':
          return pack('today', 'A positive screen needs the full ocular protocol, which is a scheduled thing, not an emergency.');
        case 'rad_career':
          return pack('today', 'A career budget question for mission planning. It does not change what happens in the next hour.');
        case 'sleep':
          return pack('today', 'The fix is the next sleep period. Protect it today.');
        case 'exercise':
          return pack('today', 'Loading missed today is addressed today. It is not recoverable later in the same way.');
        default:
          return pack('hours', 'Outside its band, with no faster-acting rule attached.');
      }
    }

    // Watches never outrank an alert, and they are ordered among themselves
    // by whether the thing they point at can still get worse unattended.
    if (r.band === 'watch') {
      if (r.id === 'co2' || r.id === 'rad_event') {
        return pack('today', 'Still inside the limit, but moving in the wrong direction while unattended.');
      }
      return pack('note', 'A change worth logging. Nothing has to move because of it today.');
    }
    return pack('note', 'In range.');

    function pack(key, why) {
      var u = URGENCY[key];
      return { key: u.key, rank: u.rank, label: u.label, horizon: u.horizon,
               colour: u.colour, fill: u.fill, why: why };
    }
  }

  /**
   * One ordered list of action points, across readings, hardware and
   * activity. Sorted by urgency first, then by band, then by a stable
   * order so the list does not reshuffle under the crewmember between
   * identical renders.
   */
  function actionPlan(input) {
    input = input || {};
    var items = [];

    (input.results || []).forEach(function (r) {
      if (r.band !== 'alert' && r.band !== 'watch') return;
      var u = urgencyOf(r);
      items.push({
        kind: 'reading', id: r.id, label: r.label, band: r.band,
        detail: r.why, action: r.action,
        urgency: u.key, rank: u.rank, urgencyLabel: u.label, horizon: u.horizon,
        colour: u.colour, fill: u.fill, rationale: u.why,
        escalate: r.escalate
      });
    });

    (input.sensors || []).forEach(function (s) {
      if (s.band !== 'alert' && s.band !== 'watch') return;
      // Being blind to something is as urgent as the thing you are blind to.
      var feedsUrgent = (s.feeds || []).some(function (fid) {
        var hit = (input.results || []).filter(function (r) { return r.id === fid; })[0];
        return hit && hit.band === 'alert';
      });
      var key;
      if (s.band === 'alert' && feedsUrgent) key = 'now';
      else if (s.band === 'alert') key = 'hours';
      else key = 'note';
      var u = URGENCY[key];
      items.push({
        kind: 'hardware', id: s.id, label: s.name + ' — ' + s.status, band: s.band,
        detail: s.plain, action: s.action,
        urgency: u.key, rank: u.rank, urgencyLabel: u.label, horizon: u.horizon,
        colour: u.colour, fill: u.fill,
        rationale: feedsUrgent
          ? 'This sensor feeds a reading that is currently outside its expected range, so the gap matters now.'
          : 'A gap in the record, not a change in the crewmember.',
        escalate: false
      });
    });

    var act = input.activity;
    if (act && act.enough && act.band !== 'ok') {
      var key2 = act.band === 'alert' ? 'today' : 'note';
      var u2 = URGENCY[key2];
      items.push({
        kind: 'activity', id: 'activity', label: 'Activity has moved', band: act.band,
        detail: act.text, action: act.action,
        urgency: u2.key, rank: u2.rank, urgencyLabel: u2.label, horizon: u2.horizon,
        colour: u2.colour, fill: u2.fill,
        rationale: 'Measured against this crewmember’s own norm. The size of the change sets the priority, not the direction.',
        escalate: false
      });
    }

    var bandRank = { alert: 0, watch: 1 };
    var kindRank = { reading: 0, hardware: 1, activity: 2 };
    items.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (bandRank[a.band] !== bandRank[b.band]) return bandRank[a.band] - bandRank[b.band];
      if (kindRank[a.kind] !== kindRank[b.kind]) return kindRank[a.kind] - kindRank[b.kind];
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    items.forEach(function (it, i) { it.order = i + 1; });
    return items;
  }

  /* ------------------------------------------------------------------ *
   * 7. ROUTINE AND ENGAGEMENT
   * ------------------------------------------------------------------ */

  function dueToday(log, today) {
    var dayKeys = Object.keys(log || {}).sort();
    var todays = (log && log[today]) || {};
    var due = [];
    for (var i = 0; i < indicators.length; i++) {
      var ind = indicators[i];
      if (ind.cadence === 'event') continue;
      var has = Object.prototype.hasOwnProperty.call(todays, ind.id) && todays[ind.id] !== null && todays[ind.id] !== '';
      if (ind.cadence === 'daily') {
        if (!has) due.push({ id: ind.id, label: ind.label, cadence: 'daily' });
      } else {
        var window = ind.cadence === 'weekly' ? 7 : 30;
        var lastSeen = null;
        for (var d = dayKeys.length - 1; d >= 0; d--) {
          var k = dayKeys[d];
          if (log[k] && log[k][ind.id] !== undefined && log[k][ind.id] !== null && log[k][ind.id] !== '') { lastSeen = k; break; }
        }
        if (!lastSeen) { due.push({ id: ind.id, label: ind.label, cadence: ind.cadence }); continue; }
        var gap = daysBetween(lastSeen, today);
        if (gap >= window) due.push({ id: ind.id, label: ind.label, cadence: ind.cadence, lastSeen: lastSeen });
      }
    }
    return due;
  }

  /**
   * The full checklist: every applicable indicator, whether it is done,
   * when it was last done, when it is next due, and how long that is.
   * `dueInDays` is negative when something is overdue, so the UI can
   * count down to zero and then keep counting the other way.
   */
  function schedule(log, todayIso, environmentId) {
    log = log || {};
    var dayKeys = Object.keys(log).sort();
    var todays = log[todayIso] || {};
    return activeIndicators(environmentId)
      .filter(function (ind) { return ind.cadence !== 'event'; })
      .map(function (ind) {
        var doneToday = Object.prototype.hasOwnProperty.call(todays, ind.id)
          && todays[ind.id] !== null && todays[ind.id] !== '';
        var lastSeen = null;
        for (var d = dayKeys.length - 1; d >= 0; d--) {
          var k = dayKeys[d];
          if (log[k] && log[k][ind.id] !== undefined && log[k][ind.id] !== null && log[k][ind.id] !== '') {
            lastSeen = k; break;
          }
        }
        var windowDays = ind.cadence === 'daily' ? 1 : ind.cadence === 'weekly' ? 7 : 30;
        var nextDue, dueInDays;
        if (!lastSeen) {
          nextDue = todayIso;
          dueInDays = 0;
        } else {
          nextDue = shiftDay(lastSeen, windowDays);
          dueInDays = daysBetween(todayIso, nextDue);
        }
        var statusKey;
        if (doneToday) statusKey = 'done';
        else if (dueInDays < 0) statusKey = 'overdue';
        else if (dueInDays === 0) statusKey = 'due';
        else statusKey = 'scheduled';
        return {
          id: ind.id, label: ind.label, unit: ind.unit, cadence: ind.cadence,
          system: ind.system, windowDays: windowDays,
          doneToday: doneToday, lastSeen: lastSeen, nextDue: nextDue,
          dueInDays: dueInDays, overdueByDays: dueInDays < 0 ? -dueInDays : 0,
          status: statusKey
        };
      })
      .sort(function (a, b) {
        var rank = { overdue: 0, due: 1, scheduled: 2, done: 3 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        if (a.dueInDays !== b.dueInDays) return a.dueInDays - b.dueInDays;
        return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
      });
  }

  function daysBetween(a, b) {
    var da = new Date(a + 'T00:00:00Z').getTime();
    var db = new Date(b + 'T00:00:00Z').getTime();
    return Math.round((db - da) / 86400000);
  }

  /**
   * Streak of consecutive days (ending today) on which the crewmember both
   * logged every daily item and completed some exercise. Deliberately rewards
   * logging and countermeasure completion, never a sleep or mass number.
   */
  function streak(log, today) {
    var dailyIds = indicators.filter(function (i) { return i.cadence === 'daily'; }).map(function (i) { return i.id; });
    var n = 0;
    var cursor = today;
    for (var guard = 0; guard < 400; guard++) {
      var day = log && log[cursor];
      if (!day) break;
      var complete = dailyIds.every(function (id) {
        return day[id] !== undefined && day[id] !== null && day[id] !== '';
      });
      var moved = Number(day.exercise) > 0;
      if (!complete || !moved) break;
      n++;
      cursor = shiftDay(cursor, -1);
    }
    return n;
  }

  function shiftDay(iso, delta) {
    var t = new Date(iso + 'T00:00:00Z').getTime() + delta * 86400000;
    return new Date(t).toISOString().slice(0, 10);
  }

  function series(log, indicatorId, limit) {
    var keys = Object.keys(log || {}).sort();
    var pts = [];
    for (var i = 0; i < keys.length; i++) {
      var v = log[keys[i]] ? log[keys[i]][indicatorId] : undefined;
      if (v === undefined || v === null || v === '') continue;
      if (!isFinite(Number(v))) continue;
      pts.push({ date: keys[i], value: Number(v) });
    }
    if (limit && pts.length > limit) pts = pts.slice(pts.length - limit);
    return pts;
  }

  /**
   * Split a window in half and compare the two halves. Used for the report
   * view: "the first half of this month against the second". Returns nulls
   * rather than a number when either half is too thin to mean anything,
   * because a mean of one reading is not a mean.
   */
  function compare(log, indicatorId, days, minPerHalf) {
    minPerHalf = minPerHalf || 2;
    var pts = series(log, indicatorId, days || 30);
    if (pts.length < minPerHalf * 2) {
      return { enough: false, n: pts.length, reason: 'Not enough readings in this window to compare two halves.' };
    }
    var mid = Math.floor(pts.length / 2);
    var a = pts.slice(0, mid), b = pts.slice(mid);
    function mean(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i].value; return s / arr.length; }
    var ma = mean(a), mb = mean(b);
    var delta = mb - ma;
    var pct = ma === 0 ? null : (delta / Math.abs(ma)) * 100;
    return {
      enough: true,
      first: { mean: ma, n: a.length, from: a[0].date, to: a[a.length - 1].date },
      second: { mean: mb, n: b.length, from: b[0].date, to: b[b.length - 1].date },
      delta: delta,
      pct: pct === null ? null : Math.round(pct * 10) / 10,
      direction: Math.abs(delta) < 1e-9 ? 'flat' : (delta > 0 ? 'up' : 'down'),
      n: pts.length
    };
  }

  /** Simple least-squares slope per day over a series. */
  function trend(points) {
    if (!points || points.length < 3) return { slope: 0, direction: 'flat', n: points ? points.length : 0, enough: false };
    var n = points.length;
    var x0 = new Date(points[0].date + 'T00:00:00Z').getTime();
    var sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) {
      var x = (new Date(points[i].date + 'T00:00:00Z').getTime() - x0) / 86400000;
      var y = points[i].value;
      sx += x; sy += y; sxy += x * y; sxx += x * x;
    }
    var denom = (n * sxx - sx * sx);
    var slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    var dir = 'flat';
    var span = Math.abs(points[n - 1].value - points[0].value);
    if (span > 0 && Math.abs(slope) > 1e-9) dir = slope > 0 ? 'rising' : 'falling';
    return { slope: slope, direction: dir, n: n, enough: true };
  }


/* How long a self-reported check takes, in minutes. These are Team 3S
 * planning estimates for the interface, NOT measured task times and NOT
 * from any NASA or clinical source: no published figure for these specific
 * checks was found, so none is claimed. They exist because telling a tired
 * crewmember that something is urgent says nothing about whether it is a
 * twenty-second job or a ten-minute one, and the second question is the one
 * that decides whether it actually gets done. Origin 'none' throughout.
 */
var EFFORT_NOTE = 'Team 3S planning estimate for the interface. Not measured, '
  + 'and not from a NASA or clinical source.';
var EFFORT_ORIGIN = 'none';

function effortFor(id){
  var i = null;
  for (var k = 0; k < indicators.length; k++) if (indicators[k].id === id) { i = indicators[k]; break; }
  if (!i || typeof i.effortMin !== 'number') return null;
  return { minutes: i.effortMin, origin: EFFORT_ORIGIN, originNote: EFFORT_NOTE };
}

function effortTotal(ids){
  var sum = 0, known = 0;
  (ids || []).forEach(function(id){
    var e = effortFor(id);
    if (e) { sum += e.minutes; known++; }
  });
  return { minutes: sum, counted: known, origin: EFFORT_ORIGIN, originNote: EFFORT_NOTE };
}

  return {
    version: '1.0.0',
    sources: sources,
    hazards: hazards,
    environments: environments,
    indicators: indicators,
    systems: systems,
    BANDS: BANDS,
    CARE: CARE,
    getIndicator: getIndicator,
    getSystem: getSystem,
    getHazard: getHazard,
    spaceWeather: spaceWeather,
    SPE_SCALE: SPE_SCALE,
    indicatorsForSystem: indicatorsForSystem,
    standardMeasures: standardMeasures,
    coverageOf: coverageOf,
    appliesTo: appliesTo,
    activeIndicators: activeIndicators,
    selfRelianceLevel: selfRelianceLevel,
    URGENCY: URGENCY,
    urgencyOf: urgencyOf,
    actionPlan: actionPlan,
    education: education,
    getEducation: getEducation,
    educationFor: educationFor,
    sensors: sensors,
    getSensor: getSensor,
    sensorsFor: sensorsFor,
    sensorStatus: sensorStatus,
    activityDeviation: activityDeviation,
    challenge: challenge,
    speakFor: speakFor,
    escalation: escalation,
    sleepRegularity: sleepRegularity,
    nightShape: nightShape,
    clockOf: clockOf,
    DISCIPLINES: DISCIPLINES,
    getDiscipline: getDiscipline,
    OBJECTIVES: OBJECTIVES,
    sessionsOn: sessionsOn,
    weekTotals: weekTotals,
    challengeProgress: challengeProgress,
    encouragement: encouragement,
    bestStreak: bestStreak,
    evaluate: evaluate,
    evaluateDay: evaluateDay,
    worstBand: worstBand,
    systemStatus: systemStatus,
    hazardStatus: hazardStatus,
    briefing: briefing,
    effortFor: effortFor,
    effortTotal: effortTotal,
    EFFORT_NOTE: EFFORT_NOTE,
    dueToday: dueToday,
    schedule: schedule,
    streak: streak,
    series: series,
    compare: compare,
    trend: trend,
    daysBetween: daysBetween,
    shiftDay: shiftDay,
    formatDelay: formatDelay
  };
}));
