export interface LoreDocument {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  classification: 'ÖPPEN' | 'HEMLIG' | 'TOPPHEMLIG';
  hasCode: boolean;
  code?: string;
  codeHint?: string;
  found: boolean;
}

export interface IntelEntry {
  id: string;
  title: string;
  snippet: string;
  type: 'document' | 'code' | 'radio' | 'photo';
  icon: string;
}

export const SECRET_CODES: Record<string, string> = {
  'VARG-7': 'Låser upp vapengömmans plats',
  'GRYNING-12': 'Avslöjar dold evakueringspunkt',
  'STORM-3': 'Identifierar förrädaren i Enhet 9',
  'CEDER-88': 'Koordinater till underjordiskt labb',
};

export const LORE_DOCUMENTS: LoreDocument[] = [
  {
    id: 'doc_1',
    title: 'Operation "Grå Varg"',
    author: 'Överste Zorin',
    date: '14.03.1993',
    classification: 'HEMLIG',
    content: `RAPPORT — Operation "Grå Varg"

Objekt Z-14 bekräftat som aktivt. Spaningsgruppen har upptäckt spår av nylig aktivitet i bunkerns underjordiska utrymmen.

Objektets personal har evakuerats i okänd riktning. Laboratorieutrustningen är delvis demonterad, men spår av experimentella arbeten med okända prover har hittats.

VARNING: Vid upptäckt av containrar märkta "B-serien" — ÖPPNA INTE. Överlämna kod VARG-7 till högkvarteret för instruktioner.

Grupp "Ceder" har omgrupperats för att förstärka perimetern. Kommunikation via frekvens 147.300.

— Zorin`,
    hasCode: true,
    code: 'VARG-7',
    codeHint: 'Koden nämns i samband med B-seriens containrar',
    found: false,
  },
  {
    id: 'doc_2',
    title: 'Okänd soldats dagbok',
    author: 'Menig ???',
    date: '22.11.1994',
    classification: 'ÖPPEN',
    content: `Dag 47.

Regn igen. Kasernens tak har läckt i tre veckor nu. Kompanibefälet lovade att fixa det, men han har inte tid för oss — hela ledningen är besatta av de underjordiska laboratorierna.

Igår såg jag folk i kemskyddsdräkter komma från bunkern. Att stå vakt nära det stället är skrämmande. På nätterna hörs konstiga ljud från ventilationen.

Serjoha från andra plutonen säger att han sett varelser utanför perimetern. Jag tror han bara druckit för mycket, men... vem vet.

Om någon hittar den här lappen — överlämna kod GRYNING-12 till Natasja. Hon förstår.

Vill bara hem.`,
    hasCode: true,
    code: 'GRYNING-12',
    codeHint: 'Soldatens personliga begäran i slutet av anteckningen',
    found: false,
  },
  {
    id: 'doc_3',
    title: 'Förhörsprotokoll nr 847',
    author: 'Major Petrenko',
    date: '03.06.1995',
    classification: 'TOPPHEMLIG',
    content: `FÖRHÖRSPROTOKOLL
Subjekt: [DATA RADERAD]
Förhörsledare: Major Petrenko, Intern Säkerhet

F: Berätta om händelserna den 28 maj.
S: Jag har redan sagt det... Vi gick ner till nedre nivån. Ljuset fungerade inte. Ficklampornas sken flackade.
F: Fortsätt.
S: Sen hörde vi... skrapande. Bakom dörren till laboratorium nr 3. Löjtnanten beordrade att öppna.
F: Vad fanns bakom dörren?
S: [PAUS 40 SEKUNDER] Jag kan inte... De... de såg ut som människor, men...
F: Subjekt, svara på frågan.
S: De stirrade på oss. Alla vred huvudena samtidigt. Och log.

[INSPELNING AVBRUTEN]

ANMÄRKNING: Subjektet har överförts till isolering.
Åtkomstkod till materialet: STORM-3
Behörighetsnivå: Endast för ledningens ögon.`,
    hasCode: true,
    code: 'STORM-3',
    codeHint: 'Åtkomstkod till förhörsmaterialet',
    found: false,
  },
  {
    id: 'doc_4',
    title: 'Radioavlyssning — Frekvens 147.300',
    author: 'SIGINT-avdelningen',
    date: '11.09.1995',
    classification: 'HEMLIG',
    content: `AVKODNING AV RADIOAVLYSSNING
Frekvens: 147.300 MHz
Tid: 03:47 MSK

[STATISKT BRUS]
Röst 1: ...bekräftar, objekt Z-fjorton är komprometterat. Initierar protokoll "Aska".
Röst 2: Mottaget. Vilka förluster?
Röst 1: Grupp "Ceder" — total kontaktförlust. Nio personer.
Röst 2: [SVORDOMAR] Hur?!
Röst 1: Oklart. Sista signalen från deras fyr — undernivå 4. Efter det... tystnad.
Röst 2: Påbörja evakuering av värdefull utrustning. Koordinater för avlastningszon — CEDER-88.
Röst 1: Uppfattat. Ceder-åttioåtta.
[STATISKT BRUS]
[INSPELNING SLUT]

ANALYS: "Protokoll Aska" — sannolikt en plan för bevisförstöring. Omedelbar insats för avlyssning rekommenderas.`,
    hasCode: true,
    code: 'CEDER-88',
    codeHint: 'Koordinater till utrustningens avlastningszon',
    found: false,
  },
  {
    id: 'doc_5',
    title: 'Klotter på väggen (blyerts)',
    author: 'Okänd',
    date: '???',
    classification: 'ÖPPEN',
    content: `OM DU LÄSER DETTA — GÅ HÄRIFRÅN

gå inte ner under andra nivån
dörrar som är stängda — är stängda av en anledning
lita inte på de som ler i mörkret

jag såg vad de gjorde med grupp Ceder
de är inte människor längre

ljuset skrämmer bort dem men inte länge

gå medan du kan
sydväst utgång genom avloppet
nordost genom staketet vid tornet

SPRING`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_6',
    title: 'Inventarieförteckning — Förråd nr 3',
    author: 'Fanjunkare Sidorov',
    date: '01.01.1994',
    classification: 'ÖPPEN',
    content: `INVENTARIEFÖRTECKNING
Förråd nr 3, Objekt Z-14

✓ Gasmasker GP-7 — 240 st (12 st avskrivna)
✓ RPK-74 — 6 st
✓ Patroner 5.45x39 — 12 000 st (egentligen ≈8 000, resten "försvann")
✓ Patroner 9x18 — 8 000 st
✓ Torrskaffning — 400 st (bäst före... ja, formellt)
✓ Sjukvårdskit AI-2 — 80 st
✓ Vodka "Stolitjnaja" — 24 flaskor (för "desinfektion")
✓ Cigaretter "Prima" — 50 paket
✗ Container B-7 — SAKNAS (vem tog den?!)
✗ Dokumentation för projekt "Gryning" — SAKNAS

ANMÄRKNING: Om någon snor vodka från förrådet igen — skjuter jag. Jag skojar inte.

— Sidorov
P.S. Möss åt upp tre torrskaffningar. Eller inte möss. Fan vet vad som springer runt här om nätterna.`,
    hasCode: false,
    found: false,
  },
  {
    id: 'doc_7',
    title: 'Personalakt: Kommendant V. Volkov',
    author: 'GRU Intern Säkerhet',
    date: '08.02.1993',
    classification: 'TOPPHEMLIG',
    content: `PERSONALAKT — TOPPHEMLIG
Subjekt: Viktor Andrejevitj Volkov
Grad: Kommendant
Enhet: Specialgrupp "Vargen"
Stationering: Objekt Z-14, Underjordisk Sektion

BAKGRUND:
Volkov rekryterades från Spetsnaz 1987. Utmärkta resultat i strid — 47 bekräftade operationer. Psykologisk profil visar extrem lojalitet till projektet men stigande instabilitet sedan exponeringen.

EXPONERING:
Under inspektion av laboratorium nr 3 (se "Gryning"-protokollet) utsattes Volkov för okänt ämne från B-seriens containrar. Sedan dess rapporterar underställda om:
- Onaturlig styrka (böjde en stålregel med bara händerna)
- Ögon som "lyser" i mörker
- Sömnlöshet i 23 dagar utan prestationsförlust
- Samtal med "röster" — uppger att han hör order från undervåningen

BEDÖMNING:
Trots instabiliteten är Volkov den effektivaste befälhavaren på Z-14. Han har vägrat evakuering och säger att han "vaktar det som finns nedanför". Personal rapporterar att han patrullerar djuplagret nattetid, beväpnad och muttrande.

REKOMMENDATION: Övervaka. Neutralisera INTE utan direkt order. Hans kunskap om B-serien är oersättlig.

VARNING: Om Volkov visar tecken på total regression — aktivera protokoll STORM-3 omedelbart.

— Överste Karpov, GRU`,
    hasCode: false,
    found: false,
  },
];

export function getFoundCodes(documents: LoreDocument[]): string[] {
  return documents
    .filter(d => d.found && d.hasCode && d.code)
    .map(d => d.code!);
}

export function getIntelSummary(documents: LoreDocument[]): IntelEntry[] {
  return documents
    .filter(d => d.found)
    .map(d => ({
      id: d.id,
      title: d.title,
      snippet: d.content.substring(0, 80) + '...',
      type: d.id === 'doc_4' ? 'radio' as const : 'document' as const,
      icon: d.classification === 'TOPPHEMLIG' ? '🔴' : d.classification === 'HEMLIG' ? '🟡' : '⚪',
    }));
}
