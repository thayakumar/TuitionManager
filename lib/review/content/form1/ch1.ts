import type { Checkpoint } from "@/lib/review/types";

export const misconceptions: Record<string, string> = {
  "ct-decomp-vs-abs":
    "Confuses decomposition (leraian — splitting a problem into smaller parts) with abstraction (peniskalaan — filtering out unimportant details).",
  "ct-pattern-vs-gen":
    "Confuses pattern recognition (pengecaman corak — spotting similarities/trends) with generalisation (pengitlakan — building a reusable model or formula).",
  "ct-keeps-irrelevant":
    "Retains surface or decorative details (brand, colour, font) instead of abstracting only decision-critical variables.",
  "ct-drops-essential":
    "Drops an essential constraint (budget, time limit, safety rule, or dimensions) when simplifying a problem.",
  "ct-step-order":
    "Places an action step before its prerequisite input/preparation step when sequencing a decomposed task.",
  "ct-linear-vs-diff":
    "Misreads how consecutive terms grow (adds a constant difference when differences themselves change, or vice versa).",
  "ct-surface-similarity":
    "Matches problems by surface story (same objects) rather than underlying structure (same mathematical or logical rule).",
  "ct-formula-offset":
    "Builds a general rule that works for n = 1 only and forgets to test n = 2, 3 (off-by-one constant in generalisation).",
};

export const checkpoints: Checkpoint[] = [
  {
    id: "f1-1.1.1",
    code: "1.1.1",
    title: "Techniques in Computational Thinking",
    titleMs: "Teknik dalam Pemikiran Komputasional",
    game: "match-up",
    objective:
      "Distinguish the four core computational thinking techniques (leraian, pengecaman corak, peniskalaan, pengitlakan) across everyday scenarios.",
    draw: 7,
    items: [
      {
        id: "f1-1.1.1-q01",
        kind: "match",
        skill: "recall",
        prompt: "Match each computational thinking technique (teknik pemikiran komputasional) to its definition.",
        pairs: [
          { id: "p1", left: "Decomposition (Leraian)", right: "Break a complex problem into smaller, manageable parts" },
          { id: "p2", left: "Pattern Recognition (Pengecaman Corak)", right: "Identify similarities or repeating trends across cases" },
          { id: "p3", left: "Abstraction (Peniskalaan)", right: "Focus on important aspects and ignore irrelevant details" },
          { id: "p4", left: "Generalisation (Pengitlakan)", right: "Build a model, rule or formula to solve similar problems" },
        ],
        explanation:
          "The four KSSM ASK techniques work together: break down (leraian), spot similarities (pengecaman corak), filter what matters (peniskalaan), and form a general rule (pengitlakan).",
      },
      {
        id: "f1-1.1.1-q02",
        kind: "match",
        skill: "apply",
        prompt: "A prefect team is organising Hari Kantin. Match each action to the technique being used.",
        pairs: [
          { id: "p1", left: "Split work into food stalls, coupons, cleanliness and stage crew", right: "Decomposition (Leraian)" },
          { id: "p2", left: "Notice fried snacks sold out before 10 a.m. for the past 3 years", right: "Pattern Recognition (Pengecaman Corak)" },
          { id: "p3", left: "Ignore tablecloth colours when calculating stall profit", right: "Abstraction (Peniskalaan)" },
          { id: "p4", left: "Write a profit formula: Profit = Coupons Collected − Ingredient Cost", right: "Generalisation (Pengitlakan)" },
        ],
        explanation:
          "Splitting roles is leraian; spotting multi-year sales trends is pengecaman corak; ignoring decor during profit math is peniskalaan; writing a reusable formula is pengitlakan.",
      },
      {
        id: "f1-1.1.1-q03",
        kind: "match",
        skill: "understand",
        prompt: "In the textbook's brick staircase problem (masalah binaan anak tangga), match each step to its technique.",
        pairs: [
          { id: "p1", left: "Count bricks row by row instead of the whole staircase at once", right: "Decomposition (Leraian)" },
          { id: "p2", left: "Observe each row adds a fixed number of bricks", right: "Pattern Recognition (Pengecaman Corak)" },
          { id: "p3", left: "Keep number of steps & step width; ignore brick colour", right: "Abstraction (Peniskalaan)" },
          { id: "p4", left: "Create a formula to predict bricks for any n steps", right: "Generalisation (Pengitlakan)" },
        ],
        explanation:
          "The textbook uses the brick staircase to show all four techniques in sequence from breaking down rows to writing a general formula.",
      },
      {
        id: "f1-1.1.1-q04",
        kind: "match",
        skill: "apply",
        prompt: "Match each Grab/bus commute action in Kuala Lumpur to the matching CT technique.",
        pairs: [
          { id: "p1", left: "Divide journey into walk → LRT → feeder bus", right: "Decomposition (Leraian)" },
          { id: "p2", left: "Notice Federal Highway jams every weekday at 5:30 p.m.", right: "Pattern Recognition (Pengecaman Corak)" },
          { id: "p3", left: "Check fare and arrival time, ignoring bus paint design", right: "Abstraction (Peniskalaan)" },
          { id: "p4", left: "Rule: leave 45 min before class whenever it rains", right: "Generalisation (Pengitlakan)" },
        ],
        explanation:
          "Each stage of planning a trip maps cleanly onto leraian, pengecaman corak, peniskalaan, and pengitlakan.",
      },
      {
        id: "f1-1.1.1-q05",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Aiman wants to bake 60 cupcakes for a kenduri. He ignores the cupcake wrapper cartoon design and focuses only on oven tray size, baking time, and batter volume. Which technique is Aiman using?",
        options: [
          { id: "a", text: "Abstraction (Peniskalaan)" },
          { id: "b", text: "Decomposition (Leraian)", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Pattern recognition (Pengecaman corak)" },
          { id: "d", text: "Generalisation (Pengitlakan)" },
        ],
        answer: "a",
        explanation:
          "Filtering out non-essential details (wrapper cartoons) to focus on important quantities is abstraction (peniskalaan).",
      },
      {
        id: "f1-1.1.1-q06",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "After solving 3-step, 4-step, and 5-step brick stairs, Mei Ling writes `Total = n × (n + 1) / 2` so anyone can find the bricks for 20 steps immediately. Which technique is this final step?",
        options: [
          { id: "a", text: "Generalisation (Pengitlakan)" },
          { id: "b", text: "Pattern recognition (Pengecaman corak)", misconception: "ct-pattern-vs-gen" },
          { id: "c", text: "Decomposition (Leraian)" },
          { id: "d", text: "Abstraction (Peniskalaan)" },
        ],
        answer: "a",
        explanation:
          "Noticing 1+2+3… is pattern recognition, whereas turning that pattern into a reusable formula or model is generalisation (pengitlakan).",
      },
      {
        id: "f1-1.1.1-q07",
        kind: "match",
        skill: "apply",
        prompt: "A doctor diagnoses dengue patients at a clinic. Match each clinical thought to its CT technique.",
        pairs: [
          { id: "p1", left: "Check symptoms separately: fever, platelets, rash, joint pain", right: "Decomposition (Leraian)" },
          { id: "p2", left: "Spot that 6 patients from the same taman have identical symptoms", right: "Pattern Recognition (Pengecaman Corak)" },
          { id: "p3", left: "Ignore what shirt colour the patient wore to the clinic", right: "Abstraction (Peniskalaan)" },
          { id: "p4", left: "Standard checklist for screening suspected dengue cases", right: "Generalisation (Pengitlakan)" },
        ],
        explanation:
          "Computational thinking applies outside computers too — medicine uses decomposition, pattern spotting, abstraction and standard protocols.",
      },
      {
        id: "f1-1.1.1-q08",
        kind: "mcq",
        skill: "understand",
        prompt: "Why do we apply decomposition (leraian) BEFORE trying to write a solution for a large problem?",
        options: [
          { id: "a", text: "Smaller sub-problems are easier to understand, examine and solve separately" },
          { id: "b", text: "It deletes every unimportant variable automatically", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "It guarantees a mathematical formula without checking patterns", misconception: "ct-pattern-vs-gen" },
          { id: "d", text: "Computers cannot run programs longer than 10 lines" },
        ],
        answer: "a",
        explanation:
          "Leraian breaks a complex system into smaller parts so each part can be understood, designed or solved independently.",
      },
      {
        id: "f1-1.1.1-q09",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Cikgu Farah splits producing the school magazine into 4 teams: articles, photography, layout, and printing. Which CT technique did she use?",
        options: [
          { id: "a", text: "Decomposition (Leraian)" },
          { id: "b", text: "Abstraction (Peniskalaan)", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Generalisation (Pengitlakan)" },
          { id: "d", text: "Pattern recognition (Pengecaman corak)" },
        ],
        answer: "a",
        explanation: "Breaking one big project into four distinct sub-tasks is decomposition (leraian).",
      },
      {
        id: "f1-1.1.1-q10",
        kind: "match",
        skill: "understand",
        prompt: "Match each guiding question a student asks themselves to the CT technique it triggers.",
        pairs: [
          { id: "p1", left: "“Can I split this big task into smaller parts?”", right: "Decomposition (Leraian)" },
          { id: "p2", left: "“What repeats or looks similar here?”", right: "Pattern Recognition (Pengecaman Corak)" },
          { id: "p3", left: "“Which details actually matter, and what can I ignore?”", right: "Abstraction (Peniskalaan)" },
          { id: "p4", left: "“Can I write one rule that works for any size?”", right: "Generalisation (Pengitlakan)" },
        ],
        explanation: "Remembering these four self-questions helps you apply computational thinking to any exam problem.",
      },
    ],
  },
  {
    id: "f1-1.1.2",
    code: "1.1.2",
    title: "Decomposition & Ordered Steps",
    titleMs: "Penggunaan Teknik Leraian dan Menentukan Langkah Secara Tertib",
    game: "rank-order",
    objective:
      "Decompose a real-world task into sub-problems and arrange the solution steps in valid logical order.",
    draw: 7,
    items: [
      {
        id: "f1-1.1.2-q01",
        kind: "order",
        skill: "apply",
        prompt: "Arrange the decomposed steps for cooking nasi goreng in logical order (tertib).",
        steps: [
          { id: "s1", text: "Prepare ingredients: cold rice, garlic, egg, and seasoning" },
          { id: "s2", text: "Heat oil in the wok and sauté chopped garlic" },
          { id: "s3", text: "Crack in the egg and stir until scrambled" },
          { id: "s4", text: "Add cold rice and seasoning, then toss evenly" },
          { id: "s5", text: "Turn off the stove and serve on a plate" },
        ],
        misconception: "ct-step-order",
        explanation: "Ingredients must be prepared before heating, aromatics sautéed before rice, and stove turned off before serving.",
      },
      {
        id: "f1-1.1.2-q02",
        kind: "order",
        skill: "apply",
        prompt: "Put the steps to buy a train ticket at a KTM Komuter kiosk in order.",
        steps: [
          { id: "s1", text: "Select destination station and number of passengers" },
          { id: "s2", text: "Check the fare displayed on the screen" },
          { id: "s3", text: "Pay using cash or Touch 'n Go / debit card" },
          { id: "s4", text: "Collect the token/receipt and change" },
          { id: "s5", text: "Tap the token at the gate to enter the platform" },
        ],
        misconception: "ct-step-order",
        explanation: "The fare depends on destination and passenger count, payment must happen before token dispensing, and the gate opens last.",
      },
      {
        id: "f1-1.1.2-q03",
        kind: "order",
        skill: "analyse",
        prompt: "Arrange the steps to calculate the total paint cost for a rectangular classroom wall (with one door not painted).",
        steps: [
          { id: "s1", text: "Measure wall length & height, and door width & height" },
          { id: "s2", text: "Compute gross wall area (length × height)" },
          { id: "s3", text: "Compute door area and subtract it to get net paint area" },
          { id: "s4", text: "Divide net area by area covered per tin (rounding up to whole tins)" },
          { id: "s5", text: "Multiply number of tins needed by price per tin" },
        ],
        misconception: "ct-step-order",
        explanation: "Decomposing geometry problems separates measurement → gross area → deductions → quantity of tins → total cost.",
      },
      {
        id: "f1-1.1.2-q04",
        kind: "order",
        skill: "apply",
        prompt: "Order the steps for borrowing a book at the school resource centre (pusat sumber).",
        steps: [
          { id: "s1", text: "Search the shelf or catalogue and pick the book" },
          { id: "s2", text: "Hand student library card and book to the librarian" },
          { id: "s3", text: "Scan card barcode and book barcode into the system" },
          { id: "s4", text: "Stamp or record the return due date" },
          { id: "s5", text: "Take the book and card back before leaving" },
        ],
        misconception: "ct-step-order",
        explanation: "A book must be chosen and identified with the borrower's card before recording the loan and due date.",
      },
      {
        id: "f1-1.1.2-q05",
        kind: "order",
        skill: "analyse",
        prompt: "Order the steps to solve a complex problem using computational thinking.",
        steps: [
          { id: "s1", text: "Understand the goal and break the problem into smaller parts (Leraian)" },
          { id: "s2", text: "Look for similarities among the smaller parts (Pengecaman corak)" },
          { id: "s3", text: "Keep essential details and drop irrelevant ones (Peniskalaan)" },
          { id: "s4", text: "Formulate ordered steps or a general model to solve it (Pengitlakan)" },
        ],
        misconception: "ct-step-order",
        explanation: "Rajah 1.1 in the textbook shows: break problem down → spot patterns → leave out unimportant details → build a solution model.",
      },
      {
        id: "f1-1.1.2-q06",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Raju wants to calculate the area of an L-shaped badminton hall floor. Which decomposition makes the calculation simplest?",
        options: [
          { id: "a", text: "Split the L-shape into two non-overlapping rectangles and add their areas" },
          { id: "b", text: "Guess the average width and multiply by the longest wall", misconception: "ct-drops-essential" },
          { id: "c", text: "Record the floor paint colour and brand first", misconception: "ct-keeps-irrelevant" },
          { id: "d", text: "Split the floor into 1,000 tiny random triangles" },
        ],
        answer: "a",
        explanation:
          "Good decomposition splits an unfamiliar compound shape into simple, non-overlapping rectangles whose area formula (length × width) we already know.",
      },
      {
        id: "f1-1.1.2-q07",
        kind: "order",
        skill: "apply",
        prompt: "Arrange the steps to wash school white shoes properly.",
        steps: [
          { id: "s1", text: "Remove shoelaces and shake off loose dirt" },
          { id: "s2", text: "Wet the shoes and scrub stains with soap and a brush" },
          { id: "s3", text: "Rinse thoroughly with clean water" },
          { id: "s4", text: "Dry the shoes in an airy place" },
          { id: "s5", text: "Apply shoe chalk/whitener once dry and re-lace" },
        ],
        misconception: "ct-step-order",
        explanation: "Chalk/whitener and laces go on after washing, rinsing, and drying — otherwise soap or water washes it right off.",
      },
      {
        id: "f1-1.1.2-q08",
        kind: "mcq",
        skill: "understand",
        prompt: "Why must steps after decomposition be arranged 'secara tertib' (in strict logical order)?",
        options: [
          { id: "a", text: "Later steps often depend on outputs or conditions prepared by earlier steps" },
          { id: "b", text: "Alphabetical order makes instructions shorter" },
          { id: "c", text: "Order never matters once a task is decomposed", misconception: "ct-step-order" },
          { id: "d", text: "Only computers care about order; humans can do steps in any order", misconception: "ct-step-order" },
        ],
        answer: "a",
        explanation:
          "Even in daily life (like baking or calculating net area), doing a step before its inputs are ready produces the wrong result.",
      },
      {
        id: "f1-1.1.2-q09",
        kind: "order",
        skill: "apply",
        prompt: "Arrange the steps to plant a chilli seedling in a pot for RBT/ASK project.",
        steps: [
          { id: "s1", text: "Fill the pot with potting soil Mix and poke a small hole in the centre" },
          { id: "s2", text: "Place the chilli seedling gently into the hole" },
          { id: "s3", text: "Cover the roots with soil and press lightly" },
          { id: "s4", text: "Water the soil around the seedling" },
        ],
        misconception: "ct-step-order",
        explanation: "Soil goes in the pot first, then the seedling, then root covering, then watering.",
      },
      {
        id: "f1-1.1.2-q10",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Siti's steps to make hot Milo: (1) Pour hot water into mug, (2) Drink Milo, (3) Add 2 spoons of Milo powder, (4) Stir well. What is wrong?",
        options: [
          { id: "a", text: "Step (2) is out of order — drinking happens before adding powder and stirring" },
          { id: "b", text: "She forgot to specify the colour of the mug", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "Nothing is wrong because all 4 sub-tasks are present", misconception: "ct-step-order" },
          { id: "d", text: "She did not write a mathematical equation" },
        ],
        answer: "a",
        explanation: "Having the right sub-tasks is not enough — step (2) must come last after adding Milo and stirring.",
      },
    ],
  },
  {
    id: "f1-1.1.3",
    code: "1.1.3",
    title: "Pattern Recognition in Situations",
    titleMs: "Pengecaman Corak dalam Sesuatu Situasi",
    game: "odd-one-out",
    objective:
      "Recognise numerical, visual and situational patterns and spot anomalies or predict missing values.",
    draw: 10,
    items: [
      {
        id: "f1-1.1.3-q01",
        kind: "mcq",
        skill: "analyse",
        prompt: "Three of these number sequences follow the rule 'multiply by 2 each step'. Which one is the ODD ONE OUT?",
        options: [
          { id: "a", text: "3, 6, 9, 12, 15" },
          { id: "b", text: "2, 4, 8, 16, 32" },
          { id: "c", text: "5, 10, 20, 40, 80" },
          { id: "d", text: "1, 2, 4, 8, 16" },
        ],
        answer: "a",
        explanation: "3, 6, 9, 12, 15 adds 3 each time (+3), whereas the other three double every term (×2).",
      },
      {
        id: "f1-1.1.3-q02",
        kind: "mcq",
        skill: "apply",
        prompt: "Look at the differences in this sequence: 2, 5, 10, 17, 26, ? What comes next?",
        options: [
          { id: "a", text: "37" },
          { id: "b", text: "35", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "36", misconception: "ct-formula-offset" },
          { id: "d", text: "52" },
        ],
        answer: "a",
        explanation: "The differences are +3, +5, +7, +9 (odd numbers increasing by 2). The next difference is +11, so 26 + 11 = 37.",
      },
      {
        id: "f1-1.1.3-q03",
        kind: "mcq",
        skill: "analyse",
        prompt: "Which item breaks the pattern in this list: Square (4), Pentagon (5), Hexagon (6), Circle, Octagon (8)?",
        options: [
          { id: "a", text: "Circle — it is curved, not a straight-sided polygon" },
          { id: "b", text: "Square — it has equal sides" },
          { id: "c", text: "Octagon — 8 is an even number" },
          { id: "d", text: "Pentagon — 5 is prime" },
        ],
        answer: "a",
        explanation: "All the others are polygons with straight sides; Circle has no straight sides or vertices.",
      },
      {
        id: "f1-1.1.3-q04",
        kind: "mcq",
        skill: "apply",
        prompt:
          "A school bus arrives at Taman Melawati at 6:30 a.m., 6:45 a.m., 7:00 a.m., and 7:15 a.m. If the pattern continues, when is the next bus?",
        options: [
          { id: "a", text: "7:30 a.m." },
          { id: "b", text: "7:25 a.m.", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "7:45 a.m." },
          { id: "d", text: "8:00 a.m." },
        ],
        answer: "a",
        explanation: "The pattern is a steady 15-minute interval between buses, so 7:15 a.m. + 15 minutes = 7:30 a.m.",
      },
      {
        id: "f1-1.1.3-q05",
        kind: "mcq",
        skill: "analyse",
        prompt: "Three tasks share the SAME repeating daily routine pattern. Which one is the ODD ONE OUT?",
        options: [
          { id: "a", text: "Replacing a burst bicycle tyre on the roadside" },
          { id: "b", text: "Taking class attendance every morning at 7:40 a.m." },
          { id: "c", text: "Ringing the school recess bell at 10:10 a.m. each school day" },
          { id: "d", text: "Backing up the library computer every Friday at 4:00 p.m." },
        ],
        answer: "a",
        explanation: "Attendance, recess bells and weekly backups follow predictable schedules; a burst tyre is an unplanned one-off event.",
      },
      {
        id: "f1-1.1.3-q06",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Table of matchstick triangles in a row: 1 triangle uses 3 sticks, 2 joined triangles use 5 sticks, 3 joined triangles use 7 sticks. How many sticks for 5 joined triangles?",
        options: [
          { id: "a", text: "11" },
          { id: "b", text: "15", misconception: "ct-formula-offset" },
          { id: "c", text: "9", misconception: "ct-linear-vs-diff" },
          { id: "d", text: "10" },
        ],
        answer: "a",
        explanation: "The first triangle needs 3 sticks and each new joined triangle shares a side so it adds +2 sticks: 3, 5, 7, 9, 11.",
      },
      {
        id: "f1-1.1.3-q07",
        kind: "mcq",
        skill: "analyse",
        prompt: "Spot the ODD ONE OUT among these four passwords based on their character pattern:",
        code: "A) Kucing42!\nB) Harimau19!\nC) Pelangi88!\nD) burung77?",
        options: [
          { id: "a", text: "D — starts with lowercase and ends with '?' instead of Capital + 2 digits + '!'" },
          { id: "b", text: "A — 'Kucing' has 6 letters", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "C — '88' uses repeated digits" },
          { id: "d", text: "B — '19' is an odd number" },
        ],
        answer: "a",
        explanation: "Options A, B, and C all follow CapitalisedMalayWord + 2 digits + '!'; D breaks both capitalisation and ending symbol.",
      },
      {
        id: "f1-1.1.3-q08",
        kind: "multi",
        skill: "understand",
        prompt: "Select the TWO statements that explain why pattern recognition (pengecaman corak) helps solve problems faster.",
        options: [
          { id: "a", text: "Known solutions from similar past cases can be reused or adapted" },
          { id: "b", text: "Repeating trends let us predict future values without counting from scratch" },
          { id: "c", text: "It removes the need to check if our answer is logical", misconception: "ct-drops-essential" },
          { id: "d", text: "It splits one task into unrelated team roles", misconception: "ct-decomp-vs-abs" },
        ],
        answer: ["a", "b"],
        explanation: "Spotting similarities lets us reuse proven strategies and predict values instead of redoing work.",
      },
      {
        id: "f1-1.1.3-q09",
        kind: "mcq",
        skill: "analyse",
        prompt: "In this row of numbers, ONE number breaks the pattern: 1, 4, 9, 16, 24, 36, 49. Which number is wrong?",
        options: [
          { id: "a", text: "24 (should be 25, because the pattern is square numbers n²)" },
          { id: "b", text: "9 (because all other numbers are even)", misconception: "ct-surface-similarity" },
          { id: "c", text: "1 (because 1 has one digit)" },
          { id: "d", text: "49 (should be 48)", misconception: "ct-linear-vs-diff" },
        ],
        answer: "a",
        explanation: "1², 2², 3², 4², 5², 6², 7² gives 1, 4, 9, 16, 25, 36, 49 — so 24 breaks the square-number pattern.",
      },
      {
        id: "f1-1.1.3-q10",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Canteen nasi lemak sales over two weeks:\nMon 80, Tue 55, Wed 50, Thu 55, Fri 90 | Mon 82, Tue 53, Wed 52, Thu 54, Fri ?\nWhat is the most reasonable estimate for Friday?",
        options: [
          { id: "a", text: "Around 90 packets (sales peak on Mondays and Fridays)" },
          { id: "b", text: "Around 54 packets (same as Thursday)", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "Around 20 packets" },
          { id: "d", text: "Cannot predict anything from past weeks" },
        ],
        answer: "a",
        explanation: "Comparing Week 1 and Week 2 reveals a weekly cycle: mid-week ~50–55, Monday ~80, and Friday peaks around 90.",
      },
      {
        id: "f1-1.1.3-q11",
        kind: "mcq",
        skill: "analyse",
        prompt: "Three of these pairs show a SIMILAR structural pattern (input → fixed rate × quantity). Which one is the ODD ONE OUT?",
        options: [
          { id: "a", text: "Guessing your friend's favourite colour" },
          { id: "b", text: "Electricity charge = kWh used × tariff rate" },
          { id: "c", text: "Parking fee = hours parked × RM2 per hour" },
          { id: "d", text: "Photocopy cost = pages printed × RM0.10 per page" },
        ],
        answer: "a",
        explanation: "B, C and D all share the multiplication pattern Total = Quantity × Unit Rate; guessing a colour has no rate rule.",
      },
      {
        id: "f1-1.1.3-q12",
        kind: "mcq",
        skill: "apply",
        prompt: "Bead necklace pattern: Red, Blue, Blue, Yellow, Red, Blue, Blue, Yellow… What colour is the 15th bead?",
        options: [
          { id: "a", text: "Blue" },
          { id: "b", text: "Yellow", misconception: "ct-formula-offset" },
          { id: "c", text: "Red", misconception: "ct-formula-offset" },
          { id: "d", text: "Green" },
        ],
        answer: "a",
        explanation: "The cycle length is 4 (R, B, B, Y). 15 ÷ 4 = 3 full cycles remainder 3, and the 3rd bead in the cycle is Blue.",
      },
      {
        id: "f1-1.1.3-q13",
        kind: "mcq",
        skill: "analyse",
        prompt: "Three words share a palindrome pattern (reads the same forwards and backwards). Which is the ODD ONE OUT?",
        options: [
          { id: "a", text: "KATAK" },
          { id: "b", text: "MALAM" },
          { id: "c", text: "RADAR" },
          { id: "d", text: "KASUT" },
        ],
        answer: "d",
        explanation: "KATAK, MALAM and RADAR read identically backwards; KASUT reversed is TUSAK.",
      },
    ],
  },
  {
    id: "f1-1.1.4",
    code: "1.1.4",
    title: "Decisions Based on Important Aspects",
    titleMs: "Membuat Keputusan Berdasarkan Aspek Penting",
    game: "group-sort",
    objective:
      "Use abstraction (peniskalaan) to separate decision-critical aspects from irrelevant details when making choices.",
    draw: 7,
    items: [
      {
        id: "f1-1.1.4-q01",
        kind: "sort",
        skill: "analyse",
        prompt:
          "Your family is choosing a hotel in Penang for 4 people within a RM300/night budget. Sort each detail into Important Aspect vs Unimportant Detail.",
        buckets: [
          { id: "imp", label: "Important Aspect (Aspek Penting)" },
          { id: "unimp", label: "Unimportant Detail (Perkara Tidak Penting)" },
        ],
        cards: [
          { id: "c1", text: "Room price per night", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Number of beds / max guests", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Distance & safety of location", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Font used on the receptionist's name tag", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Lobby sofa cushion pattern", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c6", text: "Hotel owner's favourite football club", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation:
          "Abstraction keeps budget, capacity and location while ignoring decorative or personal trivia that do not affect the stay.",
      },
      {
        id: "f1-1.1.4-q02",
        kind: "sort",
        skill: "analyse",
        prompt:
          "Hafiz is buying a laptop for ASK coding and online tuition. Sort these factors into Important vs Unimportant.",
        buckets: [
          { id: "imp", label: "Important Aspect" },
          { id: "unimp", label: "Unimportant Detail" },
        ],
        cards: [
          { id: "c1", text: "RAM, storage & processor speed", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Price within family budget & warranty", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Working webcam & battery life", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Cartoon sticker on the cardboard box", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Colour of the shop's shopping bag", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Specs, budget, warranty and battery affect learning; box art and bag colour do not.",
      },
      {
        id: "f1-1.1.4-q03",
        kind: "sort",
        skill: "apply",
        prompt:
          "An LRT transit map (like RapidKL) is a classic example of abstraction. Sort what the map KEEPS vs LEAVES OUT.",
        buckets: [
          { id: "keep", label: "Kept on Transit Map" },
          { id: "drop", label: "Left Out (Abstracted Away)" },
        ],
        cards: [
          { id: "c1", text: "Station names and sequence of stops", bucket: "keep", misconception: "ct-drops-essential" },
          { id: "c2", text: "Interchange stations between lines", bucket: "keep", misconception: "ct-drops-essential" },
          { id: "c3", text: "Every roadside tree and shop along the track", bucket: "drop", misconception: "ct-keeps-irrelevant" },
          { id: "c4", text: "Exact twists and hills of every street", bucket: "drop", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Line colours/numbers to tell routes apart", bucket: "keep", misconception: "ct-drops-essential" },
        ],
        explanation:
          "Transit maps strip away geographic clutter (trees, exact road bends) so commuters immediately see stops, lines and interchanges.",
      },
      {
        id: "f1-1.1.4-q04",
        kind: "sort",
        skill: "apply",
        prompt:
          "You are writing a program to calculate a student's BMI = mass (kg) ÷ height (m)². Sort the student data fields.",
        buckets: [
          { id: "need", label: "Needed by BMI Program" },
          { id: "ignore", label: "Ignored (Not Needed)" },
        ],
        cards: [
          { id: "c1", text: "Body mass in kilograms", bucket: "need", misconception: "ct-drops-essential" },
          { id: "c2", text: "Height in metres", bucket: "need", misconception: "ct-drops-essential" },
          { id: "c3", text: "Favourite canteen drink", bucket: "ignore", misconception: "ct-keeps-irrelevant" },
          { id: "c4", text: "Pencil case brand", bucket: "ignore", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Home house number", bucket: "ignore", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Only mass and height affect BMI; collecting extra personal trivia adds clutter without improving the answer.",
      },
      {
        id: "f1-1.1.4-q05",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Cikgu Tan must pick ONE venue for Form 1 coding camp (45 students, needs Wi-Fi and power sockets, budget RM900). Which venue is the best decision?",
        code: "Venue P: RM850, holds 50, strong Wi-Fi & sockets, plain beige curtains\nVenue Q: RM1,200, holds 60, strong Wi-Fi, luxury chandelier\nVenue R: RM700, holds 25, strong Wi-Fi, colourful murals\nVenue S: RM800, holds 50, NO Wi-Fi, free balloons",
        options: [
          { id: "a", text: "Venue P — meets capacity, Wi-Fi, sockets and budget (curtain colour is irrelevant)" },
          { id: "b", text: "Venue Q — has a luxury chandelier", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "Venue R — cheapest at RM700", misconception: "ct-drops-essential" },
          { id: "d", text: "Venue S — includes free balloons", misconception: "ct-keeps-irrelevant" },
        ],
        answer: "a",
        explanation:
          "Venue Q breaks budget, R is too small for 45 students, and S lacks Wi-Fi. Only Venue P satisfies every essential constraint.",
      },
      {
        id: "f1-1.1.4-q06",
        kind: "sort",
        skill: "analyse",
        prompt:
          "To decide which route gets an ambulance to Hospital Kuala Lumpur fastest, sort these factors.",
        buckets: [
          { id: "imp", label: "Important Aspect" },
          { id: "unimp", label: "Unimportant Detail" },
        ],
        cards: [
          { id: "c1", text: "Live traffic congestion & roadblocks", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Distance & estimated travel time", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Billboard advertisements along the highway", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c4", text: "Year the street lamps were painted", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Time, distance and live traffic determine arrival speed; billboards and lamp paint are irrelevant noise.",
      },
      {
        id: "f1-1.1.4-q07",
        kind: "mcq",
        skill: "understand",
        prompt: "What happens if a student removes TOO MANY details during abstraction (peniskalaan)?",
        options: [
          { id: "a", text: "An essential constraint is lost, so the solution may fail in real life" },
          { id: "b", text: "The model always becomes more accurate", misconception: "ct-drops-essential" },
          { id: "c", text: "It turns into decomposition automatically", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Nothing — fewer details is always better even if key facts are missing", misconception: "ct-drops-essential" },
        ],
        answer: "a",
        explanation:
          "Good abstraction removes only irrelevant details. Dropping an essential factor (like room capacity or allergies) produces a broken decision.",
      },
      {
        id: "f1-1.1.4-q08",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Notice that whether you are choosing a bus route OR choosing a canteen meal, what counts as an 'important aspect' depends on:",
        options: [
          { id: "a", text: "The specific goal and constraints of the problem you are solving" },
          { id: "b", text: "Always picking the item with the longest description", misconception: "ct-keeps-irrelevant" },
          { id: "c", text: "Ignoring numbers and keeping colours", misconception: "ct-keeps-irrelevant" },
          { id: "d", text: "Keeping every single fact ever mentioned", misconception: "ct-keeps-irrelevant" },
        ],
        answer: "a",
        explanation:
          "Importance is context-dependent: brick colour is irrelevant when counting bricks, but essential if designing a mosaic flag!",
      },
      {
        id: "f1-1.1.4-q09",
        kind: "sort",
        skill: "apply",
        prompt:
          "Ordering catering for a school prize-giving ceremony (majlis anugerah). Sort Important vs Unimportant aspects.",
        buckets: [
          { id: "imp", label: "Important Aspect" },
          { id: "unimp", label: "Unimportant Detail" },
        ],
        cards: [
          { id: "c1", text: "Halal certification & guest food allergies", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Number of guests & price per head", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Delivery arrival time before break", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Caterer's van number plate digits", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Chef's favourite song", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Dietary needs, headcount, cost and timing matter; number plates and music tastes do not.",
      },
      {
        id: "f1-1.1.4-q10",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Mei wants to find how long it takes to fill a 600-litre water tank from a tap flowing at 15 litres per minute. Which detail is UNIMPORTANT?",
        options: [
          { id: "a", text: "The water tank is dark blue plastic" },
          { id: "b", text: "The tank holds 600 litres", misconception: "ct-drops-essential" },
          { id: "c", text: "Water flows in at 15 litres per minute", misconception: "ct-drops-essential" },
          { id: "d", text: "Whether the tank starts empty or half-full", misconception: "ct-drops-essential" },
        ],
        answer: "a",
        explanation: "Capacity, flow rate and starting water level affect filling time; tank colour does not.",
      },
    ],
  },
  {
    id: "f1-1.1.5",
    code: "1.1.5",
    title: "Similarities Across Problems (Generalisation)",
    titleMs: "Ciri-ciri Kesamaan dalam Sesuatu Permasalahan",
    game: "recall-blast",
    objective:
      "Identify shared structural features between two problems and adapt a general model or formula (pengitlakan) to solve a new case.",
    draw: 10,
    items: [
      {
        id: "f1-1.1.5-q01",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Problem 1: Stacking cans where row 1 has 2 cans, row 2 has 4, row 3 has 6.\nProblem 2: Seating chairs where row 1 has 2 chairs, row 2 has 4, row 3 has 6.\nWhy can the SAME formula solve both?",
        options: [
          { id: "a", text: "Both share the same mathematical structure: row k has 2k items" },
          { id: "b", text: "Cans and chairs weigh the same", misconception: "ct-surface-similarity" },
          { id: "c", text: "Only cans can use formulas; chairs must be counted by hand" },
          { id: "d", text: "Both happen in a supermarket", misconception: "ct-surface-similarity" },
        ],
        answer: "a",
        explanation:
          "When two different stories share identical structural features (ciri-ciri kesamaan), one general model (pengitlakan) solves both.",
      },
      {
        id: "f1-1.1.5-q02",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Square tables arranged in a single long line: 1 table seats 4 people, 2 joined tables seat 6, 3 joined tables seat 8 (formula: Seats = 2n + 2). How many people sit at 10 joined tables?",
        accept: ["22"],
        traps: [
          { answer: "40", misconception: "ct-formula-offset" },
          { answer: "20", misconception: "ct-formula-offset" },
        ],
        explanation: "Using the generalised model Seats = 2n + 2: for n = 10, Seats = 2(10) + 2 = 22 (inner edges are shared!).",
      },
      {
        id: "f1-1.1.5-q03",
        kind: "mcq",
        skill: "apply",
        prompt:
          "Fence posts along a straight path: 1 section needs 2 posts, 2 sections need 3 posts, 3 sections need 4 posts. Which formula gives the posts for n sections?",
        options: [
          { id: "a", text: "Posts = n + 1" },
          { id: "b", text: "Posts = 2n", misconception: "ct-formula-offset" },
          { id: "c", text: "Posts = n", misconception: "ct-formula-offset" },
          { id: "d", text: "Posts = n − 1" },
        ],
        answer: "a",
        explanation: "Check n = 1 → 2, n = 2 → 3, n = 3 → 4: Posts = n + 1 works for every n (classic fencepost model).",
      },
      {
        id: "f1-1.1.5-q04",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "You already wrote a method to find the highest mark in a class list. Which new problem has the HIGHEST structural similarity so you can reuse the same method?",
        options: [
          { id: "a", text: "Finding the hottest daily temperature recorded in Ipoh this month" },
          { id: "b", text: "Sorting exam papers alphabetically by surname" },
          { id: "c", text: "Printing a school timetable poster", misconception: "ct-surface-similarity" },
          { id: "d", text: "Decorating the classroom noticeboard", misconception: "ct-surface-similarity" },
        ],
        answer: "a",
        explanation:
          "Finding the highest mark and finding the highest temperature are structurally identical: scan a list of numbers and keep the maximum.",
      },
      {
        id: "f1-1.1.5-q05",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "In the textbook staircase model, Step 1 uses 3 bricks, Step 2 uses 6 bricks, Step 3 uses 9 bricks (row k uses 3k bricks). How many bricks are in row 7 ALONE?",
        accept: ["21"],
        traps: [{ answer: "10", misconception: "ct-linear-vs-diff" }],
        explanation: "Row k has 3k bricks, so row 7 alone has 3 × 7 = 21 bricks.",
      },
      {
        id: "f1-1.1.5-q06",
        kind: "mcq",
        skill: "understand",
        prompt: "In computational thinking, what is the outcome of generalisation (pengitlakan)?",
        options: [
          { id: "a", text: "A reusable rule, formula, or step-by-step model that solves a whole family of similar problems" },
          { id: "b", text: "A list of unimportant details to delete", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Splitting a single task among four classmates", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Memorising one answer that works for only one number", misconception: "ct-formula-offset" },
        ],
        answer: "a",
        explanation: "Pengitlakan builds a general model (formula, rule or procedure) applicable to similar problems of any size.",
      },
      {
        id: "f1-1.1.5-q07",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Danial claims `Tiles = 4n` fits this pattern: n=1 → 4 tiles, n=2 → 7 tiles, n=3 → 10 tiles. Why is Danial's formula wrong?",
        options: [
          { id: "a", text: "He only checked n = 1; for n = 2 his formula gives 8 instead of 7 (correct is 3n + 1)" },
          { id: "b", text: "Formulas can never contain multiplication" },
          { id: "c", text: "His formula fails for n = 1" },
          { id: "d", text: "Tiles cannot be modelled with numbers" },
        ],
        answer: "a",
        explanation: "Always test a generalised formula against at least 2–3 cases! Since each step adds +3 starting from 4, the model is 3n + 1.",
      },
      {
        id: "f1-1.1.5-q08",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Using the verified model `Tiles = 3n + 1` (n=1 → 4, n=2 → 7, n=3 → 10), how many tiles are needed for Figure 8 (n = 8)?",
        accept: ["25"],
        traps: [
          { answer: "24", misconception: "ct-formula-offset" },
          { answer: "32", misconception: "ct-formula-offset" },
        ],
        explanation: "Substitute n = 8 into 3n + 1: 3(8) + 1 = 24 + 1 = 25.",
      },
      {
        id: "f1-1.1.5-q09",
        kind: "multi",
        skill: "analyse",
        prompt:
          "Which TWO problems share the exact same structure: `Total = Fixed Base Fee + (Rate × Units)`?",
        options: [
          { id: "a", text: "Taxi fare: RM3 flag-down + RM2 per km travelled" },
          { id: "b", text: "Printing service: RM5 setup fee + RM0.50 per booklet page" },
          { id: "c", text: "Area of a square field = side × side", misconception: "ct-surface-similarity" },
          { id: "d", text: "Splitting 24 sweets equally among 6 children", misconception: "ct-surface-similarity" },
        ],
        answer: ["a", "b"],
        explanation: "Both the taxi fare and printing service combine a one-off base fee with a per-unit charge: Base + Rate × Units.",
      },
      {
        id: "f1-1.1.5-q10",
        kind: "mcq",
        skill: "apply",
        prompt:
          "A delivery rider charges RM4 base fee + RM1.50 per km. A plumber charges RM30 call-out fee + RM20 per hour. What is the plumber's bill for 3 hours?",
        options: [
          { id: "a", text: "RM90" },
          { id: "b", text: "RM60", misconception: "ct-drops-essential" },
          { id: "c", text: "RM150", misconception: "ct-formula-offset" },
          { id: "d", text: "RM50" },
        ],
        answer: "a",
        explanation: "Same general model Base + Rate × Units: RM30 + (RM20 × 3) = RM30 + RM60 = RM90.",
      },
      {
        id: "f1-1.1.5-q11",
        kind: "mcq",
        skill: "recall",
        prompt: "What is the Malay term in KSSM ASK for building a general model or formula from patterns?",
        options: [
          { id: "a", text: "Pengitlakan" },
          { id: "b", text: "Peniskalaan", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Leraian", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Pengecaman corak", misconception: "ct-pattern-vs-gen" },
        ],
        answer: "a",
        explanation: "Pengitlakan = Generalisation (building a model/rule/formula to solve similar problems).",
      },
      {
        id: "f1-1.1.5-q12",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Cutting a long bamboo pole: 1 cut makes 2 pieces, 2 cuts make 3 pieces, 3 cuts make 4 pieces. How many cuts are needed to get 12 pieces (cutting one pole without stacking)?",
        accept: ["11"],
        traps: [
          { answer: "12", misconception: "ct-formula-offset" },
          { answer: "13", misconception: "ct-formula-offset" },
        ],
        explanation: "Pieces = Cuts + 1, so Cuts = Pieces − 1 = 12 − 1 = 11 cuts.",
      },
    ],
  },
  {
    id: "f1-1.1",
    code: "1.1",
    title: "Chapter 1 Mastery: Computational Thinking",
    titleMs: "Asas Pemikiran Komputasional",
    boss: true,
    game: "escape-room",
    objective:
      "Combine decomposition, pattern recognition, abstraction and generalisation to solve multi-step unseen problems.",
    draw: 8,
    items: [
      {
        id: "f1-1.1-q01",
        kind: "match",
        skill: "understand",
        prompt: "Lock 1 — Match each Sports Day (Hari Sukan) planning move to its CT technique.",
        pairs: [
          { id: "p1", left: "Divide into track events, field events, first-aid & march-past", right: "Leraian (Decomposition)" },
          { id: "p2", left: "Notice 100m heats always take ~4 minutes per heat every year", right: "Pengecaman Corak (Pattern Recognition)" },
          { id: "p3", left: "Schedule using runner count & lane count, ignoring shoe brands", right: "Peniskalaan (Abstraction)" },
          { id: "p4", left: "Formula: Heats Needed = ceiling(Runners ÷ 8 lanes)", right: "Pengitlakan (Generalisation)" },
        ],
        explanation: "A single school event uses all four CT techniques from initial task breakdown to the scheduling formula.",
      },
      {
        id: "f1-1.1-q02",
        kind: "order",
        skill: "apply",
        prompt: "Lock 2 — Arrange the decomposed steps to compute the change due when a student buys items at the co-op.",
        steps: [
          { id: "s1", text: "List the price and quantity of each item bought" },
          { id: "s2", text: "Multiply price × quantity for each item and add them for the grand total" },
          { id: "s3", text: "Check that cash tendered is at least equal to the grand total" },
          { id: "s4", text: "Subtract grand total from cash tendered to get the change" },
        ],
        misconception: "ct-step-order",
        explanation: "Individual item subtotals come first, then grand total, then sufficient-cash check, then subtraction.",
      },
      {
        id: "f1-1.1-q03",
        kind: "sort",
        skill: "analyse",
        prompt:
          "Lock 3 — You are calculating how many buses to charter for 170 Form 1 students going to Petrosains. Sort Important vs Unimportant details.",
        buckets: [
          { id: "imp", label: "Important (Keep)" },
          { id: "unimp", label: "Unimportant (Ignore)" },
        ],
        cards: [
          { id: "c1", text: "Total students & accompanying teachers", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c2", text: "Seats per bus (44 seats)", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c3", text: "Rental cost per bus vs trip budget", bucket: "imp", misconception: "ct-drops-essential" },
          { id: "c4", text: "Bus driver's favourite nasi kandar shop", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
          { id: "c5", text: "Pattern on the bus seat curtains", bucket: "unimp", misconception: "ct-keeps-irrelevant" },
        ],
        explanation: "Passenger count, seat capacity and budget determine bus count; curtain patterns and food preferences do not.",
      },
      {
        id: "f1-1.1-q04",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt:
          "Lock 4 — 170 students + 10 teachers = 180 passengers. Each bus seats 44 passengers. What is the MINIMUM whole number of buses needed so nobody is left behind?",
        accept: ["5"],
        traps: [{ answer: "4", misconception: "ct-drops-essential" }],
        explanation: "180 ÷ 44 = 4 remainder 4. 4 buses only carry 176 people, leaving 4 behind — so we round UP to 5 buses.",
      },
      {
        id: "f1-1.1-q05",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Lock 5 — Hexagon honeycomb chain: 1 hexagon has 6 sides, 2 joined hexagons share 1 wall so have 11 outer/inner walls, 3 in a line have 16 walls. Which formula fits n hexagons in a line?",
        options: [
          { id: "a", text: "5n + 1" },
          { id: "b", text: "6n", misconception: "ct-formula-offset" },
          { id: "c", text: "6n − 1", misconception: "ct-formula-offset" },
          { id: "d", text: "n + 5", misconception: "ct-linear-vs-diff" },
        ],
        answer: "a",
        explanation: "Start with 6 for n=1, then each added hexagon shares 1 wall so adds +5: 5(1)+1=6, 5(2)+1=11, 5(3)+1=16.",
      },
      {
        id: "f1-1.1-q06",
        kind: "input",
        skill: "apply",
        inputMode: "numeric",
        prompt: "Lock 6 — Using the honeycomb formula `Walls = 5n + 1`, how many walls are in a chain of 9 joined hexagons?",
        accept: ["46"],
        traps: [{ answer: "54", misconception: "ct-formula-offset" }],
        explanation: "5 × 9 + 1 = 45 + 1 = 46 walls.",
      },
      {
        id: "f1-1.1-q07",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Lock 7 — Aisha notices her phone battery drops 12% per hour on video calls: 100%, 88%, 76%, 64%… Which TWO CT techniques does she use if she writes `Battery = 100 − 12h`?",
        options: [
          { id: "a", text: "Pattern recognition (spotting −12%/hr) then Generalisation (writing 100 − 12h)" },
          { id: "b", text: "Decomposition only", misconception: "ct-decomp-vs-abs" },
          { id: "c", text: "Abstraction only", misconception: "ct-decomp-vs-abs" },
          { id: "d", text: "Neither — battery percentages cannot use CT" },
        ],
        answer: "a",
        explanation: "Spotting the constant −12 drop is pengecaman corak; expressing it as `100 − 12h` is pengitlakan.",
      },
      {
        id: "f1-1.1-q08",
        kind: "mcq",
        skill: "analyse",
        prompt:
          "Lock 8 — Which problem is structurally identical to finding how many 44-seat buses are needed for 180 passengers?",
        options: [
          { id: "a", text: "Finding how many 12-egg cartons are needed to pack 100 eggs without leaving any unpacked" },
          { id: "b", text: "Painting a bus yellow", misconception: "ct-surface-similarity" },
          { id: "c", text: "Listing the names of 44 bus stations", misconception: "ct-surface-similarity" },
          { id: "d", text: "Finding the average height of 5 players" },
        ],
        answer: "a",
        explanation: "Both divide total items by container capacity and round UP any remainder (ceiling division).",
      },
      {
        id: "f1-1.1-q09",
        kind: "mcq",
        skill: "apply",
        prompt: "Lock 9 — Sequence check: 3, 7, 15, 31, ? What is the next term?",
        options: [
          { id: "a", text: "63 (each term is double the previous plus 1: 31 × 2 + 1)" },
          { id: "b", text: "47 (adds 16 again)", misconception: "ct-linear-vs-diff" },
          { id: "c", text: "62 (forgot +1)", misconception: "ct-formula-offset" },
          { id: "d", text: "39" },
        ],
        answer: "a",
        explanation: "Differences double (+4, +8, +16, +32), equivalently next = 2 × 31 + 1 = 63.",
      },
      {
        id: "f1-1.1-q10",
        kind: "multi",
        skill: "understand",
        prompt: "Lock 10 — Select ALL statements that accurately describe a well-designed computational thinking solution.",
        options: [
          { id: "a", text: "Complex parts are broken into manageable sub-tasks (leraian)" },
          { id: "b", text: "Steps are ordered so inputs exist before calculations need them" },
          { id: "c", text: "Only relevant variables are kept in the model (peniskalaan)" },
          { id: "d", text: "Decorative details like paper colour must be included in math formulas", misconception: "ct-keeps-irrelevant" },
        ],
        answer: ["a", "b", "c"],
        explanation: "Decomposition, ordered steps, and abstraction are hallmarks of sound computational thinking.",
      },
      {
        id: "f1-1.1-q11",
        kind: "order",
        skill: "analyse",
        prompt: "Lock 11 — Put the steps for preparing a school emergency fire-drill map in CT order.",
        steps: [
          { id: "s1", text: "Divide the school into Block A, Block B, labs and assembly field" },
          { id: "s2", text: "Identify common nearest-staircase exit patterns per floor" },
          { id: "s3", text: "Draw clean floor outlines & exit arrows, omitting classroom posters" },
          { id: "s4", text: "Publish a standard evacuation rule for every class on that floor" },
        ],
        misconception: "ct-step-order",
        explanation: "Block division (leraian) → exit patterns → simplified map (peniskalaan) → general floor rule (pengitlakan).",
      },
    ],
  },
];
