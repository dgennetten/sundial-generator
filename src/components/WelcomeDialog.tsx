// src/components/WelcomeDialog.tsx
import React, { useState, useEffect } from 'react';
import { X, Compass, Camera, BookOpen } from 'lucide-react';
import { version } from '../../package.json';
import { galleryTranslations } from './gallery/galleryTranslations';
import GalleryErrorBoundary from './gallery/GalleryErrorBoundary';
// Imported statically (not React.lazy) — see the note in DesignExport.tsx.
import PhotoGallery from './gallery/PhotoGallery';

const WELCOME_DISMISSED_KEY = 'sundial-welcome-dismissed';

interface WelcomeDialogProps {
  onClose?: () => void;
  language?: string;
  onLanguageChange?: (lang: string) => void;
}

export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ru' | 'ar';

interface Translations {
  title: string;
  steps: {
    location: { label: string; text: string };
    gnomon: { label: string; text: string };
    dateRange: { label: string; text: string };
    specialDates: { label: string; text: string };
    reset: { label: string; text: string };
  };
  dontShowAgain: string;
  gotIt: string;
  sendFeedback: string;
  overviewLink: string;
}

const translations: Record<Language, Translations> = {
  en: {
    title: 'How to Build Your Custom Sundial',
    steps: {
      location: { label: 'Location:', text: 'Use the dropdown menu, the interactive map, or enter latitude and longitude directly.' },
      gnomon: { label: 'Gnomon Style:', text: 'Don\'t miss the innovative popup gnomons, especially the new greeting card popup, perfect for paper dials (see gallery photos).' },
      dateRange: { label: 'Full/Half Year:', text: ': Choose Winter–Spring or Fall–Summer for a cleaner, easier‑to‑read layout.' },
      specialDates: { label: 'Special Dates:', text: ': Display any Special Dates. Uncheck \'Today\' to remove the red line with today\'s date.' },
      reset: { label: 'Reset to Defaults:', text: 'Click Reset button to restore defaults and bring back this popup.' },
    },
    dontShowAgain: 'Don\'t show again',
    gotIt: 'Got it',
    sendFeedback: 'send feedback!',
    overviewLink: 'Illustrated overview of the pop-up dials →',
  },
  es: {
    title: 'Cómo Construir Tu Reloj de Sol Personalizado',
    steps: {
      location: { label: 'Ubicación:', text: ' Usa el menú desplegable, el mapa interactivo o introduce latitud y longitud directamente.' },
      gnomon: { label: 'Estilo de Gnomon:', text: ' No te pierdas los innovadores gnomons emergentes, especialmente el nuevo popup de tarjeta de felicitación, perfecto para relojes de papel y experimentación práctica.' },
      dateRange: { label: 'Año Completo/Medio:', text: ': Elige Invierno–Primavera u Otoño–Verano para un diseño más limpio y fácil de leer.' },
      specialDates: { label: 'Fechas Especiales:', text: ': Muestra cualquier fecha especial. Desmarca \'Hoy\' para eliminar la línea roja con la fecha de hoy.' },
      reset: { label: 'Restablecer a Predeterminados:', text: 'Haz clic en el botón Restablecer para restaurar los valores predeterminados y volver a mostrar este popup.' },
    },
    dontShowAgain: 'No volver a mostrar',
    gotIt: 'Entendido',
    sendFeedback: '¡enviar comentarios!',
    overviewLink: 'Resumen ilustrado de los relojes emergentes →',
  },
  fr: {
    title: 'Comment Construire Votre Cadran Solaire Personnalisé',
    steps: {
      location: { label: 'Emplacement :', text: ' Utilisez le menu déroulant, la carte interactive ou saisissez directement la latitude et la longitude.' },
      gnomon: { label: 'Style de Gnomon :', text: ' Ne manquez pas les gnomons pop-up innovants, notamment le nouveau popup carte de vœux, parfait pour les cadrans en papier et l\'expérimentation pratique.' },
      dateRange: { label: 'Année Complète/Demi :', text: ': Choisissez Hiver–Printemps ou Automne–Été pour une mise en page plus claire et plus facile à lire.' },
      specialDates: { label: 'Dates Spéciales :', text: ': Affichez toutes les dates spéciales. Décochez « Aujourd\'hui » pour supprimer la ligne rouge avec la date d\'aujourd\'hui.' },
      reset: { label: 'Réinitialiser aux Valeurs par Défaut :', text: 'Cliquez sur le bouton Réinitialiser pour restaurer les paramètres par défaut et réafficher ce popup.' },
    },
    dontShowAgain: 'Ne plus afficher',
    gotIt: 'Compris',
    sendFeedback: 'envoyer des commentaires!',
    overviewLink: 'Aperçu illustré des cadrans pop-up →',
  },
  de: {
    title: 'So Bauen Sie Ihre Individuelle Sonnenuhr',
    steps: {
      location: { label: 'Standort:', text: ' Verwenden Sie das Dropdown-Menü, die interaktive Karte oder geben Sie Breiten- und Längengrad direkt ein.' },
      gnomon: { label: 'Gnomon-Stil:', text: ' Verpassen Sie nicht die innovativen Pop-up-Gnomons, insbesondere den neuen Grußkarten-Popup, perfekt für Papieruhren und praktische Experimente.' },
      dateRange: { label: 'Ganzes/Halbes Jahr:', text: ': Wählen Sie Winter–Frühling oder Herbst–Sommer für ein klareres, leichter lesbares Layout.' },
      specialDates: { label: 'Besondere Daten:', text: ': Zeigen Sie beliebige besondere Daten an. Deaktivieren Sie „Heute“, um die rote Linie mit dem heutigen Datum zu entfernen.' },
      reset: { label: 'Auf Standardwerte Zurücksetzen:', text: 'Klicken Sie auf die Schaltfläche Zurücksetzen, um die Standardeinstellungen wiederherzustellen und dieses Popup erneut anzuzeigen.' },
    },
    dontShowAgain: 'Nicht mehr anzeigen',
    gotIt: 'Verstanden',
    sendFeedback: 'Feedback senden!',
    overviewLink: 'Illustrierte Übersicht der Pop-up-Zifferblätter →',
  },
  it: {
    title: 'Come Costruire la Tua Meridiana Personalizzata',
    steps: {
      location: { label: 'Posizione:', text: ' Usa il menu a discesa, la mappa interattiva o inserisci direttamente latitudine e longitudine.' },
      gnomon: { label: 'Stile dello Gnomone:', text: ' Non perdere gli innovativi gnomoni pop-up, in particolare il nuovo popup biglietto d\'auguri, perfetto per meridiane di carta e sperimentazione pratica.' },
      dateRange: { label: 'Anno Intero/Mezzo:', text: ': Scegli Inverno–Primavera o Autunno–Estate per un layout più pulito e facile da leggere.' },
      specialDates: { label: 'Date Speciali:', text: ': Visualizza qualsiasi data speciale. Deseleziona «Oggi» per rimuovere la linea rossa con la data di oggi.' },
      reset: { label: 'Ripristina le Impostazioni Predefinite:', text: 'Clicca il pulsante Ripristina per ripristinare le impostazioni predefinite e riportare questo popup.' },
    },
    dontShowAgain: 'Non mostrare più',
    gotIt: 'Capito',
    sendFeedback: 'invia feedback!',
    overviewLink: 'Panoramica illustrata dei quadranti pop-up →',
  },
  pt: {
    title: 'Como Construir Seu Relógio de Sol Personalizado',
    steps: {
      location: { label: 'Localização:', text: ' Use o menu suspenso, o mapa interativo ou insira latitude e longitude diretamente.' },
      gnomon: { label: 'Estilo do Gnômon:', text: ' Não perca os inovadores gnômons pop-up, especialmente o novo popup de cartão de felicitações, perfeito para relógios de papel e experimentação prática.' },
      dateRange: { label: 'Ano Completo/Meio:', text: ': Escolha Inverno–Primavera ou Outono–Verão para um layout mais limpo e fácil de ler.' },
      specialDates: { label: 'Datas Especiais:', text: ': Exiba quaisquer datas especiais. Desmarque «Hoje» para remover a linha vermelha com a data de hoje.' },
      reset: { label: 'Redefinir para Padrões:', text: 'Clique no botão Redefinir para restaurar os padrões e trazer de volta este popup.' },
    },
    dontShowAgain: 'Não mostrar novamente',
    gotIt: 'Entendi',
    sendFeedback: 'enviar feedback!',
    overviewLink: 'Visão geral ilustrada dos relógios pop-up →',
  },
  zh: {
    title: '如何制作您的定制日晷',
    steps: {
      location: { label: '位置：', text: '使用下拉菜单、交互式地图或直接输入纬度和经度。' },
      gnomon: { label: '晷针样式：', text: ' 不要错过创新的弹出式晷针，尤其是全新的贺卡弹出式，非常适合纸质日晷和动手实验。' },
      dateRange: { label: '全年/半年：', text: '选择冬季–春季或秋季–夏季，以获得更清晰、更易读的布局。' },
      specialDates: { label: '特殊日期：', text: ' 显示任意特殊日期。取消选中「今天」以移除带有今天日期的红线。' },
      reset: { label: '重置为默认值：', text: '点击重置按钮以恢复默认设置并重新显示此弹出窗口。' },
    },
    dontShowAgain: '不再显示',
    gotIt: '知道了',
    sendFeedback: '发送反馈！',
    overviewLink: '弹出式日晷图解概览 →',
  },
  ja: {
    title: 'カスタム日時計の作り方',
    steps: {
      location: { label: '位置：', text: 'ドロップダウンメニュー、インタラクティブマップを使うか、緯度と経度を直接入力してください。' },
      gnomon: { label: 'グノモンスタイル：', text: ' 革新的なポップアップグノモン、特に新しいグリーティングカードポップアップをお見逃しなく。紙の日時計や実践的な実験に最適です。' },
      dateRange: { label: '全年/半年：', text: 'よりクリーンで読みやすいレイアウトのために、冬–春または秋–夏を選択します。' },
      specialDates: { label: '特別な日付：', text: ' 任意の特別な日付を表示します。「今日」のチェックを外すと、今日の日付の赤い線が削除されます。' },
      reset: { label: 'デフォルトにリセット：', text: 'リセットボタンをクリックしてデフォルト設定に戻し、このポップアップを再表示してください。' },
    },
    dontShowAgain: '再表示しない',
    gotIt: '了解しました',
    sendFeedback: 'フィードバックを送信！',
    overviewLink: 'ポップアップ日時計の図解概要 →',
  },
  ko: {
    title: '맞춤형 해시계 만들기',
    steps: {
      location: { label: '위치:', text: ' 드롭다운 메뉴, 대화형 지도를 사용하거나 위도와 경도를 직접 입력하세요.' },
      gnomon: { label: '그노몬 스타일:', text: ' 혁신적인 팝업 그노몬, 특히 새로운 그리팅 카드 팝업을 놓치지 마세요. 종이 해시계와 실습 실험에 완벽합니다.' },
      dateRange: { label: '전체/반년:', text: '더 깔끔하고 읽기 쉬운 레이아웃을 위해 겨울–봄 또는 가을–여름을 선택합니다.' },
      specialDates: { label: '특별한 날짜:', text: ' 원하는 특별한 날짜를 표시합니다. \'오늘\'의 체크를 해제하면 오늘 날짜의 빨간 선이 제거됩니다.' },
      reset: { label: '기본값으로 재설정:', text: '재설정 버튼을 클릭하여 기본값을 복원하고 이 팝업을 다시 표시하세요.' },
    },
    dontShowAgain: '다시 표시하지 않음',
    gotIt: '알겠습니다',
    sendFeedback: '피드백 보내기!',
    overviewLink: '팝업 해시계 그림 개요 →',
  },
  ru: {
    title: 'Как Создать Свой Персональный Солнечные Часы',
    steps: {
      location: { label: 'Местоположение:', text: ' Используйте выпадающее меню, интерактивную карту или введите широту и долготу напрямую.' },
      gnomon: { label: 'Стиль Гномона:', text: ' Не пропустите инновационные всплывающие гномоны, особенно новый всплывающий гномон-открытка, идеально подходящий для бумажных часов и практических экспериментов.' },
      dateRange: { label: 'Полный/Полугодовой:', text: ': Выберите Зима–Весна или Осень–Лето для более чистого и удобочитаемого макета.' },
      specialDates: { label: 'Особые Даты:', text: ': Отображайте любые особые даты. Снимите флажок «Сегодня», чтобы удалить красную линию с сегодняшней датой.' },
      reset: { label: 'Сбросить к Значениям по Умолчанию:', text: 'Нажмите кнопку Сбросить, чтобы восстановить настройки по умолчанию и вернуть это всплывающее окно.' },
    },
    dontShowAgain: 'Больше не показывать',
    gotIt: 'Понятно',
    sendFeedback: 'отправить отзыв!',
    overviewLink: 'Иллюстрированный обзор всплывающих циферблатов →',
  },
  ar: {
    title: 'كيفية بناء ساعتك الشمسية المخصصة',
    steps: {
      location: { label: 'الموقع:', text: ' استخدم القائمة المنسدلة أو الخريطة التفاعلية أو أدخل خط العرض وخط الطول مباشرة.' },
      gnomon: { label: 'نمط العقرب:', text: ' لا تفوت العقارب المنبثقة المبتكرة، وخاصة النافذة المنبثقة الجديدة لبطاقة التهنئة، المثالية للساعات الورقية والتجارب العملية.' },
      dateRange: { label: 'سنة كاملة/نصف سنة:', text: ': اختر الشتاء–الربيع أو الخريف–الصيف للحصول على تخطيط أنظف وأسهل للقراءة.' },
      specialDates: { label: 'تواريخ خاصة:', text: ': اعرض أي تواريخ خاصة. قم بإلغاء تحديد \'اليوم\' لإزالة الخط الأحمر مع تاريخ اليوم.' },
      reset: { label: 'إعادة التعيين إلى الافتراضيات:', text: 'انقر على زر إعادة التعيين لاستعادة الإعدادات الافتراضية وإعادة عرض هذه النافذة المنبثقة.' },
    },
    dontShowAgain: 'لا تظهر مرة أخرى',
    gotIt: 'فهمت',
    sendFeedback: 'إرسال الملاحظات!',
    overviewLink: 'نظرة عامة مصوّرة على الساعات الشمسية المنبثقة ←',
  },
};

export const languages: { code: Language; countryCode: string; flag: string; name: string }[] = [
  { code: 'en', countryCode: 'us', flag: '🇺🇸', name: 'English' },
  { code: 'es', countryCode: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', countryCode: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', countryCode: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'it', countryCode: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', countryCode: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'zh', countryCode: 'cn', flag: '🇨🇳', name: '中文' },
  { code: 'ja', countryCode: 'jp', flag: '🇯🇵', name: '日本語' },
  { code: 'ko', countryCode: 'kr', flag: '🇰🇷', name: '한국어' },
  { code: 'ru', countryCode: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'ar', countryCode: 'sa', flag: '🇸🇦', name: 'العربية' },
];

export const DIAL_LABELS: Record<Language, { latitude: string; longitude: string; height: string; spring: string; summer: string; fall: string; winter: string }> = {
  en: { latitude: 'Latitude',   longitude: 'Longitude',   height: 'height',    spring: 'Spring', summer: 'Summer', fall: 'Fall',    winter: 'Winter'   },
  es: { latitude: 'Latitud',    longitude: 'Longitud',    height: 'altura',    spring: 'Primavera', summer: 'Verano', fall: 'Otoño', winter: 'Invierno' },
  fr: { latitude: 'Latitude',   longitude: 'Longitude',   height: 'hauteur',   spring: 'Printemps', summer: 'Été',  fall: 'Automne', winter: 'Hiver'    },
  de: { latitude: 'Breite',     longitude: 'Länge',       height: 'Höhe',      spring: 'Frühling', summer: 'Sommer', fall: 'Herbst', winter: 'Winter'   },
  it: { latitude: 'Latitudine', longitude: 'Longitudine', height: 'altezza',   spring: 'Primavera', summer: 'Estate', fall: 'Autunno', winter: 'Inverno' },
  pt: { latitude: 'Latitude',   longitude: 'Longitude',   height: 'altura',    spring: 'Primavera', summer: 'Verão', fall: 'Outono', winter: 'Inverno'  },
  zh: { latitude: '纬度',        longitude: '经度',         height: '高度',       spring: '春', summer: '夏', fall: '秋', winter: '冬'                      },
  ja: { latitude: '緯度',        longitude: '経度',         height: '高さ',       spring: '春', summer: '夏', fall: '秋', winter: '冬'                      },
  ko: { latitude: '위도',        longitude: '경도',         height: '높이',       spring: '봄', summer: '여름', fall: '가을', winter: '겨울'                },
  ru: { latitude: 'Широта',     longitude: 'Долгота',     height: 'высота',    spring: 'Весна', summer: 'Лето', fall: 'Осень', winter: 'Зима'           },
  ar: { latitude: 'خط العرض',   longitude: 'خط الطول',   height: 'الارتفاع',  spring: 'الربيع', summer: 'الصيف', fall: 'الخريف', winter: 'الشتاء'     },
};

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ onClose, language: languageProp, onLanguageChange }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [internalLanguage, setInternalLanguage] = useState<Language>('en');

  const language: Language = (languageProp && translations[languageProp as Language] ? languageProp as Language : null) ?? internalLanguage;

  const handleLanguageSelect = (code: Language) => {
    setInternalLanguage(code);
    localStorage.setItem('sundial-welcome-language', code);
    onLanguageChange?.(code);
  };

  useEffect(() => {
    // On localhost, suppress auto-show unless reset just ran (sessionStorage flag)
    if (import.meta.env.DEV) {
      const resetFlag = sessionStorage.getItem('sundial-show-welcome-after-reset');
      if (!resetFlag) return;
      sessionStorage.removeItem('sundial-show-welcome-after-reset');
    }
    // Check if user has dismissed the welcome dialog
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setShowDialog(true);
    }
    // Load saved language preference
    const savedLanguage = localStorage.getItem('sundial-welcome-language') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      setInternalLanguage(savedLanguage);
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
    <>
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100dvh',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        zIndex: 10000,
      }}
      onClick={handleClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: 'calc(100dvh - 32px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
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
            zIndex: 1,
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

        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '32px 32px 16px',
          }}
        >
          {/* Language Selector */}
          <div dir="ltr" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e5e7eb',
            flexWrap: 'wrap',
          }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
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

          <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '12px', paddingInlineEnd: '28px' }}>
            <Compass size={24} color="#2563eb" />
            {translations[language].title}
          </h2>

          <div style={{ fontSize: '1rem', lineHeight: '1.5', color: '#4b5563' }}>
            <ul style={{ paddingInlineStart: '24px', margin: 0 }}>
              <li style={{ marginBottom: '5px' }}>
                <strong>{translations[language].steps.location.label}</strong> {translations[language].steps.location.text}
              </li>
              <li style={{ marginBottom: '5px' }}>
                <strong>{translations[language].steps.gnomon.label}</strong> {translations[language].steps.gnomon.text}
              </li>
              <li style={{ marginBottom: '5px' }}>
                <strong>{translations[language].steps.dateRange.label}</strong>{translations[language].steps.dateRange.text}
              </li>
              <li style={{ marginBottom: '5px' }}>
                <strong>{translations[language].steps.specialDates.label}</strong>{translations[language].steps.specialDates.text}
              </li>
              <li style={{ marginBottom: 0 }}>
                <strong>{translations[language].steps.reset.label}</strong>{' '}
                {translations[language].steps.reset.text}
              </li>
            </ul>

            <a
              href="/overview/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '18px',
                padding: '10px 16px',
                backgroundColor: '#eff6ff',
                border: '1.5px solid #2563eb',
                borderRadius: '8px',
                color: '#2563eb',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <BookOpen size={16} />
              {translations[language].overviewLink}
            </a>
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: '16px 32px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div style={{
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowGallery(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #2563eb',
                  borderRadius: '6px',
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.15)',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#dbeafe';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }}
              >
                <Camera size={16} />
                {galleryTranslations[language].photos}
              </button>

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
          </div>

          {/* Version number at center bottom */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '12px',
          }}>
            v{version} — <a
              href="mailto:douglas@gennetten.org?subject=Sundial%20Feedback"
              style={{
                color: '#dc2626',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#dc2626';
              }}
            >
              {translations[language].sendFeedback}
            </a>
          </div>
        </div>
      </div>
    </div>

    {showGallery && (
      <GalleryErrorBoundary onClose={() => setShowGallery(false)}>
        <PhotoGallery language={language} onClose={() => setShowGallery(false)} />
      </GalleryErrorBoundary>
    )}
    </>
  );
};

// Export function to clear the dismissed state (for reset functionality)
export const clearWelcomeDismissed = () => {
  localStorage.removeItem(WELCOME_DISMISSED_KEY);
};

export default WelcomeDialog;
