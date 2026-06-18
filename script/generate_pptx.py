from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import os

IMG = '/home/user/portefolio/assets/pptx_images'

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

def S():
    return prs.slides.add_slide(blank_layout)

def rect(s, l, t, w, h, fill=None):
    sh = s.shapes.add_shape(1, int(l), int(t), int(w), int(h))
    sh.line.fill.background()
    if fill:
        sh.fill.solid(); sh.fill.fore_color.rgb = fill
    else:
        sh.fill.background()
    return sh

def txt(s, l, t, w, h, text, sz=14, bold=False, color=DARK, align=PP_ALIGN.LEFT):
    tb = s.shapes.add_textbox(int(l), int(t), int(w), int(h))
    tb.text_frame.word_wrap = True
    p = tb.text_frame.paragraphs[0]
    p.text = text; p.font.size = Pt(sz); p.font.bold = bold; p.font.color.rgb = color; p.alignment = align
    return tb.text_frame

def bullets(s, l, t, w, h, lines, sz=16, color=DARK):
    tb = s.shapes.add_textbox(int(l), int(t), int(w), int(h))
    tf = tb.text_frame; tf.word_wrap = True
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line; p.font.size = Pt(sz); p.font.color.rgb = color; p.space_before = Pt(4)

def img(s, path, l, t, w, h=None):
    fp = os.path.join(IMG, path)
    if not os.path.exists(fp):
        return
    if h:
        s.shapes.add_picture(fp, int(l), int(t), int(w), int(h))
    else:
        s.shapes.add_picture(fp, int(l), int(t), width=int(w))

# ── Slide types ──

def cover_img_slide(title, subtitle, image):
    s = S()
    img(s, image, 0, 0, SW, SH)
    rect(s, 0, 0, SW, SH, fill=RGBColor(0x0D, 0x94, 0x88))  # overlay
    # Make overlay semi-transparent via image instead
    s.shapes[-1].fill.solid()
    s.shapes[-1].fill.fore_color.rgb = GREEN
    txt(s, Inches(1), Inches(2), Inches(11.3), Inches(2.5), title, sz=40, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    if subtitle:
        txt(s, Inches(1), Inches(4.5), Inches(11.3), Inches(1.5), subtitle, sz=20, color=RGBColor(0xCC,0xFB,0xF1), align=PP_ALIGN.CENTER)
    txt(s, Inches(1), Inches(6.5), Inches(11.3), Inches(0.5),
        "DataMEAL Academy — Formation des Formateurs", sz=12, color=RGBColor(0x99,0xF6,0xE4), align=PP_ALIGN.CENTER)

def image_slide(title, image, caption=""):
    s = S()
    rect(s, 0, 0, Inches(0.07), SH, fill=GREEN)
    txt(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.7), title, sz=24, bold=True, color=DARK)
    img(s, image, Inches(0.5), Inches(1.2), Inches(12), Inches(5.5))
    if caption:
        txt(s, Inches(0.5), Inches(6.9), Inches(12), Inches(0.4), caption, sz=11, color=GRAY)

def section_slide(month, subtitle):
    s = S()
    rect(s, 0, 0, SW, SH, fill=DARK)
    txt(s, Inches(1), Inches(2.5), Inches(11.3), Inches(1), month, sz=36, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
    txt(s, Inches(1), Inches(3.8), Inches(11.3), Inches(1), subtitle, sz=20, color=GRAY, align=PP_ALIGN.CENTER)

def lesson_title(num, title, duration, material, image=None):
    s = S()
    if image:
        img(s, image, Inches(8.5), Inches(1), Inches(4.5), Inches(5))
    rect(s, 0, 0, Inches(0.12), SH, fill=GREEN)
    badge = rect(s, Inches(0.8), Inches(1.5), Inches(1.1), Inches(1.1), fill=GREEN)
    txt(s, Inches(0.8), Inches(1.7), Inches(1.1), Inches(0.8), str(num), sz=40, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    txt(s, Inches(2.5), Inches(1.2), Inches(5.5), Inches(0.5), f"Leçon {num}", sz=16, bold=True, color=GREEN)
    txt(s, Inches(2.5), Inches(1.8), Inches(5.5), Inches(1.5), title, sz=28, bold=True, color=DARK)
    txt(s, Inches(2.5), Inches(3.5), Inches(5.5), Inches(0.5), f"Durée : {duration}  |  Matériel : {material}", sz=14, color=GRAY)

def content_slide(title, blines, callout_title=None, callout_text=None, callout_color=GREEN, image_right=None):
    s = S()
    rect(s, 0, 0, Inches(0.07), SH, fill=GREEN)
    txt(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.7), title, sz=26, bold=True, color=DARK)
    if image_right:
        bw = Inches(7)
        img(s, image_right, Inches(7.8), Inches(1.3), Inches(5), Inches(4))
    elif callout_title:
        bw = Inches(7)
        box = rect(s, Inches(8), Inches(1.3), Inches(4.8), Inches(4.5), fill=LIGHT_BG)
        txt(s, Inches(8.3), Inches(1.5), Inches(4.3), Inches(0.6), callout_title, sz=14, bold=True, color=callout_color)
        txt(s, Inches(8.3), Inches(2.2), Inches(4.3), Inches(3.3), callout_text, sz=13, color=DARK)
    else:
        bw = Inches(12)
    bullets(s, Inches(0.5), Inches(1.3), bw, Inches(5.5), blines, sz=16)

def table_slide(title, headers, rows, image_below=None):
    s = S()
    rect(s, 0, 0, Inches(0.07), SH, fill=GREEN)
    txt(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.7), title, sz=24, bold=True, color=DARK)
    nc = len(headers); nr = len(rows) + 1
    tw = min(Inches(12.5), Inches(3) * nc)
    rh = min(Inches(0.45), Inches(4.5) / nr)
    tbl = s.shapes.add_table(nr, nc, Inches(0.5), Inches(1.2), int(tw), int(rh * nr)).table
    for i, h in enumerate(headers):
        c = tbl.cell(0, i); c.text = h; c.fill.solid(); c.fill.fore_color.rgb = GREEN
        for p in c.text_frame.paragraphs:
            p.font.size = Pt(11); p.font.bold = True; p.font.color.rgb = WHITE
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            c = tbl.cell(ri+1, ci); c.text = str(val)
            c.fill.solid(); c.fill.fore_color.rgb = WHITE if ri % 2 == 0 else LIGHT_BG
            for p in c.text_frame.paragraphs:
                p.font.size = Pt(10); p.font.color.rgb = DARK

def quiz_slide(question, options, answer_idx):
    s = S()
    rect(s, 0, 0, SW, SH, fill=RGBColor(0xF0,0xFD,0xFA))
    rect(s, 0, 0, Inches(0.07), SH, fill=GREEN)
    rect(s, Inches(0.5), Inches(0.4), Inches(0.9), Inches(0.45), fill=GREEN)
    txt(s, Inches(0.5), Inches(0.42), Inches(0.9), Inches(0.45), "QUIZ", sz=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    t = txt(s, Inches(0.5), Inches(1.2), Inches(12), Inches(1), question, sz=22, bold=True, color=DARK)
    for i, opt in enumerate(options):
        letter = chr(65 + i)
        y = Inches(2.7 + i * 0.95)
        is_ans = (i == answer_idx)
        rect(s, Inches(1.2), y, Inches(10.5), Inches(0.7), fill=GREEN if is_ans else WHITE)
        txt(s, Inches(1.5), int(y) + Pt(6), Inches(10), Inches(0.6),
            f"{letter}.  {opt}", sz=16, bold=is_ans, color=WHITE if is_ans else DARK)


# ══════════════════════════════════════════════════
# BUILD THE ILLUSTRATED PRESENTATION
# ══════════════════════════════════════════════════

# ── COVER ──
s = S()
img(s, 'cover.png', 0, 0, SW, SH)
txt(s, Inches(1), Inches(6.5), Inches(11.3), Inches(0.5),
    "DataMEAL Academy | TOF-FIN-01 | Parcours 3 mois", sz=12, color=WHITE, align=PP_ALIGN.CENTER)

# ── PROGRAMME ──
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

# ── APPROCHE ──
content_slide("Approche andragogique : 5 principes",
    ["1. L'adulte a besoin de savoir POURQUOI — Commencer par un problème concret",
     "2. L'adulte apporte son expérience — Faire parler les anciens d'abord",
     "3. L'adulte veut décider lui-même — Proposer, ne jamais imposer",
     "4. L'adulte apprend pour résoudre un problème immédiat",
     "5. L'adulte est motivé par des résultats concrets"],
    "Règle d'or du facilitateur",
    "Le formateur parle 20% du temps maximum. Les 80% restants, ce sont les participants qui parlent, réfléchissent, calculent et échangent entre eux.", GREEN)

# ── CYCLE APCA (avec image) ──
image_slide("Le cycle APCA — Canevas de chaque session", "cycle_apca.png",
            "Accroche (15 min) → Pratique (60 min) → Conceptualisation (20 min) → Action (15 min) = 2h max")

# ═══ MOIS 1 ═══
section_slide("MOIS 1", "Comprendre l'argent du paysan — Semaines 1 à 4")

# L1
lesson_title(1, "Posture du formateur-animateur\nen milieu rural", "2h", "cercle de chaises, images parlantes")
content_slide("Vous n'êtes pas un professeur, vous êtes un facilitateur",
    ["Les paysans ont 20-40 ans d'expérience. Ils savent déjà beaucoup.",
     "Votre rôle : faciliter la prise de conscience, PAS enseigner.",
     "",
     "Boîte à outils du facilitateur :",
     "  • L'arbre à problèmes — dessiner causes/conséquences",
     "  • Le cercle de parole — chacun parle à son tour",
     "  • Les images parlantes — dessins sans texte",
     "  • Le jeu de rôle — simuler des situations financières",
     "  • Les cailloux/graines — compter, représenter, répartir"],
    "Le piège du débutant",
    "Un formateur arrive avec des PowerPoint et du jargon comptable. Les paysans s'ennuient et ne reviennent pas. Ce qui marche : s'asseoir sous l'arbre à palabres, écouter d'abord.", ORANGE)
quiz_slide("Un formateur rural efficace consacre quelle proportion du temps à écouter ?",
    ["20% écoute, 80% cours", "50/50", "80% écoute et facilitation, 20% apport", "100% cours"], 2)

# L2
lesson_title(2, "D'où vient et où va l'argent\ndu paysan ?", "2h", "sol sableux, cailloux 2 couleurs")
image_slide("Carte des flux d'argent du ménage paysan", "flux_argent.png",
            "Activité : dessinez un cercle au sol, cailloux verts (revenus) entrants, cailloux rouges (dépenses) sortants")
image_slide("Le déséquilibre saisonnier : 7 mois de déficit", "budget_saisonnier.png",
            "Les REVENUS sont concentrés sur 2-3 mois, les DÉPENSES sont permanentes toute l'année")
quiz_slide("Quel problème l'activité des cailloux fait-elle apparaître ?",
    ["Il ne gagne pas assez", "Revenus saisonniers mais dépenses permanentes",
     "Trop de cérémonies", "Il ne sait pas compter"], 1)

# L3
lesson_title(3, "Construire un budget familial\navec les paysans", "3h", "graines (maïs, haricots), 12 cuvettes")
content_slide("L'outil central : le budget en tas de graines",
    ["1. 12 tas de sable en ligne = janvier à décembre",
     "2. 100 graines de maïs = tout l'argent gagné en un an",
     "3. « Répartissez dans les mois où vous recevez de l'argent »",
     "4. 100 graines de haricots = les dépenses par mois",
     "5. Le paysan VOIT les mois de galère",
     "",
     "Les montants viennent DU PAYSAN, pas de vous."],
    "Témoignage terrain (Mali)",
    "« Quand Mamadou a vu que pendant 7 mois il avait plus de haricots que de maïs, il a dit : Ah, c'est pour ça qu'on souffre ! Il le vivait mais ne l'avait jamais VU. »",
    RGBColor(0x25,0x63,0xEB))
quiz_slide("Pourquoi utiliser des graines plutôt qu'un tableau écrit ?",
    ["C'est moins cher", "Les non-alphabétisés participent et VOIENT le déséquilibre",
     "Plus joli", "C'est obligatoire"], 1)

# L4
lesson_title(4, "L'épargne paysanne : tontines,\nAVEC et stratégies locales", "2h30", "dessins, graines")
image_slide("La tontine : 10 membres × 5 000 FCFA/semaine", "tontine.png",
            "Chaque semaine, tous cotisent et UN membre reçoit la cagnotte. Au bout de 10 semaines, tout le monde a reçu.")
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

# L5
lesson_title(5, "Calculer le coût de production\navec les paysans", "3h", "grande feuille, graines, dessins")
content_slide("Le paysan connaît-il le vrai coût de sa production ?",
    ["Animation : « Combien vous coûte un sac de maïs ? »",
     "1. Dessinez un grand champ au tableau/sol",
     "2. « Pour cultiver 1 ha, qu'est-ce qu'il vous faut ? »",
     "3. Le groupe liste tout : semences, engrais, labour...",
     "4. Pour CHAQUE élément : « Combien ça coûte ? »",
     "5. Additionnez ensemble.",
     "",
     "Le coût invisible : la main-d'œuvre familiale",
     "« Si votre femme allait vendre au marché,",
     "  combien gagnerait-elle ? » = coût d'opportunité"],
    "Le choc du calcul",
    "Au nord-Cameroun, un paysan vendait son sac à 8 000 FCFA. Coût réel : 9 500 FCFA/sac. Il travaillait à PERTE depuis des années.", ORANGE)
image_slide("Répartition du coût de production — 1 ha de maïs", "cout_production.png",
            "Total : 175 000 FCFA — Coût par sac (20 sacs/ha) : 8 750 FCFA = prix plancher de vente")
quiz_slide("Sac vendu 8 000 FCFA, coût réel 9 500 FCFA. Situation ?",
    ["Bénéfice 1 500", "Perte de 1 500 FCFA par sac", "Équilibre", "Impossible à dire"], 1)

# L6
lesson_title(6, "Planifier financièrement\nla campagne agricole", "3h", "corde 3m, 12 nœuds, cartons")
image_slide("La corde des saisons — calendrier cultural et trésorerie", "corde_saisons.png",
            "Placez les activités sur la corde (12 nœuds = 12 mois). Les graines sous chaque nœud = l'argent nécessaire.")
content_slide("Stratégie d'épargne anticipée",
    ["Question clé : « En avril, vous avez l'argent pour les intrants ? »",
     "",
     "Calcul avec le groupe :",
     "  Besoins avril : ~80 000 FCFA",
     "  Mois pour épargner (nov-mars) : 5 mois",
     "  = 16 000 FCFA/mois à mettre de côté",
     "",
     "C'est concret, atteignable, et ça brise le cycle d'endettement.",
     "",
     "Exercice maison : chaque participant calcule",
     "ses propres besoins avec sa femme/son mari."],
    "Le cercle vicieux",
    "Avril : plus d'argent → emprunt au commerçant → remboursement en nature (prix le plus bas) → perte de 30-50%. Chaque année le même piège.", ORANGE)
quiz_slide("Pourquoi le paysan s'endette-t-il en avril ?",
    ["Paresse", "Pas d'épargne planifiée pour les intrants",
     "Intrants trop chers", "La banque le force"], 1)

# L7
lesson_title(7, "Le crédit agricole :\nopportunité ou piège ?", "2h30", "3 chaises, cartons offres de crédit")
content_slide("Jeu de rôle : Aminata face au crédit",
    ["Aminata a besoin de 100 000 FCFA pour les intrants.",
     "",
     "3 prêteurs se présentent :",
     "  A. Commerçant : intrants maintenant, 5 sacs à la récolte",
     "  B. Microfinance : 2%/mois sur 8 mois",
     "  C. AVEC/VSLA : 5% sur 4 mois, flexible",
     "",
     "3 règles d'or :",
     "  1. Emprunter UNIQUEMENT pour investissement productif",
     "  2. Calculer le coût TOTAL du remboursement",
     "  3. Préférer l'épargne au crédit"],
    image_right="comparaison_credit.png")
quiz_slide("Commerçant prête 100 000 FCFA, demande 5 sacs à 30 000 FCFA. Coût ?",
    ["0 FCFA", "50 000 FCFA (150 000 - 100 000)", "30 000 FCFA", "100 000 FCFA"], 1)

# L8
lesson_title(8, "Stratégies de commercialisation :\nvendre au bon moment", "2h30", "cailloux pour courbe des prix")
image_slide("Évolution du prix du maïs — vendre au bon moment", "courbe_prix.png",
            "Le paysan vend à la récolte (prix bas). Stocker 6 mois = +113% par sac !")
table_slide("Gain du stockage — 20 sacs de maïs",
    ["Scénario", "Prix/sac", "Total", "Gain"],
    [["Vente nov.", "8 000", "160 000", "—"],
     ["Vente mai", "17 000", "340 000", "+180 000"],
     ["Coût stockage", "—", "-15 000", "—"],
     ["Gain NET", "—", "—", "+165 000 (+103%)"]])
quiz_slide("20 sacs vendus à 8 000 au lieu de 17 000. Perte ?",
    ["Rien", "90 000", "180 000 FCFA (9 000 × 20)", "20 000"], 2)

# ═══ MOIS 3 ═══
section_slide("MOIS 3", "Transmettre et pérenniser — Semaines 9 à 12")

# L9
lesson_title(9, "Gérer les risques :\nmaladies, sécheresse, vol", "2h30", "cartes illustrées, 3 boîtes")
image_slide("La méthode des 3 enveloppes", "trois_enveloppes.png",
            "Répartir les revenus de la récolte en 3 parts : INTRANTS (campagne), URGENCE (imprévus), FAMILLE (quotidien)")
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
     "SÉPARÉ de l'épargne intrants"],
    "L'histoire de Moussa",
    "200 000 FCFA pour un bœuf. Fils malade. Tout part en soins. Plus de bœuf, campagne ratée. Sans fonds séparé, UN événement efface des ANNÉES d'efforts.", ORANGE)
quiz_slide("Pourquoi le fonds d'urgence doit être SÉPARÉ ?",
    ["Compliquer les choses",
     "Éviter qu'un imprévu détruise la campagne agricole",
     "Gagner des intérêts", "Pas nécessaire"], 1)

# L10
lesson_title(10, "Structurer et animer une session\nde formation au village", "2h", "fiches APCA vierges")
content_slide("Le plan de session APCA",
    ["Chaque session = 4 phases, 2h maximum :",
     "",
     "  ACCROCHE (15 min) — Problème vécu, histoire",
     "  PRATIQUE (60 min) — Cailloux, jeu de rôle, calcul",
     "  CONCEPTUALISATION (20 min) — Le GROUPE formule la leçon",
     "  ACTION (15 min) — Engagement concret",
     "",
     "Préparez une fiche A4 recto-verso pour chaque session :",
     "  objectif, matériel, déroulement minute par minute,",
     "  questions de facilitation."],
    image_right="cycle_apca.png")
table_slide("Exemple : session budget familial",
    ["Phase", "Durée", "Le formateur", "Les participants"],
    [["Accroche", "15 min", "Histoire de Mamadou", "Réagissent, s'identifient"],
     ["Pratique", "60 min", "Distribue les graines", "Construisent LEUR budget"],
     ["Concept.", "20 min", "« Qu'avez-vous découvert ? »", "Formulent la leçon"],
     ["Action", "15 min", "« Que comptez-vous faire ? »", "S'engagent"]])
quiz_slide("Dans le cycle APCA, le formateur parle combien ?",
    ["Pendant l'Accroche surtout", "Pendant la Pratique",
     "20% max — le groupe fait 80%", "Pendant la Conceptualisation"], 2)

# L11
lesson_title(11, "Pratique supervisée :\nanimez votre première session", "3h", "matériel du thème choisi")
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
    "90% des stagiaires parlent trop lors de leur première animation. C'est normal — on a tous été formés par le modèle scolaire. L'andragogie c'est le contraire.", ORANGE)
quiz_slide("Lors du feedback, par quoi commencer ?",
    ["Les erreurs", "Ce qu'il a bien fait (méthode sandwich)",
     "Une note chiffrée", "Un silence"], 1)

# L12 — CAPSTONE
lesson_title(12, "Capstone : plan d'action\ncommunautaire", "3h", "fiches plan d'action, tableau de suivi")
content_slide("Bilan et engagement",
    ["Ce que vous maîtrisez maintenant :",
     "  Posture facilitateur — Budget en graines",
     "  Épargne/tontine/AVEC — Coût de production",
     "  Planification campagne — Crédit et vente",
     "  Gestion des risques — Animation APCA",
     "",
     "Votre plan d'action :",
     "  1. OÙ — quel(s) village(s) ?",
     "  2. QUAND — calendrier des 12 sessions",
     "  3. QUI — combien de groupes et participants ?",
     "  4. COMMENT — matériel nécessaire",
     "  5. SUIVI — mesurer le changement (avant/après)"],
    image_right="impact_projection.png")
table_slide("Tableau de suivi d'impact",
    ["Indicateur", "Avant", "Après 6 mois", "Objectif"],
    [["% ménages avec budget", "À mesurer", "À mesurer", "60%"],
     ["Épargne mensuelle", "À mesurer", "À mesurer", "+30%"],
     ["% crédit commerçant", "À mesurer", "À mesurer", "-50%"],
     ["Tontines/AVEC actives", "À compter", "À compter", "+3"],
     ["Paysans formés", "0", "À compter", "300"]])

# ── CLOSING ──
s = S()
img(s, 'closing.png', 0, 0, SW, SH)

# Save
output = "/home/user/portefolio/TOF-FIN-01_Gestion_Financiere_Paysanne.pptx"
prs.save(output)
print(f"OK — {len(prs.slides)} slides, file: {output}")
print(f"Size: {os.path.getsize(output) // 1024} KB")
