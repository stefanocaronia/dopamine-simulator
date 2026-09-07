# Fedeltà biologica della simulazione

Nota di lavoro per chi sviluppa il simulatore e per i biologi che lo revisionano. Dice cosa il modello fa, cosa succede nella realtà e quanto i due coincidono, così da decidere cosa correggere e cosa lasciare come compromesso didattico.

**Scopo del simulatore:** far capire il flusso a grandi linee, non riprodurre numeri reali. Tutto è rallentato di circa 100 volte per essere visibile. Le percentuali e i conteggi (5 recettori contro 12, 55% contro 75% di riciclo, ecc.) sono scelte illustrative, non misure.

**Verdetto sintetico.** Il flusso è fedele: impulsi → fusione delle vescicole → fessura → recettori, con ricaptazione, riciclo e degradazione come destini alternativi della stessa molecola. Le differenze ADHD (meno D2, più ricaptazione, più COMT) sono le ipotesi classiche della letteratura, non fatti accertati. I tre punti da correggere per primi, se si vuole più rigore: la **caffeina** (meccanismo sbagliato, direzione giusta), la **COMT** (posizione e peso) e l'etichetta **MAO-B**.

Legenda della fedeltà: ●●●● fedele · ●●●○ semplificato ma corretto · ●●○○ metafora didattica · ●○○○ meccanismo sbagliato.

## Tabella elemento per elemento

| Elemento | Nella simulazione | Nella realtà | Fedeltà |
|---|---|---|---|
| Impulsi → rilascio (SNAP25) | Lo stimolo regola la frequenza degli impulsi e delle fusioni. A stimolo zero non c'è rilascio. | I neuroni dopaminergici scaricano in modo **tonico** (circa 4 Hz, dopamina di fondo sempre presente) e **fasico** (raffiche a 15–30 Hz per novità e ricompense inattese). La fusione richiede l'ingresso di Ca²⁺ e il complesso SNARE (SNAP-25, sintaxina, sinaptobrevina). | ●●●○ manca il tono di fondo |
| Vescicole e serbatoio | 100 unità, ogni rilascio ne consuma 0,05, sintesi lenta e costante, "esaurimento" sotto il 15%. | Esistono un pool pronto al rilascio e un pool di riserva; la sintesi (tirosina → L-DOPA → dopamina, con la tirosina-idrossilasi come tappa limitante) si adatta alla domanda. Con stimolazione intensa il pool pronto si svuota in secondi (**depressione sinaptica**) e si ricarica in secondi o minuti. Un esaurimento globale richiede farmaci (reserpina, AMPT). | ●●○○ esagerazione didattica utile |
| DAT (gene DAT1 / SLC6A3) | Pompe sulla membrana che catturano quasi tutto (94% ADHD, 78% neurotipico), più numerose e veloci in ADHD. | Il DAT è il principale meccanismo di rimozione **nello striato**; nella corteccia prefrontale conta di più il trasportatore della noradrenalina (NET). L'associazione genetica di DAT1 (allele 10R) con l'ADHD è debole. Gli studi PET sulla densità del DAT sono discordanti: la meta-analisi di Fusar-Poli (2012) trova DAT più alto nei pazienti già trattati con stimolanti e più basso nei mai trattati, e Volkow (2009) trova DAT **ridotto** in adulti ADHD mai trattati. Il "più DAT in ADHD" della simulazione è quindi l'ipotesi classica, che potrebbe riflettere l'esposizione ai farmaci. Il metilfenidato blocca il DAT. | ●●●○ ipotesi plausibile mostrata come certa |
| COMT | Enzima libero nella fessura che distrugge ciò che tocca, più attivo in ADHD (Val158). | La COMT è per lo più **intracellulare** (neuroni postsinaptici e glia). Nello striato pesa poco; nella corteccia prefrontale, dove il DAT scarseggia, rimuove oltre metà della dopamina (Käenmäki 2010). La variante Val158 accelera l'enzima e abbassa la dopamina prefrontale, ma l'associazione con l'ADHD è debole e incostante. | ●●○○ metafora visiva, posizione sbagliata |
| MAO-B | Distrugge nel terminale la dopamina ricatturata e non riciclata. | Nel terminale dopaminergico l'isoforma prevalente è la **MAO-A**; la MAO-B sta soprattutto nella glia. Entrambe sono sulla membrana esterna dei mitocondri (corretto). Gli inibitori della MAO-B (selegilina, rasagilina) alzano la dopamina nel Parkinson. | ●●○○ andrebbe chiamata MAO (A/B) |
| VMAT2 | Riconfeziona il 55–75% della dopamina ricatturata nelle vescicole. | VMAT2 impacchetta nelle vescicole sia la dopamina appena sintetizzata sia quella ricatturata, proteggendola dalla MAO. Le percentuali sono inventate, il ruolo è corretto. | ●●●● |
| Recettori D2 e stato "recettivo" | Tasche postsinaptiche; ogni legame aggiunge segnale a un integratore con emivita 0,6 s; sopra la soglia il neurone è "recettivo". 5 recettori in ADHD contro 12. | La dopamina è un **modulatore**, non eccita direttamente: D2 (e D1, assente qui) sono recettori accoppiati a proteine G che cambiano la sensibilità del neurone agli altri input, su scale di 100 ms–secondi. La parola "recettivo" è quindi azzeccata. La PET mostra minore disponibilità di D2/D3 nello striato e nel mesencefalo di adulti ADHD (Volkow 2009). Manca l'**autorecettore D2 presinaptico**, che frena il rilascio quando la dopamina nella fessura è alta (Ford 2014). | ●●●○ |
| Caffeina | Rallenta i DAT (blocco dell'85% delle ricaptazioni per 25 s). | È un **antagonista dei recettori dell'adenosina A2A**: negli eteromeri A2A–D2 dello striato aumenta l'affinità e il segnale dei D2 e alza modestamente il rilascio (Ferré 2008). Non tocca il DAT: il blocco del DAT è il meccanismo del **metilfenidato**. | ●○○○ direzione giusta, meccanismo sbagliato |
| Esercizio | Rilascio dolce a basso costo e sintesi accelerata per 12 s. | L'esercizio acuto aumenta rilascio e sintesi (tirosina-idrossilasi, BDNF); l'allenamento cronico aumenta la disponibilità di D2 (Lin & Kuo 2013; Bastioli 2022). La scala reale è di minuti–ore. | ●●●○ |
| Sonno e debito di sonno | Il debito cresce con lo stimolo, alza la soglia, accorcia il segnale, indebolisce la caffeina; "Sonno" azzera tutto. | La privazione di sonno riduce la disponibilità di D2/D3 nello striato ventrale (Volkow 2012) e accumula **adenosina**, cioè proprio il bersaglio della caffeina. Il debito cresce con le ore di veglia, non con l'intensità dello stimolo. | ●●○○ metafora accettabile |
| Tempi | Una molecola vive fino a 2 s nella fessura; ricaptazione e legame durano decimi di secondo. | Nello striato la dopamina extracellulare viene rimossa in decine di millisecondi (Garris & Wightman 1994; Rice & Cragg 2008). | ●●●○ rallentamento voluto |

## Non modellato, in ordine di utilità didattica
1. **Autorecettori D2 presinaptici**: il feedback negativo che riduce il rilascio quando la dopamina è alta. Spiega perché la stimolazione continua si auto-limita. È la prima cosa da aggiungere.
2. **Scarica tonica di fondo** e distinzione tonico/fasico: il "segnale" reale è la variazione rispetto al fondo, non la presenza assoluta di dopamina (Grace 1991; Schultz 1998).
3. **Recettori D1** (via diretta) accanto ai D2 (via indiretta).
4. **Noradrenalina e NET**, cruciali nella corteccia prefrontale e bersaglio di atomoxetina e guanfacina.
5. **Glia** (ricaptazione e degradazione extra-neuronale) ed **eterogeneità dell'ADHD** (striato contro corteccia prefrontale, sottotipi, farmaci assunti).

## Correzioni proposte, per priorità
1. Rinominare il pulsante **Caffeina** in **Metilfenidato**, oppure rimodellare la caffeina come antagonismo A2A: soglia dei neuroni riceventi più bassa o affinità D2 più alta, con un piccolo aumento del rilascio.
2. Rinominare **MAO-B** in **MAO** (o "MAO-A/B") nei testi e nelle etichette.
3. Aggiungere gli **autorecettori D2**: quando le molecole libere nella fessura superano una soglia, ridurre il tasso di rilascio.
4. Aggiungere un **rilascio tonico** minimo anche a stimolo zero e ridefinire lo stimolo come componente fasica.
5. Ridurre il peso della COMT nello striato, oppure aggiungere un selettore di regione (striato / corteccia prefrontale) che cambia i pesi di DAT, COMT e NET.
6. Aggiornare i testi sul DAT in ADHD: presentare il "più DAT" come ipotesi, citando che gli studi sui pazienti mai trattati trovano il contrario.

## Come contribuire una correzione
Apri una issue o modifica questo file indicando: elemento, cosa è sbagliato, riferimento bibliografico, e come cambierebbe il comportamento visibile della simulazione. I parametri stanno in `js/model.js`, i testi esplicativi in `i18n/it.js` e `i18n/en.js`.

## Riferimenti (orientativi, da verificare prima di citarli in un testo formale)
- Volkow ND et al. (2009). Evaluating dopamine reward pathway in ADHD: clinical implications. *JAMA* 302(10):1084–1091.
- Volkow ND et al. (2012). Evidence that sleep deprivation downregulates dopamine D2R in ventral striatum in the human brain. *J Neurosci* 32(19):6711–6717.
- Fusar-Poli P et al. (2012). Striatal dopamine transporter alterations in ADHD: pathophysiology or adaptation to psychostimulants? A meta-analysis. *Am J Psychiatry* 169(3):264–272.
- Faraone SV, Larsson H (2019). Genetics of attention deficit hyperactivity disorder. *Mol Psychiatry* 24:562–575.
- Ferré S (2008). An update on the mechanisms of the psychostimulant effects of caffeine. *J Neurochem* 105(4):1067–1079.
- Käenmäki M et al. (2010). Quantitative role of COMT in dopamine clearance in the prefrontal cortex of freely moving mice. *J Neurochem* 114(6):1745–1755.
- Youdim MBH, Edmondson D, Tipton KF (2006). The therapeutic potential of monoamine oxidase inhibitors. *Nat Rev Neurosci* 7(4):295–309.
- Ford CP (2014). The role of D2-autoreceptors in regulating dopamine neuron activity and transmission. *Neuroscience* 282:13–22.
- Grace AA (1991). Phasic versus tonic dopamine release and the modulation of dopamine system responsivity. *Neuroscience* 41(1):1–24.
- Schultz W (1998). Predictive reward signal of dopamine neurons. *J Neurophysiol* 80(1):1–27.
- Garris PA, Wightman RM (1994). Different kinetics govern dopaminergic transmission in the amygdala, prefrontal cortex, and striatum. *J Neurosci* 14(1):442–450.
- Rice ME, Cragg SJ (2008). Dopamine spillover after quantal release: rethinking dopamine transmission in the nigrostriatal pathway. *Brain Res Rev* 58(2):303–313.
- Lin TW, Kuo YM (2013). Exercise benefits brain function: the monoamine connection. *Brain Sci* 3(1):39–53.
- Bastioli G et al. (2022). Voluntary exercise boosts striatal dopamine release: evidence for the necessary and sufficient role of BDNF. *J Neurosci* 42(23):4725–4736.
