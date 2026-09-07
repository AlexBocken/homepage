/**
 * The commentators' lives in English: who they were, what they taught, how
 * the Church reads them today, and what is peculiar to each. Written from
 * Benedict XVI's catecheses on the Fathers (2007–2010), the Catholic
 * Encyclopedia and the standard reference works; `fathersBio.ts` joins this
 * with the German and the sources. Paragraphs are separated by blank lines.
 */
import type { BioSections } from './fathersBio';

export const BIO_EN: Record<string, BioSections> = {
	augustine: {
		dates: '354–430 · Tagaste, Milan, Hippo',
		life: `Born on 13 November 354 at Tagaste in Numidia to a pagan father and a Christian mother, Monica, Augustine taught rhetoric in Carthage, Rome and Milan, spent nine years as a hearer of the Manichaeans and fathered a son, Adeodatus, with a concubine he never names. In Milan the preaching of Ambrose and the books of the Platonists loosened his objections; in a garden in August 386 he read Romans 13,13 at a child's chant of "tolle, lege" and gave up the world. Ambrose baptised him at Easter 387; Monica died at Ostia on the way home.

Back in Africa he meant to live as a monk. The people of Hippo seized him for a priest in 391 and he became their bishop in 395, for thirty-five years preaching, judging, writing letters and about a hundred books. He died on 28 August 430 while the Vandals besieged the city, the penitential psalms pinned to the wall of his room.`,
		teaching: `The Confessions turned his own life into a prayer and made the restless heart the image of every soul: "you have made us for yourself, and our heart is restless until it rests in you". The City of God read the sack of Rome as the passage of two cities, built on two loves, through one history. De Trinitate sought the Trinity in the mind's memory, understanding and will.

Against the Manichaeans he taught that evil is no substance but the privation of good; against the Donatists that a sacrament is Christ's and does not depend on the minister's holiness; against Pelagius that grace precedes every good act and that no one can save himself. "Believe so that you may understand, understand so that you may believe" is his rule for faith and reason.`,
		church: `Benedict XVI called him "the greatest Father of the Latin Church" and devoted five catecheses to him (2008). He is one of the four original Latin Doctors of the Church (1298), and his teaching on grace, the sacraments and the Church runs through the Council of Trent and the Catechism. Where his late writings on predestination were hardened by Jansenism, the Church read him with the Council of Orange (529): grace is universal and freedom real. His Rule is still followed by many orders.`,
		particular: `In De Trinitate II–IV Augustine holds that the theophanies of the Old Testament, the burning bush, the visitors at Mamre, the fire on Sinai, were created signs worked through angels, in which any Person or the whole Trinity could speak. Every earlier Father, Justin, Irenaeus, Tertullian, Hilary and Ambrose among them, had read them as appearances of the Son before his incarnation. Augustine's reading became the norm in the West. He also argued against the death penalty for heretics and, at the end of his life, reviewed all his books in the Retractations to correct himself.`,
		feast: '28 August',
		titles: 'Doctor of the Church · Doctor of grace'
	},
	chrysostom: {
		dates: 'c. 349–407 · Antioch, Constantinople, Comana',
		life: `Born at Antioch and raised by his widowed mother Anthusa, John studied rhetoric under the pagan Libanius and Scripture under Diodore of Tarsus. He spent six years as a monk and hermit in the mountains, ruined his health with vigils, and returned to be ordained deacon (381) and priest (386). For twelve years he preached at Antioch almost daily; the Homilies on the Statues, spoken while the city awaited the emperor's revenge for a riot, made his name.

In 398 he was taken by stealth to be bishop of Constantinople. He cut the household budget, fed the poor, disciplined the clergy and preached against the court's luxury. The empress Eudoxia and Theophilus of Alexandria had him deposed at the Synod of the Oak (403); recalled by the frightened people, he was banished again in 404 to Cucusus in Armenia. Marched further in the summer heat, he died at Comana on 14 September 407 with the words "Glory be to God for all things".`,
		teaching: `John was the master of the Antiochene school: he explained the text verse by verse in its plain sense and drew the moral for the congregation before him. More than seven hundred of his homilies survive, on Genesis, the Psalms, Matthew, John, Acts, Romans, the Corinthians, Hebrews, the largest body of exegesis by any Greek Father.

His preaching returned again and again to the poor as the sacrament of Christ, to almsgiving, to the Eucharist received with a burning heart, and to the family as a "little church" where Scripture is read at home.`,
		church: `He was declared a Doctor of the Church in 1568, is one of the Three Holy Hierarchs of the Byzantine calendar, and was named patron of preachers by Pius X in 1908. The Divine Liturgy of the Byzantine rite bears his name. Benedict XVI devoted two catecheses to him (2007), on his social teaching and on the Church as the body of Christ; his relics were returned by Rome to Constantinople in 2004.`,
		particular: `On "you are Peter" he reads the rock as Peter's confession of faith, a reading Catholic exegesis holds together with the person of Peter. Eight sermons of 386–387 against the Judaising Christians of Antioch use the violent rhetoric of the age against the Jews; the Church reads them as a product of their time and not as teaching.`,
		feast: '13 September',
		titles: 'Doctor of the Church · "golden-mouthed"'
	},
	jerome: {
		dates: 'c. 347–420 · Stridon, Rome, Bethlehem',
		life: `Jerome was born at Stridon on the border of Dalmatia and studied grammar and rhetoric at Rome under Donatus, where he was baptised. After years in Trier and Aquileia he went east and lived as a hermit in the desert of Chalcis (374–379), learning Hebrew from a converted Jew to master his temptations. Ordained at Antioch, he heard Gregory Nazianzen in Constantinople and served Pope Damasus as secretary in Rome (382–385), where the pope asked him to revise the Latin Gospels.

Driven from Rome after Damasus's death by the enemies his tongue had made, he settled in Bethlehem in 386 with Paula and her daughter Eustochium, founded a monastery and a convent, and worked there until his death on 30 September 420.`,
		teaching: `His life's work is the Vulgate: the Gospels corrected from the Greek, the Old Testament translated afresh from the Hebrew (the "Hebrew truth"), against Augustine's wish to keep to the Septuagint. It became the Bible of the Latin Church for over a thousand years. He wrote commentaries on the prophets, Matthew and Galatians, the catalogue De viris illustribus, and letters on the ascetic life that were read as treatises.

"Ignorance of the Scriptures is ignorance of Christ", from his preface to Isaiah, is quoted by the Second Vatican Council as the reason every Christian should read the Bible.`,
		church: `One of the four original Latin Doctors of the Church. The Council of Trent declared his Vulgate the authentic Latin Bible (1546). Benedict XVI presented him (2007) as the model of a love of Scripture that becomes a love of Christ, and Francis marked the 1600th anniversary of his death with the letter Scripturae Sacrae affectus (2020).`,
		particular: `Jerome doubted the deuterocanonical books: his prefaces call them edifying reading rather than a rule of faith, though he translated Tobit and Judith for the pope. The Church kept the books, and in Trent named them canonical. His controversies with Rufinus over Origen, with Jovinian and Helvidius over Mary's virginity, and with Vigilantius over relics show a temper his friends feared. The lion at his feet in painting is a legend borrowed from another saint.`,
		feast: '30 September',
		titles: 'Doctor of the Church'
	},
	ambrose: {
		dates: 'c. 340–397 · Trier, Milan',
		life: `Born at Trier, the son of a praetorian prefect of Gaul, Ambrose became a lawyer and governor of Aemilia-Liguria at Milan. When the Arian bishop died in 374 and the parties fought over a successor, a voice in the crowd, a child's it was said, called out "Ambrose bishop". He was still a catechumen. Within a week he was baptised and consecrated, on 7 December.

He gave his property to the Church, learned Greek to read Philo, Origen and Basil, and preached so well that the young Augustine came to hear the style and stayed for the substance. He held the basilicas of Milan against the Arian court in 385–386 by filling them with the people and their hymns, and in 390 made the emperor Theodosius do public penance for the massacre at Thessalonica. He died on Holy Saturday 397.`,
		teaching: `Ambrose brought the allegorical reading of Scripture from the Greeks to the West and taught the newly baptised from the sacraments themselves (De mysteriis, De sacramentis). His hymns, "Aeterne rerum conditor" among them, created Latin hymnody. De officiis ministrorum gave the clergy an ethics on Cicero's plan; his writings on virginity made Mary the type of the Church.

His maxim to Theodosius, "the emperor is within the Church, not above it", set the relation of Church and state for the Middle Ages.`,
		church: `One of the four original Latin Doctors of the Church. The rite of Milan bears his name to this day. Benedict XVI (2007) presented him as the master of "lectio divina" and of a catechesis from the mysteries, and as the bishop who converted Augustine as much by his life as by his words.`,
		particular: `Augustine watched him read without moving his lips, and recorded it in the Confessions as something strange. Ambrose held that the Angel of the Lord who appears in the Old Testament was Christ, the reading of all the Fathers before Augustine changed it.`,
		feast: '7 December',
		titles: 'Doctor of the Church'
	},
	'gregory-great': {
		dates: 'c. 540–604 · Rome, Constantinople',
		life: `Born into a senatorial family of Rome, Gregory was prefect of the city at about thirty. In 574 he turned his house on the Caelian hill into the monastery of St Andrew and became a monk. Pope Pelagius II made him a deacon and sent him as his envoy to Constantinople (579–586). On the pope's death in the plague of 590 the clergy and people elected him; he tried to flee, and was pope from 3 September 590 until 12 March 604, the first monk on Peter's chair.

He fed Rome from the papal estates while the Lombards besieged it and made peace with them himself when the emperor's exarch would not. In 596 he sent Augustine and forty monks to convert the English. He called himself "servant of the servants of God", a title the popes still use.`,
		teaching: `The Moralia on Job, thirty-five books preached to his monks, read the whole Christian life out of one book of Scripture. The Pastoral Rule became the handbook of every bishop in the Middle Ages; Alfred the Great translated it into English. The Dialogues told the miracles of the Italian saints and gave the West the life of Benedict; his forty Homilies on the Gospels were read on Sundays for a thousand years.

He taught that "Scripture grows with the one who reads it": the moral sense, the reading that changes a life, was his concern above all.`,
		church: `One of the four original Latin Doctors of the Church. Benedict XVI devoted two catecheses to him (2008), on his government of Rome and on his teaching. The Gregorian sacramentary and the "Gregorian" chant carry his name by a tradition of the ninth century; the chant was not his, and the liturgical books that bear his name were built up after him.`,
		particular: `He had no Greek, distrusted philosophy, and expected the end of the world soon; his Dialogues tell of visions of purgatory that shaped the Western imagination of the afterlife. The mission to the English was, by Bede's story, born of a glance at fair-haired slave boys in the Roman market: "not Angles but angels".`,
		feast: '3 September',
		titles: 'Doctor of the Church'
	},
	bede: {
		dates: '672/3–735 · Wearmouth, Jarrow',
		life: `Bede was given to the monastery of Wearmouth in Northumbria at the age of seven and moved to its sister house at Jarrow, where he lived all his life. He was ordained deacon at nineteen and priest at thirty, and "amid the observance of the Rule and the daily task of singing in church", as he says, made it his delight to learn, to teach and to write. He died on 26 May 735, having just finished dictating an English translation of the Gospel of John.`,
		teaching: `He wrote commentaries on much of the Bible, on Genesis, Samuel, Ezra, Tobit, Mark, Luke, Acts, the catholic letters and the Apocalypse, gathering the Fathers into a form that a monk of his time could use, and marking his borrowings in the margin so that no one would take Augustine's words for his own. The Ecclesiastical History of the English People (731) is the source of almost all that is known of early England. His De temporum ratione made the reckoning of years from the birth of Christ, "anno Domini", the standard of the West.`,
		church: `Leo XIII declared him a Doctor of the Church in 1899, the only Englishman among them. The title "Venerable" has been his since the century after his death, confirmed by the council of Aachen in 836. Benedict XVI (2009) presented him as the teacher who joined learning to the liturgy and made history a school of faith.`,
		particular: `Bede never left his corner of Northumbria and never held an office higher than priest, yet his commentaries were copied across Europe within a generation and fed the Glossa Ordinaria and the Catena Aurea. His reading is almost wholly allegorical: the temple, the tabernacle and the ark become the Church.`,
		feast: '25 May',
		titles: 'Doctor of the Church · the Venerable'
	},
	origen: {
		dates: 'c. 185–253/4 · Alexandria, Caesarea',
		life: `The son of Leonides, who was martyred at Alexandria in 202 while the boy wrote to encourage him, Origen was made head of the catechetical school at eighteen. He lived with extreme austerity, and Eusebius reports that he took Matthew 19,12 literally and made himself a eunuch. Ordained a priest at Caesarea in 230 without his own bishop's leave, he was excluded from Alexandria and moved to Caesarea in Palestine in 231, where a patron paid seven stenographers to take down his lectures.

He was imprisoned and tortured in the persecution of Decius (250) and died of the effects at Tyre a few years later, a confessor if not a martyr.`,
		teaching: `Origen was the first Christian to comment on the whole of Scripture, in commentaries, homilies and scholia, and the first to lay out a systematic theology (De principiis). The Hexapla set the Hebrew text and four Greek versions in six columns. Against Celsus he wrote the most learned defence of Christianity of the early Church.

He read Scripture on three levels, after 1 Thessalonians 5,23: the body of the letter, the soul of the moral sense and the spirit of the mystery, the third being the goal. The Catechism's account of the senses of Scripture descends from him.`,
		church: `Origen was never made a saint. Certain of his speculations, the pre-existence of souls, the final restoration of all things including the devil, a subordination of the Son, were condemned as "Origenism" in the controversies of 400, in Justinian's edict of 543 and at the Second Council of Constantinople (553), though scholars doubt that the anathemas describe what he himself taught. The Catholic Encyclopedia calls him no promoter of heresy; Benedict XVI (2007) called him "one of the most remarkable figures in the history of Christian thought" and praised his "primacy of Scripture".`,
		particular: `His allegory could treat the contradictions of the Gospels as intended by the Spirit to force the reader past the letter. The universalism that kept him from the calendar, the hope that in the end all would be saved, returned in Gregory of Nyssa and in modern theology as a question the Church has left open for individuals and closed as a doctrine.`
	},
	'cyril-alexandria': {
		dates: 'c. 376–444 · Alexandria',
		life: `Nephew of the patriarch Theophilus, whom he accompanied to the Synod of the Oak that deposed Chrysostom, Cyril became patriarch of Alexandria in 412. His early years were violent: he closed the churches of the Novatians, drove Jews out of the city after riots, and fought the prefect Orestes; the murder of the philosopher Hypatia by a Christian mob in 415 is laid at his door by critics, though no source makes him its instigator.

From 428 he opposed Nestorius of Constantinople, who would not call Mary Mother of God. He presided at the Council of Ephesus (431), which he opened before the Antiochene bishops arrived, and was reconciled with them in the Formula of Reunion of 433. He died on 27 June 444.`,
		teaching: `Cyril taught that the one Person of the Word is the single subject of both the divine and the human in Christ, so that what the man Jesus did and suffered, God the Word did and suffered in the flesh. Mary is therefore Theotokos, the God-bearer, and the Eucharist is life-giving because it is the flesh of the Word. His commentaries on John, Luke, the Pentateuch and the prophets read the Old Testament as prophecy of Christ.`,
		church: `Leo XIII declared him a Doctor of the Church in 1882. The dogma of Ephesus is his; the Council of Chalcedon (451) read his letters alongside the Tome of Leo. Benedict XVI (2007) called him "the guardian of exactness" in faith. The formula "one incarnate nature of God the Word", which he took from a forgery of Apollinaris under the name of Athanasius, later served the Monophysites who rejected Chalcedon.`,
		particular: `Cyril is the Father whose doctrine the Church holds and whose methods it does not defend. The historian Socrates, no friend, and the Catholic Encyclopedia alike distinguish the ruthless politician from the theologian of the Incarnation. He is the doctor of Mary's title.`,
		feast: '27 June',
		titles: 'Doctor of the Church · Doctor of the Incarnation'
	},
	basil: {
		dates: 'c. 330–379 · Caesarea in Cappadocia',
		life: `Basil was born into a family of saints: his grandmother Macrina, his parents, his sister Macrina and his brothers Gregory of Nyssa and Peter of Sebaste are all venerated. He studied at Constantinople and Athens with Gregory Nazianzen, returned as a fashionable rhetor, and was converted to the ascetic life by his sister. After a tour of the monks of Egypt and Syria he founded a community on the river Iris, where Gregory joined him.

Priest in 362 and bishop of Caesarea in 370, he faced the Arian emperor Valens down in person: "perhaps you have never met a bishop". He built a whole city of hospitals, hospices and workshops outside Caesarea, the Basileiad, and died worn out on 1 January 379, before the council that vindicated his faith.`,
		teaching: `His two monastic Rules, in questions and answers, made the common life the norm of Eastern monasticism and shaped Benedict's Rule in the West. On the Holy Spirit defended the Spirit's divinity and equal honour without pronouncing the word "God" of him, an economy he thought pastoral and Gregory Nazianzen thought too cautious. The Hexaemeron homilies on the six days of creation taught the beauty of the world to a Christian public. The Liturgy of St Basil is still used in the Byzantine rite in Lent.`,
		church: `Doctor of the Church, one of the Three Holy Hierarchs of the East. Benedict XVI devoted two catecheses to him (2007), on his sermons on wealth and hunger: "the bread you keep back belongs to the hungry, the coat in your cupboard to the naked".`,
		particular: `He fixed the vocabulary of the Trinity, one essence in three hypostases, that the council of 381 adopted. The strain between him and Gregory Nazianzen, whom he made bishop of an unwanted village to gain a vote, is written into Gregory's poems.`,
		feast: '2 January',
		titles: 'Doctor of the Church · the Great'
	},
	'gregory-nazianzen': {
		dates: 'c. 330–390 · Nazianzus, Constantinople',
		life: `The son of the bishop of Nazianzus, Gregory studied at Athens with Basil and would gladly have spent his life with books and prayer. His father ordained him a priest against his will in 361; Basil made him bishop of Sasima in 372, a post he never took up. In 379 the small Nicene flock of Constantinople called him to the capital, where in a house chapel he preached the Five Theological Orations that gave him his title.

He presided for a while over the council of 381, was contested as bishop, and resigned in the middle of it with a farewell speech. He retired to Arianzus to write poems and died there in 390.`,
		teaching: `The Theological Orations set the terms of the doctrine of the Trinity: one nature, three persons, the Son begotten, the Spirit proceeding, and the Spirit fully God, which Basil had not said aloud. Against Apollinaris he coined the rule of the Incarnation: "what has not been assumed has not been healed", so Christ has a human mind. His orations on Easter, Epiphany and Pentecost are read in the Byzantine liturgy; his poems, thirty thousand lines, include the first Christian autobiography in verse.`,
		church: `Doctor of the Church and one of the Three Holy Hierarchs. The East calls him "the Theologian", a title it gives only to him, John the Evangelist and Simeon. Benedict XVI devoted two catecheses to him (2007), on his friendship with Basil and on his theology as praise.`,
		particular: `The most sensitive of the Fathers: he fled every office he was given, mourned the friendship Basil had strained, and left the council of 381 with the words "let me rest from my labours". He is the poet among the doctors.`,
		feast: '2 January',
		titles: 'Doctor of the Church · the Theologian'
	},
	'gregory-nyssa': {
		dates: 'c. 335–after 394 · Nyssa',
		life: `Basil's younger brother taught rhetoric and was married before his brother made him bishop of the small town of Nyssa in 372. Arian intrigue had him deposed for mismanagement in 376; he was restored in 378, took a leading part at the council of 381 and preached the funeral orations of the imperial family. He died after 394.`,
		teaching: `Gregory is the most speculative of the Cappadocians. The Life of Moses reads the ascent of Sinai as the soul's endless progress into God, "epektasis", since the infinite can never be exhausted. On the Making of Man treats the human being as the image of God; the Great Catechesis is a summary of the faith for teachers. His homilies on the Song of Songs and the Beatitudes are mystical theology; his sermons on Ecclesiastes were the first Christian condemnation of slavery as such, as against the image of God.`,
		church: `A saint but not a Doctor. The Second Council of Constantinople (553) called him "father of fathers". His leaning, from Origen, toward the restoration of all things was rejected by the Church without any condemnation of him; Photius and Germanus of Constantinople held the passages interpolated. Benedict XVI devoted two catecheses to him (2007).`,
		particular: `His teaching on God as darkness, known by unknowing, was taken up by Pseudo-Dionysius and the whole mystical tradition. He held that God's infinity means the soul's desire never ends, even in heaven.`,
		feast: '10 January'
	},
	athanasius: {
		dates: 'c. 300–373 · Alexandria',
		life: `Athanasius attended the Council of Nicaea (325) as the deacon and secretary of bishop Alexander, and succeeded him in 328. For forty-five years he was the defender of the council's faith against the Arians and the emperors who favoured them: banished five times, seventeen years in all, to Trier, to Rome, to the monks of the desert, hidden in his own city. "Athanasius against the world" became a proverb. He died in peace on 2 May 373.`,
		teaching: `On the Incarnation argues that the Word became man "so that we might become god": only God can save, so the Saviour must be God. The Orations against the Arians expound the Son's eternal generation and the meaning of "consubstantial". His Life of Antony created the monastic biography and, read by Augustine's friends, helped convert him. His Easter letter of 367 is the first list of exactly the twenty-seven books of the New Testament.`,
		church: `Doctor of the Church and "Father of Orthodoxy". Benedict XVI (2007) called him "the intransigent" who saved the faith of Nicaea. The so-called Athanasian Creed, "Quicumque", is a Latin text of the fifth century and not his.`,
		particular: `His whole theology is the one question, whether the Son is created or begotten; his enemies called him stubborn and his friends the pillar of the Church. He gave the monks to the Church and the Church to the monks.`,
		feast: '2 May',
		titles: 'Doctor of the Church · Father of Orthodoxy'
	},
	'cyril-jerusalem': {
		dates: 'c. 315–386 · Jerusalem',
		life: `Ordained priest by bishop Maximus of Jerusalem, Cyril became bishop about 350 and was three times driven from his see by the Arians (357, 360, 367–378), spending over sixteen years in exile. He belonged at first to the party that distrusted the word "consubstantial", and the Council of Constantinople (381), which he attended, vindicated his faith. He died on 18 March 386.`,
		teaching: `His twenty-four Catecheses, taken down as he preached them in the church of the Holy Sepulchre, are the fullest picture of how a fourth-century church made Christians: eighteen lectures on the Creed for the candidates in Lent, five "mystagogical" lectures in Easter week on baptism, chrism, the Eucharist and the liturgy. Of the Eucharist he says that what seems to be bread is not bread but the body of Christ.`,
		church: `Leo XIII declared him a Doctor of the Church in 1883. Benedict XVI (2007) presented his catechesis as "integral", forming body, soul and spirit through doctrine, morals and the sacraments, and as a model for catechists today.`,
		particular: `He avoided the Nicene word for decades while teaching its sense, an example the Church cites of orthodoxy of faith before orthodoxy of formula. His letter to the emperor Constantius on a cross of light seen over Jerusalem in 351 is the earliest such report.`,
		feast: '18 March',
		titles: 'Doctor of the Church'
	},
	ephrem: {
		dates: 'c. 306–373 · Nisibis, Edessa',
		life: `Ephrem served the bishops of Nisibis as a deacon and catechist, and when the city was ceded to Persia in 363 moved with the Christians to Edessa. He taught, wrote, and led choirs of women in singing his hymns. He died of the plague on 9 June 373 while nursing the sick.`,
		teaching: `His hymns, the madrashe, on faith, on paradise, on the Nativity, against the heresies, are theology in images, not concepts: fire and Spirit in the bread, the pearl as Christ, Mary as the second Eve and the mother without sin. His commentaries on Genesis and on Tatian's Gospel harmony are the earliest Syriac exegesis. He is called "the harp of the Holy Spirit".`,
		church: `Benedict XV declared him a Doctor of the Church in 1920, the only Syriac one. Benedict XVI (2007) presented him as the poet who showed that theology can be sung.`,
		particular: `Ephrem was never a priest and always refused to be; he is the deacon among the Doctors. His hymns were sung by women's choirs, a role for women in the liturgy that was unusual in his time.`,
		feast: '9 June',
		titles: 'Doctor of the Church · Harp of the Holy Spirit'
	},
	hilary: {
		dates: 'c. 310–367 · Poitiers, Phrygia',
		life: `A pagan of good family, married and with a daughter, Hilary came to the faith by reading Scripture and was elected bishop of Poitiers about 350. When he refused to condemn Athanasius the emperor Constantius exiled him to Phrygia (356–360), where he learned the Greek theology of the East and wrote his great work. He came home to a Gaul that welcomed him and died in 367.`,
		teaching: `De Trinitate, in twelve books, is the first full Latin treatment of the doctrine, written to show the Latins that the Nicene faith was that of Scripture. In De synodis he tried to reconcile the "homoiousians" of the East, who feared that "consubstantial" meant one person, with the Nicenes: a bridge that helped the council of 381. His commentaries on Matthew and the Psalms are the oldest Latin exegesis to survive whole. He also wrote the first Latin hymns.`,
		church: `Pius IX declared him a Doctor of the Church in 1851; he is "the Athanasius of the West". Benedict XVI (2007) praised his search for the sense behind the words of the parties.`,
		particular: `He held, with the Fathers before Augustine, that the theophanies of the Old Testament were the Son. He also taught that Christ's body, being what it was, did not feel pain as ours does, a view the Church did not follow.`,
		feast: '13 January',
		titles: 'Doctor of the Church · Athanasius of the West'
	},
	tertullian: {
		dates: 'c. 155–after 220 · Carthage',
		life: `Born at Carthage to pagan parents, trained in rhetoric and law, Tertullian became a Christian about 195 and, married, wrote for the Church of Africa with the force of an advocate. His Apologeticus (197) told the governors that "the blood of Christians is seed". About 207 the rigorism of the Montanists, the "New Prophecy" with its fasts and its refusal of second penance, drew him away from the Catholic community; Augustine says he ended among a sect of his own. Nothing is known of his death.`,
		teaching: `He created the Latin theological vocabulary: "trinitas", "one substance, three persons", "sacramentum", "satisfaction". Against Praxeas he taught the distinction of the persons; in On the Prescription of Heretics he argued that Scripture belongs to the Church and heretics have no right to use it; On the Soul held the soul "naturally Christian". "What has Athens to do with Jerusalem?" is his, though he used Athens all the same.`,
		church: `Tertullian is not a saint and not a Doctor; he is read as a Father for his orthodox works. Benedict XVI (2007) called him "a great Father" whose fall is "a warning": the brilliant mind who cannot bear the Church's patience with the weak ends in isolation.`,
		particular: `He was the first Christian author to write in Latin at length, and gave the West its terms before it had its councils. His later works forbid remarriage, flight in persecution and the forgiveness of adultery. He is the only Father who is a heretic and remains a Father.`
	},
	cyprian: {
		dates: 'c. 200–258 · Carthage',
		life: `A wealthy rhetor of Carthage, Cyprian was converted in 246, gave his gardens to the poor, and within three years was bishop. In the persecution of Decius (250) he hid, was criticised for it, and from hiding governed the Church by letter. When it ended he fixed the way back for those who had lapsed, neither the easy pardon of the confessors nor the refusal of Novatian, but penance under the bishop. During the plague of 252 he organised relief for pagans and Christians alike. In the persecution of Valerian he was tried, banished, tried again and beheaded on 14 September 258, the first martyr-bishop of Africa.`,
		teaching: `On the Unity of the Catholic Church teaches that "you cannot have God for your Father unless you have the Church for your mother" and that the unity is founded on Peter; the fourth chapter exists in two versions, one giving Peter more, both probably his. On the Lapsed and his letters made the discipline of penance; his treatise on the Lord's Prayer was read for centuries.`,
		church: `A saint and martyr, named in the Roman Canon of the Mass. Benedict XVI (2007) called him "the first bishop of Africa to attain the crown of martyrdom" and the teacher of the Church as mother.`,
		particular: `Cyprian held with the councils of Africa that converts from heresy must be rebaptised, and Pope Stephen forbade it: "let nothing be innovated". The Church later sided with Stephen; Augustine wrote that Cyprian erred and kept charity, and that his martyrdom washed the error. The dispute is the classic case of a saint corrected by Rome.`,
		feast: '16 September'
	},
	irenaeus: {
		dates: 'c. 135–c. 202 · Smyrna, Lyon',
		life: `Irenaeus heard Polycarp of Smyrna preach as a boy, and Polycarp had known John. A priest at Lyon, he carried the letter of the martyrs of 177 to Rome and returned to succeed the martyred bishop Pothinus. About 190 he pleaded with Pope Victor for peace with the Asian churches over the date of Easter, living up to his name, "the peaceful". A tradition makes him a martyr under Septimius Severus.`,
		teaching: `Against the Heresies, five books against the Gnostics, set out the rule of faith, the succession of bishops from the apostles as the guarantee of the tradition, the four Gospels, and the Church of Rome as the church with which every church must agree. His theology is "recapitulation": Christ sums up Adam and undoes his fall, Mary unties the knot Eve tied; the flesh is good and will rise. "The glory of God is a living man, and the life of man is the vision of God."`,
		church: `Francis declared him a Doctor of the Church on 21 January 2022 with the title "Doctor of Unity", the first Father so named in the twenty-first century. Benedict XVI (2007) presented him as the first great theologian of the Church.`,
		particular: `He expected a literal thousand-year reign of Christ on earth, a hope the Church later set aside. His exposition of Mary as the new Eve is the root of Marian doctrine.`,
		feast: '28 June',
		titles: 'Doctor of the Church · Doctor of Unity'
	},
	'clement-alexandria': {
		dates: 'c. 150–c. 215 · Athens, Alexandria',
		life: `Born probably at Athens of pagan parents, Clement travelled among Christian teachers until he found Pantaenus at Alexandria and succeeded him in the catechetical school about 190. He left in the persecution of 202 and died in Cappadocia. Origen was his pupil.`,
		teaching: `His trilogy leads a pagan to the faith: the Protrepticus, an exhortation, the Paedagogus, Christ as the teacher of daily life, and the Stromata, "carpets" of miscellany on the "true gnostic" who knows by faith and love. Philosophy was for him a divine gift, the "Old Testament of the Greeks", preparing them for the Gospel as the Law prepared the Jews. In Who is the rich man that is saved? he taught that wealth is not the fault but the heart set on it.`,
		church: `Clement's name stood in the Roman Martyrology on 4 December until Clement VIII removed it on the advice of Baronius for passages that read as subordinationist or that seemed to deny that Christ needed to eat; Benedict XIV confirmed the removal in 1748 while praising his learning and his life. He is not venerated, but Benedict XVI (2007) presented him with honour as the first Christian to make philosophy a way to Christ.`,
		particular: `His "gnostic" language was later read against him; he meant the Christian who understands what he believes. He is the first Father to quote the pagan poets as freely as Scripture.`
	},
	'clement-rome': {
		dates: 'd. c. 99 · Rome',
		life: `Clement was the third successor of Peter at Rome, after Linus and Cletus, and some Fathers identified him with the Clement of Philippians 4,3. About 96, in the name of the Roman Church, he wrote to the Church of Corinth, where the young had deposed the presbyters. Later legend has him exiled to the Crimea and drowned with an anchor.`,
		teaching: `The Letter to the Corinthians is the oldest Christian writing outside the New Testament: it pleads for order, humility and the peace of the Church, and grounds the ministry in a succession from the apostles who were sent by Christ who was sent by God. It was read in the liturgy at Corinth for a century and stands in some early Bibles.`,
		church: `A saint, an Apostolic Father, named in the Roman Canon. Benedict XVI (2007) presented the letter as "the first exercise of the Roman primacy after Peter's death". The homily and the romance that bear his name are later.`,
		particular: `Rome speaks to Corinth uninvited, while the apostle John was still alive at Ephesus. The letter's prayer for rulers, under Domitian, is the model of the Church's prayer for the state.`,
		feast: '23 November'
	},
	ignatius: {
		dates: 'd. c. 107 · Antioch, Rome',
		life: `Bishop of Antioch, the second or third after Peter, Ignatius was condemned under Trajan and taken under guard to Rome to be thrown to the beasts. On the road, at Smyrna and Troas, he wrote seven letters to the churches that had sent to greet him and to Polycarp. He died in the amphitheatre, probably in 107.`,
		teaching: `The letters are the first witness to the threefold ministry of one bishop, presbyters and deacons in every church: "do nothing without the bishop". The Eucharist is "the flesh of our Saviour Jesus Christ", "the medicine of immortality"; the Church at Smyrna is the first text to say "catholic Church"; the Church of Rome "presides in love". Against the Docetists he insists that Christ truly ate, suffered and rose. To the Romans he begs not to be rescued: "I am God's wheat, to be ground by the teeth of the beasts".`,
		church: `A saint and martyr, an Apostolic Father, named in the Roman Canon. Benedict XVI (2007) called him "the doctor of unity" of the early Church, unity of God, of Christ and of the Church.`,
		particular: `No writer of the early Church speaks so personally; his letters were the pattern of martyrdom for centuries. His name for himself, "Theophorus", God-bearer, gave rise to the legend that he was the child Jesus set among the disciples.`,
		feast: '17 October'
	},
	hippolytus: {
		dates: 'c. 170–235 · Rome, Sardinia',
		life: `A priest at Rome, perhaps a pupil of Irenaeus, Hippolytus was the most learned man of the Roman Church and preached to Origen on a visit in 212. He accused Pope Zephyrinus of modalism and Pope Callistus of laxity toward sinners, and from 217 headed a party of his own, the first antipope. The emperor Maximinus exiled him with Pope Pontian to the mines of Sardinia in 235; there the two were reconciled and both died. Their bodies were brought to Rome together on 13 August and both honoured as martyrs.`,
		teaching: `He defended the Logos theology of the apologists against the modalists, distinguishing Father and Word so sharply that he was accused of two gods. His Refutation of All Heresies traces the heresies to the philosophers; his commentary on Daniel is the oldest Christian commentary to survive; his treatise on the Antichrist and his Chronicle were much read. The Apostolic Tradition, a church order with the oldest Roman Eucharistic prayer, has gone under his name since 1910, though the attribution is now contested; the second Eucharistic Prayer of the Roman Missal is drawn from it.`,
		church: `A saint and martyr, kept on 13 August with Pontian in the Roman calendar. The schism was forgiven in the reconciliation; the confusion it caused made him, in later legend, a soldier-martyr dragged by horses. The seated statue in the Vatican Library that lists his works is a restored figure whose identity is uncertain.`,
		particular: `The only antipope venerated as a saint. He held that the Church is a society of the holy and objected to the forgiveness of grave sins after baptism, the rigorism of Tertullian and Novatian.`,
		feast: '13 August'
	},
	justin: {
		dates: 'c. 100–165 · Flavia Neapolis, Rome',
		life: `Born a pagan at Flavia Neapolis, the old Shechem in Samaria, Justin went from the Stoics to the Peripatetics, the Pythagoreans and the Platonists in search of God, until an old man on the seashore pointed him to the prophets and to Christ. He kept the philosopher's cloak, taught in Rome above a bath-house, and wrote two Apologies to the emperors and the Dialogue with the Jew Trypho. Denounced, he was tried before the prefect Junius Rusticus with six companions and beheaded about 165; the record of the trial survives.`,
		teaching: `The Word who became flesh is the "seed-bearing Logos" whose seeds are in every man, so that "whatever has been said well by anyone belongs to us Christians" and Socrates was in a sense a Christian before Christ. The First Apology contains the earliest description of the Sunday Eucharist: the readings, the sermon, the prayers, the bread and wine "which we call Eucharist", over which "the president gives thanks". In the Dialogue he argues that the Old Testament theophanies were the Word.`,
		church: `A saint and martyr, the first Christian philosopher. Benedict XVI (2007) presented him as the one who made Christianity "the true philosophy", and the Second Vatican Council took his "seeds of the Word" for its view of other religions.`,
		particular: `He is a philosopher who never dropped the name and died a martyr for the same faith he argued. His account of the Mass, before 155, is the one non-believers were meant to read.`,
		feast: '1 June'
	},
	'leo-great': {
		dates: 'd. 461 · Rome',
		life: `A Tuscan, deacon under Popes Celestine and Sixtus III and already the ablest man in Rome, Leo was elected pope in 440 while on an embassy in Gaul. He met Attila at the Mincio in 452 and Rome was spared; in 455 he met Genseric at the gates and got a promise of no burning and no massacre, though the Vandals looted for a fortnight. He died on 10 November 461.`,
		teaching: `His Tome to Flavian (449) laid down that in Christ two natures, each keeping what is proper to it, are united in one person, and that each acts in communion with the other. Read at Chalcedon in 451, it was acclaimed with "Peter has spoken through Leo"; he then rejected the council's canon giving Constantinople second rank. His sermons, ninety-six of them, made the feasts into teaching: "Christian, recognise your dignity". He taught that Peter speaks in his successor and the successor's authority is Peter's.`,
		church: `Benedict XIV declared him a Doctor of the Church in 1754, the first pope so named. Benedict XVI (2008) presented him as the pope of Chalcedon and of the sermons.`,
		particular: `The legend of Peter and Paul appearing over his head to Attila is Raphael's; the sources say only that the king turned back. He is the first pope whose sermons survive.`,
		feast: '10 November',
		titles: 'Doctor of the Church'
	},
	'john-damascene': {
		dates: 'c. 675–749 · Damascus, Mar Saba',
		life: `John was born at Damascus under the caliphs into a Christian family that served as their financial officers; he may have held his father's office. About 725 he left for the monastery of Mar Saba in the Judaean desert, was ordained priest, and wrote there safely beyond the reach of the iconoclast emperors of Constantinople, who cursed him by name. He died about 749.`,
		teaching: `His three Discourses against those who attack the holy images (726–730) gave the theology of icons: matter is not evil, since God became matter and saved through matter, "I do not venerate matter but the Creator of matter who became matter for my sake"; veneration is not adoration. The Fount of Knowledge, with its third part, the Exact Exposition of the Orthodox Faith, was the first summa of theology, and through Latin translation fed Peter Lombard and Aquinas. His homilies on the Dormition teach Mary's assumption; his canons are sung at the Byzantine Easter. He treated Islam as a Christian heresy.`,
		church: `Leo XIII declared him a Doctor of the Church in 1890. The Second Council of Nicaea (787) vindicated his doctrine of images. Benedict XVI (2009) presented him as the last of the Greek Fathers and the teacher of the goodness of matter.`,
		particular: `He wrote in the caliphate, in freedom the Byzantine emperor did not allow; the Church's doctrine of images was worked out under Muslim rule. His hymns and his summa alike were meant to be used, not admired.`,
		feast: '4 December',
		titles: 'Doctor of the Church'
	},
	cassian: {
		dates: 'c. 360–435 · Scythia, Egypt, Marseille',
		life: `Born probably in Scythia Minor, the Romanian Dobruja, Cassian entered a monastery at Bethlehem about 380 and with his friend Germanus spent over a decade among the monks of Egypt. Ordained deacon by Chrysostom at Constantinople, he pleaded the exiled bishop's cause in Rome in 405. About 415 he founded two monasteries at Marseille, for men and for women, and wrote there for the monks of Gaul until his death.`,
		teaching: `The Institutes describe the coenobite's life and the eight principal vices; the Conferences report the teaching of the desert elders on prayer, discretion, purity of heart and the reading of Scripture. Benedict prescribed them for reading after supper, and through him they shaped Western monasticism. He wrote On the Incarnation against Nestorius at Leo's request.`,
		church: `A saint at Marseille and in the East, with a feast on 23 July in the Roman Martyrology; never a Doctor. His thirteenth Conference holds that the beginning of faith can come from man, which Prosper of Aquitaine attacked as Pelagian, and the Council of Orange (529) condemned semi-Pelagianism without naming him. The Church kept his monastic teaching and corrected his account of grace.`,
		particular: `The Church honours as a saint the man whose name is attached to an error. His "purity of heart" as the goal of the monk, and his eight vices, became the seven deadly sins through Gregory the Great.`,
		feast: '23 July'
	},
	eusebius: {
		dates: 'c. 260–339 · Caesarea in Palestine',
		life: `Pupil and adopted son of the martyr Pamphilus, whose name he took, Eusebius grew up in the library Origen had left at Caesarea and became its bishop about 313. He sat at Constantine's right hand at Nicaea (325), delivered the opening address and signed the creed with a letter of reservations to his flock. He had defended Arius before the council and worked against Athanasius after it, at Tyre in 335. He died about 339.`,
		teaching: `The Ecclesiastical History, in ten books, is the record of the first three centuries and preserves sources otherwise lost; the Chronicle set the history of the nations in parallel tables; the Preparation and Demonstration of the Gospel are the most learned apologetic of the ancient Church; the Onomasticon lists the places of the Bible, the canon tables the parallels of the Gospels. His commentaries on the Psalms and Isaiah are literal in Origen's manner.`,
		church: `Eusebius is not a saint: his sympathy for Arius, his campaign against Athanasius and his flattery of Constantine kept him off the calendar. Benedict XVI (2007) nonetheless called him "the first historian of Christianity" and "the greatest philologist of the ancient Church", and drew from him the reading of history as the trace of God's love.`,
		particular: `Without him the early Church would be nearly silent; with him it speaks in the voice of the imperial court. His Life of Constantine gives the vision of the cross before the Milvian bridge, on the emperor's oath.`
	},
	chrysologus: {
		dates: 'c. 380–450 · Imola, Ravenna',
		life: `Born at Imola, Peter was made bishop of Ravenna about 433 by Pope Sixtus III, against the wish of the local electors, when Ravenna was the residence of the Western court. He preached before the empress Galla Placidia, who is said to have given him his name, "golden-worded". He died about 450 at Imola.`,
		teaching: `One hundred and seventy-six of his sermons survive, short, plain and exact, on the Gospels of the year, the Creed and the Lord's Prayer; he urged daily communion, taught Mary's perpetual virginity and the forgiveness of sins, and preached against the Arians and the Monophysites in a city where both had a court.`,
		church: `Benedict XIII declared him a Doctor of the Church in 1729. His letter to Eutyches (449), advising him to submit to the bishop of Rome, "because Peter lives and presides in his own see", is an early witness to the primacy.`,
		particular: `He never preached long, "lest the people tire", and is the doctor of the short homily. The mosaics of Ravenna that show him with the imperial family are almost contemporary.`,
		feast: '30 July',
		titles: 'Doctor of the Church'
	},
	theophylact: {
		dates: 'c. 1050–after 1107 · Euboea, Constantinople, Ohrid',
		life: `Born at Chalcis on Euboea, Theophylact was a deacon of Hagia Sophia and tutor of the young prince Constantine Doukas, for whom he wrote a mirror of princes. About 1078 he was made archbishop of Ohrid, the Bulgarian church under Byzantine rule, and stayed for the rest of his life, complaining in his letters of the "barbarians" and defending their church's rights against the tax-collectors.`,
		teaching: `He wrote commentaries on the whole New Testament except the Apocalypse and on the minor prophets, sober, clear and useful, in close dependence on Chrysostom, for readers who could not manage the Fathers themselves. Aquinas cites him in the Catena Aurea; Erasmus used him, under the garbled name "Vulgarius", for the Greek New Testament.`,
		church: `A saint of the Orthodox Church (31 December), not of the Roman calendar; Catholics read him as a witness of the Greek tradition. On the Filioque he wrote that the difference between Greeks and Latins was one of words, not of faith, a moderate voice a generation after the schism of 1054.`,
		particular: `The last of the Greek commentators in the reader, and the bridge by which Chrysostom reached the Latin sixteenth century.`
	},
	rabanus: {
		dates: 'c. 780–856 · Mainz, Fulda, Tours',
		life: `Born at Mainz and given to the abbey of Fulda as a child, Rabanus was sent to Alcuin at Tours, who named him Maurus after Benedict's disciple. He led the school at Fulda, was abbot from 822 to 842, and archbishop of Mainz from 847 until his death on 4 February 856. His pupils called him "the teacher of Germany".`,
		teaching: `He wrote commentaries on most of the Bible, compiled from the Fathers for the monks and clergy who had no libraries; De universo, an encyclopaedia of things and their meanings; a handbook for the clergy; a martyrology; and poems, among them the figure-poems In Praise of the Holy Cross. The hymn Veni Creator Spiritus is ascribed to him. At the synod of Mainz in 848 he condemned the monk Gottschalk's teaching of double predestination.`,
		church: `"Blessed" in the calendars of Mainz, Fulda and Limburg (4 February), never formally canonised. Benedict XVI (2009) presented him as the teacher for whom faith touches the whole person, in word, image and song, and the liturgy is the school of beauty.`,
		particular: `Rabanus made no claim to originality: he set the Fathers in order so that the Carolingian Church could read them. His figure-poems are pictures made of letters, to be read and looked at at once.`,
		feast: '4 February'
	},
	alcuin: {
		dates: 'c. 735–804 · York, Aachen, Tours',
		life: `Educated at the cathedral school of York and its master after Ælberht, Alcuin met Charlemagne at Parma in 781 and followed him to Aachen to head the palace school, where he taught the king and his family and made the court the centre of learning in the West. In 796 he became abbot of St Martin at Tours, where he built up the school and the scriptorium, and died on 19 May 804.`,
		teaching: `His textbooks on grammar, rhetoric and dialectic, in dialogue form, taught the liberal arts for centuries; he revised the text of the Vulgate for the emperor, supplemented the Roman sacramentary with the Gallican feasts, and wrote commentaries on Genesis, the Psalms, the Song of Songs and John. Against Adoptionism, the Spanish teaching that Christ as man was God's adopted son, he wrote seven books and persuaded its author Felix to recant at Aachen in 799.`,
		church: `Called "Blessed" in some calendars (20 May), without a formal cult in the Roman Church. He is the mind of the Carolingian renaissance, "the schoolmaster of his age".`,
		particular: `He told Charlemagne that faith cannot be forced on the Saxons and that tithes should not be demanded of the newly converted, one of the few voices against the forced conversions. He signed himself "Flaccus", after Horace.`
	},
	remigius: {
		dates: 'c. 841–908 · Auxerre, Reims, Paris',
		life: `A monk of Saint-Germain at Auxerre, pupil of Heiric and through him of Haimo, Remigius taught at Auxerre, was called to Reims by archbishop Fulk in 893 to restore its schools, and taught in Paris at the end of his life. He died in 908.`,
		teaching: `He commented on Genesis, the Psalms, the minor prophets and Matthew, and glossed the school authors, Donatus, Boethius, Martianus Capella, drawing on Eriugena and the Carolingian tradition. Grammar and the liberal arts were for him the way into Scripture. The Catena Aurea quotes him on Matthew.`,
		church: `No cult. He is the last teacher of the Carolingian schools, whose glosses fed the twelfth century.`,
		particular: `Not to be confused with Remigius of Reims, the bishop who baptised Clovis, under whose name some of the sources list him.`
	},
	haimo: {
		dates: 'd. c. 865 · Auxerre',
		life: `A monk of Saint-Germain at Auxerre, teacher of Heiric, Haimo is known only from his works; the Carolingian school of Auxerre, Haimo, Heiric, Remigius, is its succession of masters.`,
		teaching: `He wrote commentaries on Paul, the Apocalypse, Isaiah, the minor prophets and the Song of Songs, compiled from the Fathers and sharpened into a teaching of his own on the real presence in the Eucharist and on the Church. His Apocalypse commentary fed Adso's letter on the Antichrist.`,
		church: `No cult. For eight centuries his works were printed under the name of Haymo of Halberstadt, a bishop of the same century, and stand so in Migne's Patrology; the Catena Bible lists him as "Haymo".`,
		particular: `The first medieval commentator to read Paul through Augustine's doctrine of grace at length, and an early witness to the eucharistic realism the Berengarian controversy would later make a dogma.`
	},
	lactantius: {
		dates: 'c. 250–325 · Africa, Nicomedia, Trier',
		life: `An African pupil of Arnobius, Lactantius was called by Diocletian to teach Latin rhetoric at Nicomedia and lost his chair when the persecution began in 303. He wrote in poverty, and about 317 Constantine made him tutor to his son Crispus at Trier.`,
		teaching: `The Divine Institutes, in seven books, are the first attempt at a full account of Christian teaching in Latin, addressed to the educated pagan in Cicero's manner; the humanists called him "the Christian Cicero". On the Deaths of the Persecutors tells how each persecutor came to a bad end, and preserves the story of Constantine's vision. On the Workmanship of God and On the Anger of God are apologetic.`,
		church: `Not a saint. Jerome wished "he had taught our things as well as he destroyed the others'": his theology is thin, he held a literal millennium, treated the devil almost as a second principle, and said little of the Holy Spirit. The Gelasian Decree of the sixth century listed his works among the apocrypha.`,
		particular: `He is read for his Latin and his history rather than his doctrine; the reader has him as a witness to the age of Constantine.`
	},
	anselm: {
		dates: '1033–1109 · Aosta, Bec, Canterbury',
		life: `Born at Aosta, Anselm left home after a quarrel with his father, wandered in Burgundy and Normandy, and entered the abbey of Bec under Lanfranc in 1060. He was prior at thirty, abbot in 1078, and in 1093 archbishop of Canterbury, a post William Rufus forced on him and then fought him over. Twice exiled over the king's claim to invest bishops, under William and Henry I, he won the point in 1107 and died at Canterbury on 21 April 1109.`,
		teaching: `The Monologion argues to God from the good things we know; the Proslogion finds in the definition "that than which nothing greater can be thought" a proof that God exists, the "ontological argument" that Aquinas rejected and Bonaventure, Descartes and Hegel kept. Cur Deus homo explains the Incarnation by satisfaction: sin owes God an honour only God can pay and only man ought to, so the God-man pays it. His prayers and meditations began the affective devotion of the Middle Ages. "Faith seeking understanding", "I believe in order to understand", are his rule.`,
		church: `Clement XI declared him a Doctor of the Church in 1720, "the magnificent Doctor", the father of scholastic theology. Benedict XVI (2009) presented his three steps of faith, experience and contemplation and his courage before the kings.`,
		particular: `His pupil Eadmer took his teaching on original sin further than he had to argue Mary's Immaculate Conception, which Anselm himself did not hold. He refused to be archbishop until the bishops forced the crozier into his hand.`,
		feast: '21 April',
		titles: 'Doctor of the Church · the Magnificent Doctor'
	},
	bernard: {
		dates: '1090–1153 · Fontaines, Cîteaux, Clairvaux',
		life: `Born at Fontaines near Dijon into the lesser nobility, Bernard entered the new monastery of Cîteaux in 1112 with thirty relatives and friends he had persuaded to come. In 1115 he was sent to found Clairvaux, and from that valley governed the growth of the Cistercians to sixty-eight daughter houses in his lifetime. He decided the papal schism of 1130 for Innocent II, had Abelard condemned at Sens in 1140, preached the Second Crusade at Vézelay in 1146 and bore the blame for its failure. He died on 20 August 1153.`,
		teaching: `The eighty-six Sermons on the Song of Songs, which reach only the third chapter, are the classic of Western mystical theology, the soul as bride of the Word. On Loving God sets four degrees of love; On Grace and Free Choice reconciles Augustine with freedom; the Book on Consideration told his former monk, Pope Eugene III, what a pope is for. His Marian sermons, "look at the star, call on Mary", made him the doctor of devotion to her.`,
		church: `Canonised in 1174, declared a Doctor of the Church by Pius VIII in 1830, "the mellifluous Doctor". Benedict XVI (2009) set him beside Abelard as the theologian of the heart: "God is better sought in prayer than in discussion".`,
		particular: `Bernard opposed the new feast of Mary's Conception in a letter to the canons of Lyon (1140), holding that she was sanctified in the womb after conception, the view Aquinas would share; the dogma of 1854 went the other way. His polemic against the Cluniac churches, their size and their carvings, is the Cistercian aesthetic in a paragraph.`,
		feast: '20 August',
		titles: 'Doctor of the Church · the Mellifluous Doctor'
	},
	aquinas: {
		dates: '1224/5–1274 · Roccasecca, Paris, Naples, Fossanova',
		life: `Born at Roccasecca, the castle of the counts of Aquino, Thomas was given to Monte Cassino at five and sent to the university of Naples at fourteen, where he met the Dominicans and joined them in 1244. His brothers seized him and held him in the family castle for a year; he did not change his mind. Under Albert the Great at Paris and Cologne he was "the dumb ox"; at Paris he became master of theology in 1256, then taught at Orvieto, Rome, Paris again and Naples.

On 6 December 1273, after Mass, he stopped writing: "all I have written seems like straw compared with what I have seen". He died on 7 March 1274 at the Cistercian abbey of Fossanova on the way to the Council of Lyon.`,
		teaching: `The Summa theologiae, five hundred and twelve questions, unfinished, orders the whole of theology from God through creation and the human return to God in Christ and the sacraments; the Summa contra gentiles argues with those who share no Scripture. He commented on Aristotle and on Job, the Psalms, Isaiah, Jeremiah, Matthew, John and Paul. The Catena Aurea, made for Urban IV (1263–1268), strings the Fathers, Greek and Latin, into one continuous gloss on the four Gospels; the reader's chain is his.

Grace perfects nature and does not destroy it; faith and reason are two ways to one truth; the five ways lead to God from the world; the Eucharist is transubstantiation. He wrote the office of Corpus Christi, "Pange lingua", "Adoro te".`,
		church: `Canonised in 1323, declared a Doctor of the Church by Pius V in 1567 and named "the common Doctor" and "the angelic Doctor". Leo XIII's Aeterni Patris (1879) made him the norm of Catholic philosophy; the Second Vatican Council and the Code of Canon Law still name him as the teacher of seminarians. Benedict XVI devoted three catecheses to him (2010).`,
		particular: `Before the crucifix at Naples he was heard to be told "you have written well of me, Thomas; what reward will you have?" and to answer "nothing but yourself, Lord". He denied the Immaculate Conception in the form then proposed, holding that Mary was sanctified after animation; the dogma of 1854 followed Scotus. He is a medieval, not a Father, and appears in the reader as the compiler of the Fathers.`,
		feast: '28 January',
		titles: 'Doctor of the Church · the Angelic Doctor · the Common Doctor'
	},
	glossa: {
		dates: '12th century · Laon, Paris',
		life: `The Glossa Ordinaria is not a person but the standard commentary of the medieval schools: short extracts from the Fathers written in the margins of the Latin Bible and between its lines. It was begun at Laon by Anselm of Laon († 1117) and his brother Ralph, continued by Gilbert the Universal on the Old Testament, and finished at Paris in the second half of the twelfth century, where Peter Lombard's glosses on the Psalms and Paul replaced the older ones.`,
		teaching: `The sources are Augustine, Jerome, Gregory, Bede, Isidore, Rabanus, Haimo and Origen in Latin. Every student of theology read the Bible with the Gloss around it; Aquinas cites "the Gloss" as an authority in itself, and in the Catena Aurea the "interlinear Gloss" is one voice among the Fathers.`,
		church: `It was attributed to Walafrid Strabo until Beryl Smalley showed the Laon origin in the twentieth century. First printed at Strasbourg by Adolph Rusch in 1480/81, it stayed the reference commentary into the early modern period until the Postills of Hugh of Saint-Cher and Nicholas of Lyra took its place.`,
		particular: `The reader shows it with initials, since there is no face to show. Its entries in the chain are the anonymous voice of the medieval school.`
	},
	lapide: {
		dates: '1567–1637 · Bocholt, Louvain, Rome',
		life: `Born at Bocholt in the Flemish Campine, Cornelis van den Steen, "a Lapide" in Latin, studied at Maastricht, Cologne, Douai and Louvain and entered the Jesuits in 1592. He taught Scripture and Hebrew at Louvain from 1596 and at the Roman College from 1616 until his death on 12 March 1637.`,
		teaching: `He commented on every book of the Bible except Job and the Psalms, in folio volumes published from 1614 to 1645 that gather the Fathers, the rabbis and the scholastics on each verse and give the literal, allegorical, moral and anagogical senses side by side, with the preacher in mind. The commentaries were reprinted across Europe for two centuries; the English translation of the Gospels (1876–1908) is the source of the extracts in the reader.`,
		church: `No cause has been opened; he is honoured as the great Catholic commentator of the Counter-Reformation, "the most important of Catholic scriptural commentators" in the judgement of his age, and Haydock drew on him throughout.`,
		particular: `Lapide is a library on every verse, gathering more than he judges. He is the last of the commentators to give the four senses of Scripture with equal weight.`
	},
	haydock: {
		dates: '1774–1849 · Cottam, Douai, Penrith',
		life: `Born at Cottam in Lancashire into an old recusant family, George Leo Haydock studied at Douai and fled the French Revolution in 1793 to finish at Crook Hall. Ordained in 1798, he served the missions of Ugthorpe on the Yorkshire moors, Whitby, Westby and Penrith, was suspended from 1831 to 1839 in a quarrel with his bishop and restored, and died at Penrith on 29 November 1849.`,
		teaching: `The Haydock Bible (Manchester 1811–1814, printed by his brother Thomas) set the Douay-Rheims text within a commentary compiled from the Fathers and from Calmet, Estius, Menochius, Tirinus and Witham, with his own notes against Protestant and deist objections. It was the most popular English Catholic Bible of the nineteenth century, reprinted in America and Ireland for a hundred years.`,
		church: `A parish priest and compiler, without cause or title. His notes are pre-critical and often polemical, and are read today as a witness of Catholic apologetics before the biblical movement.`,
		particular: `Haydock is the "modern" voice in the reader, off by default: brief, combative and practical, the note a priest could read from the pulpit.`
	},
	challoner: {
		dates: '1691–1781 · Lewes, Douai, London',
		life: `Born at Lewes in Sussex to a Presbyterian cooper and a mother who became a Catholic in service, Challoner was sent to Douai in 1705 and spent twenty-five years there as student, professor and vice-president. From 1730 he worked in London in disguise among the Catholic poor, was made coadjutor bishop in 1741 and vicar apostolic of the London District in 1758. During the Gordon Riots of 1780 the eighty-nine-year-old bishop was hidden by friends; he died on 12 January 1781 and was reburied in Westminster Cathedral in 1946.`,
		teaching: `He revised the Douay-Rheims Bible (1749–1752), replacing its Latinate English with plainer words and adding short notes; the "Douay" Bible read by English-speaking Catholics until the twentieth century, and the English text in this reader, is his. The Garden of the Soul (1740) was the English Catholic prayer book for two centuries; the Memoirs of Missionary Priests (1741) recorded the martyrs of the Reformation and prepared their canonisation.`,
		church: `Not beatified; honoured as the bishop who kept the faith alive in England in its lowest years. Cardinal Newman called the Catholics of his time "the Church of Challoner".`,
		particular: `His notes in the reader are a bishop's marginal notes for people who had no other book: short, doctrinal, and careful to defend the Church's reading.`
	},
	erasmus: {
		dates: '1466/9–1536 · Rotterdam, Louvain, Basel',
		life: `The illegitimate son of a priest, Erasmus was placed with the Augustinian canons at Steyn, ordained in 1492 and released from the cloister by papal dispensation. He studied at Paris, made friends in England with More and Colet, and lived by his pen at Louvain, Basel and Freiburg as the most famous scholar in Europe. He died at Basel on 12 July 1536.`,
		teaching: `His Novum Instrumentum (1516) was the first printed Greek New Testament, with a new Latin translation and Annotations that founded modern textual study; his Paraphrases of the New Testament were read from every English pulpit under Edward VI. The Enchiridion taught an inward piety, the Praise of Folly mocked the Church's abuses; his editions of Jerome, Cyprian, Ambrose and Augustine gave the Fathers to the sixteenth century.`,
		church: `He refused to follow Luther, answered him on free will (1524) and was answered with The Bondage of the Will. Paul IV's Index of 1559 banned all his works, the Index of Trent (1564) only some; the Sorbonne had censured thirty-two propositions in 1527. Today he is read as the Catholic reformer who stayed in the Church, and his Annotations are the "Erasmus" in the reader.`,
		particular: `Erasmus doubted the Johannine comma and the authorship of Hebrews, questioned relics and pilgrimages, and said that "the sum of our religion is peace". He is the humanist among the commentators and the only one who was never a theologian by profession.`
	},
	ambrosiaster: {
		dates: 'fl. 366–384 · Rome',
		life: `"Ambrosiaster" is the name Erasmus gave in 1527 to the unknown author of a commentary on the thirteen letters of Paul, written at Rome under Pope Damasus, that had passed for centuries as the work of Ambrose. Who he was is still debated: a Roman priest, perhaps Hilary the deacon, perhaps the converted Jew Isaac.`,
		teaching: `His commentary is literal, historical and sober, the best Latin exegesis of Paul before Pelagius, and the Questions on the Old and New Testament under Augustine's name are also his. On Romans 5,12 he read "in whom all sinned" of Adam, and Augustine took the reading into his doctrine of original sin; Pelagius used him too.`,
		church: `A name for a text, without cult or title. He is read as the voice of the Roman Church of the fourth century.`,
		particular: `The one commentator in the reader without a face or a name, the "would-be Ambrose".`
	},
	'pseudo-chrysostom': {
		dates: '5th century',
		life: `The Catena Aurea cites under Chrysostom's name the Opus imperfectum in Matthaeum, an unfinished Latin commentary on Matthew written about 400–450 by an Arian author, probably in the Danube provinces, which the Middle Ages took for a translation of the Golden Mouth. Aquinas knew it was suspect and marked it; the reader keeps the label so that the chain reads as he wrote it.`
	},
	'pseudo-augustine': {
		dates: '5th–8th century',
		life: `Sermons and treatises that circulated under Augustine's name and were later shown to be by others: Caesarius of Arles, Quodvultdeus, Fulgentius and unknown preachers. Where the Catena Aurea cites one, the reader labels it "Pseudo-Augustine".`
	},
	'pseudo-jerome': {
		dates: '5th–7th century',
		life: `Texts once printed among Jerome's works and now known not to be his, the Breviarium in Psalmos above all, and the commentary on Mark that the Catena Aurea quotes. The reader keeps the label Aquinas's sources give.`
	},
	'greek-expositor': {
		dates: 'various',
		life: `The Catena Aurea sometimes quotes a Greek scholion whose author its source did not name, or gave a name Aquinas could not verify: the reader lists these as "a Greek expositor", as he did.`
	},
	'douay-1609': {
		dates: '1582–1610 · Rheims, Douai',
		life: `The annotators of the original Douay-Rheims Bible, the English College's New Testament of 1582 and Old Testament of 1609–1610, Gregory Martin, William Allen, Richard Bristow and Thomas Worthington. Their notes are long, learned and controversial, written against the Protestant translations; Challoner shortened them in 1750, and the few that reach the reader come through the Catena Bible.`
	},
	'aquinas-study-bible': {
		dates: '21st century',
		life: `Editorial notes of a modern compilation that gathers the Fathers and Aquinas on each verse; the reader carries them as one of the modern sources, off by default.`
	}
};
