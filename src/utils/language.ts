import type { SupportedLanguage } from "../types";

export const SUPPORTED_LANGUAGES: Array<{
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  if (value === "es" || value === "hi") return value;
  return "en";
}

export function getLanguageLabel(language: SupportedLanguage): string {
  return SUPPORTED_LANGUAGES.find((entry) => entry.code === language)?.label ?? "English";
}

const COPY = {
  en: {
    common: {
      policy: "Policy",
      camera: "Camera",
      askAboutCoverage: "Ask about coverage",
      addItem: "Add Item",
      manualModeActive: "Manual Mode Active",
      cameraDisabled: "Camera is disabled.",
      enableCamera: "Enable Camera",
      requestingCamera: "Requesting camera access...",
      mockMode: "Mock Mode",
      simulatedFeed: "Simulated camera feed",
      mockDetectionMode: "Mock Detection Mode",
      aiRoomScan: "AI ROOM SCAN",
      aiScanning: "AI SCANNING...",
      geminiRoomRead: "Gemini Room Read",
      addToList: "Add To List",
      addAllToList: "Add All To List",
      openDashboard: "Open Dashboard",
      added: "Added",
      priorities: "Priorities",
      nextSteps: "Next Steps",
      useManualMode: "Use Manual Mode",
      retryPermission: "Retry Permission",
      reloadPage: "Reload Page",
      tryAgain: "Try Again",
      cameraAccessNeeded: "Camera Access Needed",
      browserNotSupported: "Browser Not Supported",
      aiModelFailedToLoad: "AI Model Failed to Load",
      cameraError: "Camera Error",
      cameraDeniedBody:
        "Camera access is required to detect items in your room. Allow camera access in your browser and then retry.",
      browserUnsupportedBody:
        "Your browser does not support camera access. Please use a modern browser like Chrome, Safari, or Firefox.",
      aiModelFailedBody:
        "The AI detection model failed to load. This may be due to a network issue. Please try reloading the page.",
      manualModeTip:
        "Manual mode lets you add items by hand. You can still switch policies, view coverage details, and see recommendations.",
    },
    onboarding: {
      selectInsurance: "Select Your Insurance",
      selectInsuranceBody: "Choose your current policy type and preferred guidance language.",
      choosePolicy: "Choose your current policy type. You can change this later.",
      preferences: "Language and voice",
      voiceInput: "Voice input",
      spokenExplanations: "Spoken explanations",
      continue: "Continue",
      back: "Back",
      skipDemo: "Skip demo",
      readyToScan: "Ready to scan your room?",
      readyToScanBody:
        "Point your camera at objects in your room and we will highlight coverage in real time.",
      startCamera: "Start Camera",
    },
  },
  es: {
    common: {
      policy: "Póliza",
      camera: "Cámara",
      askAboutCoverage: "Preguntar cobertura",
      addItem: "Agregar artículo",
      manualModeActive: "Modo manual activo",
      cameraDisabled: "La cámara está desactivada.",
      enableCamera: "Activar cámara",
      requestingCamera: "Solicitando acceso a la cámara...",
      mockMode: "Modo simulado",
      simulatedFeed: "Vista simulada",
      mockDetectionMode: "Modo de detección simulada",
      aiRoomScan: "ESCANEO IA",
      aiScanning: "ESCANEANDO...",
      geminiRoomRead: "Lectura Gemini",
      addToList: "Agregar a la lista",
      addAllToList: "Agregar todo",
      openDashboard: "Abrir panel",
      added: "Agregado",
      priorities: "Prioridades",
      nextSteps: "Siguientes pasos",
      useManualMode: "Usar modo manual",
      retryPermission: "Reintentar permiso",
      reloadPage: "Recargar página",
      tryAgain: "Intentar de nuevo",
      cameraAccessNeeded: "Se necesita acceso a la cámara",
      browserNotSupported: "Navegador no compatible",
      aiModelFailedToLoad: "No se pudo cargar el modelo IA",
      cameraError: "Error de cámara",
      cameraDeniedBody:
        "Se necesita acceso a la cámara para detectar objetos en tu habitación. Permite la cámara en tu navegador y vuelve a intentar.",
      browserUnsupportedBody:
        "Tu navegador no admite acceso a la cámara. Usa un navegador moderno como Chrome, Safari o Firefox.",
      aiModelFailedBody:
        "El modelo de detección no se pudo cargar. Puede ser un problema de red. Recarga la página.",
      manualModeTip:
        "El modo manual te permite agregar artículos a mano. Aún puedes cambiar pólizas y revisar cobertura.",
    },
    onboarding: {
      selectInsurance: "Selecciona tu seguro",
      selectInsuranceBody: "Elige tu tipo de póliza y el idioma de guía.",
      choosePolicy: "Elige tu póliza actual. Puedes cambiarla después.",
      preferences: "Idioma y voz",
      voiceInput: "Entrada por voz",
      spokenExplanations: "Explicaciones habladas",
      continue: "Continuar",
      back: "Atrás",
      skipDemo: "Omitir demo",
      readyToScan: "¿Listo para escanear tu habitación?",
      readyToScanBody: "Apunta la cámara a los objetos y resaltaremos la cobertura en tiempo real.",
      startCamera: "Iniciar cámara",
    },
  },
  hi: {
    common: {
      policy: "पॉलिसी",
      camera: "कैमरा",
      askAboutCoverage: "कवरेज पूछें",
      addItem: "आइटम जोड़ें",
      manualModeActive: "मैनुअल मोड सक्रिय",
      cameraDisabled: "कैमरा बंद है।",
      enableCamera: "कैमरा चालू करें",
      requestingCamera: "कैमरा अनुमति मांगी जा रही है...",
      mockMode: "मॉक मोड",
      simulatedFeed: "सिम्युलेटेड फ़ीड",
      mockDetectionMode: "मॉक डिटेक्शन मोड",
      aiRoomScan: "एआई रूम स्कैन",
      aiScanning: "स्कैन हो रहा है...",
      geminiRoomRead: "जेमिनी रूम रीड",
      addToList: "सूची में जोड़ें",
      addAllToList: "सब जोड़ें",
      openDashboard: "डैशबोर्ड खोलें",
      added: "जोड़ा गया",
      priorities: "प्राथमिकताएँ",
      nextSteps: "अगले कदम",
      useManualMode: "मैनुअल मोड",
      retryPermission: "अनुमति फिर से दें",
      reloadPage: "पेज रीलोड करें",
      tryAgain: "फिर कोशिश करें",
      cameraAccessNeeded: "कैमरा अनुमति चाहिए",
      browserNotSupported: "ब्राउज़र समर्थित नहीं है",
      aiModelFailedToLoad: "एआई मॉडल लोड नहीं हुआ",
      cameraError: "कैमरा त्रुटि",
      cameraDeniedBody:
        "कमरे की चीजें पहचानने के लिए कैमरा अनुमति चाहिए। ब्राउज़र में कैमरा अनुमति दें और फिर दोबारा कोशिश करें।",
      browserUnsupportedBody:
        "आपका ब्राउज़र कैमरा एक्सेस का समर्थन नहीं करता। Chrome, Safari या Firefox जैसे आधुनिक ब्राउज़र का उपयोग करें।",
      aiModelFailedBody: "एआई डिटेक्शन मॉडल लोड नहीं हुआ। यह नेटवर्क समस्या हो सकती है। कृपया पेज रीलोड करें।",
      manualModeTip: "मैनुअल मोड में आप आइटम हाथ से जोड़ सकते हैं। आप पॉलिसी और कवरेज विवरण फिर भी देख सकते हैं।",
    },
    onboarding: {
      selectInsurance: "अपना बीमा चुनें",
      selectInsuranceBody: "अपनी पॉलिसी और पसंदीदा भाषा चुनें।",
      choosePolicy: "अपनी वर्तमान पॉलिसी चुनें। आप इसे बाद में बदल सकते हैं।",
      preferences: "भाषा और आवाज़",
      voiceInput: "वॉइस इनपुट",
      spokenExplanations: "बोली गई व्याख्याएँ",
      continue: "आगे बढ़ें",
      back: "वापस",
      skipDemo: "डेमो छोड़ें",
      readyToScan: "क्या आप कमरे को स्कैन करने के लिए तैयार हैं?",
      readyToScanBody: "कैमरा वस्तुओं की ओर करें और हम रीयल-टाइम में कवरेज दिखाएंगे।",
      startCamera: "कैमरा शुरू करें",
    },
  },
} as const;

export function getCopy(language: SupportedLanguage) {
  return COPY[language] ?? COPY.en;
}
