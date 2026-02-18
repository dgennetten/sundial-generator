// src/components/WelcomeDialog.tsx
import React, { useState, useEffect } from 'react';
import { X, Compass } from 'lucide-react';
import { version } from '../../package.json';

const WELCOME_DISMISSED_KEY = 'sundial-welcome-dismissed';

interface WelcomeDialogProps {
  onClose?: () => void;
}

type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ru' | 'ar';

interface Translations {
  title: string;
  steps: {
    location: { label: string; text: string };
    size: { label: string; text: string };
    gnomon: { label: string; text: string };
    dateRange: { label: string; text: string };
    specialDates: { label: string; text: string };
    reset: { label: string; text: string };
  };
  closing: string;
  closingBold: string;
  dontShowAgain: string;
  gotIt: string;
  sendFeedback: string;
}

const translations: Record<Language, Translations> = {
  en: {
    title: 'How to Build Your Custom Sundial',
    steps: {
      location: { label: 'Set your location', text: 'using the dropdown menu, the interactive map, or by entering latitude and longitude directly.' },
      size: { label: 'Choose your dial\'s size and shape:', text: 'Large or Small; whether you prefer a classic rectangle or a graceful oval.' },
      gnomon: { label: 'Pick a gnomon style:', text: 'Don\'t miss the innovative popup gnomon, perfect for paper dials and hands‑on experimentation.' },
      dateRange: { label: 'Select a date range', text: ': Choose Winter–Spring or Fall–Summer for a cleaner, easier‑to‑read layout.' },
      specialDates: { label: 'Add special dates', text: ': Enter Day and Month in Date Lines. Uncheck Today to remove the red line with today\'s date.' },
      reset: { label: 'Reset to default:', text: 'Getting lost? Reset the dial to default settings (and bring back this popup). Scroll to the bottom of the UI and click reset.' },
    },
    closing: 'TIP: Verify your final dial scaling by enabling and measuring the popup gnomon. Enjoy exploring, experimenting, and crafting your perfect dial.',
    closingBold: 'Happy Dialing!',
    dontShowAgain: 'Don\'t show again',
    gotIt: 'Got it',
    sendFeedback: 'send feedback!',
  },
  es: {
    title: 'Cómo Construir Tu Reloj de Sol Personalizado',
    steps: {
      location: { label: 'Establece tu ubicación', text: ' usando el menú desplegable, el mapa interactivo o ingresando la latitud y longitud directamente.' },
      size: { label: 'Elige el tamaño y la forma de tu reloj:', text: ' Grande o Pequeño; ya sea que prefieras un rectángulo clásico o un óvalo elegante.' },
      gnomon: { label: 'Elige un estilo de gnomon:', text: ' No te pierdas el innovador gnomon emergente, perfecto para relojes de papel y experimentación práctica.' },
      dateRange: { label: 'Selecciona un rango de fechas', text: ': Elige Invierno–Primavera u Otoño–Verano para un diseño más limpio y fácil de leer.' },
      specialDates: { label: 'Añade fechas especiales', text: ': Ingresa Día y Mes en Líneas de Fecha. Desmarca Hoy para eliminar la línea roja con la fecha de hoy.' },
      reset: { label: 'Restablecer a predeterminado:', text: '¿Te sientes perdido? Restablece el reloj a la configuración predeterminada (y vuelve a mostrar este popup). Desplázate hasta la parte inferior de la interfaz y haz clic en reset.' },
    },
    closing: 'CONSEJO: Verifica la escala final de tu reloj habilitando y midiendo el gnomon emergente. Disfruta explorando, experimentando y creando tu reloj perfecto.',
    closingBold: '¡Feliz Construcción!',
    dontShowAgain: 'No volver a mostrar',
    gotIt: 'Entendido',
    sendFeedback: '¡enviar comentarios!',
  },
  fr: {
    title: 'Comment Construire Votre Cadran Solaire Personnalisé',
    steps: {
      location: { label: 'Définissez votre emplacement', text: ' en utilisant le menu déroulant, la carte interactive ou en entrant directement la latitude et la longitude.' },
      size: { label: 'Choisissez la taille et la forme de votre cadran:', text: ' Grand ou Petit; que vous préfériez un rectangle classique ou un ovale gracieux.' },
      gnomon: { label: 'Choisissez un style de gnomon:', text: ' Ne manquez pas le gnomon pop-up innovant, parfait pour les cadrans en papier et l\'expérimentation pratique.' },
      dateRange: { label: 'Sélectionnez une plage de dates', text: ': Choisissez Hiver–Printemps ou Automne–Été pour une mise en page plus claire et plus facile à lire.' },
      specialDates: { label: 'Ajoutez des dates spéciales', text: ': Entrez le Jour et le Mois dans les Lignes de Date. Décochez Aujourd\'hui pour supprimer la ligne rouge avec la date d\'aujourd\'hui.' },
      reset: { label: 'Réinitialiser aux valeurs par défaut:', text: 'Vous êtes perdu? Réinitialisez le cadran aux paramètres par défaut (et réaffichez ce popup). Faites défiler jusqu\'en bas de l\'interface et cliquez sur reset.' },
    },
    closing: 'ASTUCE : Vérifiez l\'échelle finale de votre cadran en activant et en mesurant le gnomon pop-up. Profitez de l\'exploration, de l\'expérimentation et de la création de votre cadran parfait.',
    closingBold: 'Bon Cadranage!',
    dontShowAgain: 'Ne plus afficher',
    gotIt: 'Compris',
    sendFeedback: 'envoyer des commentaires!',
  },
  de: {
    title: 'So Bauen Sie Ihre Individuelle Sonnenuhr',
    steps: {
      location: { label: 'Legen Sie Ihren Standort fest', text: ', indem Sie das Dropdown-Menü, die interaktive Karte verwenden oder Breiten- und Längengrad direkt eingeben.' },
      size: { label: 'Wählen Sie Größe und Form Ihrer Sonnenuhr:', text: ' Groß oder Klein; ob Sie ein klassisches Rechteck oder ein elegantes Oval bevorzugen.' },
      gnomon: { label: 'Wählen Sie einen Gnomon-Stil:', text: ' Verpassen Sie nicht den innovativen Pop-up-Gnomon, perfekt für Papieruhren und praktische Experimente.' },
      dateRange: { label: 'Wählen Sie einen Datumsbereich', text: ': Wählen Sie Winter–Frühling oder Herbst–Sommer für ein klareres, leichter lesbares Layout.' },
      specialDates: { label: 'Fügen Sie besondere Daten hinzu', text: ': Geben Sie Tag und Monat in Datumslinien ein. Deaktivieren Sie Heute, um die rote Linie mit dem heutigen Datum zu entfernen.' },
      reset: { label: 'Auf Standard zurücksetzen:', text: 'Sind Sie verloren? Setzen Sie die Sonnenuhr auf die Standardeinstellungen zurück (und zeigen Sie dieses Popup erneut an). Scrollen Sie zum Ende der Benutzeroberfläche und klicken Sie auf reset.' },
    },
    closing: 'TIPP: Überprüfen Sie die endgültige Skalierung Ihrer Sonnenuhr, indem Sie den Pop-up-Gnomon aktivieren und messen. Genießen Sie das Erkunden, Experimentieren und Gestalten Ihrer perfekten Sonnenuhr.',
    closingBold: 'Viel Erfolg!',
    dontShowAgain: 'Nicht mehr anzeigen',
    gotIt: 'Verstanden',
    sendFeedback: 'Feedback senden!',
  },
  it: {
    title: 'Come Costruire la Tua Meridiana Personalizzata',
    steps: {
      location: { label: 'Imposta la tua posizione', text: ' utilizzando il menu a discesa, la mappa interattiva o inserendo direttamente latitudine e longitudine.' },
      size: { label: 'Scegli la dimensione e la forma della tua meridiana:', text: ' Grande o Piccola; che tu preferisca un rettangolo classico o un ovale elegante.' },
      gnomon: { label: 'Scegli uno stile di gnomone:', text: ' Non perdere l\'innovativo gnomone pop-up, perfetto per meridiane di carta e sperimentazione pratica.' },
      dateRange: { label: 'Seleziona un intervallo di date', text: ': Scegli Inverno–Primavera o Autunno–Estate per un layout più pulito e facile da leggere.' },
      specialDates: { label: 'Aggiungi date speciali', text: ': Inserisci Giorno e Mese nelle Linee di Data. Deseleziona Oggi per rimuovere la linea rossa con la data di oggi.' },
      reset: { label: 'Ripristina alle impostazioni predefinite:', text: 'Ti senti perso? Ripristina la meridiana alle impostazioni predefinite (e riporta questo popup). Scorri fino in fondo all\'interfaccia e clicca su reset.' },
    },
    closing: 'SUGGERIMENTO: Verifica la scala finale del tuo quadrante abilitando e misurando il gnomone pop-up. Divertiti esplorando, sperimentando e creando la tua meridiana perfetta.',
    closingBold: 'Buona Costruzione!',
    dontShowAgain: 'Non mostrare più',
    gotIt: 'Capito',
    sendFeedback: 'invia feedback!',
  },
  pt: {
    title: 'Como Construir Seu Relógio de Sol Personalizado',
    steps: {
      location: { label: 'Defina sua localização', text: ' usando o menu suspenso, o mapa interativo ou inserindo latitude e longitude diretamente.' },
      size: { label: 'Escolha o tamanho e a forma do seu relógio:', text: ' Grande ou Pequeno; se você prefere um retângulo clássico ou um oval gracioso.' },
      gnomon: { label: 'Escolha um estilo de gnômon:', text: ' Não perca o inovador gnômon pop-up, perfeito para relógios de papel e experimentação prática.' },
      dateRange: { label: 'Selecione um intervalo de datas', text: ': Escolha Inverno–Primavera ou Outono–Verão para um layout mais limpo e fácil de ler.' },
      specialDates: { label: 'Adicione datas especiais', text: ': Insira Dia e Mês nas Linhas de Data. Desmarque Hoje para remover a linha vermelha com a data de hoje.' },
      reset: { label: 'Redefinir para padrão:', text: 'Está perdido? Redefina o relógio para as configurações padrão (e traga de volta este popup). Role até o final da interface e clique em reset.' },
    },
    closing: 'DICA: Verifique a escala final do seu relógio habilitando e medindo o gnômon pop-up. Aproveite explorando, experimentando e criando seu relógio perfeito.',
    closingBold: 'Boa Construção!',
    dontShowAgain: 'Não mostrar novamente',
    gotIt: 'Entendi',
    sendFeedback: 'enviar feedback!',
  },
  zh: {
    title: '如何制作您的定制日晷',
    steps: {
      location: { label: '设置您的位置', text: '：使用下拉菜单、交互式地图或直接输入纬度和经度。' },
      size: { label: '选择日晷的尺寸和形状：', text: ' 大或小；无论您喜欢经典的矩形还是优雅的椭圆形。' },
      gnomon: { label: '选择晷针样式：', text: ' 不要错过创新的弹出式晷针，非常适合纸质日晷和动手实验。' },
      dateRange: { label: '选择日期范围', text: '：选择冬季–春季或秋季–夏季，以获得更清晰、更易读的布局。' },
      specialDates: { label: '添加特殊日期', text: '：在日期线中输入日期和月份。取消选中"今天"以移除带有今天日期的红线。' },
      reset: { label: '重置为默认值：', text: '感到困惑？将日晷重置为默认设置（并重新显示此弹出窗口）。滚动到界面底部并点击 reset。' },
    },
    closing: '提示：通过启用并测量弹出式晷针来验证最终日晷的比例。享受探索、实验和制作完美日晷的乐趣。',
    closingBold: '祝制作愉快！',
    dontShowAgain: '不再显示',
    gotIt: '知道了',
    sendFeedback: '发送反馈！',
  },
  ja: {
    title: 'カスタム日時計の作り方',
    steps: {
      location: { label: '位置を設定', text: '：ドロップダウンメニュー、インタラクティブマップ、または緯度と経度を直接入力して設定します。' },
      size: { label: '日時計のサイズと形状を選択：', text: ' 大きいまたは小さい；クラシックな長方形または優雅な楕円形のどちらを好むか。' },
      gnomon: { label: 'グノモンスタイルを選択：', text: ' 紙の日時計や実践的な実験に最適な革新的なポップアップグノモンをお見逃しなく。' },
      dateRange: { label: '日付範囲を選択', text: '：よりクリーンで読みやすいレイアウトのために、冬–春または秋–夏を選択します。' },
      specialDates: { label: '特別な日付を追加', text: '：日付線に日と月を入力します。今日の日付の赤い線を削除するには、「今日」のチェックを外します。' },
      reset: { label: 'デフォルトにリセット：', text: '迷っていますか？日時計をデフォルト設定にリセットします（このポップアップも再度表示されます）。インターフェースの下部までスクロールして、reset をクリックしてください。' },
    },
    closing: 'ヒント：ポップアップグノモンを有効にして測定することで、最終的な日時計のスケールを確認してください。探索、実験、完璧な日時計を作り上げることをお楽しみください。',
    closingBold: '良い日時計作りを！',
    dontShowAgain: '再表示しない',
    gotIt: '了解しました',
    sendFeedback: 'フィードバックを送信！',
  },
  ko: {
    title: '맞춤형 해시계 만들기',
    steps: {
      location: { label: '위치 설정', text: '：드롭다운 메뉴, 대화형 지도 또는 위도와 경도를 직접 입력하여 설정합니다.' },
      size: { label: '해시계의 크기와 모양 선택：', text: ' 크거나 작은；클래식한 직사각형 또는 우아한 타원형 중 선호하는 것을 선택하세요.' },
      gnomon: { label: '그노몬 스타일 선택：', text: ' 종이 해시계와 실습 실험에 완벽한 혁신적인 팝업 그노몬을 놓치지 마세요.' },
      dateRange: { label: '날짜 범위 선택', text: '：더 깔끔하고 읽기 쉬운 레이아웃을 위해 겨울–봄 또는 가을–여름을 선택합니다.' },
      specialDates: { label: '특별한 날짜 추가', text: '：날짜선에 일과 월을 입력합니다. 오늘 날짜의 빨간 선을 제거하려면 "오늘"의 체크를 해제하세요.' },
      reset: { label: '기본값으로 재설정:', text: '길을 잃으셨나요? 해시계를 기본 설정으로 재설정하세요 (이 팝업도 다시 표시됩니다). 인터페이스 하단으로 스크롤하여 reset을 클릭하세요.' },
    },
    closing: '팁: 팝업 그노몬을 활성화하고 측정하여 최종 해시계의 비율을 확인하세요. 탐색하고 실험하며 완벽한 해시계를 만드는 것을 즐기세요.',
    closingBold: '좋은 해시계 만들기 되세요!',
    dontShowAgain: '다시 표시하지 않음',
    gotIt: '알겠습니다',
    sendFeedback: '피드백 보내기!',
  },
  ru: {
    title: 'Как Создать Свой Персональный Солнечные Часы',
    steps: {
      location: { label: 'Установите ваше местоположение', text: ' используя выпадающее меню, интерактивную карту или введя широту и долготу напрямую.' },
      size: { label: 'Выберите размер и форму ваших часов:', text: ' Большие или Маленькие; предпочитаете ли вы классический прямоугольник или изящный овал.' },
      gnomon: { label: 'Выберите стиль гномона:', text: ' Не пропустите инновационный всплывающий гномон, идеально подходящий для бумажных часов и практических экспериментов.' },
      dateRange: { label: 'Выберите диапазон дат', text: ': Выберите Зима–Весна или Осень–Лето для более чистого и удобочитаемого макета.' },
      specialDates: { label: 'Добавьте особые даты', text: ': Введите День и Месяц в Линиях Даты. Снимите флажок Сегодня, чтобы удалить красную линию с сегодняшней датой.' },
      reset: { label: 'Сбросить к значениям по умолчанию:', text: 'Запутались? Сбросьте солнечные часы к настройкам по умолчанию (и верните это всплывающее окно). Прокрутите до конца интерфейса и нажмите reset.' },
    },
    closing: 'СОВЕТ: Проверьте масштаб готовых солнечных часов, включив и измерив всплывающий гномон. Наслаждайтесь исследованием, экспериментированием и созданием ваших идеальных часов.',
    closingBold: 'Удачного Создания!',
    dontShowAgain: 'Больше не показывать',
    gotIt: 'Понятно',
    sendFeedback: 'отправить отзыв!',
  },
  ar: {
    title: 'كيفية بناء ساعتك الشمسية المخصصة',
    steps: {
      location: { label: 'حدد موقعك', text: ' باستخدام القائمة المنسدلة أو الخريطة التفاعلية أو بإدخال خط العرض وخط الطول مباشرة.' },
      size: { label: 'اختر حجم وشكل ساعتك:', text: ' كبيرة أو صغيرة؛ سواء كنت تفضل مستطيلاً كلاسيكياً أو بيضاوياً أنيقاً.' },
      gnomon: { label: 'اختر نمط العقرب:', text: ' لا تفوت العقرب المنبثق المبتكر، المثالي للساعات الورقية والتجارب العملية.' },
      dateRange: { label: 'حدد نطاقاً زمنياً', text: ': اختر الشتاء–الربيع أو الخريف–الصيف للحصول على تخطيط أنظف وأسهل للقراءة.' },
      specialDates: { label: 'أضف تواريخ خاصة', text: ': أدخل اليوم والشهر في خطوط التاريخ. قم بإلغاء تحديد "اليوم" لإزالة الخط الأحمر مع تاريخ اليوم.' },
      reset: { label: 'إعادة تعيين إلى الافتراضي:', text: 'هل أنت تائه؟ أعد تعيين الساعة الشمسية إلى الإعدادات الافتراضية (وأعد عرض هذه النافذة المنبثقة). انتقل إلى أسفل الواجهة وانقر على reset.' },
    },
    closing: 'نصيحة: تحقق من مقياس ساعتك الشمسية النهائية عن طريق تفعيل وقياس العقرب المنبثق. استمتع بالاستكشاف والتجربة وصنع ساعتك المثالية.',
    closingBold: 'ساعة سعيدة!',
    dontShowAgain: 'لا تظهر مرة أخرى',
    gotIt: 'فهمت',
    sendFeedback: 'إرسال الملاحظات!',
  },
};

const languages: { code: Language; countryCode: string; name: string }[] = [
  { code: 'en', countryCode: 'us', name: 'English' },
  { code: 'es', countryCode: 'es', name: 'Español' },
  { code: 'fr', countryCode: 'fr', name: 'Français' },
  { code: 'de', countryCode: 'de', name: 'Deutsch' },
  { code: 'it', countryCode: 'it', name: 'Italiano' },
  { code: 'pt', countryCode: 'pt', name: 'Português' },
  { code: 'zh', countryCode: 'cn', name: '中文' },
  { code: 'ja', countryCode: 'jp', name: '日本語' },
  { code: 'ko', countryCode: 'kr', name: '한국어' },
  { code: 'ru', countryCode: 'ru', name: 'Русский' },
  { code: 'ar', countryCode: 'sa', name: 'العربية' },
];

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ onClose }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Check if user has dismissed the welcome dialog
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setShowDialog(true);
    }
    // Load saved language preference
    const savedLanguage = localStorage.getItem('sundial-welcome-language') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    }
    setShowDialog(false);
    onClose?.();
  };

  if (!showDialog) {
    return null;
  }

  const isRTL = language === 'ar';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={handleClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '600px',
          maxHeight: '99vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          position: 'relative',
          margin: '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            [isRTL ? 'left' : 'right']: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={20} color="#6b7280" />
        </button>

        {/* Language Selector */}
        <div dir="ltr" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                localStorage.setItem('sundial-welcome-language', lang.code);
              }}
              style={{
                background: language === lang.code ? '#2563eb' : 'transparent',
                border: `1.5px solid ${language === lang.code ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: '6px',
                padding: '4px 6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                height: '32px',
              }}
              onMouseEnter={e => {
                if (language !== lang.code) {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }
              }}
              onMouseLeave={e => {
                if (language !== lang.code) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={lang.name}
              aria-label={`Switch to ${lang.name}`}
            >
              <img
                src={`https://flagicons.lipis.dev/flags/4x3/${lang.countryCode}.svg`}
                alt={`${lang.name} flag`}
                style={{
                  width: '24px',
                  height: '18px',
                  objectFit: 'cover',
                  borderRadius: '2px',
                  display: 'block',
                }}
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </button>
          ))}
        </div>

        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Compass size={24} color="#2563eb" />
          {translations[language].title}
        </h2>

        <div style={{ fontSize: '1rem', lineHeight: '1.6', color: '#4b5563', marginBottom: '24px' }}>
          <ul style={{ paddingInlineStart: '24px', margin: '0 0 16px 0' }}>
            <li style={{ marginBottom: '12px' }}>
              <strong>{translations[language].steps.location.label}</strong> {translations[language].steps.location.text}
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>{translations[language].steps.size.label}</strong> {translations[language].steps.size.text}
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>{translations[language].steps.gnomon.label}</strong> {translations[language].steps.gnomon.text}
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>{translations[language].steps.dateRange.label}</strong>{translations[language].steps.dateRange.text}
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>{translations[language].steps.specialDates.label}</strong>{translations[language].steps.specialDates.text}
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>{translations[language].steps.reset.label}</strong>{' '}
              {(() => {
                const resetText = translations[language].steps.reset.text;
                // Find the word "reset" (case-insensitive) and make it a link
                const resetRegex = /\breset\b/i;
                const parts = resetText.split(resetRegex);
                
                return parts.map((part, idx, arr) => {
                  if (idx === arr.length - 1) {
                    return <React.Fragment key={idx}>{part}</React.Fragment>;
                  }
                  return (
                    <React.Fragment key={idx}>
                      {part}
                      <a
                        href="#reset-button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleClose();
                          setTimeout(() => {
                            const resetButton = document.getElementById('reset-button');
                            if (resetButton) {
                              resetButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              // Highlight the button briefly
                              resetButton.style.transition = 'background-color 0.3s';
                              resetButton.style.backgroundColor = '#eff6ff';
                              setTimeout(() => {
                                resetButton.style.backgroundColor = '';
                              }, 2000);
                            }
                          }, 100);
                        }}
                        style={{
                          color: '#2563eb',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        reset
                      </a>
                    </React.Fragment>
                  );
                });
              })()}
            </li>
          </ul>
          
          <p style={{ margin: '16px 0 0 0' }}>
            {translations[language].closing}<br />
            <strong>{translations[language].closingBold}</strong>
          </p>
        </div>

        <div style={{ 
          marginTop: '24px', 
          paddingTop: '20px', 
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer',
            fontSize: '0.9rem',
            color: '#4b5563',
          }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>{translations[language].dontShowAgain}</span>
          </label>

          <button
            onClick={handleClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            {translations[language].gotIt}
          </button>
        </div>

        {/* Version number at center bottom */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#9ca3af',
          marginTop: '0px',
          marginBottom: '0px',
        }}>
          v{version} — <a
            href="mailto:support@sundial.gennetten.org?subject=Sundial%20Feedback"
            style={{
              color: '#9ca3af',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#718096';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            {translations[language].sendFeedback}
          </a>
        </div>
      </div>
    </div>
  );
};

// Export function to clear the dismissed state (for reset functionality)
export const clearWelcomeDismissed = () => {
  localStorage.removeItem(WELCOME_DISMISSED_KEY);
};

export default WelcomeDialog;
