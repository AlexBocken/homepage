export type Archetype = {
  id: string;
  name: string;
  sub: string;
  color: string;
  colorSoft: string;
  colorHex: string;
  glyph: string;
  font: string;
  era: string;
};

export type Counter = {
  lede: string;
  body: string[];
  cites: string[];
};

export type Argument = {
  id: string;
  n: number;
  title: string;
  short: string;
  steel: string;
  quote: string;
  quoteBy: string;
  pub: string;
  related: string[];
  counters: Record<string, Counter>;
};

export const ARCHETYPES: Record<string, Archetype> = {
  logician: {
    id: "logician",
    name: "The Logician",
    sub: "cold reason, syllogism",
    color: "var(--nord3)",
    colorSoft: "rgba(76,86,106,0.12)",
    colorHex: "#4C566A",
    glyph: "∴",
    font: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
    era: "—",
  },
  aquinas: {
    id: "aquinas",
    name: "Thomas Aquinas",
    sub: "scholastic, the Five Ways",
    color: "var(--nord10)",
    colorSoft: "rgba(94,129,172,0.14)",
    colorHex: "#5E81AC",
    glyph: "✠",
    font: '"Cormorant Garamond", "EB Garamond", Georgia, serif',
    era: "1225–1274",
  },
  francis: {
    id: "francis",
    name: "Francis of Assisi",
    sub: "poetic, brother sun",
    color: "var(--nord14)",
    colorSoft: "rgba(163,190,140,0.18)",
    colorHex: "#A3BE8C",
    glyph: "☼",
    font: '"Spectral", "Lora", Georgia, serif',
    era: "1181–1226",
  },
  augustine: {
    id: "augustine",
    name: "Augustine",
    sub: "introspective, confessional",
    color: "var(--nord15)",
    colorSoft: "rgba(180,142,173,0.18)",
    colorHex: "#B48EAD",
    glyph: "❦",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "354–430",
  },
  chesterton: {
    id: "chesterton",
    name: "G.K. Chesterton",
    sub: "paradox, wit",
    color: "var(--nord12)",
    colorSoft: "rgba(208,135,112,0.18)",
    colorHex: "#D08770",
    glyph: "⁂",
    font: '"Inter", Helvetica, Arial, sans-serif',
    era: "1874–1936",
  },
  mystic: {
    id: "mystic",
    name: "The Mystic",
    sub: "apophatic, the cloud",
    color: "var(--nord9)",
    colorSoft: "rgba(129,161,193,0.18)",
    colorHex: "#81A1C1",
    glyph: "◯",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "—",
  },
  scientist: {
    id: "scientist",
    name: "The Scientist",
    sub: "natural theology",
    color: "var(--nord7)",
    colorSoft: "rgba(143,188,187,0.20)",
    colorHex: "#8FBCBB",
    glyph: "△",
    font: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    era: "—",
  },
  pastor: {
    id: "pastor",
    name: "The Pastor",
    sub: "lived experience",
    color: "var(--nord11)",
    colorSoft: "rgba(191,97,106,0.16)",
    colorHex: "#BF616A",
    glyph: "✚",
    font: 'Helvetica, Arial, "Noto Sans", sans-serif',
    era: "—",
  },
  pascal: {
    id: "pascal",
    name: "Blaise Pascal",
    sub: "mathematician, the wager",
    color: "var(--nord13)",
    colorSoft: "rgba(235,203,139,0.22)",
    colorHex: "#EBCB8B",
    glyph: "½",
    font: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    era: "1623–1662",
  },
  lewis: {
    id: "lewis",
    name: "C.S. Lewis",
    sub: "literary apologist",
    color: "var(--nord8)",
    colorSoft: "rgba(136,192,208,0.20)",
    colorHex: "#88C0D0",
    glyph: "❧",
    font: '"Spectral", "Lora", Georgia, serif',
    era: "1898–1963",
  },
  newman: {
    id: "newman",
    name: "John Henry Newman",
    sub: "theologian of conscience",
    color: "#6B3942",
    colorSoft: "rgba(107,57,66,0.16)",
    colorHex: "#6B3942",
    glyph: "☩",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "1801–1890",
  },
  justin: {
    id: "justin",
    name: "Justin Martyr",
    sub: "philosopher and martyr",
    color: "#A6845F",
    colorSoft: "rgba(166,132,95,0.18)",
    colorHex: "#A6845F",
    glyph: "※",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "c.100–165",
  },
  catechism: {
    id: "catechism",
    name: "The Catechism",
    sub: "the Church's compendium",
    color: "#7A8290",
    colorSoft: "rgba(122,130,144,0.18)",
    colorHex: "#7A8290",
    glyph: "☧",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "promulgated 1992",
  },
  historian: {
    id: "historian",
    name: "The Historian",
    sub: "ancient-history scholar",
    color: "#4A6741",
    colorSoft: "rgba(74,103,65,0.18)",
    colorHex: "#4A6741",
    glyph: "✦",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "—",
  },
};

export const ARGUMENTS: Argument[] = [
  {
    id: "evil",
    n: 1,
    title: "If God exists, why is there evil?",
    short: "The problem of evil",
    steel:
      "An omnipotent, omniscient, perfectly good God could prevent suffering and would want to. Yet earthquakes flatten cities, children die of cancer, and the holocaust happened. Either God can't, won't, or isn't there.",
    quote:
      "Is God willing to prevent evil, but not able? Then he is not omnipotent. Is he able, but not willing? Then he is malevolent. Is he both able and willing? Then whence cometh evil?",
    quoteBy: "Epicurus, as paraphrased by Hume",
    pub: "If God's so good, why did my dog die?",
    related: ["hiddenness", "hell", "natural-evil"],
    counters: {
      logician: {
        lede: 'The argument equivocates on "good."',
        body: [
          "Premise 1 assumes that a perfectly good being would always eliminate suffering. But this conflates the good of an individual moment with the good of a whole.",
          "A surgeon causes pain to heal. A parent permits a fall to teach balance. The act is not made evil by the suffering it produces if a sufficient countervailing good is unattainable otherwise.",
          "The deductive form of the problem (Mackie, 1955) was abandoned even by atheist philosophers after Plantinga's free-will defense. What remains is the evidential form — and evidential arguments don't yield certainty, only probability weighted by priors. The theist's prior is not irrational.",
        ],
        cites: [
          "Plantinga, God, Freedom, and Evil (1974)",
          'Mackie, "Evil and Omnipotence" (1955)',
        ],
      },
      aquinas: {
        lede: "Evil is not a thing. It is a privation.",
        body: [
          "Whatever exists is good insofar as it exists. Evil is the absence of a good that ought to be present — blindness in an eye, cruelty in a will. God is the cause of being, not the cause of these absences.",
          "God permits evil only insofar as he can draw a greater good from it. The crucifixion of Christ is the supreme instance: the worst act in history became the instrument of redemption.",
          "It does not follow that we must always see the good. The fault is not in the order of providence but in the narrowness of our vantage.",
        ],
        cites: ["Summa Theologiae I, q.49", "Contra Gentiles III, c.71"],
      },
      francis: {
        lede: "The wolf of Gubbio came to my hand.",
        body: [
          "Brother, you ask why suffering. I have walked among lepers and embraced them and found Christ in their wounds. The world groans, but it groans toward something.",
          "When the wolf was tearing the village, I did not curse the wolf. I went out and called him brother and he laid down. Evil is not refuted by argument but by love walking into it.",
          "Sister Death herself is a gift if you greet her well. Praised be my Lord for our sister bodily death, from whom no living man can escape.",
        ],
        cites: ["Canticle of the Creatures", "Fioretti, ch. 21"],
      },
      lewis: {
        lede: "Pain is God's megaphone.",
        body: [
          "We can ignore even pleasure. But pain insists upon being attended to. God whispers to us in our pleasures, speaks in our conscience, but shouts in our pains.",
          'If the universe is so bad, how on earth did human beings ever come to attribute it to the activity of a wise and good Creator? The very idea of "bad" is itself borrowed from a real ought we know we are missing.',
          "When you argue against God because of injustice, you assume a real standard of justice. Where did that standard come from?",
        ],
        cites: [
          "The Problem of Pain (1940)",
          "Mere Christianity, Bk. I, ch. 1",
        ],
      },
    },
  },
  {
    id: "evidence",
    n: 2,
    title: "There is no evidence for God.",
    short: "The evidential demand",
    steel:
      "Extraordinary claims require extraordinary evidence. We don't accept Zeus, Thor, or Russell's teapot on faith. The God hypothesis fails the same test: no peer-reviewed observation, no falsifiable prediction, nothing.",
    quote:
      "What can be asserted without evidence can be dismissed without evidence.",
    quoteBy: "Christopher Hitchens",
    pub: "Show me a miracle on camera and I'll believe.",
    related: ["science", "design", "miracles"],
    counters: {
      logician: {
        lede: '"Evidence" is doing all the work in this argument.',
        body: [
          'If by "evidence" you mean only repeatable laboratory observation, the demand is question-begging: it presupposes naturalism (only physical things are real) and then complains that no physical detector picks up a non-physical cause.',
          "Historical evidence, testimonial evidence, philosophical evidence, and personal experience all count as evidence in every other domain — courts of law, history, ethics. Excluding them only when God is at issue is special pleading.",
          "Russell's teapot fails as an analogy: nothing in the structure of reality demands a teapot. Many things in the structure of reality (contingency, fine-tuning, consciousness, moral obligation) demand explanation.",
        ],
        cites: ["Plantinga, Warranted Christian Belief (2000)"],
      },
      scientist: {
        lede: "The fine-tuning of the constants is the evidence.",
        body: [
          "Change the cosmological constant by one part in 10^120 and no galaxies form. Change the strong nuclear force by 2% and no carbon. The set of universes that permit observers is a vanishingly thin slice.",
          "Three explanations: brute fact (a 10^-N coincidence we're forbidden from finding remarkable), a multiverse (postulating ~10^500 unobservable universes to explain one), or design.",
          "The multiverse is not a parsimonious naturalism. It is a metaphysical posit at least as ambitious as theism, with worse explanatory traction.",
        ],
        cites: [
          "Penrose, The Road to Reality (2004), §27.13",
          'Collins, "The Teleological Argument" (2009)',
        ],
      },
      aquinas: {
        lede: "There are five proofs.",
        body: [
          "From motion: things that change require a changer; the chain cannot regress infinitely; therefore an unmoved mover.",
          "From causation: nothing causes itself; an infinite regress of causes never gets started; therefore a first cause.",
          "From contingency, from gradation, from teleology — each draws a line from a feature of the world we already accept to a being whose existence those features require. These are not blind faith. They are arguments. Engage them or do not, but do not say there is nothing to engage.",
        ],
        cites: ["Summa Theologiae I, q.2, a.3"],
      },
      pascal: {
        lede: "Hidden enough to be refused. Visible enough to be sought.",
        body: [
          "If God gave undeniable proof, no faith would be required and no love freely given. If he gave nothing, no honest seeker could find him. He has chosen the middle: signs sufficient for those who want him, not coercive for those who don't.",
          "There is enough light for those who only desire to see, and enough obscurity for those who have a contrary disposition.",
          "The heart has its reasons which reason knows nothing of. We feel it in a thousand things. It is the heart that perceives God, not reason.",
        ],
        cites: ["Pensées, §149, §424"],
      },
      mystic: {
        lede: "He is not an object you can find in the universe.",
        body: [
          "You are looking for God the way you would look for a planet — somewhere, in the inventory of things. But the inventory of things is exactly what God is not in. God is the reason there is an inventory at all.",
          "The cloud of unknowing stands between us and him. Not because he hides, but because finite eyes cannot see infinite light.",
          "Be still. The evidence is not behind a telescope. It is the silence after you stop talking.",
        ],
        cites: [
          "The Cloud of Unknowing (14th c.)",
          "Pseudo-Dionysius, Mystical Theology",
        ],
      },
    },
  },
  {
    id: "science",
    n: 3,
    title: "Science has explained everything religion used to.",
    short: "God of the gaps",
    steel:
      "Lightning was Zeus, then it was electricity. Disease was demons, then it was germs. The history of religion is the history of retreating from explanations as science arrives. God is what's left in the gaps, and the gaps are closing.",
    quote:
      "Religion was the first attempt of the human race to explain what was going on. We can do better now.",
    quoteBy: "Bertrand Russell, paraphrased",
    pub: "We don't need God anymore — we have physics.",
    related: ["evidence", "design", "morality"],
    counters: {
      scientist: {
        lede: "Modern science was born from theology, not in spite of it.",
        body: [
          "The conviction that nature is law-governed and intelligible — that reality answers to mathematics — is a theological inheritance. Newton, Kepler, Mendel, Lemaître, Faraday: not lapses, the founders.",
          "Science explains how a kettle boils. It cannot explain why there is a kettle, or why the laws governing the boiling exist, or why minds exist that can know them. These are not gaps in our knowledge. They are categorically different questions.",
          "The Big Bang itself was opposed by atheist physicists for decades because it suggested a beginning. The model that won is the one Lemaître, a Catholic priest, proposed.",
        ],
        cites: [
          "Hannam, God's Philosophers (2009)",
          "Lemaître, Annales de Bruxelles (1927)",
        ],
      },
      logician: {
        lede: "Category error.",
        body: [
          '"How" questions and "why" questions are not in competition. The mechanism by which a kettle boils does not eliminate the gas company.',
          '"God of the gaps" is a charge against bad theology, not against theology. Aquinas did not argue from ignorance. He argued from features of reality (motion, causation) that physics presupposes rather than explains.',
          "If the next physical theory is found, it too will sit on a metaphysical floor — the existence of laws, the rationality of reality, the why-anything-at-all. That floor is what God names.",
        ],
        cites: ['Sober, "Empiricism" (2008)'],
      },
      chesterton: {
        lede: "It is the materialist who has the small universe.",
        body: [
          "The Christian believes that the world is a story; the materialist believes it is a printout. The story has more room for things than the printout has for facts.",
          "It is absurd to complain that the supernatural cannot be tested by the natural. You may as well complain that the love of your wife cannot be weighed.",
          "The trouble is not that the materialist is wrong on this fact or that. The trouble is that he has been right in his small way and made his way the size of the world.",
        ],
        cites: ["Orthodoxy, ch. 2"],
      },
      lewis: {
        lede: "Looking along the beam, not at it.",
        body: [
          "When a man is in love, he can step out of the experience and look at it scientifically — hormones, evolutionary pair-bonding. The view from outside is true. It is also unutterably thin.",
          "Science is the view from outside, looking at the beam of sunlight. Religion is the view from inside the beam, looking out at what the beam reveals.",
          "Both are valid. Neither replaces the other. To say science has displaced religion is to say the diagram of love has displaced the lover.",
        ],
        cites: ['"Meditation in a Toolshed" (1945)'],
      },
    },
  },
  {
    id: "morality",
    n: 4,
    title: "We don't need God to be good.",
    short: "Secular ethics",
    steel:
      "Secular societies (Sweden, Denmark, Japan) score higher on every measure of human flourishing than religious ones. Empathy, evolutionary kinship, social contract — all explain morality without divine command. Many religious people behave terribly; many atheists are kind.",
    quote: "I don't believe in God and I'm not a murderer. So there.",
    quoteBy: "common formulation",
    pub: "I'm a good person without religion. End of story.",
    related: ["evidence", "evil", "religion-violence"],
    counters: {
      logician: {
        lede: "Behavior is not the question. Grounding is.",
        body: [
          'No one denies that atheists are often morally exemplary. The question is not who behaves morally. The question is what "morally" means — whether moral facts are real or merely useful fictions of evolutionary psychology.',
          'If morality is a survival heuristic, it has no more authority over you than a heuristic about food preference. "You should not torture children for fun" becomes "primates of your lineage tend not to."',
          "Most secular ethicists concede this and either bite the nihilist bullet (Mackie, error theory) or smuggle in a non-natural fact (Parfit, on the order of being). The smuggled fact is the interesting one.",
        ],
        cites: [
          "Mackie, Ethics: Inventing Right and Wrong (1977)",
          "Parfit, On What Matters (2011)",
        ],
      },
      augustine: {
        lede: "I knew what was right and did the wrong thing anyway.",
        body: [
          "I stole pears not because I was hungry — we threw them to the pigs. I stole them because the theft itself delighted me. The atheist account of morality cannot explain why I knew, even as I did it, that I was tearing something in myself.",
          "Our hearts are restless. We do not need to be taught that we have failed; we are taught only the name of what we have failed against.",
          "You have made us for yourself, O Lord, and our heart is restless until it rests in you.",
        ],
        cites: ["Confessions II.4, I.1"],
      },
      lewis: {
        lede: "The Tao is not invented; it is recognized.",
        body: [
          "Every culture, isolated or not, condemns cowardice, treachery, cruelty to the weak. They differ on details — whom to count as kin — but agree on the form. This is not what an evolved heuristic would look like; it's what a recognized law would.",
          'When you say "that\'s not fair," you appeal to something neither of us invented and both of us are bound by. Where did that come from?',
          "If there is no real Right, your indignation at injustice is a chemical event. If there is, you have already conceded more than naturalism can pay for.",
        ],
        cites: ["The Abolition of Man (1943)", "Mere Christianity, Bk. I"],
      },
      pastor: {
        lede: "I have buried good atheists.",
        body: [
          "Don't hear me wrong. I have known atheists kinder than most Christians. The question for me is not who is good — God knows that and I don't.",
          'The question is what to say to the woman whose child has died, or the addict on his eighth relapse, or the dying man asking if any of it mattered. "Be good and the species will benefit" is not a thing you say to someone in the dark.',
          "The Gospel is not primarily an ethics. It is news for the people ethics cannot reach.",
        ],
        cites: [],
      },
    },
  },
  {
    id: "religion-violence",
    n: 5,
    title: "Religion causes most of history's violence.",
    short: "Crusades, Inquisition, jihad",
    steel:
      "Crusades, Inquisition, witch trials, sectarian wars, 9/11, the Troubles. Religion poisons everything by giving people license to kill in the name of certainty. A world without religion would be measurably less violent.",
    quote: "Religion poisons everything.",
    quoteBy: "Christopher Hitchens",
    pub: "More people have been killed in the name of God than anything else.",
    related: ["morality", "evil"],
    counters: {
      logician: {
        lede: "Check the body counts.",
        body: [
          "The 20th century, the most explicitly secular century in history, killed more people for ideological reasons than all previous centuries combined. The Soviet Union, Maoist China, the Khmer Rouge, North Korea — atheist regimes, by their own self-description.",
          'The argument needs the form: "X causes Y." But the comparison class for X (with-religion) covers most of human history; the comparison class for not-X (officially without-religion) is small, recent, and bloody.',
          "Tribalism, scarcity, and power-seeking cause violence. Religion can recruit them. So can nationalism, ethnicity, ideology, soccer.",
        ],
        cites: [
          "Pinker, Better Angels (2011), table on 20th c. democide",
          "Rummel, Death by Government (1994)",
        ],
      },
      chesterton: {
        lede: "When you remove the church, you do not get reason. You get the next church.",
        body: [
          "The men who took the cross down put up the guillotine, then the swastika, then the red star. The throne does not stay empty. Something always rules.",
          "It is the test of a good religion whether you can joke about it. It is the test of a bad ideology that you cannot.",
          "A man who refuses to believe in God will believe in anything. He has not stopped being credulous; he has only stopped being discriminating.",
        ],
        cites: ["The Thing (1929), ch. 25"],
      },
      augustine: {
        lede: "The City of God is not the city of any flag.",
        body: [
          "I have watched Rome fall and the Christians blamed for it. I have also watched Christians who deserved blame. Both are part of one story: the visible church is a mixed body, wheat and tares together, and will be until the harvest.",
          "The sword used in Christ's name has always been used against Christ's name. The Crusader who slaughtered the Jew of Mainz did not become more obedient to the Sermon on the Mount. He became less.",
          "Love, and do what you will. But mark: love. Not zeal. Not certainty. Love.",
        ],
        cites: ["City of God I.1; Tractates on John 7.8"],
      },
      pastor: {
        lede: "The people I bury were not killed by religion.",
        body: [
          'I have served two parishes. In neither has the question "should we kill anyone" come up at coffee hour. The dramas are: a marriage failing, a teenager in trouble, an old man dying alone, an addict trying again.',
          "Whatever religion does on the world stage, on the small stage where most life happens it sits with the dying, feeds the hungry, marries the lovers, names the children, and buries the dead. The accounting has to include that side of the ledger.",
          "We are not blameless. We have been worse than blameless. We are also still here, doing this work, often when no one else will.",
        ],
        cites: [],
      },
    },
  },
  {
    id: "design",
    n: 6,
    title: "Evolution explains design without a designer.",
    short: "Darwin's blind watchmaker",
    steel:
      "Paley's watch was the strongest pre-Darwinian argument. Darwin disposed of it. Random mutation plus non-random selection produces the appearance of design from below. We don't need a designer for the eye, the hand, or the human.",
    quote:
      "Biology is the study of complicated things that give the appearance of having been designed for a purpose.",
    quoteBy: "Richard Dawkins",
    pub: "Evolution killed God.",
    related: ["science", "evidence"],
    counters: {
      scientist: {
        lede: "Evolution explains the watch. It does not explain the watchmaker's tools.",
        body: [
          "Even granting the full Darwinian story for biological forms, you have not addressed: why the laws of physics permit chemistry, why the constants permit stable matter, why the universe began at all, why mathematics describes it, why minds exist that can do the science.",
          'The teleological argument has long since moved upstream of biology. The question is not "who designed the eye" but "who set the stage on which design-by-selection can happen."',
          "And the modern fine-tuning literature — Penrose, Rees, Carter — is not theological propaganda. It is mainstream cosmology asking the same question Aquinas asked, with bigger numbers.",
        ],
        cites: [
          "Rees, Just Six Numbers (1999)",
          "Penrose, Cycles of Time (2010)",
        ],
      },
      francis: {
        lede: "I have spoken to Brother Wolf and Sister Moon.",
        body: [
          "You give me a mechanism and call it an explanation. But the mechanism is itself a wonder. Selection requires reproduction; reproduction requires a self that can fail; a self that can fail is already a marvel.",
          "Praised be my Lord with all his creatures, especially Sir Brother Sun, who is the day, through whom Thou givest us light. Whether by six days or six billion years, the Canticle is unchanged.",
          "Evolution does not subtract praise. It tells us by how many means God brings the daisy out of the dust.",
        ],
        cites: ["Canticle of the Creatures"],
      },
      aquinas: {
        lede: "The fifth way does not depend on biological design.",
        body: [
          "I argued from the regularity of natural agents — the way an arrow flies to the mark a non-thinking thing must be directed by a mind. Selection is a regularity. The regularity itself is what wants explaining.",
          "Secondary causes are real and operate by their own natures. God works through them as the carpenter works through the saw. To say the saw cuts is true; to say the carpenter does not is false.",
          "That a process produces order is not less remarkable than that an artisan does. It is more remarkable, because the process must be designed first.",
        ],
        cites: ["Summa Theologiae I, q.2, a.3 (Fifth Way); q.103, a.6"],
      },
      chesterton: {
        lede: "Evolution is a description, not an explanation.",
        body: [
          "If evolution simply means that a positive thing called an ape turned slowly into a positive thing called a man, then it is stingless for the most orthodox; for a personal God might just as well do things slowly as quickly.",
          "But if it means that there is no such thing as an ape or a man — only an endless smudge of becoming — it is a much more daring dogma than any of the Creeds.",
          "I have noticed that men who say evolution makes God unnecessary tend to mean evolution makes morality unnecessary. They have left the door open behind them.",
        ],
        cites: ["The Everlasting Man (1925), Pt. I"],
      },
    },
  },
  {
    id: "miracles",
    n: 7,
    title: "Miracles don't happen.",
    short: "Hume's argument",
    steel:
      "A miracle is by definition a violation of natural law. Our evidence for natural law is the uniform experience of every observer, ever. Our evidence for any specific miracle is at most a few testimonies, often centuries old, transmitted through religious communities motivated to preserve them. Bayesian arithmetic does the rest.",
    quote:
      "No testimony is sufficient to establish a miracle, unless the testimony be of such a kind that its falsehood would be more miraculous than the fact which it endeavours to establish.",
    quoteBy: "David Hume",
    pub: "Nobody rises from the dead. Period.",
    related: ["evidence", "science"],
    counters: {
      logician: {
        lede: "Hume assumed his conclusion.",
        body: [
          'The argument: miracles are very improbable; testimony for miracles is more probably false than the miracle is true; therefore reject all miracle reports. But "miracles are very improbable" is a probability conditional on no God. The whole argument is conditional on the conclusion.',
          "On the assumption that there is a God who acts in history, the prior on miracles in connection with that history is not vanishingly small. It is exactly what you'd expect.",
          "The question therefore reduces to: is there a God? Hume hasn't shown there isn't. He has only shown that if there isn't, miracles don't happen.",
        ],
        cites: [
          "Earman, Hume's Abject Failure (2000)",
          "Swinburne, The Resurrection of God Incarnate (2003)",
        ],
      },
      pastor: {
        lede: "I have seen what I have seen.",
        body: [
          "I served a parish where a woman, dying of pancreatic cancer at stage four, asked us to pray. We did. She is alive. The doctors do not know why.",
          "I am not asking you to believe me. I am asking you to ask the people in my parish, who have ordinary jobs and no incentive to lie, what they saw.",
          "Miracles are not statistical events. They are persons addressed. The story always has a face.",
        ],
        cites: ["Keener, Miracles (2011), 2 vols."],
      },
      lewis: {
        lede: "If you have already ruled them out, of course you find none.",
        body: [
          "If the existence of God be granted, miracles are perfectly natural. If it be not granted, miracles are perfectly impossible. The question is settled before the evidence is examined.",
          "Hume's principle, taken seriously, would have you reject any sufficiently unusual event — the discovery of relativity, the survival of a man crushed under a train. He uses it only against miracles because he wants to.",
          "The grand miracle is the Incarnation. If it happened, lesser miracles are footnotes. If it did not, they are noise.",
        ],
        cites: ["Miracles (1947), ch. 8, ch. 14"],
      },
      pascal: {
        lede: "Wager.",
        body: [
          "If miracles never happen, you lose nothing by examining the case for one in particular. If even one happens, you have lost everything by refusing to look.",
          "The expected value of investigation is positive on any prior above zero. Hume's prior is exactly zero, which is not a probability assignment but a refusal to play.",
          "I do not ask you to believe. I ask you to weigh the bet.",
        ],
        cites: ["Pensées, §233 (Wager)"],
      },
    },
  },
  {
    id: "hiddenness",
    n: 8,
    title: "Why is God so hidden?",
    short: "Divine hiddenness",
    steel:
      "If a loving God wanted relationship with us, he could appear unmistakably. He doesn't. Sincere seekers fail to find. Whole cultures lived and died without ever hearing his name. A God who hides while demanding faith is either uninterested, nonexistent, or cruel.",
    quote:
      "Reasonable nonbelief exists; therefore a perfectly loving God does not.",
    quoteBy: "J.L. Schellenberg, paraphrased",
    pub: "If God wants me to believe, why doesn't he just show up?",
    related: ["evidence", "evil"],
    counters: {
      mystic: {
        lede: "He is not hidden. You are not still.",
        body: [
          "The fish asks where the ocean is. He is not hidden in absence. He is hidden in nearness — too close, too constant, too dissolved in the medium of your seeing for you to notice him as a thing among other things.",
          "Be silent for one hour, alone, without input, without screen. If at the end of the hour you can still say he is hidden, say it again, and try another hour.",
          "Hiddenness is not a property of God. It is a property of your attention.",
        ],
        cites: [
          "The Cloud of Unknowing",
          "Brother Lawrence, Practice of the Presence (1692)",
        ],
      },
      pascal: {
        lede: "Hiddenness is a feature, not a bug.",
        body: [
          "If he were unconcealed, no one could refuse him; no faith would be free; no love would be a gift. He has chosen to give signs sufficient for those who seek and obscure for those who don't.",
          "There is enough light for those who only desire to see, and enough darkness for those of an opposite disposition.",
          "Your demand that he prove himself irresistibly is the demand to be coerced. He will not coerce. That is what love means in his case.",
        ],
        cites: ["Pensées, §149"],
      },
      augustine: {
        lede: "Late have I loved you. You were within, I was without.",
        body: [
          "I sought God in books and in cities and in arguments. He was the whole time inside the seeking. The hunger I called by all those other names was him.",
          "Beauty so ancient and so new, late have I loved you! And behold, you were within me, and I outside; and there I sought you, and upon the lovely things you have made I rushed in, deformed.",
          "Hiddenness is a name we give to our own distraction.",
        ],
        cites: ["Confessions X.27"],
      },
      lewis: {
        lede: "We may ignore but cannot evade the presence of God.",
        body: [
          "An unhidden God would not be a God you could refuse. We do not want a God we cannot refuse — we want a God we can choose. He has paid the high price of letting us choose.",
          "The hideout is not in the stars or in the silence. It is in the human heart, which has an extraordinary capacity to look directly at a thing and not see it.",
          "Aslan is not a tame lion. He shows when he wills, not when summoned.",
        ],
        cites: [
          "The Lion, the Witch and the Wardrobe (1950)",
          "The Problem of Pain",
        ],
      },
    },
  },
  {
    id: "hell",
    n: 9,
    title: "An eternal hell is unjust.",
    short: "Infinite punishment for finite sin",
    steel:
      "Even the worst sinner — Hitler, Stalin, the child murderer — committed at most a few decades of finite wrongs. To punish a finite wrong with infinite torment is moral monstrosity. No human court would do this. A God who would is morally beneath us.",
    quote:
      "I would rather hell than the heaven of a god who tortures the dead.",
    quoteBy: "common formulation; cf. Bertrand Russell",
    pub: "I'm a decent person and your God would still send me to burn forever?",
    related: ["evil", "morality"],
    counters: {
      aquinas: {
        lede: "The gravity of sin is measured by what it offends, not by how long it takes.",
        body: [
          "A slap is a small offense to a peer, a great offense to a parent, a grave offense to a king, and a capital offense to the divine majesty. The act takes the same instant; its weight is given by its object.",
          "Hell is not God inflicting torment on creatures who would prefer his presence. It is the eternal ratification of a will that has finally and freely refused him. To force such a will into communion would be to abolish it.",
          "The fire is real. It is also not the worst part. The worst part is the loss.",
        ],
        cites: ["Summa Theologiae, Suppl., q.99", "Contra Gentiles III, c.144"],
      },
      lewis: {
        lede: "The doors of hell are locked from the inside.",
        body: [
          'There are only two kinds of people in the end: those who say to God, "Thy will be done," and those to whom God says, in the end, "Thy will be done." All that are in hell choose it. Without that self-choice there could be no hell.',
          "I willingly believe that the damned are, in one sense, successful, rebels to the end; that the doors of hell are locked on the inside.",
          "Hell is not God's failure to forgive. It is the soul's success in refusing.",
        ],
        cites: ["The Great Divorce (1945)", "The Problem of Pain, ch. 8"],
      },
      mystic: {
        lede: "Hell is the experience of God by one who has refused him.",
        body: [
          "The same fire that warms the lover burns the one who hates light. The fire is not different. The hearts are.",
          "God does not become two things at the judgment. He remains the one love he always was. Heaven is the encounter of the open soul with that love. Hell is the encounter of the closed soul with the same.",
          "The damned do not lack God's love. They lack the capacity to receive it.",
        ],
        cites: [
          "Isaac of Nineveh, Ascetical Homilies",
          "Maximus the Confessor, Ambigua",
        ],
      },
      augustine: {
        lede: "I feared hell because I loved my sin.",
        body: [
          "When I was unconverted, the doctrine of hell seemed to me an obscenity. After my conversion, I understood: the obscenity was what I had been doing, not what I had been threatened with.",
          "We do not understand hell because we do not understand the weight of refusing love. The wedding feast is set; the bridegroom waits; the only way to be outside is to walk out.",
          "It is a mercy that he warns us. The threat is the sound of the door he is holding open.",
        ],
        cites: ["Confessions VIII; Enchiridion 112"],
      },
    },
  },
  {
    id: "birth",
    n: 10,
    title: "Religious belief tracks geography, not truth.",
    short: "The accident of birth",
    steel:
      "Had you been born in Riyadh, you'd defend Islam with the same conviction you now defend Christianity. Lhasa, Buddhism. Ancient Athens, the Olympians. The overwhelming predictor of someone's \"saving faith\" is the latitude and longitude of their crib. A truth this important shouldn't depend on a postal code.",
    quote:
      "If we have a knock-down argument that the others can't have, it's strange that almost no one finds it except by accident of birth.",
    quoteBy: "John Hick, paraphrased",
    pub: "If I'd been born in Pakistan, I'd be a Muslim. So how is my faith \"true\"?",
    related: ["evidence", "hiddenness", "morality"],
    counters: {
      lewis: {
        lede: "The objection cuts both ways.",
        body: [
          "If geography decides religion, it also decides atheism. The modern Englishman who dismisses God was raised in a culture that taught him to. The Soviet child raised under militant atheism was no freer in his unbelief than the Tibetan child in his Buddhism. The argument, pressed honestly, dissolves every conviction anyone has ever held — including the conviction that geography decides convictions.",
          "What the argument really shows is that humans receive their starting points from their cultures. This is true of mathematics, ethics, and language as well. It does not follow that there is no mathematics, no ethics, no truth in language. It follows only that we begin somewhere and must reason from there.",
          "I was an atheist who became a Christian by argument and against my will. The accident-of-birth thesis cannot account for me, or for the Muslim who becomes Christian, or the Christian who becomes Buddhist. People do change.",
        ],
        cites: ["Mere Christianity (1952), Bk. II", "Surprised by Joy (1955)"],
      },
      aquinas: {
        lede: "God is not unjust to those who never heard.",
        body: [
          "The objection assumes that explicit Christian faith is the only path to God, and that those born outside earshot of the Gospel are damned by accident. The Church has never taught this. Those who through no fault of their own do not know Christ, but who seek God with a sincere heart and try to do his will as their conscience reveals it, may attain salvation.",
          "What is universal is not the name of Christ but the natural law written on the heart, and the natural knowledge of God available to reason from creation. The Athenian and the Brahmin had access to these. Where they reasoned rightly toward the One, they reasoned toward the same God Christians worship — though they knew him imperfectly.",
          "The accident of birth determines what one is taught. It does not determine what one is capable of knowing by the light of reason that every human shares.",
        ],
        cites: [
          "Summa Theologiae I.2.3 (the natural knowledge of God)",
          "ST I-II.94 (natural law)",
          "Lumen Gentium 16",
        ],
      },
      justin: {
        lede: "The seeds of the Word were everywhere.",
        body: [
          "I was a Platonist before I was a Christian, and I do not repent of having read Plato. Whatever was said rightly by any thinker — Greek, barbarian, before Christ or after — belongs to us Christians. For the Word who became flesh in Jesus is the same Word who scattered seeds of truth throughout the human race from the beginning.",
          "When Socrates spoke of justice, when the Stoics spoke of the Logos, when the Hindu sage groped toward Brahman — they were not all simply wrong. They were partial. They held fragments of the truth that came whole in Christ.",
          'So the question is not "why was I born where I was?" but "what fragments did my tradition hold, and where do they point?" Every honest religion, examined closely, points beyond itself.',
        ],
        cites: ["First Apology 46", "Second Apology 10, 13"],
      },
      newman: {
        lede: "Probable arguments converge on certainty.",
        body: [
          "Belief is not arrived at by a single decisive proof, like a geometric demonstration. It is reached by the convergence of many independent probabilities — the testimony of conscience, the historical evidence for Christ, the witness of the saints, the experience of grace, the coherence of doctrine with what one already knows of the world. What I call the illative sense is the mind's capacity to weigh these together.",
          "The accident-of-birth objection treats faith as if it were a coin flip — heads Christianity, tails Islam, decided by latitude. But a serious adult convert does not flip a coin. He weighs evidence, much of which his birth culture did not give him, and some of which it actively obscured.",
          "That a child believes what he is told is not scandalous. It is how children learn anything at all. The question is what the adult does with the inheritance — examine it, or merely repeat it. Christianity, more than any rival, invites the examination.",
        ],
        cites: ["An Essay in Aid of a Grammar of Assent (1870), ch. 8–9"],
      },
    },
  },
  {
    id: "bible",
    n: 11,
    title: "Scripture commands and condones the indefensible.",
    short: "The Bible's problems",
    steel:
      "Slavery regulated rather than abolished (Lev. 25, Eph. 6). Herem warfare in Joshua. The Midianite massacre (Num. 31). Bears mauling children for mocking a prophet. Contradictions between Gospel accounts of the resurrection morning, the genealogies, the death of Judas. If this is a divinely authored book, the author has a great deal to answer for; if it isn't, the case collapses.",
    quote:
      "The God of the Old Testament is arguably the most unpleasant character in all fiction.",
    quoteBy: "Richard Dawkins",
    pub: "The Bible says some pretty awful stuff. How can it be the word of a good God?",
    related: ["hell", "evil", "religion-violence"],
    counters: {
      augustine: {
        lede: "If a passage seems to contradict charity, you have misread it.",
        body: [
          "I will say this plainly, because it is the rule by which I read Scripture and by which I urge every Christian to read it: whoever takes from the divine writings a meaning that builds up love of God and neighbor has not yet been deceived, even if his interpretation is not what the human author intended. But whoever takes a meaning that contradicts charity has misunderstood, no matter how literally he reads.",
          "The hard passages — the conquests, the imprecations, the laws we now find barbaric — were written into a particular people at a particular stage of moral formation. God accommodates himself to the capacities of his hearers, as a father speaks differently to a child than to a man. To read these passages flatly, as if they were timeless commands rather than steps in a long pedagogy, is to read them as the literalist and the atheist both read them: badly.",
          "The trajectory of Scripture is from the herem to the Sermon on the Mount. The atheist who quotes Numbers against the Gospel must explain why Scripture itself moves in the direction it does.",
        ],
        cites: ["De Doctrina Christiana I.36.40", "Confessions III.5–7"],
      },
      aquinas: {
        lede: "Scripture has four senses, and the literal is only one.",
        body: [
          "The literal sense is the foundation, but it is not the whole. Above it stand the allegorical (what the text signifies about Christ and the Church), the moral (what it teaches about how to live), and the anagogical (what it points to in our final end). A passage may be literally about a Canaanite war and allegorically about the soul's struggle against vice. To read only the surface is to read like a man who, shown a poem, complains about the spelling.",
          "When the literal sense seems to demand something contrary to reason or to the divine goodness, this is a sign that the literal is figurative — that the human author, by divine accommodation, was using the idiom of his age. Reason and Scripture have one author and cannot truly contradict.",
          "The Church has always taught that Scripture is to be read in the Tradition, with the Fathers, under the Magisterium. The atheist's preferred reading — flat, isolated, modern — is a method the Church never endorsed and never will.",
        ],
        cites: ["Summa Theologiae I.1.10", "Quodlibet VII.6.14–16"],
      },
      newman: {
        lede: "Doctrine develops; difficulties do not destroy.",
        body: [
          "A thousand difficulties do not make one doubt. The honest reader of Scripture finds passages he cannot account for, episodes that trouble him, commands that seem to belong to another moral universe. So do I. So did every Father of the Church. The presence of difficulty is not the presence of disproof.",
          "What the Church offers is not a flat text demanding that you accept every line as a freestanding moral imperative, but a living tradition that has been wrestling with these passages for two millennia. The development of doctrine — the slow unfolding of what was implicit in the deposit of faith — has, over centuries, drawn out the meaning of the harder texts and put them in their place.",
          "The atheist reads the Bible the way he would read a memo from his employer: literally, isolated, every line equally weighted. This is the wrong genre. Scripture is the record of God forming a people, with all the texture and particularity that implies.",
        ],
        cites: [
          "An Essay on the Development of Christian Doctrine (1845)",
          "Apologia Pro Vita Sua (1864)",
        ],
      },
      pastor: {
        lede: "The hard passages are where the work is done.",
        body: [
          "I have read these passages in front of the people I love and serve. I have read Joshua to a Bible study, and the imprecatory psalms at funerals, and Paul on slavery to a congregation that includes the descendants of slaves. I will not pretend the difficulty isn't there, and I will not pretend a clever footnote dissolves it.",
          "But I will tell you what I have seen. The people who sit with these passages — who refuse both the atheist's dismissal and the fundamentalist's flattening — come out with a deeper faith, not a shallower one. They find that the God of the herem is also the God who weeps over Jerusalem. They find that Scripture is honest about violence in a way that lets them be honest about their own.",
          "A book that only flattered us would be useless to us. Scripture's willingness to record what humans actually did, including the parts done in God's name, is what gives it the authority to indict us.",
        ],
        cites: [
          "pastoral experience",
          "cf. Walter Brueggemann on the imprecatory psalms",
        ],
      },
    },
  },
  {
    id: "scale",
    n: 12,
    title: "The universe doesn't look made for us.",
    short: "The argument from scale",
    steel:
      "Thirteen point eight billion years. A hundred billion galaxies, each with a hundred billion stars. And the cosmic drama is supposed to hinge on one ape species on one rock during the last two thousand years? The proportions are absurd. A universe made for humanity would not bury humanity under this much irrelevant matter.",
    quote: "The eternal silence of these infinite spaces frightens me.",
    quoteBy: "Blaise Pascal (cited against the believer)",
    pub: "The universe is huge and we're tiny. Why would God care about us?",
    related: ["evidence", "science", "hiddenness"],
    counters: {
      pascal: {
        lede: "Man is a reed, but a thinking reed.",
        body: [
          "The eternal silence of the infinite spaces frightens me too. I have looked through the same telescope as the atheist and felt the same vertigo. Between the two infinities — the immensity of the cosmos and the abyss of the atomic — man is a nothing, a midpoint, lost.",
          "And yet. The universe does not know it is vast. The galaxies do not know they are galaxies. Only this small thinking reed, perched on its rock, knows the size of what would crush it. By space the universe encompasses me; by thought I encompass the universe. The mind that grasps the cosmos is the strangest fact in the cosmos.",
          "That the eternal God should bend to such a creature is astonishing. But once you grant that he made the thinking reed, you have already granted the more difficult thing. The scale of the rest is decoration.",
        ],
        cites: ["Pensées §72, §347 (Brunschvicg numbering)"],
      },
      chesterton: {
        lede: "Smallness is the Christian boast, not the atheist's discovery.",
        body: [
          "The atheist announces, as if he had discovered it, that man is small in a vast universe. He has discovered nothing. Christianity has been saying this for two thousand years, and Judaism for longer. What is man, that thou art mindful of him? The Psalmist beat the astronomer to the punch by three millennia.",
          "What is new is not the smallness but the conclusion drawn from it. The believer says: given this smallness, the divine attention is the most extraordinary fact imaginable. The atheist says: given this smallness, the divine attention is impossible. But the data are the same. The argument from scale is not an argument; it is a mood.",
          "And it is a mood that depends, oddly, on the very Christian intuition it claims to refute — the intuition that human beings matter, that their being overlooked would be a scandal. A consistent materialist should not be offended by cosmic indifference. He should expect it, and shrug.",
        ],
        cites: [
          'Orthodoxy (1908), ch. 2 ("The Maniac"), ch. 4 ("The Ethics of Elfland")',
        ],
      },
      lewis: {
        lede: "The size of the universe was not news to anyone who looked up.",
        body: [
          "Ptolemy knew the earth was a point compared to the heavens. Augustine knew it. The medievals, whom we caricature as thinking the cosmos was a snug box, in fact pictured a universe whose vastness terrified them more than ours terrifies us — because they peopled it with intelligences. The discovery of more space did not produce the modern unease. The loss of meaning did.",
          "The argument from size is rhetorical, not logical. A flea is small; this does not prove the flea is unimportant to its dog. A galaxy is large; this does not prove it is important to anything. Importance is not measured in cubic light-years.",
          "If the Incarnation is true, then God entered the smallest possible point of his own creation — a particular Jewish carpenter, in a particular year. The scandal of Christianity has never been that it makes too much of man. It is that it makes too much of one man.",
        ],
        cites: [
          'Miracles (1947), ch. 7 ("A Chapter of Red Herrings")',
          "The Discarded Image (1964)",
        ],
      },
      mystic: {
        lede: "The drop does not contain the ocean. The ocean contains the drop.",
        body: [
          "You speak of scale as though God were one large object among other objects, competing for room with galaxies. He is not. He is the ground in which galaxies and atoms equally rest. The hundred billion galaxies do not dwarf God; they are sustained, moment by moment, by the same act of being that sustains the sparrow.",
          "When the contemplative speaks of God's attention to the soul, she does not mean that God has stopped attending to the supernovae in order to attend to her. She means that the divine presence is undivided, total, simultaneous — that the same love that holds the cosmos in being holds her, with the same fullness, in being.",
          "The vastness you find oppressive, the saint finds liberating. There is no corner of the universe she could flee to where she would be more or less held than she is now.",
        ],
        cites: [
          "Meister Eckhart, Sermons",
          "Julian of Norwich, Revelations of Divine Love ch. 5 (the hazelnut)",
        ],
      },
    },
  },
  {
    id: "natural-evil",
    n: 13,
    title: "Earthquakes have no free will.",
    short: "Natural evil",
    steel:
      "The free-will defense, even granted, only covers moral evil — what humans do to each other. It says nothing about the tsunami, the cancer cell, the child born with a genetic disease that kills her at four. No one chose these. They are built into the fabric of the world an omnipotent, omniscient, perfectly good creator chose to make.",
    quote: "If a good God made the world, why has it gone wrong?",
    quoteBy: "C.S. Lewis (citing the objector before answering)",
    pub: "Earthquakes and cancer aren't anyone's fault. So why does God allow them?",
    related: ["evil", "hell", "hiddenness"],
    counters: {
      aquinas: {
        lede: "Evil is not a thing. It is the absence of a good that ought to be there.",
        body: [
          'Blindness is not an entity competing with sight; it is the lack of sight in something made to see. Cancer is not a creature; it is a disordering of cells made for order. When we ask "why did God create this evil?" we have already misstated the question. God creates being, and being is good. Evil is what happens when being falls short of itself.',
          "Why does God permit such falling-short in the natural order? Because he created a world of secondary causes — a world in which fire genuinely burns, plates genuinely shift, cells genuinely divide — rather than a world of constant miraculous intervention. A universe of stable causes is the precondition for any creaturely action at all. Remove the stability, and you remove the creature.",
          "This does not make the suffering small. It locates it. Natural evil is the cost of a world in which finite beings genuinely act. The alternative is not a better world but no world.",
        ],
        cites: [
          "Summa Theologiae I.48–49 (on evil as privation)",
          "Summa Contra Gentiles III.71",
        ],
      },
      lewis: {
        lede: "A world that yields to my will would have no other will in it.",
        body: [
          "If matter were soft enough to spare us every pain, it would be soft enough to spare us every action. The same hardness of wood that lets me hammer a nail lets the nail go through my hand. The same gravity that holds me to my chair pulls the climber from the cliff. To ask for a universe with all the goods of stable nature and none of its dangers is to ask for a universe that contradicts itself.",
          "This does not answer why this child gets this cancer. I do not know. No one knows. But it answers a different question — why a good God might create a world in which such things are possible. The possibility is the price of a world that is genuinely other than God, with its own causal integrity.",
          "Pain, when it comes, is God's megaphone to a deaf world. I do not say this lightly; I lost my wife to cancer and I have written what it cost me. But I will not unsay it. The universe that hurts us is the same universe that lets us love each other. You cannot keep one and lose the other.",
        ],
        cites: [
          "The Problem of Pain (1940), ch. 2, 6",
          "A Grief Observed (1961)",
        ],
      },
      augustine: {
        lede: "Creation groans because creation fell.",
        body: [
          "The world as it is is not the world as it was made. Scripture's witness is consistent: the disorder we observe in nature — the predation, the disease, the seismic violence — is not the original creation but the fallen one. Creation itself will be set free from its bondage to corruption, says Paul; it is in bondage now, and was not always.",
          "How a moral fall produced a physical disorder is mysterious, and I will not pretend to map it. But the intuition that something is wrong with the world is not an argument against God. It is the most basic Christian claim. The atheist's complaint — that the world is broken — is exactly what we have been telling him for two thousand years.",
          "The question is not whether the world is broken. It is whether it can be healed, and by whom.",
        ],
        cites: ["City of God XXII.22–24", "Romans 8:19–23"],
      },
      francis: {
        lede: "Brother fire burns, and is still our brother.",
        body: [
          "I have called the sun my brother and the moon my sister. I have called death itself my sister. The world that hurts us is the same world that feeds us, and the creature does not curse the field for having stones in it.",
          "When the wolf came to Gubbio and ate the people's livestock, I did not curse the wolf. I went and spoke with him, and made peace, because the wolf was hungry and the people were afraid, and both were God's. The world is not arranged for our comfort. It is arranged for a deeper good than comfort, and we are part of it, not the center of it.",
          "The cancer is real, and the earthquake is real, and I will not insult the suffering by calling them small. But the same Lord who lets the rain fall on the just and the unjust gives us each other, to bind up wounds and bury the dead and sing in the dark.",
        ],
        cites: [
          "Canticle of the Creatures (1224)",
          "Fioretti, ch. 21 (the wolf of Gubbio)",
        ],
      },
      catechism: {
        lede: "Creation is on a journey toward a perfection not yet attained.",
        body: [
          "The world that God created was good, but it was not finished. He willed creation to be in statu viae — in a state of journeying — toward an ultimate perfection still to come. This means that physical evil exists alongside physical good in the present order: with the appearance and disappearance of certain beings, with the constructive and destructive forces of nature. Earthquakes, predation, the slow extinction of species — these belong to a creation that is unfolding, not to a creation that has been broken from above.",
          "The drama deepens with the entry of moral evil. Humanity, made for communion with God and entrusted with creation, turned away. This is the Fall: not the introduction of physics into a previously placid Eden, but the rupture of the creature meant to receive creation rightly, to lift it toward its end. Death entered human experience in a new mode. Creation, deprived of its appointed steward, groans. We know that the whole creation has been groaning in travail together until now.",
          "Why God permits a creation that suffers, rather than imposing a finished perfection from the start, is a mystery to which faith gives only a partial answer. Almighty God, because he is sovereignly good, would never allow any evil whatsoever to exist in his works if he were not so all-powerful and good as to cause good to emerge from evil itself. The full answer waits on the end of the journey, when God will be all in all, and creation itself will be set free from its bondage to corruption.",
        ],
        cites: [
          "Catechism of the Catholic Church §§310, 385, 400, 412",
          "Romans 8:19–23",
          "cf. Augustine, Enchiridion 11 (quoted at CCC §311)",
        ],
      },
    },
  },
  {
    id: "many-gods",
    n: 14,
    title: "Pascal's Wager doesn't pick a winner.",
    short: "The many-gods rebuttal",
    steel:
      "Even granting the wager's logic, it cannot select between mutually exclusive faiths. Bet on Christ, lose to Allah. Bet on Allah, lose to Vishnu. Bet on the Christian God, and a sincere Calvinist will tell you you've still gone to hell for picking the wrong denomination. The wager only works if you've already, by other means, narrowed the field to one candidate — which is the entire question.",
    quote: "The wager works only if the choice is already binary. It is not.",
    quoteBy: 'common formulation; cf. William James, "The Will to Believe"',
    pub: "Pascal's Wager doesn't tell me which god to bet on.",
    related: ["evidence", "hiddenness"],
    counters: {
      pascal: {
        lede: "The wager was never a starting point. It was a closing argument.",
        body: [
          "Read me whole, not in fragments. The wager appears late in the Pensées, after I have spent hundreds of fragments arguing for the historical specificity of Christianity — the prophecies, the witness of the apostles, the figure of Christ, the strange persistence of the Jewish people, the testimony of the saints. The wager is addressed to a man who has already been brought to the threshold and cannot make himself step across.",
          "To such a man I say: the cost of betting wrong on Christ is bounded; the cost of betting right is infinite. Given that you have already narrowed the field, the calculation favors faith. I never claimed it would narrow the field for you. That work is done by the evidence, not by the wager.",
          'The atheist who lobs "but what about Allah?" at me has not read me. Or has read only the fragment that flatters his refutation.',
        ],
        cites: ["Pensées §233 (the wager) — read in the context of §§194–232"],
      },
      lewis: {
        lede: "Christianity is not one mythology among many. It is the one that happened.",
        body: [
          "I came to Christianity through the back door of mythology. I loved the dying-and-rising gods of the pagans — Balder, Adonis, Osiris — long before I loved Christ. What converted me was not the discovery that Christianity was unique, but the discovery that it was the true version of what the myths were groping toward. The pagans had dreamed it; the Jews had been prepared for it; in Christ it actually happened, in a particular place, under a particular Roman governor.",
          "The world's religions are not interchangeable bets on a roulette wheel. They make incompatible historical claims, and those claims can be examined. Christianity uniquely stakes itself on a public, datable, falsifiable event — the resurrection. If the tomb was not empty, Paul says, our faith is in vain. No other religion makes itself so vulnerable to history.",
          'The wager, properly understood, is not "pick a god, any god." It is "having examined the evidence, commit."',
        ],
        cites: [
          "Mere Christianity (1952), Bk. II, ch. 3",
          "Miracles (1947)",
          '"Myth Became Fact" in God in the Dock',
        ],
      },
      newman: {
        lede: "Many candidates do not mean equal candidates.",
        body: [
          "That a question has multiple proposed answers does not mean the answers are equally weighted. There are many theories about what causes cancer; this does not mean every theory is one-in-many and therefore none can be chosen. The investigator weighs the evidence and the candidates resolve into a probable hierarchy.",
          "The same is true of the religions. Examined seriously — their historical foundations, their internal coherence, the lives they have produced, their capacity to bear philosophical weight — they do not present as a flat menu. The convergence of probabilities, what I have called the illative sense, is exactly the faculty by which a serious person navigates such a field.",
          'The atheist\'s "many gods" objection treats every religion as evidentially equivalent. No serious comparative theologian believes this, including atheist ones. The objection survives only by refusing to do the actual comparison.',
        ],
        cites: [
          "Grammar of Assent (1870), ch. 8",
          "Apologia Pro Vita Sua (1864)",
        ],
      },
      logician: {
        lede: "The objection misunderstands decision theory.",
        body: [
          "The many-gods objection is sometimes presented as if it were a knockdown refutation of the wager. It is not. It is a refinement. Decision theory under uncertainty handles competing hypotheses the same way regardless of the domain: you weight by prior probability and expected outcome.",
          "If the priors over the candidate religions were genuinely uniform — every religion equally likely on the evidence — the wager would indeed dissolve into noise. But priors are almost never uniform. Some religions have more evidential support, more internal coherence, more historical specificity than others. Updating on this, the wager reconstructs itself for the leading candidate.",
          'The atheist who deploys "but what about Zeus?" is making a claim about priors: that Zeus and Yahweh are evidentially symmetric. He should be asked to defend that claim. He almost never can.',
        ],
        cites: [
          'cf. Alan Hájek, "Waging War on Pascal\'s Wager" (2003) — and the responses',
        ],
      },
    },
  },
  {
    id: "neuroscience",
    n: 15,
    title: "Religious experience is just brain chemistry.",
    short: "Neuroscience of the divine",
    steel:
      "Stimulate the temporal lobe, get a mystical experience. Take psilocybin, meet God. Epileptic seizures produce conversions; brain tumors produce visions of angels. If we can reliably trigger encounters with the sacred by poking neurons, the encounters tell us about the neurons, not the sacred.",
    quote:
      "Mystical experience tells us about the brain, just as a dream tells us about the dreamer.",
    quoteBy: "paraphrase of contemporary cognitive science of religion",
    pub: 'If a brain scan can show why someone "feels" God, isn\'t God just in their head?',
    related: ["evidence", "science", "hiddenness"],
    counters: {
      mystic: {
        lede: "Mechanism is not refutation.",
        body: [
          'When I see a tree, light strikes my retina, neurons fire, the visual cortex assembles an image. I can describe every step of this process and the tree does not vanish. The mechanism by which I perceive is not an argument against the thing perceived. To say "your experience of the tree is just neurons" is to confuse the channel with the broadcast.',
          "Religious experience has a neurological substrate. Of course it does. So does mathematical insight, romantic love, and the recognition of your mother's face. Showing the substrate has never disproved the object in any other domain. It is curious that this particular argument is deployed only against the sacred.",
          "The mystic does not claim that her experience of God bypasses the brain. She claims that the brain, when properly disposed, perceives what is actually there. The atheist owes us a reason to think this case is different from every other case of perception.",
        ],
        cites: [
          "Teresa of Ávila, Interior Castle",
          "Bernard McGinn, The Foundations of Mysticism",
        ],
      },
      lewis: {
        lede: "The genetic fallacy is still a fallacy.",
        body: [
          "Tell me where a belief came from and you have told me nothing about whether it is true. Newton's apple, Kekulé's dream of the snake, Archimedes in the bath — discoveries arrive through neurons firing in particular ways, and the discoveries are still true. To call religious experience \"just brain chemistry\" is to commit the same fallacy in reverse.",
          'There is also a self-defeat at the heart of the objection. If religious experience is debunked because it has a neural cause, then every experience — including the experience of being persuaded by neuroscientific arguments — has a neural cause. The atheist\'s confidence in his own reasoning is also "just neurons firing." If the objection works against the believer, it works against the objector. If it does not work against the objector, it does not work at all.',
          "The honest question is not whether religious experience has a mechanism, but whether the mechanism is reliable. That requires looking at the lives the experiences produce, not at the scans alone.",
        ],
        cites: [
          'Miracles (1947), ch. 3 ("The Self-Contradiction of the Naturalist")',
          '"Bulverism" in God in the Dock',
        ],
      },
      aquinas: {
        lede: "The soul is the form of the body. Of course the brain is involved.",
        body: [
          "The objection presupposes a Cartesian dualism that the Church never taught. It imagines the soul as a ghost attached to a body, and triumphantly announces that touching the body affects the ghost. But the human person is not a ghost in a machine. The soul is the form of the body — the principle by which this matter is this living, thinking person. Naturally, then, what affects the body affects the person, including in his perception of God.",
          "That a stroke can change personality, that a tumor can produce visions, that psilocybin can occasion mystical experience — none of this is news to a Thomist. The intellect, in this life, depends on the senses and on the brain. Nihil in intellectu nisi prius in sensu. We always know God through the body, never apart from it.",
          "What the neuroscientist can show is that religious experience uses the brain. He cannot show, by neuroscience alone, that the brain generates the object rather than perceives it. That is a philosophical claim, not a neurological one.",
        ],
        cites: [
          "Summa Theologiae I.75–76 (on soul and body)",
          "ST I.84 (on knowledge through the senses)",
        ],
      },
      scientist: {
        lede: "Correlation is not the whole of causation.",
        body: [
          "The cognitive science of religion is a real and interesting field, and I will not dismiss it. We have good data that certain brain states correlate with reported religious experience. We have plausible evolutionary stories about why humans are disposed to detect agency, to feel awe, to seek transcendence. All of this is genuine science.",
          'But the inference from "religious experience has neural correlates" to "religious experience has no real object" is not a scientific inference. It is a philosophical one, smuggled in. The same data are equally compatible with the hypothesis that the brain evolved to detect a real transcendent dimension of reality, and with the hypothesis that it evolved to fabricate one. Choosing between these requires arguments outside neuroscience.',
          "A careful scientist distinguishes what the data show from what she wishes they showed. On the question of whether the object of religious experience exists, the brain scans are silent.",
        ],
        cites: [
          "Andrew Newberg, Principles of Neurotheology",
          "Justin Barrett, Why Would Anyone Believe in God?",
        ],
      },
    },
  },
  {
    id: "prayer",
    n: 16,
    title: "Tested under controlled conditions, intercessory prayer fails.",
    short: "Prayer doesn't work",
    steel:
      "The 2006 STEP study (Templeton-funded, ten years, 1,800 cardiac patients) found no benefit from intercessory prayer — and a slight negative effect for those who knew they were prayed for. Amputees never regrow limbs. Catholic and Protestant child mortality rates track local medicine, not local devotion. If prayer is real communication with an omnipotent friend, the silence on the line is deafening.",
    quote:
      "The proper, if somewhat ungainly, formulation is: those who knew they were being prayed for had a slightly higher rate of complications.",
    quoteBy: "STEP Project, 2006",
    pub: "If prayer worked, amputees would grow limbs back. They don't.",
    related: ["evidence", "miracles", "hiddenness"],
    counters: {
      lewis: {
        lede: "Prayer is not a vending machine.",
        body: [
          'The objection imagines prayer as a system of inputs and outputs: enough prayers in, the desired outcome out. On this model, of course prayer "fails." It would also fail as a model of friendship, or marriage, or any relation between persons. You do not summon your wife by repeating her name with sufficient sincerity. She is not a vending machine, and neither is God.',
          "Prayer in the Christian tradition is not primarily a mechanism for getting things. It is the alignment of the creature with the Creator — a participation in the divine will, not a manipulation of it. Thy will be done is the model, not an afterthought. When Jesus prays in Gethsemane, he asks; he is refused; he submits. This is the pattern.",
          "That said, prayers are answered. I have seen them answered. But the answer comes on God's terms and his timing, and is often not what was asked. Asked for relief, we are sometimes given strength to bear. Asked for the dead to be raised, we are sometimes given the courage to bury them.",
        ],
        cites: [
          '"The Efficacy of Prayer" in The World\'s Last Night (1960)',
          "Letters to Malcolm: Chiefly on Prayer (1964)",
        ],
      },
      aquinas: {
        lede: "We pray not to change God, but to be changed by God.",
        body: [
          "A common confusion: that prayer is meant to alter God's mind, and that if it doesn't, it has failed. God's will is eternal and unchanging. We pray not to inform him of our needs (he knows them already) nor to persuade him to act (he has eternally willed what he wills) but because he has eternally willed that certain goods come to us through our asking.",
          "Prayer is thus a real cause in the chain of providence — but its primary effect is on the one praying. To pray rightly is to conform one's desire to God's, to learn what to want by asking for it, to become the kind of creature for whom the petition makes sense. The petition that is answered changes the petitioner more than the world.",
          "The Templeton study tested whether God could be made to function as a magic spell when invoked by strangers about strangers. The result — that he cannot — is exactly what the tradition predicts.",
        ],
        cites: [
          "Summa Theologiae II-II.83 (on prayer)",
          'ST II-II.83.2 ("Whether it is fitting to pray")',
        ],
      },
      augustine: {
        lede: "My mother prayed for years. She got something better than she asked for.",
        body: [
          "My mother Monica prayed for years that I would not go to Rome, because she feared I would be lost there. I went to Rome anyway, and there I was found — converted, baptized, returned to the faith she had wanted for me. She had asked for one thing and been given another. The thing she had been given was the thing she had really wanted, but she had not known how to name it.",
          "This is the shape of prayer in a fallen world. We pray with the desires we have, which are mixed and partial. God answers, when he answers, the deeper desire we did not know we had. The prayers that look unanswered are sometimes answered at a depth we could not have specified.",
          "I will not pretend this consoles every grief. The mother whose child dies prayed in a depth I have not touched. But I will say what I have seen: that those who pray long and honestly are rarely surprised, in the end, that God did not give them what they asked. They are surprised by what he gave instead.",
        ],
        cites: ["Confessions V.8 (Monica's prayer)", "IX.10–13 (her death)"],
      },
      pastor: {
        lede: "I have been at the bedsides. I will not lie about what I saw.",
        body: [
          "I have prayed for healing and seen it. I have prayed for healing and watched the person die. I will not give you a clean theology that flattens this. The honest answer is that intercessory prayer is real, and its results are unpredictable, and any pastor who tells you otherwise is selling something.",
          "What I have seen, more reliably than miraculous healing, is this: the people who are prayed for, and who pray, die better. They are less afraid. Their families are less shattered. The community around them is more present. None of this shows up in a Templeton study because none of this was what the study measured. The study measured cardiac complications. Prayer was never primarily about cardiac complications.",
          "The amputee question is the cleanest version of the objection, and I will be plain: I do not know why limbs are not restored. I know that other things are restored — marriages, addictions, the will to live — and that I have watched it happen. The atheist is right that the data on prayer-for-things is messy. He is wrong that this settles the question of whether God listens.",
        ],
        cites: [
          "pastoral experience",
          "cf. Tim Keller, Prayer: Experiencing Awe and Intimacy with God (2014)",
        ],
      },
    },
  },
  {
    id: "pleasure",
    n: 17,
    title: "Why would God make it feel good if it's wrong?",
    short: "The pleasure principle",
    steel:
      "The Catholic prohibitions on sex outside marriage, masturbation, contraception, and homosexual acts all run into the same wall: the activities in question are designed, by the same God who allegedly forbids them, to be intensely pleasurable. Either pleasure is a reliable signal that something is good — in which case the prohibitions are perverse — or pleasure is not a reliable signal, in which case God built a system designed to deceive us about our own good. Neither option flatters the believer.",
    quote:
      "If God didn't want us to enjoy it, he had a strange way of showing it.",
    quoteBy: "common formulation; cf. Bertrand Russell, Marriage and Morals",
    pub: "If God doesn't want me touching myself, why does it feel so good?",
    related: ["morality", "bible", "evil"],
    counters: {
      aquinas: {
        lede: "Pleasure follows the good. It does not define it.",
        body: [
          "The objection assumes that pleasure is the criterion of goodness — that if an act is pleasurable, it must be good, and any prohibition must be arbitrary. This is precisely backwards. In the order of nature, pleasure is attached to goods to draw us toward them. Eating is pleasurable because eating sustains life; sex is pleasurable because it generates and binds life. The pleasure is the lure; the good is what it lures us toward.",
          "What follows is that pleasure is reliable when ordered to its proper end and unreliable when severed from it. The glutton experiences real pleasure in eating beyond his need; the pleasure is genuine, but it is no longer doing the work it was designed for. The same applies to the sexual faculty. Detached from the goods it exists to serve — the union of spouses, the begetting of children — the pleasure remains, but it has been cut loose from what made it good in the first place.",
          'To say "it feels good, therefore it is good" is to mistake the signpost for the destination. A counterfeit coin still feels like money in the hand. The question is whether it spends.',
        ],
        cites: [
          "Summa Theologiae I-II.34 (on pleasure)",
          "ST II-II.153–154 (on lust and its species)",
          'ST I-II.31.7 ("Whether bodily pleasure is greater than spiritual?")',
        ],
      },
      lewis: {
        lede: "God invented pleasure. The devil cannot make pleasures, only steal them.",
        body: [
          "I want to grant the objection more than the objector expects. Pleasure is good. Sexual pleasure is good. The Christian who pretends otherwise has already lost the argument, because he is contradicting Genesis, which calls the body very good, and the Song of Songs, which is in the canon for a reason. The enemy of Christianity here is not the hedonist but the Manichee, who thinks the flesh itself is the problem.",
          "What Christianity teaches is not that pleasure is bad but that pleasure has a grain, like wood, and that working against the grain splinters the thing you are working on. The pleasure of food is good; the pleasure of food severed from nourishment produces the bulimic. The pleasure of drink is good; severed from its proper use it produces the alcoholic. Sexual pleasure is good; severed from the union it was made to seal, it produces — well, look around.",
          'The screwtape question is not "does it feel good?" but "what does more of it look like, ten years on?" The pleasures that diminish you, that need ever-larger doses, that leave you lonelier than they found you — those are the pleasures the tradition has flagged. Not because they are pleasures, but because they are pleasures pointed at nothing.',
        ],
        cites: [
          "The Screwtape Letters (1942), Letter IX",
          'Mere Christianity, Bk. III, ch. 5 ("Sexual Morality")',
          'The Four Loves (1960), ch. 5 ("Eros")',
        ],
      },
      catechism: {
        lede: "The pleasure is good. The use is what the moral law addresses.",
        body: [
          "The Church does not teach, and has never taught, that sexual pleasure is evil. The acts in marriage by which the intimate and chaste union of the spouses takes place are noble and honorable; the truly human performance of these acts fosters the self-giving they signify and enriches the spouses in joy and gratitude. Pleasure within the integrity of the conjugal act is a good willed by God.",
          "What the moral law addresses is not pleasure itself but the use of the sexual faculty apart from its meaning. The faculty has two ends inscribed in its very structure: the union of the spouses and the transmission of life. These are not arbitrary rules imposed from outside; they are what the act is. To take the pleasure while deliberately excluding the meaning — through masturbation, through contraception within the act, through acts of their nature closed to either union or life — is to use the faculty against itself.",
          "This teaching is demanding, and the Church does not pretend otherwise. Many find it difficult; many fail; the confessional exists for this reason among others. But the demand is not arbitrary cruelty. It is the recognition that the body speaks a language, and that the moral life consists in not lying with the body about what one is doing.",
        ],
        cites: [
          "Catechism of the Catholic Church §§2331–2336 (vocation to chastity)",
          "§§2351–2356 (offenses against chastity)",
          "§§2360–2365 (conjugal love)",
          "Gaudium et Spes §49 (quoted at CCC §2362)",
        ],
      },
      chesterton: {
        lede: "The fence around the garden is the reason there is a garden.",
        body: [
          "The modern man looks at a fence and asks why it is there. If he is wise, he does not tear it down until he has found out. The Christian rules around sex look, from a sufficient distance, like fences around nothing — arbitrary lines drawn across an open field of pleasure. Walk closer and you find that the field is a garden, and the fence has been keeping the wolves out.",
          'The argument from pleasure proves too much. If "it feels good, therefore it is good" were a moral principle, it would license every addiction and excuse every betrayal. The man cheating on his wife also reports that it feels good. The drunk reports the same. Of course it feels good. The question every grown person eventually has to answer is whether the things that feel good are also the things that build a life worth having ten years from now, and twenty, and at the deathbed.',
          "Christianity's sexual ethic is unfashionable. It has always been unfashionable. It was unfashionable in pagan Rome, which is precisely why Christianity spread there — it offered, for the first time in that world, a vision in which women and slaves and unwanted children were not disposable. The hedonist objection sounds new. It is in fact the oldest objection there is, and the strangest fact in history is how many tired hedonists, having tried the alternative, have come back to the fence and looked again at the garden.",
        ],
        cites: [
          'The Thing (1929), ch. 4 ("The Drift from Domesticity") — the famous "fence" passage',
          "What's Wrong with the World (1910), Part III",
          "Orthodoxy (1908), ch. 7",
        ],
      },
    },
  },
  {
    id: "projection",
    n: 18,
    title: "Religion is psychological projection.",
    short: "The cosmic father",
    steel:
      "We invented God because we miss our actual fathers, fear death, and want the universe to be on our side. The doctrine of providence is the wish that someone is watching. The doctrine of heaven is the wish that we don't really die. The doctrine of judgment is the wish that the wicked don't really get away with it. Strip the wishes away and there is no residue.",
    quote:
      "Religious ideas are illusions, fulfilments of the oldest, strongest, and most urgent wishes of mankind.",
    quoteBy: "Sigmund Freud, The Future of an Illusion",
    pub: "You only believe in God because you want it to be true.",
    related: ["evidence", "hiddenness", "morality"],
    counters: {
      lewis: {
        lede: "A creature is not born with desires unless satisfaction for those desires exists.",
        body: [
          "A baby feels hunger; well, there is such a thing as food. A duckling wants to swim; well, there is such a thing as water. Men feel sexual desire; well, there is such a thing as sex. If I find in myself a desire which no experience in this world can satisfy, the most probable explanation is that I was made for another world. The wish-fulfillment objection treats human longing as evidence against its object. In every other domain we treat it as evidence for one.",
          "The atheist version of the argument says: you long for a Father, therefore you invented one. Run the same argument on hunger and you get: you long for food, therefore food does not exist. The structure is absurd. What the longing actually shows is that the longing is for something — and the question of whether that something is real cannot be settled by pointing out that you want it.",
          "I will go further. Freud's theory is itself wish-fulfillment, for those who wish there were no Father to answer to. The desire to be free of a moral lawgiver is at least as primal as the desire to have one. If the genetic argument debunks belief, it debunks unbelief on the same terms.",
        ],
        cites: [
          'Mere Christianity (1952), Bk. III, ch. 10 ("Hope")',
          "The Weight of Glory (1941)",
          "Surprised by Joy (1955), ch. 1, 11",
        ],
      },
      chesterton: {
        lede: "Atheism is the most consoling religion ever invented.",
        body: [
          "The man who says Christianity is a comforting fairy tale has never tried to live by it. He has confused Christianity with whatever cozy childhood pieties he is rebelling against. Real Christianity tells you that you are a sinner, that you must forgive your enemies, that the rich will have a hard time of it, that you will be judged for every idle word, and that the cost of discipleship is your life. If this is wish-fulfillment, the wishes involved are extraordinarily perverse.",
          "What is actually comforting is the doctrine that there is no God to whom one must answer, no soul that survives death to face judgment, no objective moral law one can be measured against. The atheist sleeps better than the Christian and always has. The honest atheists know this. Camus knew it. Nietzsche, who wanted the death of God to terrify, knew that his contemporaries were taking it as good news and despised them for it.",
          "The wish-fulfillment argument should be turned around and pointed at the one making it. Cui bono? Who benefits from the cosmic absence? The man who would rather not be watched.",
        ],
        cites: [
          'Orthodoxy (1908), ch. 6 ("The Paradoxes of Christianity")',
          "The Everlasting Man (1925), Part II, ch. 1",
        ],
      },
      logician: {
        lede: "The genetic fallacy.",
        body: [
          "To explain the origin of a belief is not to refute the belief. This is among the most basic distinctions in the philosophy of argument, and the wish-fulfillment objection violates it as a matter of structure. How someone came to believe X is logically independent of whether X is true. A man who believes the bridge is safe because his mother told him so may still be standing on a safe bridge.",
          "Freud's argument, applied consistently, dissolves itself. The belief that religious belief is wish-fulfillment is itself a belief, held by particular humans for particular psychological reasons. If the origin of a belief settles its truth, then we can debunk Freud by examining Freud's psychology — which is exactly what later analysts have done, with results unflattering to the founder of the discipline. The argument cannot be deployed against religion without also being deployable against itself.",
          "There is a legitimate question buried in the objection: given that we have psychological reasons to want X, can we still arrive at X by good evidence? The answer is yes, the same way we arrive at any belief — by examining the evidence on its merits and remaining alert to bias. This is hard, but it is hard in the same way for the atheist.",
        ],
        cites: [
          "Antony Flew, Thinking About Thinking (1975)",
          "cf. Alvin Plantinga, Warranted Christian Belief (2000), ch. 5–6",
        ],
      },
      aquinas: {
        lede: "The natural desire for God is evidence, not illusion.",
        body: [
          "Every faculty in nature is ordered toward an object that exists. The eye is for light; light exists. The intellect is for truth; truth exists. The will is for the good; the good exists. It would be a strange exception to this universal pattern if the deepest human longing — the restlessness Augustine names, the desire for the infinite that no finite thing satisfies — pointed at nothing.",
          "The argument, properly stated, is not that God exists because we want him. It is that the universal human capacity to desire what no creature can give is itself a feature of human nature requiring explanation. The materialist must explain why evolution would shape an animal that is not at home in the world it evolved for. The Christian explanation — that we are made for God and remain restless until we rest in him — is at minimum a candidate, and a candidate that fits the data better than its alternatives.",
          "What the objection mistakes for projection is in fact the testimony of the creature about its own end.",
        ],
        cites: [
          "Summa Contra Gentiles III.48–51",
          "Summa Theologiae I-II.2 (on the ultimate end of man)",
          "cf. Augustine, Confessions I.1",
        ],
      },
    },
  },
  {
    id: "faith-reason",
    n: 19,
    title: "Faith is the abdication of reason.",
    short: "Belief without evidence",
    steel:
      "Science proceeds by evidence, falsification, and revision. Religion proceeds by faith — which means believing things you have no good reason to believe. The two are not complementary; they are opposites. A scientist who believed things on faith would be drummed out of his field. The religious person celebrates as a virtue what every other domain treats as a vice.",
    quote:
      "Faith is the great cop-out, the great excuse to evade the need to think and evaluate evidence.",
    quoteBy: "Richard Dawkins",
    pub: "Faith just means believing stuff without proof.",
    related: ["evidence", "science", "intelligence"],
    counters: {
      aquinas: {
        lede: "Faith is assent to truth on the authority of a trustworthy witness.",
        body: [
          "The objection assumes that faith means believing without reason. This is not what the word has ever meant in the Catholic tradition. Faith is the assent of the intellect to a truth on the basis of testimony — specifically, the testimony of God, whose veracity is the ground of the assent. It is not opposed to reason; it is reason operating on a particular kind of evidence, namely the witness of one who knows.",
          "You believe a great many things this way already. You believe that Australia exists, though you have not been there. You believe that the American Revolution happened, though you did not see it. You believe your mother is your mother on the testimony of those who were present at your birth. None of this is irrational. It is the ordinary operation of a finite mind that cannot verify everything firsthand and must rely on credible witnesses.",
          "What faith adds is not the structure of testimonial assent but the witness — God himself, whose authority exceeds that of any human source. The reasonableness of faith therefore depends on the prior question of whether God has in fact spoken, which is a question reason can examine. The motives of credibility — miracles, prophecy, the holiness of the saints, the spread of the Church — are not faith itself but the rational grounds for entertaining faith.",
        ],
        cites: [
          "Summa Theologiae II-II.1–2 (on faith)",
          "ST II-II.4.1 (the definition of faith)",
          "Vatican I, Dei Filius ch. 3 (on faith and reason)",
        ],
      },
      newman: {
        lede: "Most of what we know, we know by accumulated probability, not demonstration.",
        body: [
          'The model of knowledge implied by the objection — that genuine knowledge is what can be proven by deductive certainty or experimental replication, and everything else is mere "faith" — describes almost nothing of what any actual person actually knows. Outside of mathematics and a narrow band of laboratory science, we know things by the convergence of independent probabilities, weighed by what I have called the illative sense.',
          "You know that your spouse loves you. You cannot prove it the way you prove a theorem. You believe it because of ten thousand small evidences — looks, gestures, sacrifices, the texture of years — none of which is decisive alone, all of which together produce certitude. This is not irrationality. It is the ordinary structure of how rational adults arrive at the most important conclusions of their lives.",
          "Faith in God is reached by the same faculty. Not by a single knockdown proof but by the convergence of conscience, history, philosophical argument, the witness of the saints, the experience of grace, and the coherence of doctrine. The man who demands a syllogistic demonstration before he will believe will also, if he is consistent, never be able to say he loves his wife.",
        ],
        cites: [
          "An Essay in Aid of a Grammar of Assent (1870), esp. ch. 8–9",
          "Apologia Pro Vita Sua (1864)",
        ],
      },
      logician: {
        lede: "Every belief system rests on testimony.",
        body: [
          "Consider what the average educated atheist actually knows about, say, evolution. He has not done the genetic sequencing. He has not dug the fossils. He has not read the original Origin of Species, much less the technical literature. He believes evolution is true because credible authorities — scientists, textbooks, teachers — have told him so, and the institutions that produced them are reliable. This is exactly the structure of religious faith: assent based on trusted testimony.",
          'The atheist\'s belief in evolution is not therefore irrational. Trust in expert testimony, when the experts are trustworthy and the institutions reliable, is a perfectly sound epistemic strategy. But it is not categorically different from the Catholic\'s belief in the resurrection. Both rest on testimony; both can be examined for the credibility of the witnesses; both involve a non-zero leap from "the witnesses seem reliable" to "I assent to what they say."',
          "The Dawkins formulation — that faith means believing without evidence — is not a description of what religious people do. It is a definition rigged to make the conclusion automatic. Substitute the actual definition (assent on the basis of testimony) and the supposed gulf between faith and reason narrows to nothing.",
        ],
        cites: [
          "C.A.J. Coady, Testimony: A Philosophical Study (1992)",
          "cf. Alvin Plantinga, Warranted Christian Belief (2000)",
        ],
      },
      lewis: {
        lede: "Faith is holding on to what your reason has accepted, against changing moods.",
        body: [
          "I want to distinguish two things that are often confused. There is faith in the sense of arriving at a belief, and faith in the sense of sticking with a belief once arrived at. The first is the work of evidence and reason; the second is the work of will and habit. The atheist's caricature confuses them deliberately.",
          "When I am cheerful and well-rested, the case for Christianity seems obvious. When I am frightened, exhausted, or in love with the wrong person, the same case looks thin. This is not because the evidence has changed; it is because I have. Faith, in the second sense, is the discipline of holding to what I concluded in my best moments when I am no longer in my best moments. Every serious belief — scientific, moral, personal — requires this. The scientist who abandons his theory the first time the data look wobbly is not a better scientist than the one who holds on while checking his work.",
          "The atheist who imagines that his unbelief requires no such discipline has not examined his own moods. He, too, holds his views against the pull of contrary feeling. He simply does not call it faith.",
        ],
        cites: [
          'Mere Christianity (1952), Bk. III, ch. 11 ("Faith")',
          "Mere Christianity, Bk. III, ch. 12 (the second kind of faith)",
        ],
      },
    },
  },
  {
    id: "mythicism",
    n: 20,
    title: "Christ is a recycled myth.",
    short: "Jesus never existed",
    steel:
      "The story of a dying-and-rising god born of a virgin, performing miracles, and being resurrected on the third day predates Christianity by centuries. Horus, Mithras, Dionysus, Osiris, Attis — the parallels are legion. The Gospels were written decades after the alleged events, by partisans, in Greek, far from Palestine. There is no contemporary non-Christian record of Jesus. The simplest explanation is that the figure is fictional, assembled from the mythological raw material of the Hellenistic world.",
    quote:
      "Did Jesus exist? You probably think this question is settled. It isn't.",
    quoteBy: "Richard Carrier, On the Historicity of Jesus",
    pub: "Jesus is just a copy of older pagan gods.",
    related: ["miracles", "evidence", "science"],
    counters: {
      historian: {
        lede: "Even the agnostic scholars say he existed.",
        body: [
          "I am not a believer, and I will not pretend to be one. I am a historian of late antiquity, and I am here to tell you that the mythicist position is not held by any serious scholar of the period in any major secular university. This is not a matter of religious bias. The faculty of ancient history at Oxford, Cambridge, Harvard, Yale, the Sorbonne — populated overwhelmingly by secular and agnostic scholars — agree that Jesus of Nazareth existed and was crucified under Pontius Pilate. The dispute is over what to make of him, not whether to count him.",
          "The reasons are technical but solid. Paul's letters, written within twenty to thirty years of the crucifixion, refer to Jesus's brother James as a person Paul personally met. The historian Tacitus, writing in 116 AD, mentions \"Christus, who was executed by the procurator Pontius Pilate during the reign of Tiberius\" — and Tacitus was no Christian. Josephus, a Jewish historian writing in the 90s, mentions Jesus twice, once in a passage that has been interpolated by later Christian copyists but that almost all scholars agree contains an authentic core. The criterion of embarrassment — historians ask why a community would invent details that embarrass them — gives us a crucified messiah, baptism by John (which makes Jesus look subordinate), and a Galilean origin (which made him an unlikely candidate to begin with). You do not invent these details. You inherit them.",
          "The dying-and-rising-god parallels are mostly bogus. Most of the alleged parallels — Horus born of a virgin on December 25th, Mithras crucified and resurrected — are nineteenth-century inventions or massive overreadings of fragmentary evidence. Read the actual primary sources and the parallels evaporate. What you are left with is a Galilean Jewish preacher, executed under Pilate, whose followers shortly afterward began making extraordinary claims about him. That much is history. What to do with it is theology.",
        ],
        cites: [
          "Bart Ehrman, Did Jesus Exist? (2012)",
          "Maurice Casey, Jesus: Evidence and Argument or Mythicist Myths? (2014)",
          "Tacitus, Annals XV.44",
          "Josephus, Antiquities XX.9.1, XVIII.3.3",
        ],
      },
      lewis: {
        lede: "I have read myths. The Gospels are not myths.",
        body: [
          "I spent my professional life reading ancient and medieval literature, and I will say something the mythicist cannot: I know what myths read like, and the Gospels do not read like them. Myths are vague about geography, vague about chronology, populated by figures who exist outside ordinary time. The Gospels name a Roman procurator, a Jewish high priest, a Galilean tetrarch, a specific tax census. They report awkward, pointless details — the pillow Jesus slept on in the boat, the way he wrote in the dust, his irritation with his disciples. Myths do not have pillows in them. Reportage has pillows in it.",
          "If the Gospel writers were inventing a mythological figure, they were inventing in a genre that did not yet exist — realistic biographical fiction. No one was writing this way in the first century. The novelistic technique that produces the Jesus of the Gospels was not developed until the eighteenth century. Either the evangelists were two thousand years ahead of their literary moment, or they were doing something other than inventing. Occam suggests the latter.",
          "The mythicist also has to explain the rise of Christianity. A movement that recruits Jewish monotheists into the worship of a crucified man — crucifixion being the most shameful death the ancient world could imagine — has a steep hill to climb if its central figure never existed. The hill becomes much gentler if he did.",
        ],
        cites: [
          '"Modern Theology and Biblical Criticism" in Christian Reflections (1967)',
          '"Myth Became Fact" in God in the Dock (1970)',
          "An Experiment in Criticism (1961)",
        ],
      },
      chesterton: {
        lede: "Pontius Pilate is not a mythological figure.",
        body: [
          "The genius of the Christian creed is that it grounds itself in the most embarrassing specificity. Suffered under Pontius Pilate. No mythology does this. Mythology lives in illo tempore, in the time of beginnings, when the gods walked. Christianity locates its central act under a specific Roman administrator whose career we can date, whose coins we have, whose archaeological inscriptions exist. This is not how myths work. It is the opposite of how myths work.",
          'The mythicist argument requires us to believe that early Christians, wishing to fabricate a god, chose to attach him to the most awkward possible historical handle — a recent execution, in a remote province, by a named bureaucrat. It is as if someone fabricating a religion today set it under "the second Obama administration." You do not invent legends with bureaucratic timestamps. You inherit them.',
          "The dying-and-rising god parallels are the favorite weapon of the mythicist, and the weakest. Frazer's Golden Bough, on which most of the parallels depend, has been quietly demolished by every generation of subsequent anthropology. The pagan parallels, examined closely, turn out to be either much later than Christianity (and dependent on it), or so structurally different that the comparison is meaningless. The atheist owes us a citation. He almost never has one that survives examination.",
        ],
        cites: [
          "The Everlasting Man (1925), Part II",
          'Orthodoxy (1908), ch. 8 ("The Romance of Orthodoxy")',
        ],
      },
      aquinas: {
        lede: "The argument from the spread of the Church.",
        body: [
          "Even setting aside the textual evidence, the historical fact of the Church's expansion is itself an argument. Within a generation of the crucifixion, communities devoted to the worship of a particular Galilean Jew had spread across the Roman Empire, withstood three centuries of intermittent persecution, and converted the empire that crucified their founder. This expansion happened in literate, hostile, well-documented territory. Roman authorities, Jewish authorities, and pagan philosophers all had every motive to refute the Christian claim by producing evidence that the founder had not existed. None of them did. They argued instead that he had existed and that his followers were wrong about him.",
          "This is not proof of the Resurrection. It is, however, evidence that the existence of Jesus was not a matter of dispute even among his ancient enemies. The mythicist position is not merely a modern academic minority view; it is a position the ancient world itself never seriously entertained, including the parties most motivated to entertain it.",
          "What the believer adds to the historian's account is not a different set of facts but a different reading of the same facts. The historian gives us a man crucified under Pilate whose followers said impossible things about him. The believer says: those things were true.",
        ],
        cites: [
          "Summa Contra Gentiles I.6 (the conversion of the world as a sign)",
          "Summa Theologiae II-II.1.4 ad 1",
        ],
      },
    },
  },
  {
    id: "corruption",
    n: 21,
    title: "Your institution is morally bankrupt.",
    short: "The corrupt church",
    steel:
      "The Catholic Church spent decades concealing the systematic sexual abuse of children by its clergy. The Borgia popes ran the Vatican as a criminal enterprise. The Vatican Bank has been implicated in money laundering across multiple decades. Inquisitors burned dissidents. Bishops blessed colonial conquest. An institution with this record is not a credible vehicle of divine truth, regardless of what its doctrines claim on paper.",
    quote: "The Church has been weighed in the balance and found wanting.",
    quoteBy:
      "common formulation; cf. Boston Globe Spotlight investigation, 2002",
    pub: "If the Church were really God's, why is it so corrupt?",
    related: ["religion-violence", "morality", "bible"],
    counters: {
      pastor: {
        lede: "I will not defend the indefensible. I will tell you what I have seen.",
        body: [
          "The abuse crisis is the worst thing the Catholic Church has done in my lifetime, and possibly in centuries. I will not soften it, contextualize it, or compare it to other institutions. Children were raped by priests. Bishops covered for them. The institutional apparatus that should have protected the victims protected the perpetrators instead. Anyone who wants to be Catholic in this century must look at this directly, without flinching, and let it do its work on them.",
          "What I can tell you is what I have also seen. I have seen a Church that, slowly and incompletely, has begun to face what it did. I have seen survivors who, against every reason, returned to the sacraments and found something there that the men who hurt them had not destroyed. I have seen priests of my generation who entered seminary knowing the cost of the collar in this era and went anyway, because they believed there was something here worth saving. I have buried good men and ordained good men, and I will not pretend either set was the whole story.",
          "The question the objection asks is whether an institution this compromised can still be the vehicle of grace. The Catholic answer, hard-won and historically ancient, is yes — not because the institution deserves to be, but because grace is not contingent on the worthiness of its ministers. The God who entrusted his Church to Peter, who denied him three times, has always worked through unworthy custodians. This is not a defense of the unworthiness. It is an account of the strangeness of how grace travels.",
        ],
        cites: [
          "Spotlight (2002, Boston Globe) and subsequent investigations",
          "the McCarrick Report (2020)",
          "cf. Pope Benedict XVI, Letter to the Catholics of Ireland (2010)",
        ],
      },
      newman: {
        lede: "The holiness of the Church does not reside in the holiness of her members.",
        body: [
          "The Church is at once a divine institution and a human one, and the human side is exactly as broken as humans are. To expect otherwise is to expect what the Church has never claimed for herself. The Creed says I believe in one, holy, catholic, and apostolic Church; it does not say I believe in a Church whose members are uniformly holy. The first is a doctrinal claim about the institution's character and mission; the second would be empirically refuted on any given Tuesday.",
          "What the Church claims is that, despite the sins of her members — including her highest officials, including in some periods the majority of her bishops — the deposit of faith, the validity of the sacraments, and the indefectibility of her core teaching are preserved by the action of the Holy Spirit. This is a strong claim and a humble one. It is strong because it survives the historical record; it is humble because it does not depend on pretending the historical record is better than it is. The Borgia popes did not invalidate the Eucharist. The Inquisitors did not unmake baptism. The bishops who covered for abusers did not erase the Gospel they failed to preach.",
          "To grant the institution's corruption is therefore not, by Catholic lights, to refute the institution's claim. It is to confirm the doctrine of original sin, applied to the Church herself. The skeptic and the saint agree that the Church is full of sinners. They disagree about what follows.",
        ],
        cites: [
          "An Essay on the Development of Christian Doctrine (1845)",
          "Apologia Pro Vita Sua (1864)",
          "cf. Lumen Gentium §8 (the Church semper purificanda, always in need of purification)",
        ],
      },
      augustine: {
        lede: "The Donatists asked this question first. The Church gave its answer.",
        body: [
          "In my own day there was a movement, the Donatists, who held that the sacraments administered by sinful or compromised clergy were invalid. The bishops who had handed over the Scriptures during the persecutions, they said, had forfeited their priesthood; the Church needed to be a Church of the pure. I argued against them, at length and with the support of councils, and the Church's settled answer is this: the validity of the sacrament does not depend on the holiness of the minister, but on the action of Christ working through him.",
          "This is not a convenient excuse. It is a hard-won doctrine, paid for by a long controversy. If the worthiness of the minister determined the validity of the sacrament, no one could ever be sure his baptism was real, his marriage sacramental, his absolution effective — because no one can be sure of another's worthiness, and most of the time the minister himself cannot be sure of his own. The doctrine ex opere operato — that the sacrament works by the work worked, not by the worker — is what makes the sacramental life possible at all.",
          'The corollary is the one the objection misses: the Church has always known she was full of sinners, including in her sanctuary. The Catholic position is not "look how holy we are." It is "look how holy the grace is that works even through us." The historical record of clerical corruption is not a refutation of this teaching. It is the situation the teaching was developed to address.',
        ],
        cites: [
          "Contra Litteras Petiliani",
          "De Baptismo Contra Donatistas",
          "cf. Catechism of the Catholic Church §1128 (on ex opere operato)",
        ],
      },
      chesterton: {
        lede: "The Church has been going to the dogs for two thousand years and somehow keeps outliving the dogs.",
        body: [
          "Every generation produces its critics who announce that this time the corruption is terminal, the Church cannot recover, the credibility is finally and definitively spent. The Arian crisis of the fourth century, when the majority of bishops were heretics. The pornocracy of the tenth century, when the papacy was openly trafficked. The Avignon captivity. The Borgias. The wars of religion. The French Revolution. The Modernist crisis. The abuse crisis. Each of these was, in its moment, the final blow. The Church somehow keeps burying her undertakers.",
          "I do not say this to minimize the present scandal. I say it to put it in its actual historical context. An institution that has survived two millennia of being run by sinners, including some of the worst sinners of their respective centuries, is not on its face less credible than an institution that has been around for fifty years and has not yet had time to discredit itself. The atheist's argument requires us to believe that institutional rot is dispositive. The historical record suggests that the Catholic Church specifically has a property — call it whatever you like, divine preservation or stubborn historical accident — that makes it unusually resistant to the rot that has dispatched its peers.",
          "The man who looked at the Church under Alexander VI and concluded that the institution was finished was making a reasonable bet on the evidence available. He was also wrong. This does not prove the modern critic is wrong on the same grounds. It does suggest that the kind of argument he is making has a poor track record.",
        ],
        cites: [
          'The Everlasting Man (1925), Part II, ch. 6 ("The Five Deaths of the Faith")',
          "The Catholic Church and Conversion (1926)",
        ],
      },
    },
  },
  {
    id: "intelligence",
    n: 22,
    title: "Smart people grow out of religion.",
    short: "Faith is for the unintelligent",
    steel:
      "Studies consistently show a negative correlation between religious belief and measures of intelligence and education. The most accomplished scientists — National Academy members, Nobel laureates — are overwhelmingly secular. Religious belief tracks with lower education, lower income, and lower scientific literacy. Whatever else religion is, it is a position that intelligent people increasingly find untenable.",
    quote:
      "The higher one's intelligence or education level, the less one is likely to be religious.",
    quoteBy: "Lynn, Harvey, & Nyborg, Intelligence (2009)",
    pub: "Religion is for people who don't know any better.",
    related: ["science", "evidence", "faith-reason"],
    counters: {
      chesterton: {
        lede: "The roster of Catholic intellectuals is the longest in history.",
        body: [
          "The argument requires us to overlook, by a strange selective amnesia, almost the entire intellectual history of the West. Augustine. Aquinas. Dante. Pascal. Descartes was a believer; so was Newton, who wrote more on theology than on physics; so was Mendel, who founded genetics from a monastery. Faraday, Maxwell, Kepler, Copernicus, Lemaître — the man who proposed the Big Bang was a Catholic priest. Twentieth-century philosophy alone gives us Wittgenstein, Anscombe, MacIntyre, Plantinga, Taylor. The historian who concludes that religious belief is incompatible with intelligence has stopped reading at his own century.",
          "What the modern statistic actually measures is something narrower and less interesting: that in the contemporary West, in the last fifty years, the social class most identified with formal academic credentials has been disproportionately secular. This is a sociological fact about the modern academy, not a logical fact about religious belief. The same survey conducted in 1900, or 1500, or in any non-Western culture today, would produce a wildly different result. The atheist is mistaking a local weather pattern for a law of physics.",
          "When the survey is done in five hundred years, after whatever the next civilizational upheaval turns out to be, we will see whether the correlation held or whether, like every previous prediction of religion's terminal decline, it dissolved on contact with history.",
        ],
        cites: [
          "The Everlasting Man (1925), Part II, ch. 6",
          "Orthodoxy (1908), ch. 6",
          "cf. Rodney Stark, For the Glory of God (2003)",
        ],
      },
      lewis: {
        lede: "I was an atheist because I assumed it was the intelligent position.",
        body: [
          "When I came up to Oxford as an undergraduate, I was a confirmed atheist on what I took to be impeccable intellectual grounds. The clever people I knew were atheists. The professors I admired were atheists. Christianity was the position held by people I considered my intellectual inferiors — country vicars, pious aunts, the unread. My atheism was, in significant part, a matter of social positioning rather than argument.",
          "What converted me, very much against my will, was reading the people I had assumed were stupid. Chesterton turned out to be funnier and sharper than the modern essayists I admired. MacDonald turned out to do things in fiction that my professional contemporaries could not do. Above all, Tolkien — a Catholic philologist of formidable intellect, not the kind of man who could be safely dismissed as not having thought about it — turned out to hold his Christianity with a depth and rigor that put my unbelief to shame. The intellectual case I had assumed was on my side turned out to be considerably weaker than the case I had assumed was beneath my notice.",
          "I now suspect that the modern correlation between unbelief and academic credentials measures something other than what its proponents assume. It measures the social formation of a particular professional class, in a particular century, in a particular set of institutions. The smart people I eventually came to know — Owen Barfield, Tolkien, Anscombe, Lewis the medievalist as opposed to Lewis the schoolboy atheist — were on the other side. The roster is not as one-sided as the survey suggests.",
        ],
        cites: [
          "Surprised by Joy (1955), ch. 12–14",
          '"The Inner Ring" in The Weight of Glory (1949)',
        ],
      },
      aquinas: {
        lede: "The intellect's proper object is truth. Faith does not stand in its way.",
        body: [
          "The Catholic tradition has never opposed faith to intellect. It has, on the contrary, produced the most sustained intellectual tradition in human history — the medieval universities (Catholic foundations, every one), the scholastic method, the doctrine of the analogical predication of being, the integration of Aristotle, the development of natural law, the philosophy of person and act. The man who claims that faith is hostile to intellect has not read the Summa, which is structured as ten thousand objections taken seriously and answered.",
          'What the modern survey calls "intelligence" is typically a narrow band of cognitive capacity — verbal facility, abstract reasoning, performance on standardized tests. This is a real human good, and the Church has cultivated it from her foundation. But it is not the whole of intellect, and its possession is not a guarantee of wisdom. The Pharisees were highly educated. So were the architects of modern totalitarianism. Intelligence in the narrow sense, separated from the orientation of the will toward the good, can produce monstrous results. The integration of intellect with virtue is what the tradition calls sapientia — wisdom — and it is what the saints possess and the merely clever often lack.',
          "The genuine question is not whether intelligent people can be religious (they can, and have been, in immense numbers) but what intelligence is for. If it is for the pursuit of truth, then it cannot be hostile in principle to a religion that claims to be true. The compatibility has to be examined case by case, by the intellect itself.",
        ],
        cites: [
          "Summa Theologiae I.1.1–10 (sacred doctrine as a science)",
          "ST I-II.66 (on the comparison of the virtues)",
          "Fides et Ratio (John Paul II, 1998)",
        ],
      },
      logician: {
        lede: "The argument is statistically illiterate.",
        body: [
          "The cited correlation is real but small, contested in its interpretation, and proves nothing of what the objection wants it to prove. A correlation between belief and education tells you about the social distribution of belief, not about the truth of belief. There was a time when the correlation ran the other way — when literacy and theological belief were near-universal among the educated and unbelief was the position of the marginally schooled. No one took this as evidence for Christianity then. No one should take the inverse correlation as evidence against it now.",
          "The deeper error is the appeal to authority dressed as an appeal to demographics. Smart people believe X is a fallacy whether X is theism or atheism. Smart people have believed every major position in the history of ideas, including positions that turned out to be catastrophically wrong. Aristotle believed slavery was natural. Newton believed in alchemy. Heidegger joined the Nazi Party. Intelligence does not entail correctness, and correlations between intelligence and any given position do not function as arguments. They function as social signals.",
          "If the objection were taken seriously as an argument, it would commit its proponent to whatever the contemporary intellectual class happens to believe at any given moment. This is not a posture compatible with intellectual seriousness. It is, in fact, the opposite of one.",
        ],
        cites: [
          "Antony Flew, Thinking About Thinking (1975)",
          "cf. the long literature on the genetic and ad populum fallacies",
        ],
      },
    },
  },
  {
    id: "submission",
    n: 23,
    title: "Religion suppresses critical thinking.",
    short: "The submission objection",
    steel:
      "Religion teaches you to defer to authority — Scripture, tradition, the magisterium — rather than to think for yourself. It rewards belief and punishes doubt. The catechism is a list of conclusions to be memorized, not arguments to be tested. A worldview that demands submission of the intellect is incompatible with the intellectual maturity that defines an adult.",
    quote:
      "Dare to know! Have courage to use your own reason — that is the motto of enlightenment.",
    quoteBy: "Immanuel Kant, What is Enlightenment?",
    pub: "Religion teaches you to obey instead of to think.",
    related: ["faith-reason", "intelligence", "bible"],
    counters: {
      aquinas: {
        lede: "The Summa is a book of objections.",
        body: [
          "The structure of the Summa Theologiae — the central work of Catholic theology, studied for seven centuries — is not a list of conclusions handed down from above. It is a series of quaestiones, each of which begins with the objections to the position the author will eventually defend, stated in their strongest form. It seems that God does not exist, because… The Catholic tradition's flagship intellectual document opens, repeatedly and on every important question, with the case against itself.",
          "This is not an accident of style. It is a methodological commitment. The truth, on the scholastic understanding, is reached through disputatio — through the testing of positions against their strongest objections, the canvassing of authorities, the exposure of one's own conclusions to the most rigorous available challenge. A medieval theology student was required to argue the case against Catholic doctrine before he was permitted to argue for it. The intellectual culture this produced was, by the standards of any age, unusually adversarial and unusually rigorous.",
          "The objection mistakes catechetical instruction — which is appropriate for children learning the basics of the faith — for the entirety of the Catholic intellectual tradition. The catechism is the floor, not the ceiling. The ceiling is six centuries of scholasticism, the modern Catholic philosophical revival, and the ongoing magisterial dialogue with science, philosophy, and culture. Anyone who has spent ten minutes in the actual literature knows this.",
        ],
        cites: [
          "Summa Theologiae, structure passim",
          "Quaestiones Disputatae",
          "cf. Fides et Ratio (1998)",
        ],
      },
      newman: {
        lede: "I have written a defense of conscience that the Church has accepted.",
        body: [
          "The Catholic tradition holds that conscience is the proximate norm of moral action — that a person is bound, before any external authority, to follow his own well-formed conscience, even against the directives of his superiors. I shall drink to the Pope, if you please — still, to conscience first, and to the Pope afterwards. I wrote this, and I wrote it as a cardinal, and the Church canonized me. The doctrine is not contested.",
          'What the objection mistakes for "submission of the intellect" is in fact a mature relationship between individual conscience and inherited wisdom. The Catholic does not abandon his judgment when he assents to doctrine; he integrates his judgment with two thousand years of accumulated reflection by minds at least as serious as his own. To dismiss this inheritance as authoritarianism is to mistake humility for cowardice. The man who believes nothing he did not derive from scratch is not free; he is impoverished, cut off from the entire intellectual capital of his species.',
          "Genuine intellectual maturity consists in knowing when to defer and when to dissent — and in cultivating the discernment that makes the distinction. The Catholic tradition has been working on this discernment longer than any rival has existed. It is not perfect at it. But it is not the cartoon of robotic submission the objection requires.",
        ],
        cites: [
          "Letter to the Duke of Norfolk (1875), §5 (on conscience)",
          "Grammar of Assent (1870), ch. 5",
          "cf. Catechism of the Catholic Church §§1776–1782 (on conscience)",
        ],
      },
      catechism: {
        lede: "Faith and reason are the two wings on which the human spirit rises.",
        body: [
          "The Catholic Church, far from condemning the use of reason, holds that faith and reason are mutually reinforcing rather than opposed. Though faith is above reason, there can never be any real disagreement between faith and reason, since it is the same God who reveals the mysteries and infuses faith, and who has endowed the human mind with the light of reason. The same God is the source of both, and the genuine conclusions of either, properly arrived at, cannot contradict the genuine conclusions of the other.",
          "The Church therefore not only permits but requires the rigorous exercise of reason in the examination of the faith. The motives of credibility — the rational grounds for taking the Christian claim seriously — are the proper object of philosophical investigation. The compatibility of revealed doctrine with what is known by science, history, and philosophy is to be defended, where it is genuine, and where apparent contradictions arise, both sides are to be examined honestly. Methodical research in all branches of knowledge, provided it is carried out in a truly scientific manner and does not override moral laws, can never conflict with the faith, because the things of the world and the things of faith derive from the same God.",
          "The image of religion as the suppressor of inquiry is a polemical fiction, contradicted by the historical record of Catholic universities, Catholic scientists, Catholic philosophers, and the Church's own magisterial teaching on the autonomy and dignity of the natural sciences. The objection survives only by ignoring what the Church actually teaches in favor of a caricature it would be easier to refute.",
        ],
        cites: [
          "Catechism of the Catholic Church §§154–159",
          "§159 quoting Gaudium et Spes §36",
          "Fides et Ratio (John Paul II, 1998), opening line",
          "Vatican I, Dei Filius, ch. 4",
        ],
      },
      lewis: {
        lede: "The free man and the obedient man are the same man.",
        body: [
          "The objection assumes a particular picture of the autonomous adult: the one who derives every conviction from his own resources, defers to no authority, and treats inherited wisdom as suspicion-by-default. This is a recent picture, and it has not aged well. The man who genuinely tries to live this way ends up either reinventing the wheel — laboriously deriving conclusions his ancestors had refined over millennia — or, more commonly, simply absorbing the prejudices of his immediate social class while flattering himself that he reasoned them out.",
          "There is a real form of intellectual submission that is incompatible with adulthood: the surrender of judgment to authority that has not earned it. The Church has produced this from time to time, as has every institution of any age. But there is also a form of intellectual reception — sitting at the feet of the saints and the doctors, reading them with care, allowing oneself to be taught — which is not infantile but the precondition of any real thinking. I read it; I argued with it; eventually it argued me down. This is how minds grow.",
          "The truly infantile position is the one that says, I will accept nothing I have not personally derived from first principles. No adult lives this way about anything. The Catholic tradition is unusual not in expecting reception of inherited wisdom but in being honest about the expectation. The atheist receives his inheritance too. He just calls it common sense.",
        ],
        cites: [
          "The Abolition of Man (1943)",
          "The Discarded Image (1964)",
          "Surprised by Joy (1955), ch. 14",
        ],
      },
    },
  },
];

export function findArgument(id: string): Argument | undefined {
  return ARGUMENTS.find((a) => a.id === id);
}

// Alex's curated picks per argument (archetype IDs). Same across locales.
export const ALEX_PICKS: Record<string, string[]> = {
  evil: ["aquinas"],
  evidence: ["logician", "pascal"],
  science: ["logician", "lewis"],
  morality: ["logician"],
  "religion-violence": ["logician"],
  miracles: ["logician", "pascal"],
  hiddenness: ["pascal"],
  hell: ["aquinas", "lewis"],
  birth: ["lewis", "justin"],
  bible: ["augustine", "newman"],
  scale: ["chesterton"],
  "natural-evil": ["lewis", "catechism"],
  "many-gods": ["newman"],
  neuroscience: ["mystic"],
  prayer: ["lewis", "aquinas"],
  pleasure: ["catechism"],
  projection: ["lewis", "chesterton"],
  "faith-reason": ["aquinas", "lewis"],
  mythicism: ["historian"],
  corruption: ["pastor", "chesterton"],
  intelligence: ["logician"],
  submission: ["lewis"],
};

// Locale-aware accessors. DE comes from auto-generated apologetik.de.ts;
// EN is the source of truth. Latin falls back to EN since DeepL doesn't
// support it — fill in apologetik.la.ts manually if/when desired.
export async function getArchetypes(
  lang: string,
): Promise<Record<string, Archetype>> {
  if (lang === "de") {
    const m = await import("./apologetik.de");
    return m.ARCHETYPES_DE;
  }
  return ARCHETYPES;
}
export async function getArguments(lang: string): Promise<Argument[]> {
  if (lang === "de") {
    const m = await import("./apologetik.de");
    return m.ARGUMENTS_DE;
  }
  return ARGUMENTS;
}
export async function findArgumentLang(
  id: string,
  lang: string,
): Promise<Argument | undefined> {
  const args = await getArguments(lang);
  return args.find((a) => a.id === id);
}

// ============================================================
// POSITIVE CASE — Why Christianity is true
// ============================================================

export type PosVoice = {
  id: string;
  name: string;
  sub: string;
  color: string;
  colorHex: string;
  glyph: string;
  font: string;
  era: string;
};

export type PosScripture = { text: string; ref: string };

export type PosCounter = {
  lede: string;
  body: string[];
  cites: string[];
};

export type PosLayer = { id: string; title: string; sub: string };

export type PosArgument = {
  id: string;
  layer: "natural" | "theism" | "christianity";
  n: number;
  title: string;
  claim: string;
  thesis: string;
  strength: 1 | 2 | 3 | 4 | 5;
  note?: string;
  scripture: PosScripture;
  voices: Record<string, PosCounter>;
  related: string[];
};

export const POS_VOICES: Record<string, PosVoice> = {
  habermas: {
    id: "habermas",
    name: "Gary Habermas",
    sub: "the minimal-facts case",
    color: "var(--nord11)",
    colorHex: "#BF616A",
    glyph: "✚",
    font: '"Inter", Helvetica, Arial, sans-serif',
    era: "b. 1950",
  },
  polkinghorne: {
    id: "polkinghorne",
    name: "John Polkinghorne",
    sub: "physicist-priest",
    color: "var(--nord7)",
    colorHex: "#8FBCBB",
    glyph: "△",
    font: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    era: "1930–2021",
  },
  newman: {
    id: "newman",
    name: "John Henry Newman",
    sub: "development of doctrine",
    color: "var(--nord15)",
    colorHex: "#B48EAD",
    glyph: "❦",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "1801–1890",
  },
  perennial: {
    id: "perennial",
    name: "The Perennialist",
    sub: "Guénon, Evola, Schuon",
    color: "var(--nord3)",
    colorHex: "#4C566A",
    glyph: "✶",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "—",
  },
  hart: {
    id: "hart",
    name: "David Bentley Hart",
    sub: "classical theist",
    color: "var(--nord10)",
    colorHex: "#5E81AC",
    glyph: "Θ",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "b. 1965",
  },
  lewis: {
    id: "lewis",
    name: "C.S. Lewis",
    sub: "literary apologist",
    color: "var(--nord8)",
    colorHex: "#88C0D0",
    glyph: "❧",
    font: '"Spectral", "Lora", Georgia, serif',
    era: "1898–1963",
  },
  wright: {
    id: "wright",
    name: "N.T. Wright",
    sub: "Resurrection historian",
    color: "var(--nord12)",
    colorHex: "#D08770",
    glyph: "✠",
    font: '"Inter", Helvetica, Arial, sans-serif',
    era: "b. 1948",
  },
  hahn: {
    id: "hahn",
    name: "Scott Hahn",
    sub: "covenant scripture",
    color: "var(--nord13)",
    colorHex: "#EBCB8B",
    glyph: "✡",
    font: '"Spectral", "Lora", Georgia, serif',
    era: "b. 1957",
  },
  plantinga: {
    id: "plantinga",
    name: "Alvin Plantinga",
    sub: "warrant & properly basic belief",
    color: "var(--nord14)",
    colorHex: "#A3BE8C",
    glyph: "∴",
    font: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    era: "b. 1932",
  },
  eliade: {
    id: "eliade",
    name: "Mircea Eliade",
    sub: "the sacred & the profane",
    color: "var(--nord9)",
    colorHex: "#81A1C1",
    glyph: "◯",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "1907–1986",
  },
  feser: {
    id: "feser",
    name: "Edward Feser",
    sub: "Thomistic philosopher",
    color: "var(--nord1)",
    colorHex: "#3B4252",
    glyph: "∎",
    font: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    era: "b. 1968",
  },
  chesterton: {
    id: "chesterton",
    name: "G.K. Chesterton",
    sub: "paradox & common sense",
    color: "var(--nord12)",
    colorHex: "#D08770",
    glyph: "◊",
    font: '"Spectral", "Lora", Georgia, serif',
    era: "1874–1936",
  },
  guenon: {
    id: "guenon",
    name: "René Guénon",
    sub: "metaphysics of tradition",
    color: "var(--nord2)",
    colorHex: "#434C5E",
    glyph: "☩",
    font: '"Cormorant Garamond", Georgia, serif',
    era: "1886–1951",
  },
};

export const POS_LAYERS: PosLayer[] = [
  {
    id: "natural",
    title: "The supernatural is real",
    sub: "Layer 1 · the world is more than matter",
  },
  {
    id: "theism",
    title: "There is one God",
    sub: "Layer 2 · personal, necessary, good",
  },
  {
    id: "christianity",
    title: "Christianity is that revelation",
    sub: "Layer 3 · the particular claim",
  },
];

export const POS_LAYER_COLORS: Record<string, string> = {
  natural: "#81A1C1",
  theism: "#A3BE8C",
  christianity: "#BF616A",
};

export const POS_ARGUMENTS: PosArgument[] = [
  {
    id: "perennial-mystics",
    layer: "natural",
    n: 1,
    title: "Mystics and myths converge across deep time",
    claim:
      "Civilizations isolated from one another by oceans and by tens of thousands of years independently arrive at the same religious structures: a sacred Center, a primordial fall, a cosmic flood, a degenerating sequence of world-ages, and mystical reports of one Reality beneath appearances. Independent invention of an identical illusion is a worse hypothesis than that they are touching something real.",
    thesis:
      "Naturalism predicts that religion should be a local cognitive artifact — varying with environment, drifting unpredictably across millennia, with no convergent structure. The ethnographic record shows the opposite: stable, recurrent patterns across cultures that had no possibility of contact for tens of thousands of years. The cleanest explanation is that humans across all cultures have been responding to the same transcendent Reality, with varying clarity. The modern Western refusal of that Reality is the anomaly requiring explanation — not the universal human acknowledgment of it.",
    strength: 3,
    note: "Cumulative rather than standalone — the inference from convergence to transcendence has degrees of freedom. Stronger when read alongside religious experience, consciousness, and moral law.",
    scripture: {
      text: "Where there is no vision, the people perish.",
      ref: "Proverbs 29:18",
    },
    voices: {
      chesterton: {
        lede: "The universal religious instinct is the data, not the pathology.",
        body: [
          "When a thousand cultures, separated from one another by oceans and by ages, arrive at sacred mountains and sacred trees, at flood stories and fall stories, at gods who descend and heroes who ascend, the modernist response is to call this the residue of primitive cognition. But primitive cognition does not produce convergent results. It produces noise. The convergence is the signal.",
          "Australian Aboriginal traditions developed in cognitive isolation from Eurasian religion for forty thousand years and more. Pre-Columbian American civilizations had no contact with the Old World for at least fifteen thousand. The Polynesian expansion, the Bantu migrations, the Inuit north — each unfolded across spans of time that dwarf the entire history of recorded religion. And yet across all of them we find the same architecture: a sky-father and an earth-mother, a sacred Center where heaven meets earth, a primordial unity from which the world was broken, a coming reckoning, a moral order written into the structure of things.",
          "Naturalism asks us to believe that the same dream was dreamt independently by every isolated branch of humanity for tens of thousands of years. This is not parsimony. It is desperation. The simpler explanation is that they were all looking at the same thing, with different cultural lenses and different degrees of clarity, and reporting what they saw.",
        ],
        cites: ["The Everlasting Man (1925)", "Orthodoxy (1908)"],
      },
      eliade: {
        lede: "The convergent structures of sacred space and sacred time are too specific for coincidence.",
        body: [
          "Across cultures that never met, the same architecture of the sacred recurs with startling precision. A Center where the world began and where the worlds connect. An axis mundi — a cosmic mountain, tree, or pillar — joining heaven, earth, and underworld. A primordial time, illo tempore, which ritual exists to recapitulate. A degeneration from origins requiring periodic renewal.",
          "The flood is the most striking example. Mesopotamian (Gilgamesh, Atrahasis), Hebrew (Genesis), Greek (Deucalion), Hindu (Manu), Chinese (Gun-Yu), Aztec, Maya, Inca, Hopi, Aboriginal Australian, and Polynesian traditions all preserve a flood narrative with overlapping structure: divine judgment, a righteous survivor, the saving of seed, the restoration of the world. The geographic distribution spans every inhabited continent. No diffusion model accommodates it.",
          "The degenerating ages are nearly as widespread. Hesiod's Five Ages descend from gold to iron. The Hindu yuga cycle moves from Satya to Kali, the present age. Daniel's statue moves from gold to iron-and-clay. Zoroastrian and Norse traditions preserve similar declensions. These are not random mythopoetic patterns. They are structurally identical responses to a shared intuition: that we live downstream of a better beginning.",
          "These are not parallel inventions of comfort. They are parallel responses to a structure already there. The phenomenology is the data. Modern man is the first who has tried to live in profane time and profane space, and the result is a recognizable dis-ease: anomie, the cult of novelty, the desperate search for festivals to replace the feast days that used to do real work.",
        ],
        cites: [
          "The Sacred and the Profane (1957)",
          "The Myth of the Eternal Return (1949)",
          "A History of Religious Ideas (1976–85)",
        ],
      },
      guenon: {
        lede: "Beneath the exoteric forms, one metaphysical doctrine — and the seeds of the Word.",
        body: [
          "There is, beneath the symbolic languages of every traditional civilization, a perennial wisdom: the same metaphysical doctrine of the One, the Center, the axis mundi, the hierarchy of being descending from the unconditioned to the manifest. The Vedic rishis, the Sufi masters, the Christian contemplatives, the Daoist sages, Plotinus, the kabbalists, the Plains-Indian visionaries — separated by oceans and centuries, they describe overlapping experiences and overlapping doctrines.",
          "The modern world is anomalous in having lost contact with this transcendent dimension. To call its absence the human default is provincial. The default is precisely what the rishis and the Sufi shaykhs and the Desert Fathers reported. Modernity is not the sober view at last; it is the first civilization to insist on horizontal-only sight.",
          "A Christian need not endorse every metaphysical claim of the perennialists to recognize what their data shows. Justin Martyr, in the second century, called these scattered intimations the logos spermatikos — the seeds of the Word, sown by the same Logos who became flesh in Christ. That every culture has reached for them is evidence that they are real. That Christ is their fulfillment is the further claim that completes the argument.",
        ],
        cites: [
          "Guénon, The Reign of Quantity (1945)",
          "Schuon, The Transcendent Unity of Religions (1948)",
          "Huston Smith, Forgotten Truth (1976)",
          "Justin Martyr, Second Apology, ch. 13",
        ],
      },
    },
    related: [
      "religious-experience",
      "consciousness",
      "beauty",
      "moral-law",
      "intelligibility",
    ],
  },
  {
    id: "religious-experience",
    layer: "natural",
    n: 2,
    title: "Religious experience is widespread and life-changing",
    claim:
      "Hundreds of millions of ordinary people report direct, transformative encounter with God — across every culture, education level, and skeptical disposition.",
    thesis:
      "These are not all delusions. The default epistemic stance toward sincere first-person testimony, replicated at scale, is provisional credence. We use the same standard for love, beauty, and moral indignation. To exempt religious experience alone is special pleading.",
    strength: 3,
    scripture: {
      text: "Taste and see that the LORD is good.",
      ref: "Psalm 34:8",
    },
    voices: {
      plantinga: {
        lede: "Belief in God is properly basic.",
        body: [
          "Belief in God, when produced by the sensus divinitatis functioning correctly in an appropriate environment, has warrant in the same way perceptual or memory beliefs have warrant. It does not need to be inferred from prior, more-certain premises.",
          "The demand that the believer first prove God's existence from neutral premises smuggles in evidentialism — a position that itself fails its own test.",
          "Hundreds of millions of testimonies are not noise. They are the ordinary functioning of the cognitive faculty God designed.",
        ],
        cites: ["Warranted Christian Belief (2000)"],
      },
      hart: {
        lede: "The encounter is with Being, not with a being.",
        body: [
          "What the great traditions describe is not a numinous gas pocket inside the universe. It is the apprehension of the ground of being — the One in whom we live and move.",
          "This is why the experience is so resistant to neuroscience: brain states correlate with it, as brain states correlate with seeing a tree, but the correlation does not exhaust the seen.",
          "Atheist neurotheology says: 'we found the God circuit.' The traditions reply: 'yes — that is the organ; the music is elsewhere.'",
        ],
        cites: ["The Experience of God (2013)"],
      },
      lewis: {
        lede: "Joy is the serious business of heaven.",
        body: [
          "Most people, if they had really learned to look into their own hearts, would know that they do want, and want acutely, something that cannot be had in this world.",
          "Religious experience is the moment that want is briefly satisfied, or addressed, or even just turned and faced.",
          "The transformation it produces is the test. By their fruits ye shall know them.",
        ],
        cites: ["Surprised by Joy (1955)"],
      },
    },
    related: ["perennial-mystics", "consciousness", "transformation"],
  },
  {
    id: "consciousness",
    layer: "natural",
    n: 3,
    title: "Consciousness resists naturalist reduction",
    claim:
      "The hard problem of consciousness — why there is something it is like to be you — has no traction in a purely physical ontology, despite a century of trying.",
    thesis:
      "Eliminative materialism asks you to deny that you are conscious. Property dualism quietly admits the supernatural under another name. The cleanest hypothesis is that mind is fundamental, not derivative — and that we are made in the image of a Mind.",
    strength: 4,
    scripture: {
      text: "And the Spirit of God moved upon the face of the waters.",
      ref: "Genesis 1:2",
    },
    voices: {
      hart: {
        lede: "Naturalism cannot explain the simplest fact about you.",
        body: [
          "There is no plausible mechanism by which arrangements of unconscious particles produce a perspective. Adding more particles, or arranging them more cleverly, does not bridge the gap. The gap is categorical.",
          "Either consciousness is an illusion (in which case the illusion of consciousness is itself conscious — a contradiction), or matter has been mis-described as inert (panpsychism, which is theism's poor relation), or mind is prior.",
          "The classical tradition has always said the third. We are now circling back to it from the other direction.",
        ],
        cites: ["The Experience of God (2013), ch. 4"],
      },
      polkinghorne: {
        lede: "Information is more fundamental than matter.",
        body: [
          "Quantum measurement, the structure of physical law, and the very intelligibility of nature push physics toward a picture in which information — pattern, meaning, formal cause — is irreducible.",
          "A universe whose deepest layer is information is a universe whose deepest layer is mind-like. This is not a covert theology. It is where the equations are pointing.",
          "When the question 'why these laws?' is finally pressed, the answer that does the most work is: a Mind chose them.",
        ],
        cites: ["Belief in God in an Age of Science (1998)"],
      },
      plantinga: {
        lede: "Naturalism is self-defeating.",
        body: [
          "If our cognitive faculties evolved purely for survival, we have no reason to trust them on questions that are not survival-relevant — including the question of whether naturalism is true.",
          "Theism gives us a reason to trust reason: God made minds to know. Naturalism saws off the branch it sits on.",
          "The conjunction of naturalism and evolution is therefore not just unproven but rationally unstable.",
        ],
        cites: ["Where the Conflict Really Lies (2011), ch. 10"],
      },
    },
    related: ["fine-tuning", "moral-law", "perennial-mystics"],
  },
  {
    id: "contingency",
    layer: "natural",
    n: 4,
    title: "There is something rather than nothing",
    claim:
      "Every fact about the physical world is contingent — could have been otherwise. Contingent things require explanation. The chain of explanation cannot regress forever, and it cannot be self-grounding. Something must exist whose nature is to exist.",
    thesis:
      "The question 'why is there something rather than nothing?' is not childish; it is the most adult question. It cannot be dismissed by appeal to physics, because every physical answer presupposes the very thing being asked about — a contingent reality whose existence is not self-explaining. The only sufficient answer is a being whose existence is not contingent: necessary, self-explaining, pure act, ipsum esse subsistens. This is not 'God of the gaps.' It is what every serious metaphysical tradition — Vedantic, Neoplatonic, Thomist, Avicennan — has converged on by independent routes.",
    strength: 5,
    scripture: { text: "I AM THAT I AM.", ref: "Exodus 3:14" },
    voices: {
      hart: {
        lede: "God is not a thing in the universe. God is the answer to why there is a universe.",
        body: [
          "Every philosophical tradition that has thought hard about being — Vedanta, Neoplatonism, Aquinas, Ibn Sina, Maimonides — has arrived at the same distinction: contingent being depends, necessary being does not. The latter is what the word 'God' has always named in serious theology. Not a powerful entity within the cosmos, but the very ground of there being a cosmos at all.",
          "Modern atheism, by treating God as one more entity among entities — a celestial item that might or might not exist alongside galaxies and quarks — has been arguing against an idol it built itself. The classical God is not a candidate for the inventory. Asking whether God exists in that sense is like asking whether existence exists.",
          "When Hawking writes that the universe can 'create itself from nothing' because of the laws of physics, he has changed the subject. Laws of physics are not nothing. A quantum vacuum is not nothing. Nothing is the absence of everything — including laws, fields, potentialities, and possibilities. The classical question is why there is any of that at all.",
          "The only answer not in the same predicament as the question is: a being whose essence is to exist. Not a thing that happens to exist, but Existence itself, in which all contingent things participate. This is what Aquinas meant by ipsum esse subsistens — subsistent being itself.",
        ],
        cites: [
          "The Experience of God (2013)",
          'Hart, "God, Gods, and Fairies" (2013)',
        ],
      },
      feser: {
        lede: "The argument is not from temporal beginnings but from present dependence.",
        body: [
          "The popular caricature of the cosmological argument — 'everything has a cause, so the universe has a cause, so God' — is not the argument serious theists have ever made. It misses the crucial distinction between two kinds of causal series.",
          "A series ordered per accidens (per accident) is one in which earlier members are no longer required for later members to exist. Your grandfather caused your father, who caused you; your grandfather can die and you continue. Such a series can in principle extend backward indefinitely.",
          "A series ordered per se (per essence) is one in which every member depends, here and now, on the simultaneous activity of what is prior to it. The cup rests on the table, which rests on the floor, which rests on the joists, which rest on the foundation. Remove any link and the whole collapses instantly. Such a series cannot regress infinitely — there must be a first member that is not itself supported by anything else, that holds the whole chain in being by its own act.",
          "The argument from contingency is of the second kind. Right now, this moment, every contingent thing — including you, this sentence, the screen you read it on, the laws of physics that govern the screen — is being held in being by something more fundamental. Trace that dependency relation, and it cannot terminate in another contingent being, however vast or ancient. It must terminate in something whose existence is not derived from anything else: pure actuality, with no unrealized potential, depending on nothing.",
          "This is not a god of the gaps that retreats as physics advances. It is what physics presupposes in order to advance at all. The more we learn about the contingent structure of the cosmos, the sharper the question becomes.",
        ],
        cites: [
          "Feser, Five Proofs of the Existence of God (2017)",
          "Feser, Aquinas (2009)",
          "Pruss, The Principle of Sufficient Reason (2006)",
        ],
      },
      newman: {
        lede: "The conscience of the question testifies to the answer.",
        body: [
          "That a child can ask 'why is there anything?' and expect a real answer presupposes that reality is the kind of thing that has reasons — that the Principle of Sufficient Reason is not a parochial human bias but a feature of being itself.",
          "This presupposition cannot be derived from inside the universe. The cosmos does not display its own ground; physics describes the patterns within being but never accounts for being. Yet the question is not silenced by saying 'no ground.' Saying 'there is no reason' is itself an answer to the question — and a worse one than the alternative, since it abandons the very intelligibility that made the question askable.",
          "Faith, in the proper sense, is not a leap against reason. It is the response of a mind that takes its own questions seriously, that follows the convergence of probabilities — contingency, fine-tuning, intelligibility, moral law, consciousness, religious experience — until assent is no longer optional.",
          "No single line of evidence forces the conclusion. Together, they do. This is how all serious knowledge works: not by deductive proof from indubitable axioms, but by the cumulative weight of indications until the mind, rightly disposed, recognizes what is the case.",
        ],
        cites: [
          "A Grammar of Assent (1870)",
          "The Idea of a University (1852)",
        ],
      },
    },
    related: ["fine-tuning", "consciousness", "moral-law", "intelligibility"],
  },
  {
    id: "fine-tuning",
    layer: "theism",
    n: 5,
    title: "The constants of physics are exquisitely tuned",
    claim:
      "Roughly 30 dimensionless constants must lie within absurdly narrow ranges for any complex chemistry, any stable matter, any observers at all.",
    thesis:
      "Three explanations remain viable: brute coincidence (a probability vanishingly small that we are forbidden from being puzzled by), an unobservable multiverse postulating ~10^500 universes to explain one, or design. Design is by far the cleanest.",
    strength: 5,
    scripture: {
      text: "The heavens declare the glory of God; and the firmament showeth his handywork.",
      ref: "Psalm 19:1",
    },
    voices: {
      polkinghorne: {
        lede: "The numbers are too good to be coincidence.",
        body: [
          "The cosmological constant agrees with what life requires to one part in 10^120. The ratio of the strong to the electromagnetic force, the proton-to-electron mass, the early-universe entropy: each must be threaded simultaneously through a needle.",
          "Theism predicts this. Naturalism does not. The multiverse is naturalism's attempt to make naturalism predict it, by postulating enough trials to make the long-shot likely. The cost is metaphysical: an infinity of unobservable worlds.",
          "Between two explanations equally compatible with the data, the simpler is preferred. One God or 10^500 universes — the choice is not difficult.",
        ],
        cites: ["The Faith of a Physicist (1994)"],
      },
      plantinga: {
        lede: "The fine-tuning argument is Bayesian, and decisive.",
        body: [
          "P(observed tuning | theism) is high. P(observed tuning | naturalism) is, by the physicists' own admission, vanishingly low. By Bayes' theorem, the posterior probability of theism, given the evidence, is correspondingly raised.",
          "Multiverse rebuttals require: (a) the multiverse exists, (b) it has the right measure to make our universe likely, (c) we can run inferences in our own universe despite Boltzmann-brain problems. Each is contestable.",
          "Theism solves all three at once.",
        ],
        cites: ["Where the Conflict Really Lies (2011)"],
      },
      hart: {
        lede: "It is not surprising that being looks designed. It is.",
        body: [
          "Classical theism was never a rival hypothesis to physics. It was the explanation of why there is physics — why reality is intelligible, ordered, mathematical, and apt for minds to grasp.",
          "The fine-tuning data confirms what was always claimed: that being is communicative, that the cosmos is the kind of thing whose existence is meant.",
          "We are not anomalies. We are the eyes the universe was tuned to grow.",
        ],
        cites: ["The Experience of God (2013)"],
      },
    },
    related: ["contingency", "consciousness", "beauty"],
  },
  {
    id: "moral-law",
    layer: "theism",
    n: 6,
    title: "Real moral obligations require a moral lawgiver",
    claim:
      "We do not invent the wrongness of torturing children for fun. We discover it. Moral facts that bind every rational agent require a ground that is itself rational and binding.",
    thesis:
      "Naturalist meta-ethics either denies the reality of moral facts (and then cannot account for indignation) or smuggles in a non-natural source (and is theism by another name). Christianity has always said: the moral law is the character of God impressed on the conscience.",
    strength: 4,
    scripture: {
      text: "For when the Gentiles, which have not the law, do by nature the things contained in the law, these, having not the law, are a law unto themselves.",
      ref: "Romans 2:14",
    },
    voices: {
      lewis: {
        lede: "The Tao is not invented. It is recognized.",
        body: [
          "Every culture, including those isolated from one another, condemns cowardice, treachery, and cruelty to the weak. They differ on whom to count as kin; they agree on the form of the law.",
          "When you say 'that's not fair,' you appeal to a standard you did not invent and that binds you whether you like it or not. That standard is the fingerprint of the Lawgiver.",
          "If there is no real Right, your indignation is a chemical event. If there is, you have already conceded more than naturalism can pay for.",
        ],
        cites: ["The Abolition of Man (1943)", "Mere Christianity, Bk. I"],
      },
      hart: {
        lede: "The good is not optional. It is the structure of being.",
        body: [
          "Classical metaphysics identified being, truth, and goodness as convertible — different aspects of the same fundamental reality. To know what something is is to know what it is for, and what it is for is its good.",
          "Modern attempts to derive an 'ought' from a value-neutral 'is' fail because the 'is' was already gutted. Restore the classical 'is' and the 'ought' returns with it.",
          "God is not a moral lawgiver in the sense of issuing arbitrary commands. God is the Good itself, in whom all our talk of goodness participates.",
        ],
        cites: ["The Beauty of the Infinite (2003)"],
      },
      plantinga: {
        lede: "Moral knowledge is properly basic.",
        body: [
          "We know that gratuitous cruelty is wrong with more certainty than we know any of the premises of any meta-ethical theory. Any theory that ends by denying this is reduced ad absurdum.",
          "Theism predicts moral knowledge: God has made us such that we apprehend his law. Naturalism predicts something between moral nihilism and adaptive illusion.",
          "When the data and the prediction disagree, the theory loses.",
        ],
        cites: ["Warrant and Proper Function (1993)"],
      },
    },
    related: ["consciousness", "beauty", "transformation"],
  },
  {
    id: "beauty",
    layer: "theism",
    n: 7,
    title: "Beauty is meaningful, not decorative",
    claim:
      "The same universe that produced equations also produced Bach, Chartres, the Iguazu falls, and a face you cannot stop looking at. Beauty is not a survival hack. It is a hint.",
    thesis:
      "If the cosmos were brute matter, we would expect indifference to its arrangements. Instead we encounter a hierarchy of value where a sunset is more than warm photons and a cathedral is more than stacked stone. Beauty rewards attention with meaning. That fact is data.",
    strength: 3,
    scripture: {
      text: "He hath made every thing beautiful in his time.",
      ref: "Ecclesiastes 3:11",
    },
    voices: {
      hart: {
        lede: "Beauty is the form being takes when it shows itself.",
        body: [
          "The transcendentals — being, truth, goodness, beauty — are how reality discloses itself to a mind capable of receiving it. To deny beauty's objectivity is to deny that reality has a face.",
          "A naturalist account of beauty as 'pattern recognition + reward' captures the response without touching the object. The object — the actual glory of a fugue or a galaxy — is exactly what is missed.",
          "We cannot worship matter. We cannot help worshipping beauty. The asymmetry is a clue.",
        ],
        cites: ["The Beauty of the Infinite (2003)"],
      },
      lewis: {
        lede: "We do not want the beauty. We want the source.",
        body: [
          "The books or the music in which we thought the beauty was located will betray us if we trust to them; it was not in them, it only came through them, and what came through them was longing.",
          "The longing is for our own far-off country, which we have never visited. Beauty is the rumor of it.",
          "If we find ourselves with a desire that nothing in this world can satisfy, the most probable explanation is that we were made for another.",
        ],
        cites: ["The Weight of Glory (1941)"],
      },
      eliade: {
        lede: "Beauty is the sacred, breaking through.",
        body: [
          "What archaic societies recognized as hierophany — the sacred showing itself in a particular tree, stone, or place — modern people recognize as the experience of beauty that stops them in the street.",
          "It is the same phenomenon. Only the vocabulary has been impoverished.",
          "The pull toward beauty is the residual reflex of the soul that knows where it is from.",
        ],
        cites: ["The Sacred and the Profane (1957)"],
      },
    },
    related: ["religious-experience", "moral-law", "transformation"],
  },
  {
    id: "intelligibility",
    layer: "theism",
    n: 8,
    title: "The universe is intelligible to mind",
    claim:
      "Mathematics describes physical reality with uncanny precision. Pure thought, done in advance, predicts what the experiment will find.",
    thesis:
      "Wigner called this 'unreasonable.' On naturalism it is. On theism it is exactly what you'd expect: a Mind made the world, and made minds to know it. The match between intellect and cosmos is a match because they share an author.",
    strength: 4,
    scripture: {
      text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
      ref: "John 1:1",
    },
    voices: {
      polkinghorne: {
        lede: "Mathematics is not the language of nature by accident.",
        body: [
          "When Dirac wrote down his equation for the electron, he discovered antimatter as a mathematical consequence. Pure thought, applied with discipline, found a feature of the world that no one had seen.",
          "This is not what we'd expect if mathematics were a human cultural artifact and the universe were an indifferent slop of particles. It is what we'd expect if both were thoughts in the same Mind.",
          "Theism explains why science works. Naturalism uses science and refuses to explain why it works.",
        ],
        cites: ["Belief in God in an Age of Science (1998)"],
      },
      newman: {
        lede: "The illative sense recognizes its kin.",
        body: [
          "Knowledge is not built on pure deduction. It is built on the convergence of probabilities, the cumulative weight of indications, until the mind assents.",
          "That assent is not arbitrary; it is the recognition that the world fits the kind of mind we have.",
          "The fit is itself the argument. We were built for this.",
        ],
        cites: ["A Grammar of Assent (1870)"],
      },
      hart: {
        lede: "Logos before logic.",
        body: [
          "John's gospel begins with the Word — the divine Logos — through whom all things were made. Christian metaphysics has always said: the world is meaningful because it was spoken.",
          "Modern science is the exploitation of the world's logos-character, by minds that share in the same logos. To use this gift while denying it is incoherent.",
          "When we read the universe, we are reading after Someone.",
        ],
        cites: ["The Experience of God (2013)"],
      },
    },
    related: ["fine-tuning", "consciousness", "contingency"],
  },
  {
    id: "resurrection",
    layer: "christianity",
    n: 9,
    title: "The Resurrection is the best explanation of the minimal facts",
    claim:
      "Five facts are conceded by virtually all New Testament historians, including skeptical ones: Jesus died by crucifixion, his disciples believed they saw him alive, Paul's life was changed by what he believed was an appearance, James was converted by what he believed was an appearance, and the tomb was empty.",
    thesis:
      "Naturalist alternatives — hallucination, conspiracy, legend, swoon, wrong tomb — each fail on at least one fact. The Resurrection accounts for all five. By the standard historiographical criterion of inference to the best explanation, it wins.",
    strength: 5,
    scripture: {
      text: "And if Christ be not raised, your faith is vain; ye are yet in your sins.",
      ref: "1 Corinthians 15:17",
    },
    voices: {
      habermas: {
        lede: "Five facts. One explanation.",
        body: [
          "1. Jesus died by Roman crucifixion. Conceded by every serious historian. The swoon theory was abandoned in the 19th century.",
          "2. The disciples had real experiences they believed were appearances of the risen Jesus. Conceded — even Bart Ehrman concedes this. Hallucination theories fail because group hallucinations of the same content do not occur and would not include physical eating.",
          "3. Paul, persecutor of the church, was converted by what he believed was an appearance. He had no incentive to lie; he died for the testimony.",
          "4. James, Jesus' skeptical brother, became a leader of the Jerusalem church on the basis of an appearance. Same dynamic.",
          "5. The tomb was empty. Otherwise the Jewish authorities, with motive and access, would have produced the body.",
          "Each naturalist alternative fails on at least one of these. The Resurrection explains all five.",
        ],
        cites: [
          "Habermas & Licona, The Case for the Resurrection of Jesus (2004)",
        ],
      },
      wright: {
        lede: "Second-Temple Judaism had no category for this.",
        body: [
          "In first-century Jewish thought, 'resurrection' meant the bodily raising of all the righteous at the end of history. No one expected one man to be raised in the middle. No one expected a crucified Messiah at all — crucifixion was a sign of God's curse.",
          "What the disciples claimed required them to invent two new categories simultaneously, against the grain of every expectation they held. The simplest explanation of this innovation is that it happened.",
          "And the movement they founded grew explosively in the very city where the body could be produced. It was not.",
        ],
        cites: ["The Resurrection of the Son of God (2003)"],
      },
      plantinga: {
        lede: "The probability calculus runs in our favor.",
        body: [
          "The prior probability of a resurrection is low only on the assumption of no God. Conditional on the existence of God and on the prior probability of an Incarnation given that existence, the prior of a Resurrection becomes substantial.",
          "Combined with the historical evidence, the posterior is decisively in favor.",
          "The atheist who calls the historical case 'insufficient' is doing so by ruling out the conclusion in advance.",
        ],
        cites: ["Warranted Christian Belief (2000)"],
      },
    },
    related: ["transformation", "scripture-prophecy", "church-persistence"],
  },
  {
    id: "transformation",
    layer: "christianity",
    n: 10,
    title: "The transformation of saints is empirical",
    claim:
      "Christianity has produced, in every generation, a recognizable kind of person — Francis, Teresa of Avila, Vincent de Paul, Maximilian Kolbe, Mother Teresa — whose lives are difficult to explain on naturalist grounds.",
    thesis:
      "These are not pious legends. They are people whose biographies are documented, whose holiness was tested under extreme pressure, and whose effect on those around them was transformative. A tree is known by its fruit. Strange fruit, repeated for two thousand years, is data.",
    strength: 4,
    scripture: {
      text: "By their fruits ye shall know them.",
      ref: "Matthew 7:20",
    },
    voices: {
      newman: {
        lede: "Holiness is the proper proof of Christianity.",
        body: [
          "Doctrine alone does not convert. The doctrine plus a saint does. The saint is the doctrine made visible — the embodied argument that the Gospel is not merely true on paper.",
          "Across nineteen centuries, in every culture Christianity has reached, the same kind of human being has been produced: marked by joyful self-gift, peace under suffering, and an enlarged capacity to love unattractive people.",
          "This kind of person is not produced by other ideologies in anything like the same density. The fact is unwelcome but it is a fact.",
        ],
        cites: [
          "Apologia Pro Vita Sua (1864)",
          "An Essay on the Development of Christian Doctrine (1845)",
        ],
      },
      hahn: {
        lede: "The covenant family produces these lives by structural reason.",
        body: [
          "Christianity is not primarily an ethics or a philosophy. It is a covenant — God's binding self-gift to a family he is gathering. Inside that family, the ordinary means of grace (Eucharist, confession, Scripture, prayer) reshape persons over time.",
          "The saints are not super-Christians. They are the ordinary outcome of the ordinary means, when the means are not resisted.",
          "What needs explaining is not that there are saints. It is that there are not more.",
        ],
        cites: ["The Lamb's Supper (1999)"],
      },
      lewis: {
        lede: "Christianity makes new kinds of men.",
        body: [
          "It is not the moral teachings of Christianity that constitute its uniqueness. They are largely shared with high paganism. It is the claim that, joined to Christ, a man becomes a new creature — that the old man dies and a son of God is born.",
          "And it works. Imperfectly, slowly, with relapses. But ask anyone who has known a real Christian closely whether they have known an ordinary good person.",
          "The two are not the same kind of thing.",
        ],
        cites: ["Mere Christianity, Bk. IV"],
      },
    },
    related: ["resurrection", "religious-experience", "church-persistence"],
  },
  {
    id: "scripture-prophecy",
    layer: "christianity",
    n: 11,
    title: "Scripture is unified across a millennium",
    claim:
      "The Bible is seventy-three books written by some forty authors over fifteen hundred years, on three continents and in three languages, telling one progressively-revealed story that culminates in a person. The structural correspondences between Old and New Testaments are too specific, too numerous, and too distributed across independent authors to be the product of editorial coordination.",
    thesis:
      "Typology is the test case. A handful of loose thematic echoes could be coincidence or retroactive reading. What we actually find is something else: tight clusters of structural identity — same mountain, same wood, same beloved son, same three-day pattern, same substitute — threaded through texts written a thousand years apart by authors who could not have seen the whole. Read in canonical order, the Old Testament reads like a problem whose solution is already encoded in the problem itself. This is the literary signature of an Author behind the authors.",
    strength: 4,
    scripture: {
      text: "Then opened he their understanding, that they might understand the scriptures.",
      ref: "Luke 24:45",
    },
    voices: {
      hahn: {
        lede: "The Akedah is the fingerprint pressed deepest into the page.",
        body: [
          "Read Genesis 22 with the Passion in mind and the correspondences are not impressionistic — they are structural. Abraham is told to take his son, his only son, whom he loves, to the land of Moriah and offer him there. Two Chronicles 3:1 identifies Moriah as the Temple Mount. Calvary sits on the same Jerusalem ridge. Father offers son on the same mountain.",
          "Isaac carries the wood for his own sacrifice up the mountain. Christ carries the wood of his cross up the same mountain. Isaac asks where the lamb is; Abraham answers, 'God himself will provide the lamb.' A thousand years later, John the Baptist points at Jesus and says, 'Behold the Lamb of God.' The providing has happened.",
          "When the angel stays Abraham's hand, the substitute is found: a ram caught in a thicket of thorns. The animal that dies in Isaac's place wears a crown of thorns before being slain. Christ wears the crown of thorns and dies as the substitute. The Akedah does not merely prefigure the Cross in the abstract — it prefigures its specific image.",
          "Add the rabbinic tradition that Isaac was a willing adult at the binding, not a child carried to the altar. Add the three-day journey from Beersheba to Moriah, during which Isaac is, from Abraham's perspective, as good as dead — a journey Hebrews 11:19 explicitly reads as a typological resurrection on the third day. Add the Father's voice at Christ's baptism — \"This is my beloved Son\" — which quotes the Septuagint of Genesis 22 word for word.",
          "These correspondences are not loose. They are not the kind of pattern a clever reader can find in any sufficiently long text. They are tight, specific, mutually reinforcing, and distributed across authors who lived a millennium apart and could not have coordinated. The Akedah is one chapter of Genesis. The Bible has hundreds of such chapters.",
          "And the Akedah does more than prefigure. It answers in advance the deepest objection to the Cross. What kind of God asks for the death of his beloved Son? The same God who, in figure, asked it first of Abraham — and then, in fact, asked it of himself.",
        ],
        cites: [
          "Hahn, A Father Who Keeps His Promises (1998)",
          "Hahn, Kinship by Covenant (2009)",
          "Catechism of the Catholic Church, §§128–130",
        ],
      },
      wright: {
        lede: "The whole canon has the same shape, and the shape is the argument.",
        body: [
          "The Old Testament has the shape of a problem. Israel was meant to be the light to the nations and could not be. The covenant was meant to undo the Adamic curse and reproduced it. The Davidic kingdom was meant to be the throne of God on earth and ended in exile. Each successive Old Testament arc reaches further and falls shorter. The book ends not with resolution but with longing.",
          "The New Testament is the surprising form of the answer: the faithful Israelite who fulfills, from inside Israel, the vocation Israel could not. He is the new Adam who does not fall, the new Israel who is faithful, the true son of David whose throne does not end. He is also, scandalously, more than any of these — because the problem turned out to be deeper than Israel's alone, and the solution had to come from outside the system that had failed.",
          "The Akedah is the deepest example, but the pattern is everywhere. Adam in a garden by a tree; Christ in a garden by a tree. The Passover lamb slain at the ninth hour; Christ slain at the ninth hour. Israel passing through water to wilderness to promised land; the believer passing through baptism to discipleship to glory. The bronze serpent lifted up; the Son of Man lifted up. Jonah three days in the deep; the Son of Man three days in the earth.",
          "No single author plotted this. The plot is the cumulative shape that emerges across the whole. Looking back, every shock has been prepared for. Looking forward from any point in the Old Testament, the next move is genuinely surprising. This is not how anthologies behave. It is how stories with an Author behave.",
        ],
        cites: [
          "The New Testament and the People of God (1992)",
          "Jesus and the Victory of God (1996)",
          "The Day the Revolution Began (2016)",
        ],
      },
      newman: {
        lede: "Doctrine develops because Scripture has depth.",
        body: [
          "The seed of every later Catholic doctrine is in the original deposit. The Trinity is in the baptismal formula. Marian doctrine is in the new-Eve typology and the Magnificat. The Eucharistic real presence is in the Bread of Life discourse and the Emmaus breaking-of-bread. The papacy is in the keys given at Caesarea Philippi. Time unfolds what was already given.",
          "This unfolding is itself an argument for the unity of Scripture. An invented religion would either freeze and become brittle, or evolve and become incoherent. Christian doctrine has done neither. It has grown the way a living thing grows — by drawing out from a single source what was always there in seed, never repudiating what came before, always recognizing itself in its earlier forms.",
          "Such organic continuity, sustained across two millennia of cultural translation and intellectual challenge, is the signature of a real living source. Not a committee. Not an evolving consensus. A given deposit, with depth that takes centuries to plumb.",
        ],
        cites: [
          "An Essay on the Development of Christian Doctrine (1845)",
          "A Grammar of Assent (1870)",
        ],
      },
    },
    related: ["resurrection", "church-persistence", "transformation"],
  },
  {
    id: "church-persistence",
    layer: "christianity",
    n: 12,
    title: "The Church has survived itself",
    claim:
      "Across two millennia, the Catholic Church has been led by saints and by criminals, has prevailed against the Roman empire, Arian heresy, the fall of Rome, the Reformation, the French Revolution, Marxism, and modernity, and is still teaching the same Creed.",
    thesis:
      "On purely sociological terms, this should not have happened. Institutions led that badly do not survive that long. The persistence of the Church through her own corruption is a stronger argument than her flourishing under saints would have been. What needs explaining is not that Christianity has good periods — every movement does — but that this particular institution, with this particular structure and creed, has persisted at this scale through repeated catastrophic failures of its own leadership.",
    strength: 3,
    scripture: {
      text: "And the gates of hell shall not prevail against it.",
      ref: "Matthew 16:18",
    },
    voices: {
      newman: {
        lede: "She has died often, and risen often.",
        body: [
          "I count many times the Church has been declared dead — by Diocletian, by Julian, by the Goths, by the Iconoclasts, by Voltaire, by Napoleon, by the architects of the cult of Reason, by Bismarck, by Stalin. After each, she has risen, often in places her opponents had not thought to watch.",
          "An institution that can survive its own emperors, its own popes, its own scandals, and its own intellectuals, and continue to draw new converts on every continent, is not an ordinary institution.",
          "Compare this to the Protestant fragmentation that began in the sixteenth century. What started as a reform movement has produced, by the most cautious counts, tens of thousands of denominations within five hundred years — an order of magnitude more division in a quarter of the time. This is not a sneer; it is a structural observation. Visible institutional unity, sustained through centuries under strain, is precisely what Christ promised when he said the gates of hell would not prevail. The contrast is what makes the Catholic case visible.",
          "She is held by something other than her merits.",
        ],
        cites: [
          "Apologia Pro Vita Sua (1864)",
          "Essay on the Development of Christian Doctrine (1845)",
        ],
      },
      hahn: {
        lede: "The covenant is unbreakable from God's side.",
        body: [
          "The Church's persistence is not because her members are reliable. They are not. It is because the covenant is not a contract. A contract is an exchange of services and breaks at the first material failure. A covenant is a self-gift and is not voided by the unfaithfulness of the recipient.",
          "Israel proved this in the Old Testament, again and again. The Church proves it in the New. The drama of failure-and-mercy is the engine of the story, not a flaw in it.",
          "Note the contrast with Islamic institutional history, which has its own remarkable longevity but a different structure. Sunni Islam, by deliberate design, has no centralized magisterium; authority is distributed among the ulama and the schools of jurisprudence. Shia Islam has imams, but the visible imamate ended in occultation. Neither tradition makes the same kind of claim the Catholic Church makes — a single visible head, in unbroken succession, teaching one Creed across two thousand years. Whether that claim is true is the question. But it is a distinct claim, and its survival is a distinct phenomenon requiring its own explanation.",
          "If Christianity were merely human, the corruption would have ended it. Its endurance through corruption is the argument.",
        ],
        cites: [
          "A Father Who Keeps His Promises (1998)",
          "The Lamb's Supper (1999)",
        ],
      },
      wright: {
        lede: "What started in an upper room is in every nation.",
        body: [
          "Twelve unimpressive Galileans, in a backwater province of the Roman Empire, founded a movement that within three centuries had captured the empire that had killed its founder. They had no military, no money, no political program. By any standard sociological model, this should not occur.",
          "The natural objection: but Judaism is older than the Church, and has shown comparable or greater fidelity through worse trials. This is true and worth honoring. Judaism is the elder covenantal partner whose continuity Christians read as confirmation — not refutation — of God's promise-keeping character. The covenant with Israel has not been revoked.",
          "But the historical picture is more textured than the simple chronology suggests. The Temple fell in AD 70. The sacrificial cult that had defined Israelite worship for a millennium ended. What we now call Rabbinic Judaism — Torah-centered, synagogue-based, codified in the Mishnah around AD 200 and the Talmuds over the following centuries — is itself a first-century reconstruction, emerging in roughly the same window as the Christian movement, out of the same Second Temple matrix. Both traditions are heirs of a shared inheritance. Both made interpretive moves to account for the catastrophe of 70. Christians said: the sacrificial system has been fulfilled in the once-for-all sacrifice of the Messiah. The rabbis said: Torah study and prayer stand in the place of sacrifice until the Temple is restored.",
          "These are two coherent answers to one shared question. Which is the legitimate continuation is exactly what is at issue between the two communities, and it cannot be settled by appeal to age alone — both, in their current institutional forms, are roughly contemporary developments. The argument from persistence does not refute Judaism; it joins Judaism in pointing to the kind of God who keeps covenants across catastrophe. What it specifically commends is the Christian claim that this God has acted decisively in Christ, and that the community he founded has, against all sociological expectation, endured.",
          "The simplest explanation of the endurance is the one the first witnesses gave: he is risen.",
        ],
        cites: [
          "The New Testament and the People of God (1992)",
          "Simply Christian (2006)",
        ],
      },
    },
    related: ["resurrection", "transformation", "scripture-prophecy"],
  },
];

export function findPositiveArgument(id: string): PosArgument | undefined {
  return POS_ARGUMENTS.find((a) => a.id === id);
}

export async function getPosVoices(
  lang: string,
): Promise<Record<string, PosVoice>> {
  if (lang === "de") {
    const m = await import("./apologetik.de");
    return m.POS_VOICES_DE;
  }
  return POS_VOICES;
}
export async function getPosLayers(lang: string): Promise<PosLayer[]> {
  if (lang === "de") {
    const m = await import("./apologetik.de");
    return m.POS_LAYERS_DE;
  }
  return POS_LAYERS;
}
export async function getPosArguments(lang: string): Promise<PosArgument[]> {
  if (lang === "de") {
    const m = await import("./apologetik.de");
    return m.POS_ARGUMENTS_DE;
  }
  return POS_ARGUMENTS;
}
export async function findPositiveArgumentLang(
  id: string,
  lang: string,
): Promise<PosArgument | undefined> {
  const args = await getPosArguments(lang);
  return args.find((a) => a.id === id);
}
