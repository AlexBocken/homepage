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
