export interface MysteryReference {
  title: string;
  reference: string;
}

export interface VerseData {
  book: string;
  chapter: number;
  verses: Array<{ verse: number; text: string }>;
}

export interface MysteryDescription extends MysteryReference {
  text: string;
  verseData?: VerseData | null;
}

// Only store references - texts will be fetched at build time
export const mysteryReferences = {
  lichtreichen: [
    {
      title: "Das erste lichtreiche Geheimnis: Die Taufe im Jordan.",
      reference: "Mt 3, 16-17"
    },
    {
      title: "Das zweite lichtreiche Geheimnis: Die Hochzeit von Kana.",
      reference: "Joh 2, 1-5"
    },
    {
      title: "Das dritte lichtreiche Geheimnis: Die Verkündigung des Reiches Gottes.",
      reference: "Mk 1, 15"
    },
    {
      title: "Das vierte lichtreiche Geheimnis: Die Verklärung.",
      reference: "Mt 17, 1-2"
    },
    {
      title: "Das fünfte lichtreiche Geheimnis: Die heiligste Eucharistie (Das Altarssakrament).",
      reference: "Mt 26, 26"
    }
  ],
  freudenreich: [
    {
      title: "Das erste freudenreiche Geheimnis: Die Verkündigung des Erzengles Gabriel an die Jungfrau Maria.",
      reference: "Lk 1, 26-27"
    },
    {
      title: "Das zweite freudenreiche Geheimnis: Der Besuch Marias bei Elisabeth.",
      reference: "Lk 1, 39-42"
    },
    {
      title: "Das dritte freudenreiche Geheimnis: Die Geburt Jesu im Stall von Bethlehem.",
      reference: "Lk 2, 1-7"
    },
    {
      title: "Das vierte freudenreiche Geheimnis: Jesus wird von Maria und Josef im Tempel dargebracht.",
      reference: "Lk 2, 21-24"
    },
    {
      title: "Das fünfte freudenreiche Geheimnis: Jesus wird im Tempel wiedergefunden.",
      reference: "Lk 2, 41-47"
    }
  ],
  schmerzhaften: [
    {
      title: "Das erste schmerzhafte Geheimnis: Die Todesangst Jesu.",
      reference: "Mt 26, 36-39"
    },
    {
      title: "Das zweite schmerzhafte Geheimnis: Die Geißelung Jesu.",
      reference: "Mt 27, 26"
    },
    {
      title: "Das dritte schmerzhafte Geheimnis: Die Dornenkrönung.",
      reference: "Mt 27, 27-29"
    },
    {
      title: "Das vierte schmerzhafte Geheimnis: Jesus trägt das schwere Kreuz.",
      reference: "Mk 15, 21-22"
    },
    {
      title: "Das fünfte schmerzhafte Geheimnis: Die Kreuzigung Jesu.",
      reference: "Lk 23, 33-46"
    }
  ],
  glorreichen: [
    {
      title: "Das erste glorreiche Geheimnis: Die Auferstehung Jesu.",
      reference: "Lk 24, 1-6"
    },
    {
      title: "Das zweite glorreiche Geheimnis: Die Himmerfahrt Jesu.",
      reference: "Mk 16, 19"
    },
    {
      title: "Das dritte glorreiche Geheimnis: Die Herabkunft des Heiligen Geistes im Abendmahlssaal.",
      reference: "Apg 2, 1-4"
    },
    {
      title: "Das vierte glorreiche Geheimnis: Die Aufnahme Marias in den Himmel.",
      reference: "Lk 1, 48-49"
    },
    {
      title: "Das fünfte glorreiche Geheimnis: Die Krönung Marias zur Königin des Himmels und der Erde.",
      reference: "Offb 12, 1"
    }
  ]
} as const;

// Reference for the three opening Ave Marias (Faith, Hope, Love)
export const theologicalVirtueReference = {
  title: "Das Hohelied der Liebe",
  reference: "1 Kor 13, 1-13"
} as const;

export const theologicalVirtueReferenceEnglish = {
  title: "The Hymn to Love",
  reference: "1 Cor 13:1-13"
} as const;

export const mysteryReferencesEnglish = {
  lichtreichen: [
    {
      title: "The first Luminous Mystery: The Baptism in the Jordan.",
      reference: "Mt 3:16-17"
    },
    {
      title: "The second Luminous Mystery: The Wedding at Cana.",
      reference: "Jn 2:1-5"
    },
    {
      title: "The third Luminous Mystery: The Proclamation of the Kingdom of God.",
      reference: "Mk 1:15"
    },
    {
      title: "The fourth Luminous Mystery: The Transfiguration.",
      reference: "Mt 17:1-2"
    },
    {
      title: "The fifth Luminous Mystery: The Institution of the Holy Eucharist.",
      reference: "Mt 26:26"
    }
  ],
  freudenreich: [
    {
      title: "The first Joyful Mystery: The Annunciation of the Archangel Gabriel to the Virgin Mary.",
      reference: "Lk 1:26-27"
    },
    {
      title: "The second Joyful Mystery: The Visitation of Mary to Elizabeth.",
      reference: "Lk 1:39-42"
    },
    {
      title: "The third Joyful Mystery: The Nativity of Jesus in the Stable at Bethlehem.",
      reference: "Lk 2:1-7"
    },
    {
      title: "The fourth Joyful Mystery: The Presentation of Jesus in the Temple.",
      reference: "Lk 2:21-24"
    },
    {
      title: "The fifth Joyful Mystery: The Finding of Jesus in the Temple.",
      reference: "Lk 2:41-47"
    }
  ],
  schmerzhaften: [
    {
      title: "The first Sorrowful Mystery: The Agony of Jesus in the Garden.",
      reference: "Mt 26:36-39"
    },
    {
      title: "The second Sorrowful Mystery: The Scourging at the Pillar.",
      reference: "Mt 27:26"
    },
    {
      title: "The third Sorrowful Mystery: The Crowning with Thorns.",
      reference: "Mt 27:27-29"
    },
    {
      title: "The fourth Sorrowful Mystery: Jesus Carries the Heavy Cross.",
      reference: "Mk 15:21-22"
    },
    {
      title: "The fifth Sorrowful Mystery: The Crucifixion of Jesus.",
      reference: "Lk 23:33-46"
    }
  ],
  glorreichen: [
    {
      title: "The first Glorious Mystery: The Resurrection of Jesus.",
      reference: "Lk 24:1-6"
    },
    {
      title: "The second Glorious Mystery: The Ascension of Jesus.",
      reference: "Mk 16:19"
    },
    {
      title: "The third Glorious Mystery: The Descent of the Holy Spirit.",
      reference: "Acts 2:1-4"
    },
    {
      title: "The fourth Glorious Mystery: The Assumption of Mary into Heaven.",
      reference: "Lk 1:48-49"
    },
    {
      title: "The fifth Glorious Mystery: The Coronation of Mary as Queen of Heaven and Earth.",
      reference: "Apo 12:1"
    }
  ]
} as const;
