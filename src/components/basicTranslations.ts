// src/components/basicTranslations.ts
// Strings for Basic mode (BasicPanel, ModeToggle labels and the cut-and-fold guide), in the
// same languages as the app's language setting (WelcomeDialog `languages`).
import type { Language } from './WelcomeDialog';

export interface BasicStrings {
  subtitle: string;
  modeBasic: string;
  modeAdvanced: string;
  language: string;
  stepWhere: string;
  stepStyle: string;
  stepDates: string;
  stepPrint: string;
  stepEnjoy: string;
  openMap: string;
  customLatLong: string;
  /** Shown in step 1 when the dial is set to Vertical (e.g. after the high-latitude suggestion). */
  verticalNote: string;
  currentHalf: string;
  otherHalf: string;
  fullYear: string;
  easiest: string;
  figure8: string;
  summerFall: string;
  winterSpring: string;
  today: string;
  addDate: string;
  add: string;
  cancel: string;
  remove: string;
  month: string;
  day: string;
  outOfRange: string;
  paperSize: string;
  print: string;
  sharePhoto: string;
  moreControl: string;
  guideCut: [string, string];
  guideFold: [string, string];
  guideBrace: [string, string];
  guideEnjoy: [string, string];
  /** Last-step caption for a vertical dial: wall facing the equator (south in the north, north in the south). */
  guideEnjoyVerticalNorth: string;
  guideEnjoyVerticalSouth: string;
  previous: string;
  next: string;
  play: string;
  pause: string;
}

export const BASIC_STRINGS: Record<Language, BasicStrings> = {
  en: {
    subtitle: 'Print a pop-up sundial for your location in a few easy steps.',
    modeBasic: 'Basic', modeAdvanced: 'Advanced', language: 'Language',
    stepWhere: 'Location', stepStyle: 'Style', stepDates: 'Special Dates', stepPrint: 'Print', stepEnjoy: 'Cut, Fold, and Enjoy!',
    openMap: 'Open Map', customLatLong: 'Custom Lat/Long',
    verticalNote: 'Dial must be oriented vertically.',
    currentHalf: 'Current half-year', otherHalf: 'Other half-year', fullYear: 'Full year',
    easiest: 'Easiest to Use', figure8: 'Figure-8 hour lines', summerFall: 'Summer → Fall', winterSpring: 'Winter → Spring',
    today: 'Today', addDate: 'Add a date (birthday, anniversary…)', add: 'Add', cancel: 'Cancel', remove: 'Remove',
    month: 'Month', day: 'Day',
    outOfRange: 'Not in this half-year — won’t print. Pick the other half or Full year.',
    paperSize: 'Paper size', print: 'Print',
    sharePhoto: 'Share a photo of your dial!', moreControl: 'Want more control? Advanced →',
    guideCut: ['Cut', 'Cut along the solid red lines; Lightly score the dashed lines.'],
    guideFold: ['Fold up', 'Fold the triangle straight up along its dashed edge so it stands at 90° to the page.'],
    guideBrace: ['Brace', 'Fold the rounded tab up along its dashed line until the slit in its tip slides onto the triangle’s notch, locking it upright.'],
    guideEnjoy: ['Enjoy', 'Lay the dial flat and level, turn its North Point arrow to true north, and read the time from the shadow.'],
    guideEnjoyVerticalNorth: 'Mount the dial upright on a wall that faces true south, and read the time from the shadow.',
    guideEnjoyVerticalSouth: 'Mount the dial upright on a wall that faces true north, and read the time from the shadow.',
    previous: 'Previous step', next: 'Next step', play: 'Play', pause: 'Pause',
  },
  es: {
    subtitle: 'Imprime un reloj de sol desplegable para tu ubicación en unos pocos pasos sencillos.',
    modeBasic: 'Básico', modeAdvanced: 'Avanzado', language: 'Idioma',
    stepWhere: 'Ubicación', stepStyle: 'Estilo', stepDates: 'Fechas especiales', stepPrint: 'Imprimir', stepEnjoy: '¡Recorta, dobla y disfruta!',
    openMap: 'Abrir mapa', customLatLong: 'Lat/Long personalizada',
    verticalNote: 'El reloj debe colocarse en vertical.',
    currentHalf: 'Semestre actual', otherHalf: 'Otro semestre', fullYear: 'Año completo',
    easiest: 'El más fácil', figure8: 'Líneas horarias en forma de 8', summerFall: 'Verano → Otoño', winterSpring: 'Invierno → Primavera',
    today: 'Hoy', addDate: 'Añadir una fecha (cumpleaños, aniversario…)', add: 'Añadir', cancel: 'Cancelar', remove: 'Quitar',
    month: 'Mes', day: 'Día',
    outOfRange: 'No está en este semestre: no se imprimirá. Elige el otro semestre o el año completo.',
    paperSize: 'Tamaño de papel', print: 'Imprimir',
    sharePhoto: '¡Comparte una foto de tu reloj!', moreControl: '¿Quieres más control? Avanzado →',
    guideCut: ['Recortar', 'Recorta por las líneas rojas continuas; marca ligeramente las líneas discontinuas.'],
    guideFold: ['Doblar', 'Dobla el triángulo hacia arriba por su borde discontinuo hasta que quede a 90° de la hoja.'],
    guideBrace: ['Soporte', 'Dobla la pestaña redondeada por su línea discontinua hasta que la ranura de su punta encaje en la muesca del triángulo y lo sujete en vertical.'],
    guideEnjoy: ['Disfrutar', 'Coloca el reloj plano y nivelado, orienta su flecha del Norte hacia el norte verdadero y lee la hora en la sombra.'],
    guideEnjoyVerticalNorth: 'Monta el reloj en vertical sobre una pared orientada al sur verdadero y lee la hora en la sombra.',
    guideEnjoyVerticalSouth: 'Monta el reloj en vertical sobre una pared orientada al norte verdadero y lee la hora en la sombra.',
    previous: 'Paso anterior', next: 'Paso siguiente', play: 'Reproducir', pause: 'Pausa',
  },
  fr: {
    subtitle: 'Imprimez un cadran solaire pop-up pour votre lieu en quelques étapes simples.',
    modeBasic: 'Simple', modeAdvanced: 'Avancé', language: 'Langue',
    stepWhere: 'Lieu', stepStyle: 'Style', stepDates: 'Dates spéciales', stepPrint: 'Imprimer', stepEnjoy: 'Découpez, pliez et profitez !',
    openMap: 'Ouvrir la carte', customLatLong: 'Lat/Long personnalisée',
    verticalNote: 'Le cadran doit être orienté verticalement.',
    currentHalf: 'Semestre en cours', otherHalf: 'Autre semestre', fullYear: 'Année complète',
    easiest: 'Le plus simple', figure8: 'Lignes horaires en 8', summerFall: 'Été → Automne', winterSpring: 'Hiver → Printemps',
    today: 'Aujourd’hui', addDate: 'Ajouter une date (anniversaire, fête…)', add: 'Ajouter', cancel: 'Annuler', remove: 'Retirer',
    month: 'Mois', day: 'Jour',
    outOfRange: 'Hors de ce semestre — ne sera pas imprimée. Choisissez l’autre semestre ou l’année complète.',
    paperSize: 'Format du papier', print: 'Imprimer',
    sharePhoto: 'Partagez une photo de votre cadran !', moreControl: 'Plus d’options ? Avancé →',
    guideCut: ['Découper', 'Découpez le long des traits rouges pleins ; marquez légèrement les traits pointillés.'],
    guideFold: ['Plier', 'Relevez le triangle le long de son bord pointillé pour qu’il soit à 90° de la feuille.'],
    guideBrace: ['Renfort', 'Relevez la languette arrondie le long de son pointillé jusqu’à ce que la fente de sa pointe s’emboîte dans l’encoche du triangle et le maintienne droit.'],
    guideEnjoy: ['Profiter', 'Posez le cadran à plat et de niveau, tournez sa flèche Nord vers le nord géographique et lisez l’heure grâce à l’ombre.'],
    guideEnjoyVerticalNorth: 'Fixez le cadran à la verticale sur un mur orienté plein sud (sud géographique) et lisez l’heure grâce à l’ombre.',
    guideEnjoyVerticalSouth: 'Fixez le cadran à la verticale sur un mur orienté plein nord (nord géographique) et lisez l’heure grâce à l’ombre.',
    previous: 'Étape précédente', next: 'Étape suivante', play: 'Lecture', pause: 'Pause',
  },
  de: {
    subtitle: 'Drucken Sie in wenigen einfachen Schritten eine Pop-up-Sonnenuhr für Ihren Standort.',
    modeBasic: 'Einfach', modeAdvanced: 'Erweitert', language: 'Sprache',
    stepWhere: 'Standort', stepStyle: 'Stil', stepDates: 'Besondere Daten', stepPrint: 'Drucken', stepEnjoy: 'Ausschneiden, falten und genießen!',
    openMap: 'Karte öffnen', customLatLong: 'Eigene Breite/Länge',
    verticalNote: 'Die Sonnenuhr muss senkrecht ausgerichtet werden.',
    currentHalf: 'Aktuelles Halbjahr', otherHalf: 'Anderes Halbjahr', fullYear: 'Ganzes Jahr',
    easiest: 'Am einfachsten', figure8: 'Stundenlinien als Acht', summerFall: 'Sommer → Herbst', winterSpring: 'Winter → Frühling',
    today: 'Heute', addDate: 'Datum hinzufügen (Geburtstag, Jahrestag…)', add: 'Hinzufügen', cancel: 'Abbrechen', remove: 'Entfernen',
    month: 'Monat', day: 'Tag',
    outOfRange: 'Nicht in diesem Halbjahr – wird nicht gedruckt. Wählen Sie das andere Halbjahr oder das ganze Jahr.',
    paperSize: 'Papierformat', print: 'Drucken',
    sharePhoto: 'Teilen Sie ein Foto Ihrer Sonnenuhr!', moreControl: 'Mehr Kontrolle? Erweitert →',
    guideCut: ['Schneiden', 'Entlang der durchgezogenen roten Linien schneiden; die gestrichelten Linien leicht anritzen.'],
    guideFold: ['Aufklappen', 'Das Dreieck entlang seiner gestrichelten Kante senkrecht aufklappen, sodass es im 90°-Winkel zum Blatt steht.'],
    guideBrace: ['Stütze', 'Die runde Lasche entlang ihrer gestrichelten Linie hochklappen, bis der Schlitz an ihrer Spitze in die Kerbe des Dreiecks greift und es aufrecht hält.'],
    guideEnjoy: ['Genießen', 'Die Sonnenuhr flach und waagerecht hinlegen, den Nordpfeil nach geografisch Nord ausrichten und die Zeit am Schatten ablesen.'],
    guideEnjoyVerticalNorth: 'Bringen Sie die Sonnenuhr senkrecht an einer Wand an, die genau nach Süden (geografisch) zeigt, und lesen Sie die Zeit am Schatten ab.',
    guideEnjoyVerticalSouth: 'Bringen Sie die Sonnenuhr senkrecht an einer Wand an, die genau nach Norden (geografisch) zeigt, und lesen Sie die Zeit am Schatten ab.',
    previous: 'Vorheriger Schritt', next: 'Nächster Schritt', play: 'Abspielen', pause: 'Pause',
  },
  nl: {
    subtitle: 'Print in een paar eenvoudige stappen een pop-up-zonnewijzer voor jouw locatie.',
    modeBasic: 'Eenvoudig', modeAdvanced: 'Geavanceerd', language: 'Taal',
    stepWhere: 'Locatie', stepStyle: 'Stijl', stepDates: 'Bijzondere datums', stepPrint: 'Printen', stepEnjoy: 'Knippen, vouwen en genieten!',
    openMap: 'Kaart openen', customLatLong: 'Eigen breedte/lengte',
    verticalNote: 'De zonnewijzer moet verticaal worden geplaatst.',
    currentHalf: 'Huidig halfjaar', otherHalf: 'Ander halfjaar', fullYear: 'Heel jaar',
    easiest: 'Makkelijkst', figure8: 'Uurlijnen in de vorm van een 8', summerFall: 'Zomer → Herfst', winterSpring: 'Winter → Lente',
    today: 'Vandaag', addDate: 'Datum toevoegen (verjaardag, jubileum…)', add: 'Toevoegen', cancel: 'Annuleren', remove: 'Verwijderen',
    month: 'Maand', day: 'Dag',
    outOfRange: 'Valt niet in dit halfjaar — wordt niet geprint. Kies het andere halfjaar of het hele jaar.',
    paperSize: 'Papierformaat', print: 'Printen',
    sharePhoto: 'Deel een foto van je zonnewijzer!', moreControl: 'Meer instellingen? Geavanceerd →',
    guideCut: ['Knippen', 'Knip langs de doorgetrokken rode lijnen; kras de stippellijnen lichtjes in.'],
    guideFold: ['Opvouwen', 'Vouw de driehoek langs de gestippelde rand omhoog, zodat hij haaks (90°) op het papier staat.'],
    guideBrace: ['Steun', 'Vouw het ronde lipje langs de stippellijn omhoog tot de spleet in de punt in de inkeping van de driehoek schuift en die rechtop houdt.'],
    guideEnjoy: ['Genieten', 'Leg de zonnewijzer plat en waterpas, richt de noordpijl op het ware noorden en lees de tijd af aan de schaduw.'],
    guideEnjoyVerticalNorth: 'Bevestig de zonnewijzer rechtop aan een muur die precies op het ware zuiden ligt en lees de tijd af aan de schaduw.',
    guideEnjoyVerticalSouth: 'Bevestig de zonnewijzer rechtop aan een muur die precies op het ware noorden ligt en lees de tijd af aan de schaduw.',
    previous: 'Vorige stap', next: 'Volgende stap', play: 'Afspelen', pause: 'Pauze',
  },
  it: {
    subtitle: 'Stampa una meridiana pop-up per la tua località in pochi semplici passaggi.',
    modeBasic: 'Base', modeAdvanced: 'Avanzato', language: 'Lingua',
    stepWhere: 'Località', stepStyle: 'Stile', stepDates: 'Date speciali', stepPrint: 'Stampa', stepEnjoy: 'Ritaglia, piega e divertiti!',
    openMap: 'Apri mappa', customLatLong: 'Lat/Long personalizzata',
    verticalNote: 'La meridiana va posizionata in verticale.',
    currentHalf: 'Semestre attuale', otherHalf: 'Altro semestre', fullYear: 'Anno intero',
    easiest: 'Il più semplice', figure8: 'Linee orarie a 8', summerFall: 'Estate → Autunno', winterSpring: 'Inverno → Primavera',
    today: 'Oggi', addDate: 'Aggiungi una data (compleanno, anniversario…)', add: 'Aggiungi', cancel: 'Annulla', remove: 'Rimuovi',
    month: 'Mese', day: 'Giorno',
    outOfRange: 'Non è in questo semestre: non verrà stampata. Scegli l’altro semestre o l’anno intero.',
    paperSize: 'Formato carta', print: 'Stampa',
    sharePhoto: 'Condividi una foto della tua meridiana!', moreControl: 'Vuoi più controllo? Avanzato →',
    guideCut: ['Ritaglia', 'Ritaglia lungo le linee rosse continue; incidi leggermente le linee tratteggiate.'],
    guideFold: ['Piega', 'Piega il triangolo verso l’alto lungo il bordo tratteggiato finché è a 90° rispetto al foglio.'],
    guideBrace: ['Sostegno', 'Piega la linguetta arrotondata lungo la sua linea tratteggiata finché la fessura sulla punta si innesta nella tacca del triangolo, tenendolo dritto.'],
    guideEnjoy: ['Divertiti', 'Appoggia la meridiana in piano e a livello, orienta la freccia Nord verso il nord geografico e leggi l’ora dall’ombra.'],
    guideEnjoyVerticalNorth: 'Fissa la meridiana in verticale su una parete rivolta verso il sud geografico e leggi l’ora dall’ombra.',
    guideEnjoyVerticalSouth: 'Fissa la meridiana in verticale su una parete rivolta verso il nord geografico e leggi l’ora dall’ombra.',
    previous: 'Passo precedente', next: 'Passo successivo', play: 'Riproduci', pause: 'Pausa',
  },
  pt: {
    subtitle: 'Imprima um relógio de sol pop-up para o seu local em poucos passos simples.',
    modeBasic: 'Básico', modeAdvanced: 'Avançado', language: 'Idioma',
    stepWhere: 'Localização', stepStyle: 'Estilo', stepDates: 'Datas especiais', stepPrint: 'Imprimir', stepEnjoy: 'Recorte, dobre e aproveite!',
    openMap: 'Abrir mapa', customLatLong: 'Lat/Long personalizada',
    verticalNote: 'O relógio deve ser colocado na vertical.',
    currentHalf: 'Semestre atual', otherHalf: 'Outro semestre', fullYear: 'Ano inteiro',
    easiest: 'O mais fácil', figure8: 'Linhas horárias em forma de 8', summerFall: 'Verão → Outono', winterSpring: 'Inverno → Primavera',
    today: 'Hoje', addDate: 'Adicionar uma data (aniversário, comemoração…)', add: 'Adicionar', cancel: 'Cancelar', remove: 'Remover',
    month: 'Mês', day: 'Dia',
    outOfRange: 'Fora deste semestre — não será impressa. Escolha o outro semestre ou o ano inteiro.',
    paperSize: 'Tamanho do papel', print: 'Imprimir',
    sharePhoto: 'Partilhe uma foto do seu relógio!', moreControl: 'Quer mais controlo? Avançado →',
    guideCut: ['Recortar', 'Recorte pelas linhas vermelhas contínuas; vinque levemente as linhas tracejadas.'],
    guideFold: ['Dobrar', 'Dobre o triângulo para cima pela sua aresta tracejada até ficar a 90° da folha.'],
    guideBrace: ['Suporte', 'Dobre a aba arredondada pela sua linha tracejada até a fenda da ponta encaixar no entalhe do triângulo, mantendo-o direito.'],
    guideEnjoy: ['Aproveitar', 'Pouse o relógio plano e nivelado, aponte a seta Norte para o norte verdadeiro e leia a hora pela sombra.'],
    guideEnjoyVerticalNorth: 'Fixe o relógio na vertical numa parede virada para o sul verdadeiro e leia a hora pela sombra.',
    guideEnjoyVerticalSouth: 'Fixe o relógio na vertical numa parede virada para o norte verdadeiro e leia a hora pela sombra.',
    previous: 'Passo anterior', next: 'Passo seguinte', play: 'Reproduzir', pause: 'Pausa',
  },
  zh: {
    subtitle: '只需几个简单步骤，即可为您所在的位置打印一个立体日晷。',
    modeBasic: '基础', modeAdvanced: '高级', language: '语言',
    stepWhere: '位置', stepStyle: '样式', stepDates: '特别日期', stepPrint: '打印', stepEnjoy: '剪下、折叠，尽情享用！',
    openMap: '打开地图', customLatLong: '自定义经纬度',
    verticalNote: '日晷必须竖直放置。',
    currentHalf: '当前半年', otherHalf: '另一半年', fullYear: '全年',
    easiest: '最易使用', figure8: '8字形时间线', summerFall: '夏 → 秋', winterSpring: '冬 → 春',
    today: '今天', addDate: '添加日期（生日、纪念日…）', add: '添加', cancel: '取消', remove: '移除',
    month: '月', day: '日',
    outOfRange: '不在此半年内，不会打印。请选择另一半年或全年。',
    paperSize: '纸张尺寸', print: '打印',
    sharePhoto: '分享您日晷的照片！', moreControl: '需要更多控制？高级 →',
    guideCut: ['剪', '沿红色实线剪开；沿虚线轻轻压出折痕。'],
    guideFold: ['竖起', '沿三角形的虚线边将其向上折起，使其与纸面成90°。'],
    guideBrace: ['支撑', '沿虚线将圆形小片向上折起，直到其尖端的缝卡入三角形的缺口，使三角形保持直立。'],
    guideEnjoy: ['享用', '将日晷水平放平，把北向箭头对准正北，根据影子读出时间。'],
    guideEnjoyVerticalNorth: '将日晷竖直固定在朝向正南的墙上，根据影子读出时间。',
    guideEnjoyVerticalSouth: '将日晷竖直固定在朝向正北的墙上，根据影子读出时间。',
    previous: '上一步', next: '下一步', play: '播放', pause: '暂停',
  },
  ja: {
    subtitle: 'かんたんな数ステップで、お住まいの場所に合わせた飛び出す日時計を印刷できます。',
    modeBasic: 'ベーシック', modeAdvanced: '詳細', language: '言語',
    stepWhere: '場所', stepStyle: 'スタイル', stepDates: '記念日', stepPrint: '印刷', stepEnjoy: '切って、折って、楽しもう！',
    openMap: '地図を開く', customLatLong: 'カスタム緯度/経度',
    verticalNote: '日時計は垂直に立てて設置してください。',
    currentHalf: '今の半年', otherHalf: 'もう半年', fullYear: '1年分',
    easiest: 'いちばん簡単', figure8: '8の字の時刻線', summerFall: '夏 → 秋', winterSpring: '冬 → 春',
    today: '今日', addDate: '日付を追加（誕生日、記念日…）', add: '追加', cancel: 'キャンセル', remove: '削除',
    month: '月', day: '日',
    outOfRange: 'この半年には含まれないため印刷されません。もう半年か1年分を選んでください。',
    paperSize: '用紙サイズ', print: '印刷',
    sharePhoto: '日時計の写真をシェアしよう！', moreControl: 'もっと細かく設定するなら：詳細 →',
    guideCut: ['切る', '赤い実線に沿って切り、点線には軽く折り目をつけます。'],
    guideFold: ['起こす', '三角形を点線の辺に沿って起こし、紙に対して90°に立てます。'],
    guideBrace: ['支え', '丸いタブを点線に沿って起こし、先端の切り込みを三角形の切り欠きに差し込んで、まっすぐ固定します。'],
    guideEnjoy: ['楽しむ', '日時計を水平な場所に置き、北の矢印を真北に向けて、影で時刻を読みます。'],
    guideEnjoyVerticalNorth: '日時計を真南に面した壁に垂直に取り付け、影で時刻を読みます。',
    guideEnjoyVerticalSouth: '日時計を真北に面した壁に垂直に取り付け、影で時刻を読みます。',
    previous: '前のステップ', next: '次のステップ', play: '再生', pause: '一時停止',
  },
  ko: {
    subtitle: '몇 가지 간단한 단계로 내 위치에 맞는 팝업 해시계를 인쇄하세요.',
    modeBasic: '기본', modeAdvanced: '고급', language: '언어',
    stepWhere: '위치', stepStyle: '스타일', stepDates: '특별한 날', stepPrint: '인쇄', stepEnjoy: '자르고, 접고, 즐기세요!',
    openMap: '지도 열기', customLatLong: '사용자 지정 위도/경도',
    verticalNote: '해시계는 수직으로 세워야 합니다.',
    currentHalf: '현재 반년', otherHalf: '다른 반년', fullYear: '1년 전체',
    easiest: '가장 쉬움', figure8: '8자 모양 시간선', summerFall: '여름 → 가을', winterSpring: '겨울 → 봄',
    today: '오늘', addDate: '날짜 추가(생일, 기념일…)', add: '추가', cancel: '취소', remove: '삭제',
    month: '월', day: '일',
    outOfRange: '이 반년에 포함되지 않아 인쇄되지 않습니다. 다른 반년이나 1년 전체를 선택하세요.',
    paperSize: '용지 크기', print: '인쇄',
    sharePhoto: '해시계 사진을 공유해 주세요!', moreControl: '더 세밀하게 설정하려면? 고급 →',
    guideCut: ['자르기', '빨간 실선을 따라 자르고, 점선은 가볍게 접는 선을 내세요.'],
    guideFold: ['세우기', '삼각형을 점선 모서리를 따라 세워 종이와 90°가 되게 하세요.'],
    guideBrace: ['받침', '둥근 탭을 점선을 따라 세워 끝의 홈이 삼각형의 홈에 끼워져 똑바로 고정되게 하세요.'],
    guideEnjoy: ['즐기기', '해시계를 평평하고 수평으로 놓고 북쪽 화살표를 진북으로 향하게 한 뒤 그림자로 시간을 읽으세요.'],
    guideEnjoyVerticalNorth: '해시계를 정남쪽을 향한 벽에 수직으로 붙이고 그림자로 시간을 읽으세요.',
    guideEnjoyVerticalSouth: '해시계를 정북쪽을 향한 벽에 수직으로 붙이고 그림자로 시간을 읽으세요.',
    previous: '이전 단계', next: '다음 단계', play: '재생', pause: '일시정지',
  },
  ru: {
    subtitle: 'Распечатайте объёмные солнечные часы для вашего места за несколько простых шагов.',
    modeBasic: 'Простой', modeAdvanced: 'Расширенный', language: 'Язык',
    stepWhere: 'Местоположение', stepStyle: 'Стиль', stepDates: 'Особые даты', stepPrint: 'Печать', stepEnjoy: 'Вырежьте, сложите и пользуйтесь!',
    openMap: 'Открыть карту', customLatLong: 'Своя широта/долгота',
    verticalNote: 'Часы нужно установить вертикально.',
    currentHalf: 'Текущее полугодие', otherHalf: 'Другое полугодие', fullYear: 'Весь год',
    easiest: 'Проще всего', figure8: 'Часовые линии «восьмёркой»', summerFall: 'Лето → Осень', winterSpring: 'Зима → Весна',
    today: 'Сегодня', addDate: 'Добавить дату (день рождения, годовщина…)', add: 'Добавить', cancel: 'Отмена', remove: 'Удалить',
    month: 'Месяц', day: 'День',
    outOfRange: 'Не входит в это полугодие — не будет напечатано. Выберите другое полугодие или весь год.',
    paperSize: 'Размер бумаги', print: 'Печать',
    sharePhoto: 'Поделитесь фото своих часов!', moreControl: 'Нужно больше настроек? Расширенный →',
    guideCut: ['Вырезать', 'Вырежьте по сплошным красным линиям; слегка продавите пунктирные линии.'],
    guideFold: ['Поднять', 'Поднимите треугольник по пунктирному краю, чтобы он стоял под углом 90° к листу.'],
    guideBrace: ['Опора', 'Поднимите круглый язычок по его пунктирной линии, пока прорезь на его конце не войдёт в выемку треугольника и не зафиксирует его вертикально.'],
    guideEnjoy: ['Пользуйтесь', 'Положите часы ровно и горизонтально, направьте стрелку «Север» на истинный север и определяйте время по тени.'],
    guideEnjoyVerticalNorth: 'Закрепите часы вертикально на стене, обращённой точно на юг (истинный юг), и определяйте время по тени.',
    guideEnjoyVerticalSouth: 'Закрепите часы вертикально на стене, обращённой точно на север (истинный север), и определяйте время по тени.',
    previous: 'Предыдущий шаг', next: 'Следующий шаг', play: 'Воспроизвести', pause: 'Пауза',
  },
  ar: {
    subtitle: 'اطبع مزولة شمسية منبثقة لموقعك في بضع خطوات سهلة.',
    modeBasic: 'أساسي', modeAdvanced: 'متقدم', language: 'اللغة',
    stepWhere: 'الموقع', stepStyle: 'النمط', stepDates: 'تواريخ خاصة', stepPrint: 'الطباعة', stepEnjoy: 'قصّ واطوِ واستمتع!',
    openMap: 'افتح الخريطة', customLatLong: 'خط عرض/طول مخصص',
    verticalNote: 'يجب تثبيت المزولة بشكل عمودي.',
    currentHalf: 'نصف السنة الحالي', otherHalf: 'النصف الآخر', fullYear: 'السنة كاملة',
    easiest: 'الأسهل استخدامًا', figure8: 'خطوط ساعات على شكل 8', summerFall: 'الصيف ← الخريف', winterSpring: 'الشتاء ← الربيع',
    today: 'اليوم', addDate: 'أضف تاريخًا (عيد ميلاد، ذكرى…)', add: 'إضافة', cancel: 'إلغاء', remove: 'إزالة',
    month: 'الشهر', day: 'اليوم',
    outOfRange: 'ليس ضمن هذا النصف من السنة — لن يُطبع. اختر النصف الآخر أو السنة كاملة.',
    paperSize: 'حجم الورق', print: 'اطبع',
    sharePhoto: 'شارك صورة لمزولتك!', moreControl: 'تريد تحكمًا أكبر؟ متقدم ←',
    guideCut: ['قصّ', 'قصّ على طول الخطوط الحمراء المتصلة، واضغط برفق على الخطوط المتقطعة.'],
    guideFold: ['ارفع', 'ارفع المثلث على طول حافته المتقطعة حتى يقف بزاوية 90° على الورقة.'],
    guideBrace: ['الدعامة', 'ارفع اللسان المستدير على طول خطه المتقطع حتى ينزلق الشق في طرفه داخل فتحة المثلث فيثبته قائمًا.'],
    guideEnjoy: ['استمتع', 'ضع المزولة مستوية وأفقية، ووجّه سهم الشمال نحو الشمال الحقيقي، واقرأ الوقت من الظل.'],
    guideEnjoyVerticalNorth: 'ثبّت المزولة عموديًا على جدار يواجه الجنوب الحقيقي، واقرأ الوقت من الظل.',
    guideEnjoyVerticalSouth: 'ثبّت المزولة عموديًا على جدار يواجه الشمال الحقيقي، واقرأ الوقت من الظل.',
    previous: 'الخطوة السابقة', next: 'الخطوة التالية', play: 'تشغيل', pause: 'إيقاف مؤقت',
  },
};

export function basicStrings(language: string | undefined): BasicStrings {
  return BASIC_STRINGS[(language ?? 'en') as Language] ?? BASIC_STRINGS.en;
}
