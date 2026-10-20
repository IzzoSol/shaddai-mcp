'use strict';
// Knowledge frameworks as callable tools. Each returns a full, usable
// playbook (not a summary) so agents can actually work from it.
// Sources: Pixar's 22 Rules (Emma Coats), Save the Cat (Blake Snyder),
// Story Arc (Michael Arndt), Ten Elements of Storytelling, 7 Storytelling
// Hacks (Ghulam Hussain), 9 Thinking Behaviours (Paul & Elder), Graphic
// Organizers, Thinking Maps, Cinematic Storytelling (Sky Rye), Map of the
// System of Human Knowledge, Intrinsic Values, Sci-Fi Writer Compass,
// Musical Spiral, Time Travel Taxonomy, Bad vs Great Storytelling.

const F = {};

F.pixar_22_rules = () => `PIXAR'S 22 RULES OF STORYTELLING (Emma Coats, 2011) — a thinking tool, not immutable law.

STRUCTURE (the basic shape): Once upon a time... Every day... Because of that... Because of that... Until finally...

1. CHARACTER & EMOTION
 1. Admire effort more than success.
 6. Confront the character with their opposite.
13. Give your characters opinions.
15. Seek emotional honesty.
16. Make the stakes visible.
21. Understand what drives action.

2. STRUCTURE & NARRATIVE
 3. Theme emerges, then gets rewritten.
 4. Use a cause-and-effect structure.
 7. Find the ending before the middle.
19. Coincidences complicate; they do not save.
22. Find the essence of the story.

3. WRITING PROCESS
 8. Finish, even if imperfect.
 9. List what should not happen.
11. Put the story on paper.
12. Go beyond obvious ideas.
17. No work is ever truly wasted.
18. Do not drown in details.

4. ANALYSIS & REWRITING
 2. Think about what interests the audience.
 5. Simplify, focus, combine.
10. Deconstruct the stories you love.
14. Identify the story's core conviction.
20. Repair stories you do not like.

5 KEY PILLARS: Active characters | Transformative conflict | Structure through consequences | Emotional honesty | Rewriting & iteration.

WHEN TO USE: story critique, beat-sheet construction, pitching, structure repair, rewriting passes.`;

F.save_the_cat_15_beats = () => `SAVE THE CAT! — 15 BEATS (Blake Snyder) with page markers.

ACT I — SET-UP
 1. Opening Image (p.1) — the hero's initial state
 2. Theme Stated (p.5) — the truth to be learned
 3. Set-Up (p.1-10) — world, flaws, relationships
 4. Catalyst (p.12) — the event that breaks the balance
 5. Debate (p.12) — do I really have to act?

ACT II — CONFRONTATION
 6. Break into Two (p.25) — irreversible decision
 7. B Story (p.25-50) — the relationship carrying the theme
 8. Fun and Games (p.37) — the promise of the promise
 9. Midpoint (p.50) — false victory or false defeat
10. Bad Guys Close In (p.55) — external and internal pressure
11. All Is Lost (p.75) — the lowest point
12. Dark Night of the Soul (p.75) — understanding why the old plan failed

ACT III — RESOLUTION
13. Break into Three (p.85) — a new idea, a new way to act
14. Finale (p.85) — resolving conflict through transformation
15. Final Image (p.110) — the mirror of the opening

WHEN TO USE: feature scripts, series structure, beat diagnostics, pacing checks.`;

F.story_arc_15_beats = () => `STORY ARC — 15 BEATS WITH PERCENTAGES (Michael Arndt; inspired by ENDINGS).
Use the percentages to place beats on a page count or a timeline.

  0%   HOOK            (0-1%)
 12%  TRIGGER         (1-11%)
 25%  THRUST INTO 2   (11-24%)
 37%  POWER PLAY 1    (25-36%)
 50%  MIDPOINT        (38-49%)
 63%  POWER PLAY 2    (51-62%)
 75%  PLUNGE INTO 3   (64-74%)
 76-87% PONDER         (75-86%)
 88%  FACE OFF        (87-95%)
 89-95% BATTLE 2      (88-94%)
 96-98% CLIMAX        (95-97%)
 99-100% RESOLUTION   (99-100%)

BEAT LETTERS
 A = Q-Factor (introduction / use)
 B = Hug Loved One (show the lead's heart)
 C = Kiss the Baby (show the lead's vulnerability)
 D = A-Problem (want / global goal)
 E = B-Problem (need / Act 2 goal)
 F = External Theme (genre)
 G = Internal Theme (lead)
 H = Philosophical Theme (universal)

THREE ACTS
 Act 1: Setup, Trigger, Thrust into 2, Power Play 1
 Act 2A: Rising action to the Midpoint (Problem B introduced)
 Act 2B: Reaction, power play, face-off pressure
 Act 3: Face off, Battle 2, Climax, Resolution

WHEN TO USE: beat placement, act ratio checks, act 2 differentiation, turning-point diagnostics.`;

F.ten_elements_storytelling = () => `TEN ELEMENTS OF STORYTELLING
"Fiction becomes memorable when we sense breath, rhythm, and consequence in every line."

 1. AUTHENTIC CHARACTERS — more than archetypes or plot devices. Contradictions, flaws, desires. Perfection rarely inspires empathy; vulnerability invites investment. We follow people more than plots.
 2. DYNAMIC DIALOGUE — reveals personality and conflict. Subtext gives dialogue power. Characters who say what they mean do not create friction. Each character speaks with individuality; conversations should push the story.
 3. IMMERSIVE SETTING — atmosphere, influence, sometimes antagonist. Engage the senses. Set shifts with weather, time, and perspective. A decaying house mirrors a collapsing family. A rusting city embodies ambition and alienation.
 4. EMOTIONAL STAKES — dignity, love, survival, justice, freedom. Escalation strengthens stakes; they transform plot into urgency.
 5. CONFLICT AND TENSION — conflict is the engine of narrative, external or internal. Tension arises when resolution is uncertain. Suspense thrives on delay. Unpredictability is essential. Balance escalation with relief. Conflict should be inevitable yet surprising, rooted in character choices rather than contrived twists.
 6. SYMBOLIC RESONANCE — symbols layer meaning beneath surface events. A broken watch symbolizes lost time. An object that begins as comfort can later signify loss. Symbols create cohesion; cultural and psychological associations amplify resonance.
 7. NARRATIVE RHYTHM — rhythm emerges from pacing, sentence structure, and scene arrangement. Balance acceleration with pause. Align rhythm with emotion. Alternate high stakes with quieter interludes. Stories should arc with crescendos and lulls.
 8. SCENE OBJECTIVES — every scene must justify its existence. Advance plot, reveal character, or heighten stakes. Ask what changes by the end of the scene. Filler scenes stall momentum. Each part contributes to the whole. Objectives prevent digression.
 9. CLIFFHANGERS AND CURIOSITY — suspense is withholding. Cliffhangers end scenes with unresolved tension. A door left ajar; curiosity is primal. Humans seek closure.
10. VOICE AND STYLE — voice is how readers experience narrative; style emerges from choices in diction, syntax, rhythm, and tone. Distinctive voice differentiates one writer from another. Let voice align with character psychology and narrative intent. Style serves the story's core.

WHEN TO USE: fiction/novel/short-form craft, scene revision, dialogue passes, story critique.`;

F.storytelling_7_hacks = () => `7 STORYTELLING HACKS THAT MAKE PEOPLE READ TO THE END (Ghulam Hussain)
"Great stories don't just inform. They connect, inspire, and drive action."

 1. START WITH THE TENSION — don't start with context. Start with the moment something went wrong. People want to know what happens next.
 2. BUILD AROUND ONE EMOTION — confusion kills stories. Choose one emotion to amplify.
 3. SHOW THE SCENE — don't say "the launch was stressful". Say "five minutes before launch, we crashed with 2,300 visitors waiting". Specific details create memorable stories.
 4. MAKE THE CUSTOMER THE HERO — your product isn't the story, their transformation is.
 5. ADD AN UNEXPECTED TWIST — predictable stories get skipped. Surprising stories get shared.
 6. END WITH A LESSON — don't finish with "that's what happened". The biggest breakthroughs often come from simplifying, not adding more.
 7. MAKE A PROMISE, NOT A PITCH — don't sell the product. Sell the future. "Download our free guide" or "imagine turning every post into a conversion that brings qualified leads to your inbox."

WHEN TO USE: marketing copy, brand storytelling, launch posts, email sequences, ads, landing page narrative.`;

F.bad_vs_great_storytelling = () => `BAD STORYTELLING vs GREAT STORYTELLING
"Stories sell. Facts tell. Here's how to turn your message into something people remember, trust, and act on."

 1. THE OPENING
    BAD: "Our project management software is packed with powerful features."
    GREAT: "It was 11:30 p.m., and Maya was still sending slides — again. The meeting was in 8 hours, and nothing was ready."
    TIP: Start with a moment that grabs attention and creates curiosity.
 2. THE CONFLICT
    BAD: "We faced challenges while trying to grow our business."
    GREAT: "After spending $3,000 on ads with zero sales, I almost quit. Something clearly wasn't working."
    TIP: Show the struggle. People connect with pain before they celebrate wins.
 3. THE SOLUTION
    BAD: "Our tool automates your workflow and saves time."
    GREAT: "Now I finish in 20 minutes what used to take me all day. My weekends are actually mine again."
    TIP: Focus on the transformation, not the tool or the technology.
 4. THE ENDING
    BAD: "Sign up today and get started with a free trial."
    GREAT: "Imagine hitting your goals, helping more people, and finally building the life you always wanted."
    TIP: End by painting the future they want to step into.

FACT: facts inform. STORIES CONNECT. Great storytelling inspires action.

WHEN TO USE: website copy, launch announcements, ads, cold outreach, investor decks, about pages.`;

F.cinematic_storytelling = () => `CINEMATIC STORYTELLING — how to tell a story through every shot (Sky Rye guide)

 1. WHY STORY COMES BEFORE LOOK — a cinematic look is surface; visual storytelling creates change. Each shot establishes place, reveals a relationship, shows intention, an obstacle, or a consequence. Treat each shot like one sentence. "Pretty shot != meaningful shot."
 2. 4-QUESTION FRAME DIAGNOSTIC — (1) Where does the eye land first? (2) What changed since the previous shot? (3) What does this distance make the viewer feel? (4) Would it still frame communicate more than movement? "Better questions. Stronger shots."
 3. BUILD A 5-SHOT STORY — 1 Establishing (place and context) / 2 Action (introduce the goal) / 3 Detail (add texture and progress) / 4 Consequence (show the result) / 5 Reaction (end in a different state). "Someone wants X, does Y, ends in a visibly different state." Thumbnail first, shot list second.
 4. COMPOSITION CONTROLS FEELING — show changes when information changes; use one focal point; leading lines and negative space guide emotion; camera height, lens and depth create relationships. Shot sizes: Wide (context), Medium (action), Detail (reveals information), Close-up (emotion). Camera height = relationship: low angle = authority, eye level = equality, high angle = vulnerability.
 5. LIGHT, COLOR & MOVEMENT — light shapes what we feel before we know why. Start with subject, background, one believable source. Warm vs cool can separate safety, memory, distance, or emotional states. Move only when the viewer's relationship changes; verbs: follow, reveal, isolate, approach, retreat. "Stillness can be a kind of movement."
 6. SETTINGS FOR MEANING — technical choices support emotional choices. Aperture (depth of field = what we see vs how it moves). Shutter (motion). ISO (sensitivity). Frame rate (24/25/30; 50/60 for real-time). Focus (subject). White balance (mood). Audio (completes the world). "Protect what must be read first. 24/25/30 fps for normal-time delivery. 50/60 fps when real-time slows down. A shutter near 180° is a starting point, not a law. Switch on 16:9 + 9:16 guides."
 7. B-ROLL, SOUND & EDITING — B-roll as cause to effect (beans setup, grind process, espresso transformation, the cup result, door movement, reaction payoff); record the place (room tone, steam hiss, cup contact, door movement, lav or boom); edit for meaning (cut on intention, action or consequence; build first cut without music; remove decorative shots that don't change meaning). J-cut (audio leads next shot), L-cut (audio continues after cut).
 8. 30-MINUTE PRACTICE — choose one simple action; shoot 5 distinct story jobs; include one locked shot; include one motivated move; capture one clean ambient sound moment; watch once muted, once audio-only; replace the weakest shot.

WHEN TO USE: any video deliverable — UGC ads, game trailers, tutorials, explainers, product video.`;

F.graphic_organizers = () => `GRAPHIC ORGANIZERS — pick by purpose (Murch & Wilson, 2004)

 1. RECALLING, GROUPING, CLASSIFYING, SUMMARISING IDEAS
    - Spider diagram (radial), Affinity/cluster web, Concept map
 2. SEQUENCING EVENTS, ORDERING IDEAS
    - Cycle circle, Flow chart, Twister
 3. SHOWING CAUSAL LINKS (cause and effect)
    - Futures wheel, Bridge, Fishbone
 4. DEEPER ANALYSIS — dissecting an idea into components and exploring attributes
    - Y chart (looks like/sounds like/feels like), T chart (Is/Isn't), Venn diagram
 5. PLANNING AND DECISION MAKING OR REVIEWING
    - Scales, Comic strip, ECG graph

WHEN TO USE: structuring thinking before writing; explaining a system; mapping cause-effect; planning a sequence.`;

F.thinking_maps = () => `THINKING MAPS — questions from texts/teachers/tests -> thinking processes -> thinking maps as tools
 1. DEFINING IN CONTEXT — "What is the thing or idea? What is your frame of reference?" -> Circle Map
 2. DESCRIBING QUALITIES — "What are your describing things? What adjectives would best describe this thing?" -> Bubble Map
 3. COMPARING AND CONTRASTING — "What are the similar and different qualities of these things? Which qualities do you value most? Why?" -> Double Bubble Map
 4. CLASSIFYING — "What are the main ideas, supporting ideas, and details in this information?" -> Tree Map
 5. PART-WHOLE — "What are the component parts and sub-parts of this physical object?" -> Brace Map
 6. SEQUENCING — "What is the sequence of events? What are the subevents?" -> Flow Map
 7. CAUSE AND EFFECT — "What are the causes and effects of this event? What might happen next?" -> Multi-Flow Map
 8. SEEING ANALOGIES — "What is the analogy being used? What is the guiding metaphor?" -> Bridge Map

WHEN TO USE: analysing any text or system, teaching, planning, decomposing complexity into a diagram the agent can render.`;

F.thinking_behaviours_9 = () => `9 THINKING BEHAVIOURS (Richard Paul & Linda Elder, Critical Thinking, 2006) — a self-audit before every answer.

 1. CLARITY — "You have added detail and examples." Elaborate? Illustrate? Give an example?
 2. ACCURACY — "Your thinking has facts and research to back it up." How could we check on that? How do we test that? How do we know this is true?
 3. PRECISION — "Your thinking is specific and exact." Be more specific? Give more details? Be more exact?
 4. RELEVANCE — "Your thinking is directly related to the central idea, problem or question you are working on." How does this relate to the problem? Does this answer the question? How does this help us?
 5. DEPTH — "You have predicted difficulties or problems with your thinking. You imagine what could go wrong and what you could do about it." What will make this difficult? Have you predicted different possible outcomes? Have you looked ahead?
 6. BREADTH — "You have considered other points of view." Need another perspective? Consider other points of view? Look at this in another way?
 7. LOGIC — "You show your thinking in a way that makes sense to others." Does all this make sense together? Does your thinking follow from the evidence?
 8. FAIRNESS — "You are aware of the thoughts and ideas of others. You do not ignore facts that disagree with your thinking. You are open to changing your mind." Am I considering the thinking of others? Is my purpose fair in this situation? Is my thinking based on facts, or just opinions?
 9. SIGNIFICANCE — "Your thinking is important to the central idea, problem or question you are working on." Which of these facts are the most important? Is this the most important thing to consider? Am I focusing on the most important thing?

WHEN TO USE: as a pre-flight check on any research answer, audit, or strategic plan — especially before publishing or advising.`;

F.map_human_knowledge = () => `MAP OF THE SYSTEM OF HUMAN KNOWLEDGE — a 3-branch taxonomy (history, philosophy, imagination) for routing any question to its field.

HISTORY
 NATURAL — uniformities of nature (meteors, land and sea, minerals, plants, animals, elements); celestial history (meteors, monstrous minerals, monstrous plants, monstrous animals, wonders of the elements); devotions of nature (wonders on land and sea, monstrous minerals/plants/animals, wonders of the elements)
 ECCLESIASTICAL — sacred (history of prophets), civil (civil history properly said), literary history (antiquities, complete histories, complete histories of uniformity, of celestial history, of devotions of nature, wonders of the elements, civil history, sacred)
 USES OF NATURE — arts (crafter/manufactures, manual, operative): work and uses of precious stones (mine, goldsmith, jeweller, gold-spinning, silversmith, planisher); work and uses of metals (mine, founder, tool-making, armourer, gun-making); work and uses of glass (glass-making, plate-glassmaking, mirror-making, optical); work and uses of stone (stone, mason, slate, plasterer, tiler, mason); work and uses of skin (spinning, milling, work like velvet, breeches-makings); work and uses of wood (cutting, splitting, joinery, plaster, masons, carpenters)

PHILOSOPHY
 LOGIC — science of man (art of thinking: apprehension, judgment, reasoning, method); art of remembering (memory, artificial memory, supplement to memory); art of speaking (writing, cipher, arts of writing, printing, describing, gesture, pantomime); art of reasoning (prosody, construction, syntax, analysis, synthesis, dialectic, pedagogy, choice of studies, mechanism of teaching)
 ETHICS — general (general science of good and evil in general, of virtue, of nature, of divine science of good and evil in general, necessity of being virtuous); particular (economic and political science: internal and external commerce on land and sea, politics)
 MATHEMATICS — pure (arithmetic: numeric, algebra, differential integral, elementary/multiple architecture, tactics, transcendental); mixed (mechanics: statics, hydrostatics, dynamics, hydrodynamics, astronomy, architecture, navigation); geometric (cosmogony, uranography, geography, hydrography, chronology, optics); acoustics (optics, dioptrics, perspective, catoptrics); physico-mathematics (analysis of chance)

IMAGINATION
 POETRY — sacred (epic poetry, the theory of practice, instrumental, vocal, dramatic, elegiac, lyric, historical, pastoral, epigram, satirical, apologue, comedy, novel, novelistic, romance, fabliau, tale, fabliau, allegory, parable, canto, cantata, satire, verse); parodiable (allegory, parable, canto, cantata, satire, verse)
 PROSE — narrative (epic, madrigal, novel, novella, biography, pastoral, elegy, etc.); dramatic (tragedy, comedy, pastoral, dramatic); sacred (theory of practice, instrumental, vocal, dramatic, lyric, historical, elegiac, apologue, comedy, novel, novelistic, romance, allegory, parable)
 PLASTIC — formal (all genres); allegory (symbolism, personification)

WHEN TO USE: routing a research question, classifying a topic, deciding which corpus to search, building a taxonomy for a knowledge base.`;

F.time_travel_taxonomy = () => `TIME TRAVEL IN MOVIES — multiverse taxonomy for anything involving time, timelines, or alternate realities.

TYPES
 - Single timeline (one reality, information travels back/forward)
 - Multiverse (parallel realities branch and interact)
 - Two timelines, tangent universe (two branches, tangent contact)
 - Multiverse with single timeline (branching from a single line)

CAUSALITY
 - Novikov self-consistency principle (past is fixed; your actions already happened)
 - Causality loops (Terminator 2, Blade Runner 2049, The Time Machine, Primer, 12 Monkeys, The Butterfly Effect, Predestination, Tenet, Donnie Darko, Everything Everywhere All at Once)
 - Retrocactive (changing the past rewrites the present: Back to the Future, The Butterfly Effect, Happy Accidents, Terminator 3)
 - Interaction with self (Twelve Monkeys, Harry Potter and the Prisoner of Azkaban, Army of Darkness, Midnight in Paris)

SCALE OF EFFECT
 - Personal (personal misfortune: The Time Machine, The Butterfly Effect)
 - Global (worldwide, cosmic): Back to the Future, The Day After Tomorrow, Terminator 2, 2012, 12 Monkeys, X-Men: Days of Future Past, Avengers: Endgame
 - Historical ( alters history: Man in the High Castle, The Time Traveler's Wife, Outlander, Life on Mars, Marvel's What If)
 - Supernatural (magic device: Harry Potter, The Time Machine, The Midnight Club)

TYPES OF TIME TRAVEL
 - Governmental/coincidental machine (Terminator, Tenet, Avengers: Endgame, Back to the Future)
 - Personal misfortune (The Time Machine, The Butterfly Effect, Life on Mars, Outlander)
 - Private invention (Tesla coil, Primer, Chronos, Predestination)
 - Mystical anomaly (The Butterfly Effect, Donnie Darko, Stargate, 12 Monkeys)
 - Relativistic effects (warp speed, quantum tunneling)

WHEN TO USE: any story/game/narrative involving time; building causal-consistent twist logic; avoiding paradox holes.`;

F.musical_spiral = () => `THE MUSICAL SPIRAL — frequency, colour, light, universal tuning (432 Hz vs 440 Hz)
Note: A is typically tuned to 440 Hz; tuning it to 432 Hz aligns with natural resonance (Earth, "the rest of the universe"). Harmonics: A#/Bb 27.5 Hz (Earth), D 73.4, F 108, C 136.1, G 182, A 216, E 271.2 (Tibetan bowl), F#/Gb 323.3, B 369.99, C#/Db 432, A 540. We are attuned to the 8th octave (432 Hz) — the frequency of the universe. "Conceive, Believe, Achieve."

CHAKRA / FREQUENCY SYSTEM
 Crown 216 Hz (connection, spiritual oneness, "Father")
 Third Eye 528 Hz (knowledge, intuition, "I can see")
 Throat 639 Hz (communication, expression, creativity, inspiration)
 Heart 639/528 Hz (acceptance, love, compassion, sincerity)
 Solar Plexus 741 Hz (willpower, determination, power, transformation)
 Sacral 417 Hz (sensuality, sexuality, pleasure, sociality)
 Root 396 Hz (energy, stability, comfort, safety)

SOLAR PLEXUS MANIPRA (Mantra): Curiosity — OMMMM, Mantra — SSSWWW, Manipulation — NNNNN, Gratitude — IIIIII, Power — AAAAA

CATEGORY SYSTEM: Crown / Solar Plexus / Throat / Heart; Oscillation, Dissolution, Fusion, Resonance

WHEN TO USE: audio/light/frequency work in creative briefs, meditation apps, sound design, brand sound identity.`;

F.intrinsic_values = () => `INTRINSIC VALUES — Schwartz's 10-value model (10 fundamental human values)
INTRINSIC VALUES: Universalism | Benevolence | Conformity | Tradition | Security | Self-Direction | Stimulation | Hedonism | Achievement | Power
EXTRINSIC VALUES: the rest of the map

 UNIVERSALISM — broadminded; protecting the environment; unity with nature; a world of beauty; social justice; wisdom; protecting the environment; inner harmony
 BENEVOLENCE — helpful; honest; forgiving; loyal; responsible; a spiritual life; mature love; self-respect
 CONFORMITY — self-discipline; politeness; obedience; honoring elders; social order
 TRADITION — humility; devoutness; respect for tradition; moderate; accepting
 SECURITY — national security; family security; social order; clean; reciprocation of favors
 SELF-DIRECTION — independent; creativity; freedom; curiosity; choosing own goals
 STIMULATION — daring; varied life; excitement
 HEDONISM — pleasure; enjoying life; self-indulgence
 ACHIEVEMENT — capable; influential, successful, intelligent, ambitious
 POWER — social power, authority, wealth, preserving public image, control over people/resources

WHEN TO USE: brand voice and positioning; campaign targeting; value-alignment analysis of a decision; copy that respects what the audience actually values.`;

F.sci_fi_writer_compass = () => `SCI-FI WRITER COMPASS — locate your story on two axes
X: THE FLESH (sociology/psychology) <-> THE MACHINE (physics/engineering)
Y: CHAOS (entropy/rebellion) <-> ORDER (hierarchy/competence)

 QUADRANTS
 - THE PHILOSOPHERS (Flesh + Order) — structured societies, politics, the soul: Frank Herbert, Kim Stanley Robinson, Arkady & Boris Strugatsky, Iain M. Banks, Ursula K. Le Guin, Octavia Butler, Ted Chiang, Mary Shelley
 - THE TECHNOCRATS (Machine + Order) — competence, institutions, "the right stuff": Isaac Asimov, Arthur C. Clarke, Larry Niven, Robert Heinlein, Cixin Liu, David Brin, Andy Weir, Neal Asher, Greg Egan
 - THE SUBVERSIVES (Flesh - Order) — subjective reality, rebellion, inner space: N.K. Jemisin, Kurt Vonnegut, Samuel R. Delany, Stanisław Lem, Jeff VanderMeer, China Miéville, J.G. Ballard, Philip K. Dick, Harlan Ellison
 - THE CYBERPUNKS (Machine - Order) — high-tech, low life, Darwinian capitalism: Alastair Reynolds, James S.A. Corey, William Gibson, Neal Stephenson, Peter Watts, Paolo Bacigalupi, Bruce Sterling, Richard Morgan

Axis scores run -10 to +10.

WHEN TO USE: choosing a genre voice; making a world internally consistent; matching a story to its thematic home; avoiding tonal mismatch.`;

F.dreamers_build = () => `DREAMERS BUILD — the platform roadmap + architecture (preserved for future work)

ROADMAP (26 items) — phase / build phase / AI-ready? / effort / est. cost / dependencies / why it's critical
 1  Auth system (email + Solana wallet via Solana) | MVP Q1 2026 | Solid | Medium | 2 | ICP web app foundation | required for user accounts + wallet connectivity
 2  User database + profile (Creator/Guardian/Admin roles) | MVP Q1 2026 | Solid | Medium | 2 | Auth system | enables role-based access + personalized experiences
 3  Process goal tracking engine | MVP Q1 2026 | Solid | Medium | 3 | User db + profiles | powers the core habit-building functionality
 4  Learner dashboard | MVP Q1 2026 | Solid | Medium | 3 | Process goal tracking | main user interface for daily engagement
 5  Mind & Energy module | MVP Q1 2026 | Solid | Medium | 3 | User db + profiles | basic education engine
 6  NFT minting interface | V1 Q2 2026 | Solid | Medium | 3 | Solana NFT smart contract | enables users to acquire NFTs
 7  Creator dashboard | V1 Q2 2026 | Solid | Medium | 3 | User db + profiles | enables content creators to manage contributions
 8  Guardian dashboard | V1 Q2 2026 | Solid | Medium | 3 | User db + profiles | provides parental oversight for engagement lock
 9  Birth chart module | V1 Q2 2026 | Green | Medium | 3 | User db + profiles | adds personality + engagement lock
 10 Partnership integration | Scale Q3-Q4 2026 | Solid | Medium | 3 | Token integration | enables ecosystem growth through partnerships
 11 Admin moderation tools | Scale Q3-Q4 2026 | Solid | Medium | 3 | User db + profiles | ensures platform safety + quality
 12 ICP web app foundation (Next.js) | MVP Q1 2026 | Solid | Medium | 3 | None | core platform that everything else builds
 13 Basic education engine | MVP Q1 2026 | Solid | Large | 3 | User db + profiles | core learning functionality for the platform
 14 Solana NFT smart contract | V1 Q2 2026 | With Friends | Large | 3 | Auth system | foundation for tokenized reputation
 15 SOULRARE token contract | V1 Q2 2026 | With Friends | Large | 3 | Solana NFT | powers the token economy and incentives
 16 Token integration | V1 Q2 2026 | With Friends | Large | 3 | SOULRARE token contract | connects token economy to platform rewards
 17 Creator marketplace | V1 Q2 2026 | With Friends | Large | 3 | Creator dashboard, token integration | enables monetization for creators
 18 Game-to-platform integration | Scale Q3-Q4 2026 | With Friends | Large | 3 | Dreamers Climb game, token integration | connects game achievements to token rewards
 19 NFT upgrade system | Scale Q3-Q4 2026 | With Friends | Large | 3 | Solana NFT | creates long-term value for NFT holders
 20 Merch integration | Scale Q3-Q4 2026 | Solid | Medium | 3 | Payment processing | additional revenue stream and brand expansion
 21 Music NFT & showcase system | Scale Q3-Q4 2026 | With Friends | Large | 3 | Creator marketplace, NFT | expands creator offerings to music
 22 Analytics & reporting dashboard | Scale Q3-Q4 2026 | Solid | Large | 3 | Process goal tracking | provides insights for business decisions
 23 DAO governance site | Scale Q3-Q4 2026 | With Friends | Large | 3 | SOULRARE token | enables community participation in decisions
 24 Payment processing | V1 Q2 2026 | Needs Dev | Large | $15 | Creator marketplace | enables fiat and crypto transactions
 25 Dreamers Climb game | Scale Q3-Q4 2026 | With Friends | XL | $15 | Process goal tracking | gamifies the learning experience
 26 Mobile app (iOS/Android or PWA optimization) | Scale Q3-Q4 2026 | Needs Dev | XL | $15 | ICP web app foundation | expands platform reach to mobile users

ARCHITECTURE
 Client Layer -> Web App (Learner, Creator, Guardian, Admin dashboards) + Edge/AdAPI Layer
 Gateway -> API Gateway / Backend-for-Frontend
 Core Services -> Process-Goal Service, Infrastructure Layer, Core Services Layer, Creator Economy Service, Auth & Identity Service, Education Service, Admin/Moderation Service, Web3 Adapter Service (Future), Gamification Service
 Stores -> PostgreSQL (Goals & Events, Creator Economy, Users & Identity, Gamification, Admin, Education schemas; Notification, Payments/Stripe, Message Broker/Kafka/RabbitMQ, Object Storage S3, Blockchain Network Future, Read Replica)
 Core Services Layer is the hub; Infrastructure Layer sits in the middle; all services route requests through the gateway.

WHEN TO USE: planning the Dreamers build; sequencing work; identifying the critical path (auth -> db -> ICP web app -> education engine -> NFT contract -> token -> marketplace).`;

const FRAMEWORK_TOOLS = [
  { name: 'story_pixar_22_rules', description: 'Pixar\'s 22 Rules of Storytelling (Emma Coats) — full playbook with the 4 groups and 5 key pillars. Use for story critique, beat construction, rewriting passes.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.pixar_22_rules },
  { name: 'story_save_the_cat_15', description: 'Save the Cat! 15 beats with page markers and the three acts. Use for feature scripts, series structure, pacing checks.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.save_the_cat_15_beats },
  { name: 'story_arc_15_beats', description: 'Story Arc 15 beats with percentages (Michael Arndt) + beat letters A-H + three-act breakdown. Use for beat placement and act-2 diagnosis.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.story_arc_15_beats },
  { name: 'story_ten_elements', description: 'Ten Elements of Storytelling — full guide (authentic characters, dynamic dialogue, immersive setting, stakes, conflict, symbolism, rhythm, scene objectives, cliffhangers, voice/style).', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.ten_elements_storytelling },
  { name: 'story_7_hacks', description: '7 Storytelling Hacks that make people read to the end (Ghulam Hussain) — tension, one emotion, show the scene, customer as hero, twist, lesson, promise not pitch.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.storytelling_7_hacks },
  { name: 'story_bad_vs_great', description: 'Bad Storytelling vs Great Storytelling with the 4 elements (opening, conflict, solution, ending) and rewrite examples. Use for marketing and launch copy.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.bad_vs_great_storytelling },
  { name: 'story_cinematic', description: 'Cinematic Storytelling guide (Sky Rye) — 8 sections: why story before look, 4-question frame, 5-shot story, composition, light/color/movement, settings, b-roll/sound/edit, 30-min practice.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.cinematic_storytelling },
  { name: 'story_time_travel_taxonomy', description: 'Time travel in movies — multiverse taxonomy, causality loops (Novikov), retrocactive, scale of effect, and the 4 time-travel types. Use for consistent twist logic.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.time_travel_taxonomy },
  { name: 'think_graphic_organizers', description: 'Graphic organizers by purpose — recalling/classifying, sequencing, causal links, deeper analysis, planning. 15 organizer types with when-to-use.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.graphic_organizers },
  { name: 'think_thinking_maps', description: 'Thinking Maps — 8 processes (defining in context, describing qualities, comparing, classifying, part-whole, sequencing, cause-effect, analogies) mapped to their diagram type.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.thinking_maps },
  { name: 'think_9_behaviours', description: '9 Thinking Behaviours (Paul & Elder) — clarity, accuracy, precision, relevance, depth, breadth, logic, fairness, significance with the self-check question for each. Use as a pre-flight audit on any answer.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.thinking_behaviours_9 },
  { name: 'think_map_human_knowledge', description: 'Map of the System of Human Knowledge — 3 branches (history, philosophy, imagination) with full sub-taxonomy. Use to route a research question to the right field/corpus.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.map_human_knowledge },
  { name: 'think_intrinsic_values', description: "Schwartz's 10 intrinsic values (universalism, benevolence, conformity, tradition, security, self-direction, stimulation, hedonism, achievement, power) with the values under each.", inputSchema: { type: 'object', properties: {}, required: [] }, run: F.intrinsic_values },
  { name: 'think_scifi_compass', description: 'Sci-Fi Writer Compass — 4 quadrants (philosophers, technocrats, subversives, cyberpunks) on flesh/machine x chaos/order axes with authors per quadrant.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.sci_fi_writer_compass },
  { name: 'creative_musical_spiral', description: 'Musical Spiral — 432 Hz vs 440 Hz, harmonics, chakra frequency system, mantra system. Use for sound/light/frequency briefs and meditation apps.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.musical_spiral },
  { name: 'dreamers_build', description: 'Dreamers build — 26-item roadmap (phases, effort, cost, dependencies, why critical) + full architecture (client, gateway, core services, stores). Use for planning the Dreamers platform.', inputSchema: { type: 'object', properties: {}, required: [] }, run: F.dreamers_build },
];

const FRAMEWORK_NAMES = new Set(FRAMEWORK_TOOLS.map(t => t.name));
module.exports = { FRAMEWORK_TOOLS: FRAMEWORK_TOOLS, FRAMEWORK_NAMES: FRAMEWORK_NAMES };
