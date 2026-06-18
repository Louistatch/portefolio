from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
import copy

GREEN = RGBColor(0x0D, 0x94, 0x88)
DARK = RGBColor(0x1E, 0x29, 0x3B)
GRAY = RGBColor(0x64, 0x74, 0x8B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = RGBColor(0xF1, 0xF5, 0xF9)
ORANGE = RGBColor(0xD9, 0x77, 0x06)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
SW = prs.slide_width
SH = prs.slide_height

blank_layout = prs.slide_layouts[6]

def new_slide():
    return prs.slides.add_slide(blank_layout)

def add_rect(slide, left, top, w, h, fill=None):
    shape = slide.shapes.add_shape(1, int(left), int(top), int(w), int(h))
    shape.line.fill.background()
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    else:
        shape.fill.background()
    return shape

def add_text(slide, left, top, w, h, text, size=14, bold=False, color=DARK, align=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(int(left), int(top), int(w), int(h))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align
    return tf

def add_bullets(slide, left, top, w, h, lines, size=16, color=DARK):
    txBox = slide.shapes.add_textbox(int(left), int(top), int(w), int(h))
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = line
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.space_before = Pt(4)
    return tf

# ──────────────────── SLIDE BUILDERS ────────────────────

def title_slide(title, subtitle=""):
    s = new_slide()
    add_rect(s, 0, 0, SW, SH, fill=GREEN)
    add_text(s, Inches(1), Inches(2), Inches(11.3), Inches(2.5),
             title, size=40, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    if subtitle:
        add_text(s, Inches(1), Inches(4.5), Inches(11.3), Inches(1.5),
                 subtitle, size=20, color=RGBColor(0xCC,0xFB,0xF1), align=PP_ALIGN.CENTER)
    add_text(s, Inches(1), Inches(6.5), Inches(11.3), Inches(0.5),
             "DataMEAL Academy — Formation des Formateurs", size=12,
             color=RGBColor(0x99,0xF6,0xE4), align=PP_ALIGN.CENTER)

def section_slide(month, subtitle):
    s = new_slide()
    add_rect(s, 0, 0, SW, SH, fill=DARK)
    add_text(s, Inches(1), Inches(2.5), Inches(11.3), Inches(1),
             month, size=36, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
    add_text(s, Inches(1), Inches(3.8), Inches(11.3), Inches(1),
             subtitle, size=20, color=GRAY, align=PP_ALIGN.CENTER)

def lesson_title(num, title, duration, material):
    s = new_slide()
    add_rect(s, 0, 0, Inches(0.12), SH, fill=GREEN)
    badge = add_rect(s, Inches(0.8), Inches(1.5), Inches(1.1), Inches(1.1), fill=GREEN)
    add_text(s, Inches(0.8), Inches(1.7), Inches(1.1), Inches(0.8),
             str(num), size=40, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(s, Inches(2.5), Inches(1.2), Inches(10), Inches(0.5),
             f"Leçon {num}", size=16, bold=True, color=GREEN)
    add_text(s, Inches(2.5), Inches(1.8), Inches(10), Inches(1.5),
             title, size=30, bold=True, color=DARK)
    add_text(s, Inches(2.5), Inches(3.5), Inches(10), Inches(0.5),
             f"Durée : {duration}  |  Matériel : {material}", size=14, color=GRAY)

def content_slide(title, bullets, callout_title=None, callout_text=None, callout_color=GREEN):
    s = new_slide()
    add_rect(s, 0, 0, Inches(0.07), SH, fill=GREEN)
    add_text(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.7),
             title, size=26, bold=True, color=DARK)
    bw = Inches(7) if callout_title else Inches(12)
    add_bullets(s, Inches(0.5), Inches(1.3), bw, Inches(5.5), bullets, size=16)
    if callout_title and callout_text:
        box = add_rect(s, Inches(8), Inches(1.3), Inches(4.8), Inches(4.5), fill=LIGHT_BG)
        add_text(s, Inches(8.3), Inches(1.5), Inches(4.3), Inches(0.6),
                 callout_title, size=14, bold=True, color=callout_color)
        add_text(s, Inches(8.3), Inches(2.2), Inches(4.3), Inches(3.3),
                 callout_text, size=13, color=DARK)

def table_slide(title, headers, rows):
    s = new_slide()
    add_rect(s, 0, 0, Inches(0.07), SH, fill=GREEN)
    add_text(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.7),
             title, size=26, bold=True, color=DARK)
    ncols = len(headers)
    nrows = len(rows) + 1
    tw = min(Inches(12.5), Inches(3) * ncols)
    rh = min(Inches(0.5), Inches(5.5) / nrows)
    tbl = s.shapes.add_table(nrows, ncols, Inches(0.5), Inches(1.3), int(tw), int(rh * nrows)).table
    for i, h in enumerate(headers):
        c = tbl.cell(0, i)
        c.text = h
        c.fill.solid(); c.fill.fore_color.rgb = GREEN
        for p in c.text_frame.paragraphs:
            p.font.size = Pt(12); p.font.bold = True; p.font.color.rgb = WHITE
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            c = tbl.cell(ri+1, ci)
            c.text = str(val)
            c.fill.solid()
            c.fill.fore_color.rgb = WHITE if ri % 2 == 0 else LIGHT_BG
            for p in c.text_frame.paragraphs:
                p.font.size = Pt(11); p.font.color.rgb = DARK

def quiz_slide(question, options, answer_idx):
    s = new_slide()
    add_rect(s, 0, 0, SW, SH, fill=RGBColor(0xF0,0xFD,0xFA))
    add_rect(s, 0, 0, Inches(0.07), SH, fill=GREEN)
    badge = add_rect(s, Inches(0.5), Inches(0.4), Inches(0.9), Inches(0.45), fill=GREEN)
    add_text(s, Inches(0.5), Inches(0.42), Inches(0.9), Inches(0.45),
             "QUIZ", size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(s, Inches(0.5), Inches(1.2), Inches(12), Inches(1),
             question, size=22, bold=True, color=DARK)
    for i, opt in enumerate(options):
        letter = chr(65 + i)
        y = Inches(2.7 + i * 0.95)
        is_ans = (i == answer_idx)
        fc = GREEN if is_ans else WHITE
        tc = WHITE if is_ans else DARK
        add_rect(s, Inches(1.2), y, Inches(10.5), Inches(0.7), fill=fc)
        add_text(s, Inches(1.5), int(y) + Pt(6), Inches(10), Inches(0.6),
                 f"{letter}.  {opt}", size=16, bold=is_ans, color=tc)

# ══════════════════════════════════════════════════
# BUILD
# ══════════════════════════════════════════════════

title_slide("Formation des Formateurs\nGestion Financière Paysanne",
            "Parcours andragogique de 3 mois — 12 sessions\nDataMEAL Academy | TOF-FIN-01")

table_slide("Programme — 12 sessions sur 3 mois",
    ["#", "Période", "Thème", "Activité pratique"],
    [["1","Mois 1","Posture du formateur rural","Cercle de parole"],
     ["2","Mois 1","D'où vient et où va l'argent ?","Cailloux entrants/sortants"],
     ["3","Mois 1","Budget familial en graines","12 tas + graines maïs/haricots"],
     ["4","Mois 1","Épargne, tontine et AVEC","Simulation tontine en cercle"],
     ["5","Mois 2","Coût de production agricole","Calcul collectif au tableau"],
     ["6","Mois 2","Planifier la campagne","Corde des saisons"],
     ["7","Mois 2","Le crédit : opportunité ou piège ?","Jeu de rôle 3 prêteurs"],
     ["8","Mois 2","Vendre au bon moment","Courbe des prix au sol"],
     ["9","Mois 3","Gérer les risques financiers","Méthode des 3 enveloppes"],
     ["10","Mois 3","Structurer une session APCA","Préparer une fiche de session"],
     ["11","Mois 3","Pratique supervisée","Chaque stagiaire anime 20 min"],
     ["12","Mois 3","Plan d'action communautaire","Engagement collectif"]])

content_slide("Approche andragogique : 5 principes",
    ["1. L'adulte a besoin de savoir POURQUOI — Commencer par un problème concret",
     "2. L'adulte apporte son expérience — Faire parler les anciens d'abord",
     "3. L'adulte veut décider lui-même — Proposer, ne jamais imposer",
     "4. L'adulte apprend pour résoudre un problème immédiat",
     "5. L'adulte est motivé par des résultats concrets"],
    "Règle d'or du facilitateur",
    "Le formateur parle 20% du temps maximum. Les 80% restants, ce sont les participants qui parlent, réfléchissent, calculent et échangent entre eux.",
    GREEN)

content_slide("Le cycle APCA — Canevas de chaque session",
    ["A — ACCROCHE (15 min) : Problème vécu, histoire, question provocante",
     "",
     "P — PRATIQUE (60 min) : Activité participative (cailloux, jeu de rôle, calcul)",
     "",
     "C — CONCEPTUALISATION (20 min) : Le GROUPE formule la leçon — pas le formateur",
     "",
     "A — ACTION (15 min) : Engagement concret avant la prochaine session",
     "",
     "Durée totale : 2h maximum."],
    "Pourquoi APCA ?",
    "Les adultes retiennent 20% de ce qu'ils entendent, 50% de ce qu'ils voient, mais 80% de ce qu'ils FONT.",
    RGBColor(0x25,0x63,0xEB))

# ═══ MOIS 1 ═══
section_slide("MOIS 1", "Comprendre l'argent du paysan — Semaines 1 à 4")

lesson_title(1, "Posture du formateur-animateur en milieu rural", "2h", "cercle de chaises, images parlantes")
content_slide("Vous n'êtes pas un professeur, vous êtes un facilitateur",
    ["Les paysans ont 20-40 ans d'expérience. Ils savent déjà beaucoup.",
     "Votre rôle : faciliter la prise de conscience, PAS enseigner.",
     "",
     "Boîte à outils du facilitateur :",
     "  • L'arbre à problèmes — dessiner causes/conséquences au sol",
     "  • Le cercle de parole — chacun parle à son tour",
     "  • Les images parlantes — dessins sans texte",
     "  • Le jeu de rôle — simuler des situations financières",
     "  • Les cailloux/graines — compter, représenter, répartir"],
    "Le piège du débutant",
    "Un formateur arrive avec des PowerPoint et du jargon comptable. Les paysans s'ennuient et ne reviennent pas. Ce qui marche : s'asseoir sous l'arbre à palabres, écouter d'abord.",
    ORANGE)
quiz_slide("Un formateur rural efficace consacre quelle proportion du temps à écouter ?",
    ["20% écoute, 80% cours", "50/50", "80% écoute et facilitation, 20% apport", "100% cours"], 2)

lesson_title(2, "D'où vient et où va l'argent du paysan ?", "2h", "sol sableux, cailloux 2 couleurs, bâton")
content_slide("Activité terrain : la carte des flux d'argent",
    ["1. Grand cercle au sol = la famille / le ménage",
     "2. « D'où vient l'argent ? » — cailloux verts ENTRANTS",
     "3. « Où part l'argent ? » — cailloux rouges SORTANTS",
     "4. Le groupe débat et complète",
     "",
     "4 sources de revenus typiques :",
     "  • Vente de récolte (1-2x/an, gros montant)",
     "  • Petit commerce (quotidien, petits montants)",
     "  • Travail journalier (saisonnier, variable)",
     "  • Transferts diaspora (irrégulier)"],
    "Le problème fondamental",
    "Les REVENUS sont saisonniers mais les DÉPENSES sont permanentes. Le paysan traverse 7-9 mois de déficit chaque année.",
    RGBColor(0x25,0x63,0xEB))
quiz_slide("Quel problème l'activité des cailloux fait-elle apparaître ?",
    ["Il ne gagne pas assez", "Revenus saisonniers mais dépenses permanentes",
     "Trop de cérémonies", "Il ne sait pas compter"], 1)

lesson_title(3, "Construire un budget familial avec les paysans", "3h", "graines (maïs, haricots), 12 cuvettes, feuille A3")
content_slide("L'outil central : le budget en tas de graines",
    ["1. 12 tas de sable en ligne = janvier à décembre",
     "2. 100 graines de maïs = tout l'argent gagné en un an",
     "3. « Répartissez dans les mois où vous recevez de l'argent »",
     "4. 100 graines de haricots = les dépenses par mois",
     "5. Le paysan VOIT les mois de galère",
     "",
     "Puis tableau papier simplifié :",
     "  Mois | Ce qui rentre | Ce qui sort | Il reste",
     "",
     "Les montants viennent DU PAYSAN, pas de vous."],
    "Témoignage terrain (Mali)",
    "« Quand Mamadou a vu que pendant 7 mois il avait plus de haricots que de maïs, il a dit : Ah, c'est pour ça qu'on souffre ! Il le vivait mais ne l'avait jamais VU. »",
    RGBColor(0x25,0x63,0xEB))
quiz_slide("Pourquoi utiliser des graines plutôt qu'un tableau écrit ?",
    ["C'est moins cher", "Les non-alphabétisés participent et VOIENT le déséquilibre",
     "Plus joli", "C'est obligatoire"], 1)

lesson_title(4, "L'épargne paysanne : tontines, AVEC et stratégies locales", "2h30", "dessins, graines")
content_slide("Les paysans épargnent DÉJÀ — mais comment ?",
    ["Tour de cercle : « Où gardez-vous votre argent ? »",
     "  • Sous le matelas / pot enterré",
     "  • Grenier (stock grain = épargne en nature !)",
     "  • Tontine du village",
     "  • Mobile money",
     "",
     "La tontine : 10 membres × 5 000 FCFA/semaine",
     "  = 50 000 FCFA pour 1 membre chaque semaine",
     "",
     "Simulation : 10 volontaires en cercle avec des graines",
     "Question : « À quoi sert la tontine si on reçoit ce qu'on donne ? »",
     "Réponse du groupe : Elle FORCE l'épargne et donne un gros montant d'un coup."],
    "Le grenier = un compte épargne",
    "Stocker du mil à 250 FCFA/kg en novembre, revendre à 400 FCFA/kg en juillet. Rendement de 60% ! VALORISEZ cette intelligence paysanne.",
    GREEN)
table_slide("Comparaison des formes d'épargne",
    ["Type", "Avantage", "Risque"],
    [["Sous le matelas", "Disponible immédiatement", "Vol, tentation"],
     ["Grenier (stock grain)", "+60% de valeur en 6 mois", "Insectes, incendie"],
     ["Tontine simple", "Force l'épargne", "Défaillance d'un membre"],
     ["AVEC / VSLA", "Épargne + crédit + fonds social", "Nécessite formation"],
     ["Mobile money", "Sécurisé", "Frais, réseau"]])
quiz_slide("Quel est le principal avantage de la tontine ?",
    ["Intérêts élevés", "Force l'épargne et donne un gros montant d'un coup",
     "Remplace la banque", "Gratuite"], 1)

# ═══ MOIS 2 ═══
section_slide("MOIS 2", "Gérer et planifier — Semaines 5 à 8")

lesson_title(5, "Calculer le coût de production avec les paysans", "3h", "grande feuille, graines, dessins")
content_slide("Le paysan connaît-il le vrai coût de sa production ?",
    ["Animation : « Combien vous coûte un sac de maïs ? »",
     "1. Dessinez un grand champ au tableau/sol",
     "2. « Pour cultiver 1 ha, qu'est-ce qu'il vous faut ? »",
     "3. Le groupe liste : semences, engrais, labour, sarclage...",
     "4. Pour CHAQUE élément : « Combien ça coûte ? »",
     "5. Additionnez ensemble.",
     "",
     "Le coût invisible : la main-d'œuvre familiale",
     "« Si votre femme allait vendre au marché au lieu de sarcler,",
     "  combien gagnerait-elle ? » = coût d'opportunité"],
    "Le choc du calcul",
    "Au nord-Cameroun, un paysan vendait son sac à 8 000 FCFA. Coût réel : 9 500 FCFA/sac. Il travaillait à PERTE depuis des années sans le savoir.",
    ORANGE)
table_slide("Coût de production — 1 hectare de maïs",
    ["Poste", "Montant (FCFA)"],
    [["Semences (20 kg)", "15 000"],
     ["Engrais NPK (2 sacs)", "40 000"],
     ["Engrais urée (1 sac)", "22 000"],
     ["Labour", "25 000"],
     ["Main-d'œuvre (semis+sarclage+récolte)", "57 000"],
     ["Transport + stockage", "16 000"],
     ["TOTAL", "175 000"],
     ["Coût par sac (20 sacs/ha)", "8 750 FCFA = prix plancher"]])
quiz_slide("Sac vendu 8 000 FCFA, coût réel 9 500 FCFA. Situation ?",
    ["Bénéfice 1 500", "Perte de 1 500 FCFA par sac", "Équilibre", "Impossible à dire"], 1)

lesson_title(6, "Planifier financièrement la campagne agricole", "3h", "corde 3m, 12 noeuds, cartons illustrés")
content_slide("Le calendrier cultural = le calendrier financier",
    ["Activité : La corde des saisons",
     "1. Corde 12 nœuds entre deux piquets",
     "2. Placer les cartons : labour, semis, sarclage, récolte, vente",
     "3. Sous chaque carton : graines = argent nécessaire",
     "4. « En avril, vous avez l'argent pour les intrants ? »",
     "",
     "Stratégie d'épargne anticipée :",
     "  Besoins avril : ~80 000 FCFA",
     "  Mois pour épargner (nov-mars) : 5 mois",
     "  = 16 000 FCFA/mois",
     "  Concret, atteignable, brise le cycle d'endettement"],
    "Le cercle vicieux",
    "Avril : plus d'argent → emprunt au commerçant → remboursement en nature à la récolte (prix le plus bas) → perte de 30-50%. Chaque année.",
    ORANGE)
quiz_slide("Pourquoi le paysan s'endette-t-il en avril ?",
    ["Paresse", "Pas d'épargne planifiée pour les intrants",
     "Intrants trop chers", "La banque le force"], 1)

lesson_title(7, "Le crédit agricole : opportunité ou piège ?", "2h30", "3 chaises, cartons offres de crédit")
content_slide("Jeu de rôle : le paysan face au crédit",
    ["Aminata a besoin de 100 000 FCFA pour les intrants.",
     "",
     "3 prêteurs :",
     "  A. Commerçant : intrants maintenant, 5 sacs à la récolte",
     "     Coût : 50 000 FCFA (50%)",
     "  B. Microfinance : 2%/mois sur 8 mois",
     "     Coût : 19 000 FCFA (19%)",
     "  C. AVEC/VSLA : 5% sur 4 mois",
     "     Coût : 5 000 FCFA (5%)",
     "",
     "3 règles d'or :",
     "  1. Emprunter UNIQUEMENT pour un investissement productif",
     "  2. Calculer le coût TOTAL du remboursement",
     "  3. Préférer l'épargne au crédit"],
    "Facilitation",
    "Si un participant dit 'j'emprunte au commerçant', ne critiquez pas. Demandez 'combien tu rembourses ?' et laissez le GROUPE calculer.",
    GREEN)
quiz_slide("Commerçant prête 100 000 FCFA, demande 5 sacs à 30 000 FCFA. Coût du crédit ?",
    ["0 FCFA", "50 000 FCFA (150 000 - 100 000)", "30 000 FCFA", "100 000 FCFA"], 1)

lesson_title(8, "Vendre au bon moment", "2h30", "cailloux, 12 mois au sol")
content_slide("Le paradoxe : il vend quand le prix est le plus bas",
    ["Activité : La courbe des prix au sol",
     "1. Ligne 3m = 12 mois",
     "2. « En nov, un sac coûte combien ? Et en juillet ? »",
     "3. Empilez des cailloux = prix de chaque mois",
     "4. Le groupe VOIT : prix bas à la récolte, haut en soudure",
     "",
     "4 stratégies de commercialisation :",
     "  • Vente groupée — ensemble = meilleur prix",
     "  • Stockage individuel — vendre en mai-juillet",
     "  • Warrantage — stocker + crédit 70% + vente différée",
     "  • Transformation — farine, huile = valeur ajoutée"],
    "Warrantage (Niger/PAM)",
    "Paysans stockent dans entrepôt certifié, reçoivent 70% en crédit, vendent 4-6 mois plus tard. Résultat : +40% de revenus.",
    RGBColor(0x25,0x63,0xEB))
table_slide("Gain du stockage — 20 sacs de maïs",
    ["Scénario", "Prix/sac", "Total", "Gain"],
    [["Vente nov.", "8 000", "160 000", "—"],
     ["Vente mai", "17 000", "340 000", "+180 000"],
     ["Coût stockage", "—", "-15 000", "—"],
     ["Gain NET", "—", "—", "+165 000 (+103%)"]])
quiz_slide("20 sacs vendus à 8 000 au lieu de 17 000 FCFA. Perte ?",
    ["Rien", "90 000", "180 000 FCFA (9 000 × 20)", "20 000"], 2)

# ═══ MOIS 3 ═══
section_slide("MOIS 3", "Transmettre et pérenniser — Semaines 9 à 12")

lesson_title(9, "Gérer les risques : maladies, sécheresse, vol", "2h30", "cartes illustrées, 3 boîtes")
content_slide("Les risques qui ruinent les paysans",
    ["Activité : classement des risques (cartes illustrées)",
     "  « Le plus fréquent ? Le plus grave ? »",
     "",
     "3 stratégies :",
     "  • PRÉVENIR — diversifier cultures, variétés résistantes",
     "  • ATTÉNUER — fonds d'urgence (épargne séparée)",
     "  • TRANSFÉRER — assurance, mutuelle, fonds social AVEC",
     "",
     "Priorité : fonds d'urgence = 2-3 mois de dépenses",
     "SÉPARÉ de l'épargne intrants",
     "",
     "Méthode des 3 enveloppes : INTRANTS | URGENCE | FAMILLE"],
    "L'histoire de Moussa",
    "200 000 FCFA épargnés pour un bœuf. Son fils tombe malade. Toute l'épargne part en soins. Plus de bœuf, campagne ratée. Sans fonds d'urgence séparé, UN événement efface des ANNÉES d'efforts.",
    ORANGE)
quiz_slide("Pourquoi le fonds d'urgence doit être SÉPARÉ ?",
    ["Compliquer les choses",
     "Éviter qu'un imprévu détruise la campagne agricole",
     "Gagner des intérêts", "Pas nécessaire"], 1)

lesson_title(10, "Structurer et animer une session au village", "2h", "fiches APCA vierges")
content_slide("Le plan de session APCA",
    ["Chaque session = 4 phases, 2h maximum :",
     "",
     "  ACCROCHE (15 min)",
     "  Problème vécu, histoire, question provocante",
     "",
     "  PRATIQUE (60 min)",
     "  Cailloux, jeu de rôle, calcul collectif",
     "",
     "  CONCEPTUALISATION (20 min)",
     "  Le GROUPE formule la leçon (pas vous !)",
     "",
     "  ACTION (15 min)",
     "  Engagement concret avant la prochaine session"],
    "La fiche de session",
    "Pour CHAQUE session : fiche A4 recto-verso avec objectif, matériel, déroulement minute par minute, questions de facilitation. C'est l'outil de démultiplication.",
    GREEN)
table_slide("Exemple : session budget familial",
    ["Phase", "Durée", "Le formateur", "Les participants"],
    [["Accroche", "15 min", "Histoire de Mamadou", "Réagissent, s'identifient"],
     ["Pratique", "60 min", "Distribue les graines", "Construisent LEUR budget"],
     ["Concept.", "20 min", "« Qu'avez-vous découvert ? »", "Formulent la leçon"],
     ["Action", "15 min", "« Que comptez-vous faire ? »", "S'engagent"]])
quiz_slide("Dans le cycle APCA, le formateur parle combien ?",
    ["Pendant l'Accroche surtout", "Pendant la Pratique",
     "20% max — le groupe fait 80%", "Pendant la Conceptualisation"], 2)

lesson_title(11, "Pratique supervisée : animez votre première session", "3h", "matériel du thème choisi")
content_slide("C'est à vous de jouer !",
    ["1. Choisissez UN thème (sessions 1 à 9)",
     "2. Préparez votre fiche APCA",
     "3. Animez 20 min devant vos co-stagiaires",
     "4. Feedback constructif (groupe + superviseur)",
     "",
     "Grille d'observation (5 critères, note 1-3) :",
     "  • Pose des questions avant d'expliquer",
     "  • Utilise du matériel concret",
     "  • Langage simple, pas de jargon",
     "  • Respect du cycle APCA et du temps",
     "  • Bienveillance, valorise les savoirs",
     "",
     "Feedback : méthode sandwich",
     "  Positif → 1 amélioration → Positif"],
    "Erreur la plus fréquente",
    "90% des stagiaires parlent trop lors de leur première animation. Normal — on a tous été formés par le modèle scolaire. L'andragogie c'est le contraire.",
    ORANGE)
quiz_slide("Lors du feedback, par quoi commencer ?",
    ["Les erreurs", "Ce qu'il a bien fait (méthode sandwich)",
     "Une note chiffrée", "Un silence"], 1)

lesson_title(12, "Capstone : plan d'action communautaire", "3h", "fiches plan d'action, tableau de suivi")
content_slide("Bilan et engagement",
    ["Ce que vous maîtrisez maintenant :",
     "  Posture de facilitateur — Budget en graines",
     "  Épargne/tontine/AVEC — Coût de production",
     "  Planification campagne — Crédit et commercialisation",
     "  Gestion des risques — Animation APCA",
     "",
     "Votre plan d'action :",
     "  1. OÙ — quel(s) village(s) ?",
     "  2. QUAND — calendrier des 12 sessions",
     "  3. QUI — combien de groupes et participants ?",
     "  4. COMMENT — matériel nécessaire",
     "  5. SUIVI — mesurer le changement (avant/après)"],
    "Impact projeté",
    "1 formateur × 4 groupes × 25 paysans = 100 ménages. Effet boule de neige : 300 ménages = 2 100 personnes. +35% épargne, -40% crédit commerçant après 1 an.",
    RGBColor(0x25,0x63,0xEB))
table_slide("Tableau de suivi d'impact",
    ["Indicateur", "Avant", "Après 6 mois", "Objectif"],
    [["% ménages avec budget", "À mesurer", "À mesurer", "60%"],
     ["Épargne mensuelle", "À mesurer", "À mesurer", "+30%"],
     ["% crédit commerçant", "À mesurer", "À mesurer", "-50%"],
     ["Tontines/AVEC actives", "À compter", "À compter", "+3"],
     ["Paysans formés", "0", "À compter", "300"]])

title_slide("Vous êtes maintenant\nFormateur en Gestion Financière Paysanne",
            "Allez sur le terrain. Écoutez les paysans.\nAccompagnez-les avec des cailloux, des graines\net beaucoup d'écoute.\n\nBon terrain !")

# Save
output = "/home/user/portefolio/TOF-FIN-01_Gestion_Financiere_Paysanne.pptx"
prs.save(output)
print(f"OK — {len(prs.slides)} slides saved to {output}")
