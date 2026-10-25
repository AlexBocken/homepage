/**
 * Rules of thumb, one card per skill (keyed by skill id). Shown collapsed above
 * every drill, expanded after a miss, and all together on /case-math/learn.
 */

export type Tip = {
	/** The one-line rule you should be able to recite. */
	rule: string;
	points: string[];
	example: string[];
	table?: [string, string][];
};

export const TIPS: Record<string, Tip> = {
	'mul-zeros': {
		rule: 'Strip the zeros, multiply the digits, add the zeros back.',
		points: [
			'Rewrite every number as digits × 10ⁿ: 3.2M = 32 × 10⁵, 450 = 45 × 10¹.',
			'Multiply only the digits; add the exponents.',
			'Name the result with k (10³), M (10⁶), B (10⁹) as you go — say it out loud in an interview.',
			'Sanity-check the order of magnitude before stating the answer: millions × thousands = billions.'
		],
		example: ['3.2M × 450', '32 × 45 = 1,440', '10⁵ × 10¹ = 10⁶', '→ 1,440M = 1.44B']
	},
	'div-zeros': {
		rule: 'Divide the digits, subtract the zeros.',
		points: [
			'Cancel common zeros first: 2,400,000 ÷ 300 = 24,000 ÷ 3.',
			'For k/M/B: M ÷ k = thousands, B ÷ M = thousands, B ÷ k = millions.',
			'If the digits don’t divide cleanly, scale one side by 10 and adjust the exponent.'
		],
		example: ['2.4B ÷ 300k', '24 × 10⁸ ÷ 3 × 10⁵', '24 ÷ 3 = 8, 10⁸⁻⁵ = 10³', '→ 8,000']
	},
	'mul-tricks': {
		rule: 'Turn awkward factors into ×10, ×100 or ×1000 plus a halving or subtraction.',
		points: [
			'×5 = ×10 ÷ 2;  ×25 = ×100 ÷ 4;  ×125 = ×1000 ÷ 8.',
			'×9 = ×10 − n;  ×99 = ×100 − n.',
			'×15 = ×10 + half of that;  ×75 = ×100 × ¾.',
			'×11 on two digits: write the digits apart and put their sum in the middle (carry if ≥10): 47 × 11 = 4(11)7 = 517.'
		],
		example: ['68 × 25', '68 × 100 = 6,800', '÷ 4 = 1,700']
	},
	'near-round': {
		rule: 'Round to a friendly number, multiply, then correct for what you added or removed.',
		points: [
			'49 × 38 = 50 × 38 − 38 = 1,900 − 38 = 1,862.',
			'Both near 100: (100 + a)(100 + b) = 100 × (100 + a + b) + a·b.  98 × 103 = 10,100 − 6 = 10,094.',
			'Symmetric around a round number: (m − d)(m + d) = m² − d².  47 × 53 = 2,500 − 9 = 2,491.'
		],
		example: ['23 × 198', '23 × 200 = 4,600', '− 23 × 2 = 46', '→ 4,554']
	},
	squares: {
		rule: 'Know 11²–25²; derive the rest from a nearby anchor.',
		points: [
			'Ending in 5: n5² = n × (n + 1), then append 25.  65² = 6 × 7 | 25 = 4,225.',
			'Near 50: (50 + d)² = (25 + d) hundreds + d².  53² = 28 | 09 = 2,809.',
			'Near 100: (100 + d)² = (100 + 2d) hundreds + d².  97² = 94 | 09 = 9,409.',
			'Anything else: n² = (n − d)(n + d) + d², with d the distance to the nearest ten.  37² = 34 × 40 + 9 = 1,369.'
		],
		example: ['43²', 'd = 3 → 40 × 46 = 1,840', '+ 9 = 1,849']
	},
	'percent-of': {
		rule: 'Build any percentage from 10%, 5% and 1% — or flip it.',
		points: [
			'10% = move the decimal; 5% = half of that; 1% = two places.',
			'x% of y = y% of x.  8% of 25 = 25% of 8 = 2.',
			'Fractions are percentages too: 12.5% = ⅛, 37.5% = ⅜, 20% = ⅕.',
			'For awkward ones subtract: 45% = 50% − 5%.'
		],
		example: ['35% of 4.2M', '10% = 420k → 30% = 1.26M', '5% = 210k', '→ 1.47M']
	},
	fractions: {
		rule: 'Memorize the table of 1/n; multiply for anything above 1.',
		points: [
			'Ninths repeat: 1/9 = 11.1%, 2/9 = 22.2%, … 8/9 = 88.9%.',
			'Sevenths: 1/7 = 14.3%, then 28.6, 42.9, 57.1, 71.4, 85.7.',
			'Use the table in reverse to divide: ÷ 8 = × 12.5%, ÷ 6 = × 16.7%.',
			'A percentage you recognize as a fraction often turns a nasty division into an easy one.'
		],
		example: ['5/8', '1/8 = 12.5%', '× 5 = 62.5%'],
		table: [
			['1/2', '50%'],
			['1/3', '33.3%'],
			['1/4', '25%'],
			['1/5', '20%'],
			['1/6', '16.7%'],
			['1/7', '14.3%'],
			['1/8', '12.5%'],
			['1/9', '11.1%'],
			['1/10', '10%'],
			['1/11', '9.1%'],
			['1/12', '8.3%'],
			['1/16', '6.25%'],
			['1/20', '5%'],
			['1/25', '4%']
		]
	},
	'pct-change': {
		rule: 'Change ÷ starting value. Percentages compound — they don’t add.',
		points: [
			'Always divide by the old value, not the new one.',
			'Two changes a% then b%: net ≈ a + b + ab/100.  +20% then −20% = −4%.',
			'Recovering from a fall of p% needs p ÷ (100 − p): −20% → +25%, −50% → +100%.',
			'Percentage points ≠ percent: margin 10% → 12% is +2 pp, but +20%.'
		],
		example: ['160 → 140', 'Change −20', '−20 ÷ 160 = −⅛ = −12.5%']
	},
	sums: {
		rule: 'Put every term in the same unit before adding.',
		points: [
			'Convert to the smallest unit present: 1.25M + 870k = 1,250k + 870k = 2,120k.',
			'Add left to right — big parts first — so you know the magnitude early.',
			'Subtract by counting up: 7,003 − 2,868: 2,868 → 3,000 is 132, → 7,003 is 4,003 more → 4,135.'
		],
		example: ['3.2M − 450k + 85k', '3,200k − 450k = 2,750k', '+ 85k = 2,835k = 2.835M']
	},
	margin: {
		rule: 'Profit = revenue − costs. Margin = profit ÷ revenue.',
		points: [
			'Unit view: contribution = price − variable cost; profit = contribution × units − fixed costs.',
			'Revenue from profit: profit ÷ margin.  2M at 20% → 10M revenue.',
			'A price rise with flat unit costs goes straight to profit: think per $100 of old revenue.',
			'Mark-up (on cost) is not margin (on price): 25% mark-up = 20% margin.'
		],
		example: ['Margin 20%, prices +10%', 'Per $100: cost 80, revenue 110', 'Profit 30 ÷ 110 = 27.3%']
	},
	breakeven: {
		rule: 'Break-even units = fixed costs ÷ contribution per unit.',
		points: [
			'Contribution per unit = price − variable cost.',
			'For a target profit, add it to fixed costs before dividing.',
			'Break-even revenue = fixed costs ÷ contribution margin %.',
			'Dividing by a nice number? Use the fraction table: ÷ 25% = × 4.'
		],
		example: ['Fixed 2.4M, price 60, VC 36', 'Contribution 24', '2.4M ÷ 24 = 100k units']
	},
	'rule-72': {
		rule: 'Years to double ≈ 72 ÷ growth rate (in %).',
		points: [
			'It runs both ways: to double in 6 years you need ≈ 12% a year.',
			'4× = two doublings, 8× = three, 10× ≈ 3.3.',
			'72 has many divisors (2, 3, 4, 6, 8, 9, 12, 18, 24) — that’s why 72 and not 70.',
			'Accurate within a few % for rates of roughly 5–20%.'
		],
		example: ['Market grows 8× in 18 years', '3 doublings → one every 6 years', '72 ÷ 6 = 12% a year']
	},
	compound: {
		rule: 'For two or three years expand (1 + r)ⁿ; for many years count doublings.',
		points: [
			'(1 + r)² = 1 + 2r + r²:  1.1² = 1.21,  1.05² = 1.1025.',
			'Small r over a few years: simple interest r × n, then add a little for compounding.',
			'Long horizons: doublings = n × r ÷ 72; 2³ = 8, 2⁴ = 16, 2^½ ≈ 1.4.',
			'Handy anchors: 1.1³ ≈ 1.33, 1.1⁵ ≈ 1.61, 1.1¹⁰ ≈ 2.59, 1.05¹⁰ ≈ 1.63.'
		],
		example: ['$5M at 12% for 12 years', '72 ÷ 12 = 6 → 2 doublings', '≈ $20M (exact 19.5M)']
	},
	perpetuity: {
		rule: 'Value of a perpetuity = cash flow ÷ (discount rate − growth).',
		points: [
			'Dividing by a percentage is multiplying by its inverse: ÷ 5% = × 20, ÷ 8% = × 12.5, ÷ 12.5% = × 8.',
			'Growing perpetuity: use the spread r − g. 10% with 4% growth → ÷ 6% ≈ × 16.7.',
			'NPV of a one-off investment = value of the savings − upfront cost.',
			'Multiples are perpetuities: a 10× earnings multiple implies r − g ≈ 10%.'
		],
		example: ['Save 300k/yr forever, r = 8%', '300k × 12.5 = 3.75M', 'Cost 2M → NPV 1.75M']
	},
	payback: {
		rule: 'Payback = investment ÷ net annual savings.',
		points: [
			'Net the running costs out of the savings first.',
			'Ramp-ups: subtract what year one recovers, then divide the rest by full-year savings.',
			'Months: divide by the monthly saving, or by annual ÷ 12.',
			'It ignores the time value of money — mention that if asked to compare projects.'
		],
		example: ['Invest 1.2M, save 400k/yr gross, 100k/yr opex', 'Net 300k', '1.2M ÷ 300k = 4 years']
	},
	'weighted-avg': {
		rule: 'Blended rate = Σ (share × rate). The bigger segment pulls harder.',
		points: [
			'Shares must add up to 100%; for absolute revenues, add profits and divide by total revenue.',
			'Two segments: start at the bigger one and move toward the other by the smaller share.',
			'A mix shift changes the average even if no segment’s own margin moves.'
		],
		example: ['75% at 20%, 25% at 40%', 'Start at 20, move ¼ of the gap (20) toward 40', '→ 25%']
	},
	'market-sizing': {
		rule: 'Chain the factors, multiplying one step at a time and naming the unit each time.',
		points: [
			'Write the chain first: people → households → buyers → purchases → $.',
			'Use round assumptions that make the math easy (80M, 2.5 per household, 25%).',
			'Carry magnitudes with k/M/B after every step so zeros don’t go missing.',
			'Finish with a sanity check against something you know (GDP, company revenues).'
		],
		example: ['80M people · 2.5 per household · 40% · 4×/yr · $50', '32M households → 12.8M buyers', '→ 51.2M purchases → $2.56B']
	},
	'est-mul': {
		rule: 'Round to one or two significant figures — one factor up, one down.',
		points: [
			'Opposite rounding directions cancel most of the error: 48 × 73 ≈ 50 × 70 = 3,500 (exact 3,504).',
			'Rounding both the same way? Correct afterwards by roughly the sum of the % roundings.',
			'Keep track of magnitude separately from the digits (see Multiply with zeros).',
			'Say “roughly” and give one decimal — interviewers reward speed plus a sanity check.'
		],
		example: ['≈ 3.87M × 213', '4M × 200 = 800M', 'Up 3%, down 6% → ≈ 3% low → ≈ 825M (exact 824M)']
	},
	'est-div': {
		rule: 'Round dividend and divisor in the same direction to keep the ratio.',
		points: [
			'Scaling both by the same % leaves the quotient unchanged: 4,870 ÷ 23.6 ≈ 4,800 ÷ 24 = 200.',
			'Turn the divisor into something from the fraction table: ÷ 16 ≈ × 6.25%.',
			'Check: quotient × divisor should land back near the dividend.'
		],
		example: ['≈ 7.42M ÷ 312', '7.5M ÷ 300 = 25k', 'Both rounded ~1–4% → ≈ 24k (exact 23.8k)']
	},
	'est-share': {
		rule: 'Benchmark against 10% and 1% of the whole, then interpolate.',
		points: [
			'What % is 37 of 412? 10% = 41, so a bit under 10% → ≈ 9%.',
			'% change: round the difference and the base, divide, keep the sign.',
			'CAGR: count doublings in the period, then apply the rule of 72 backwards.',
			'For small growth over short periods, total growth ÷ years is close enough (slightly high).'
		],
		example: ['$12M → $47M in 8 years', '≈ 4× = 2 doublings → one every 4 years', '72 ÷ 4 ≈ 18% (exact 18.6%)']
	}
};
