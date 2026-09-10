"""
LouisFarm Data Analytics Academy
Génération de datasets réalistes Afrique de l'Ouest (reproductibles)
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import sqlite3

np.random.seed(42)

REGIONS_TOGO = ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes']
SEMENCES = ['Améliorée', 'Traditionnelle', 'Hybride', 'OPV']
TYPES_SOL = ['Ferralitique', 'Ferrugineux', 'Hydromorphe', 'Vertisol']

def gen_agriculture_togo(n=1200, seed=42):
    np.random.seed(seed)
    regions = np.random.choice(REGIONS_TOGO, n)
    years = np.random.choice(range(2019, 2024), n)
    semences = np.random.choice(SEMENCES, n)
    base_yield = {'Maritime': 1.8, 'Plateaux': 2.1, 'Centrale': 1.6, 'Kara': 1.9, 'Savanes': 1.4}
    seed_mult = {'Améliorée': 1.35, 'Traditionnelle': 1.0, 'Hybride': 1.5, 'OPV': 1.2}
    rendement = np.array([
        base_yield[r]*seed_mult[s]*(1+0.05*(y-2019)) + np.random.normal(0, 0.3)
        for r, s, y in zip(regions, semences, years)
    ]).clip(0.3, 4.5)
    pluvio = np.where(np.isin(regions, ['Maritime','Plateaux']),
                      np.random.normal(1200, 200, n),
                      np.random.normal(900, 180, n))
    df = pd.DataFrame({
        'region': regions,
        'village': np.random.choice(['Akplogan','Dévé','Tohoun','Bassar','Mango','Tsévié'], n),
        'superficie_ha': np.round(np.random.exponential(2.5, n)+0.5, 2),
        'rendement_tonne_ha': np.round(rendement, 2),
        'type_semence': semences,
        'engrais_npk_kg': np.where(np.random.random(n)>0.4,
                                    np.random.normal(120,40,n).clip(0,300).astype(int), 0),
        'acces_irrigation': np.random.choice([0,1], n, p=[0.78,0.22]),
        'pluviometrie_mm': np.round(pluvio.clip(500, 1800), 0).astype(int),
        'type_sol': np.random.choice(TYPES_SOL, n),
        'annee': years,
        'prix_vente_fcfa': np.round(rendement * np.random.normal(95000, 12000, n), -2),
    })
    idx = np.random.choice(n, int(n*0.08), replace=False)
    df.loc[idx[:len(idx)//2], 'pluviometrie_mm'] = np.nan
    df.loc[idx[len(idx)//2:], 'engrais_npk_kg'] = np.nan
    return df

def gen_mobilemoney_senegal(n=5000, seed=42):
    np.random.seed(seed)
    villes = ['Dakar','Thiès','Kaolack','Ziguinchor','Saint-Louis','Diourbel','Tambacounda']
    types_tx = ['Dépôt','Retrait','Transfert','Paiement','Recharge']
    dates = [datetime(2022,1,1)+timedelta(days=int(x)) for x in np.random.uniform(0,547,n)]
    montants = np.random.lognormal(11, 1.2, n).clip(500, 2000000)
    df = pd.DataFrame({
        'id_transaction': [f'TX{str(i).zfill(7)}' for i in range(n)],
        'date': [d.strftime('%Y-%m-%d') for d in dates],
        'ville': np.random.choice(villes, n),
        'type_transaction': np.random.choice(types_tx, n, p=[0.3,0.25,0.2,0.15,0.1]),
        'montant_xof': np.round(montants, -2),
        'operateur': np.random.choice(['Orange Money','Wave','Free Money','Wizall'], n, p=[0.4,0.3,0.2,0.1]),
        'genre_client': np.random.choice(['M','F'], n, p=[0.58,0.42]),
        'age_client': np.random.randint(18, 65, n).astype(float),
        'zone': np.random.choice(['Urbain','Periurbain','Rural'], n, p=[0.45,0.3,0.25]),
        'statut_compte': np.random.choice(['Actif','Inactif','Suspendu'], n, p=[0.85,0.1,0.05]),
    })
    # Ajout de problèmes de qualité intentionnels
    bad = np.random.choice(n, int(n*0.05), replace=False)
    df.loc[bad, 'ville'] = df.loc[bad, 'ville'].str.upper()
    df = pd.concat([df, df.iloc[np.random.choice(n, int(n*0.02), replace=False)]], ignore_index=True)
    for col in ['genre_client','age_client']:
        miss = np.random.choice(len(df), int(len(df)*0.05), replace=False)
        df.loc[miss, col] = np.nan
    return df.sample(frac=1, random_state=42).reset_index(drop=True)

def gen_immobilier_abidjan(n=2000, seed=42):
    np.random.seed(seed)
    communes = {'Cocody':280000,'Plateau':350000,'Marcory':200000,
                'Yopougon':130000,'Abobo':110000,'Adjamé':150000,
                'Koumassi':140000,'Port-Bouet':160000,'Treichville':190000}
    commune_list = np.random.choice(list(communes.keys()), n,
                                    p=[0.12,0.08,0.12,0.18,0.14,0.1,0.1,0.1,0.06])
    base_prices = np.array([communes[c] for c in commune_list])
    surfaces = np.random.lognormal(4.3, 0.5, n).clip(20, 500).round(0)
    chambres = np.random.choice([1,2,3,4,5], n, p=[0.15,0.35,0.3,0.15,0.05])
    prix = (base_prices*surfaces*(1+0.08*(chambres-1))*np.random.normal(1,0.15,n)).clip(5e6, 5e8)
    return pd.DataFrame({
        'commune': commune_list, 'surface_m2': surfaces.astype(int),
        'nbr_chambres': chambres,
        'etage': np.random.choice([0,1,2,3,4,5], n, p=[0.3,0.25,0.2,0.15,0.07,0.03]),
        'type_logement': np.random.choice(['Appartement','Villa','Studio','Duplex'], n, p=[0.5,0.25,0.15,0.1]),
        'distance_centre_km': np.round(np.random.exponential(8,n).clip(0.5,40), 1),
        'annee_construction': np.random.randint(1980, 2024, n),
        'etat': np.random.choice(['Neuf','Bon état','À rénover'], n, p=[0.2,0.6,0.2]),
        'parking': np.random.choice([0,1], n, p=[0.4,0.6]),
        'gardiennage': np.random.choice([0,1], n, p=[0.5,0.5]),
        'prix_fcfa': np.round(prix, -5).astype(int),
    })

def gen_microcredit_ghana(n=5000, seed=42):
    np.random.seed(seed)
    regions = ['Greater Accra','Ashanti','Central','Eastern','Western','Northern','Volta']
    activites = ['Commerce','Agriculture','Artisanat','Pêche','Restauration','Transport','Services']
    age = np.random.randint(20, 65, n)
    revenu = np.random.lognormal(6.5, 0.8, n).clip(200, 15000).round(-1)
    montant = np.random.lognormal(7.5, 0.9, n).clip(500, 50000).round(-2)
    p_default = (0.05 + 0.008*(montant/revenu).clip(0,10) +
                 0.003*np.maximum(0, 45-age) + np.random.normal(0,0.02,n)).clip(0.02, 0.35)
    defaut = np.random.binomial(1, p_default)
    return pd.DataFrame({
        'id_client': [f'GH{str(i).zfill(6)}' for i in range(n)],
        'region': np.random.choice(regions, n),
        'age': age, 'genre': np.random.choice(['M','F'], n, p=[0.42,0.58]),
        'niveau_education': np.random.choice(['Aucun','Primaire','Secondaire','Superieur'], n,
                                              p=[0.15,0.35,0.35,0.15]),
        'activite': np.random.choice(activites, n),
        'revenu_mensuel_ghs': revenu.astype(int),
        'montant_credit_ghs': montant.astype(int),
        'duree_mois': np.random.choice([6,12,18,24,36], n, p=[0.15,0.4,0.25,0.15,0.05]),
        'historique_remboursement': np.random.choice(['Excellent','Bon','Moyen','Mauvais','Premier'], n,
                                                     p=[0.25,0.35,0.2,0.1,0.1]),
        'zone_rurale': np.random.choice([0,1], n, p=[0.55,0.45]),
        'nbr_dependants': np.random.randint(0, 8, n),
        'garantie_type': np.random.choice(['Bien immobilier','Épargne','Garant','Aucune'], n,
                                          p=[0.2,0.3,0.35,0.15]),
        'defaut_paiement': defaut,
    })

def gen_cacao_ci_timeseries(seed=42):
    np.random.seed(seed)
    dates = pd.date_range('2010-01-01', '2024-06-01', freq='MS')
    n = len(dates)
    trend = np.linspace(900, 1400, n)
    seasonal = 120*np.sin(2*np.pi*np.arange(n)/12 - 1.5)
    cycle = 80*np.sin(2*np.pi*np.arange(n)/48)
    noise = np.random.normal(0, 45, n)
    prix_usd = (trend+seasonal+cycle+noise).clip(600, 2200)
    return pd.DataFrame({
        'date': dates, 'annee': dates.year, 'mois': dates.month,
        'prix_tonne_usd': np.round(prix_usd, 2),
        'prix_tonne_fcfa': np.round(prix_usd*np.random.normal(600,10,n), -3).astype(int),
        'production_tonnes': np.round(np.random.normal(2100000,150000,n)*(1+0.02*(dates.year-2010)/14), -3).astype(int),
        'exportation_tonnes': np.round(np.random.normal(1700000,120000,n), -3).astype(int),
        'pluviometrie_mm': np.round(np.random.normal(1400,250,n).clip(700,2200), 0).astype(int),
    })

def gen_mfb_benin_sqlite(db_path='mfb_benin.sqlite'):
    np.random.seed(42)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript("""
    DROP TABLE IF EXISTS transactions; DROP TABLE IF EXISTS comptes;
    DROP TABLE IF EXISTS clients; DROP TABLE IF EXISTS agences;
    CREATE TABLE agences (id INT PRIMARY KEY, ville TEXT, region TEXT,
        nbr_agents INT, date_ouverture TEXT);
    CREATE TABLE clients (id INT PRIMARY KEY, nom TEXT, prenom TEXT,
        region TEXT, ville TEXT, genre TEXT, age INT,
        date_inscription TEXT, profession TEXT, revenu_mensuel_fcfa INT);
    CREATE TABLE comptes (id INT PRIMARY KEY, client_id INT, type TEXT,
        solde_initial INT, solde_actuel INT, statut TEXT, date_ouverture TEXT,
        FOREIGN KEY(client_id) REFERENCES clients(id));
    CREATE TABLE transactions (id INT PRIMARY KEY, compte_id INT, montant INT,
        type_tx TEXT, date_tx TEXT, description TEXT,
        FOREIGN KEY(compte_id) REFERENCES comptes(id));
    """)
    villes = [('Cotonou','Atlantique'),('Porto-Novo','Ouémé'),('Parakou','Borgou'),
              ('Abomey-Calavi','Atlantique'),('Bohicon','Zou'),('Natitingou','Atacora'),
              ('Kandi','Alibori'),('Ouidah','Atlantique')]
    agences = [(i+1,v,r,np.random.randint(5,20),f'201{np.random.randint(0,9)}-0{np.random.randint(1,9)}-01')
               for i,(v,r) in enumerate(villes)]
    cur.executemany("INSERT INTO agences VALUES (?,?,?,?,?)", agences)
    noms = ['Hounsou','Aïkpon','Zannou','Dossou','Gbaguidi','Adéoti','Koudjo','Agossou']
    prenoms = ['Brice','Aline','Fiacre','Agnès','Kolade','Mariam','Serge','Fidèle']
    clients = [(i, np.random.choice(noms), np.random.choice(prenoms),
                agences[np.random.randint(0,len(agences))][2],
                agences[np.random.randint(0,len(agences))][1],
                np.random.choice(['M','F']), np.random.randint(22,62),
                f'20{np.random.randint(15,23)}-{np.random.randint(1,12):02d}-{np.random.randint(1,28):02d}',
                np.random.choice(['Commerçant','Agriculteur','Fonctionnaire','Artisan']),
                int(np.random.lognormal(11.5, 0.7))) for i in range(1, 801)]
    cur.executemany("INSERT INTO clients VALUES (?,?,?,?,?,?,?,?,?,?)", clients)
    comptes = []
    cid = 1
    for c in clients:
        for _ in range(np.random.randint(1,3)):
            s = int(np.random.lognormal(12, 1.2))
            comptes.append((cid, c[0], np.random.choice(['Épargne','Courant','DAT'],p=[0.5,0.4,0.1]),
                            s, s, np.random.choice(['Actif','Inactif'],p=[0.85,0.15]),
                            f'20{np.random.randint(15,23)}-{np.random.randint(1,12):02d}-01'))
            cid += 1
    cur.executemany("INSERT INTO comptes VALUES (?,?,?,?,?,?,?)", comptes)
    txs = []
    for j, cpt in enumerate(comptes[:400]):
        for _ in range(np.random.randint(3,20)):
            amt = int(np.random.lognormal(10.5, 1.1))
            txs.append((len(txs)+1, cpt[0], amt,
                        np.random.choice(['Dépôt','Retrait','Virement','Frais'],p=[0.4,0.35,0.15,0.1]),
                        f'202{np.random.randint(2,4)}-{np.random.randint(1,12):02d}-{np.random.randint(1,28):02d}',
                        'Auto'))
    cur.executemany("INSERT INTO transactions VALUES (?,?,?,?,?,?)", txs)
    conn.commit(); conn.close()
    return len(clients), len(comptes), len(txs)

if __name__ == "__main__":
    df1 = gen_agriculture_togo()
    df1.to_csv('togo_agriculture.csv', index=False)
    df2 = gen_mobilemoney_senegal()
    df2.to_csv('senegal_mobilemoney.csv', index=False)
    df3 = gen_immobilier_abidjan()
    df3.to_csv('abidjan_immobilier.csv', index=False)
    df4 = gen_microcredit_ghana()
    df4.to_csv('ghana_microcredit.csv', index=False)
    df5 = gen_cacao_ci_timeseries()
    df5.to_csv('ci_cacao_prix.csv', index=False)
    nc, nco, nt = gen_mfb_benin_sqlite()
    print(f"Togo agri: {df1.shape}, MM Sénégal: {df2.shape}")
    print(f"Immo Abidjan: {df3.shape}, Credit Ghana: {df4.shape}")
    print(f"Cacao CI: {df5.shape}, SQLite: {nc} clients, {nco} comptes, {nt} transactions")
    print("DONE")
