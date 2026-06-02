(() => {
  const STORAGE_KEY = "chuchotage.siteLanguage";
  const GEO_ENDPOINT = "/api/geo-language";
  const APP_STORE_URL = "https://apps.apple.com/it/app/chuchotage/id6770434335";
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage";
  const STORE_REDIRECT_URL = "/download/app/";
  const STORE_QR_URL = "/assets/chuchotage-store-qr.svg";

  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "pt", label: "Português" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" },
  ];

  const OUTPUT_LANGUAGES = ["es", "pt", "fr", "ja", "ru", "zh", "de", "ko", "hi", "id", "vi", "it", "en"];
  const INPUT_LANGUAGES = [
    "ar", "af", "az", "be", "bn", "bs", "bg", "ca", "zh", "hr", "cs", "da", "nl", "en", "et", "eu",
    "fa", "fi", "fil", "fr", "gl", "de", "el", "gu", "ht", "he", "hi", "hu", "hy", "id", "it", "ja",
    "jv", "ka", "kk", "ko", "lv", "lt", "mk", "ms", "ml", "mn", "my", "ne", "no", "pl", "pt", "pa",
    "ro", "ru", "sr", "sk", "sl", "sq", "es", "sw", "sv", "tl", "te", "th", "tr", "uk", "uz", "vi", "cy",
  ];

  const COPY = {
    en: {
      shared: {
        language: {
          label: "Language",
          aria: "Website language",
        },
        nav: {
          home: "Home",
          how: "How it works",
          languages: "Languages",
          story: "Story",
          privacy: "Privacy",
          contact: "Contact",
        },
        footer: {
          notes: "Notes",
          privacy: "Privacy policy",
        },
      },
      meta: {
        home: {
          title: "Chuchotage | Live Translation App",
          description: "Chuchotage is a personal app for live translation, named after whispered interpreting and built for quiet listen-along use.",
          ogTitle: "Chuchotage | Live Translation App",
          ogDescription: "A quiet personal app for live translation, inspired by whispered interpreting.",
        },
        privacy: {
          title: "Privacy Policy | Chuchotage",
          description: "Privacy policy for Chuchotage, the personal app for live translation and whispered interpreting-style listen-along use.",
          ogTitle: "Privacy Policy | Chuchotage",
          ogDescription: "How Chuchotage handles audio, sign-in, saved settings, and translation.",
        },
        blog: {
          title: "Chuchotage Notes | Live Translation Notes",
          description: "Notes from Chuchotage, the live translation app named after whispered interpreting.",
          ogTitle: "Chuchotage Notes",
          ogDescription: "Short notes on the name, product shape, and personal live translation ideas behind Chuchotage.",
        },
        story: {
          title: "Why It Is Called Chuchotage | Chuchotage",
          description: "Chuchotage is named after whispered interpreting: a quiet live translation practice that inspired the Chuchotage app.",
          ogTitle: "Why It Is Called Chuchotage",
          ogDescription: "The meaning behind Chuchotage, the live translation app inspired by whispered interpreting.",
        },
      },
      home: {
        hero: {
          eyebrow: "Live translation",
          lede: "Live translation in your ear, for the conversations around you.",
          primary: "Download",
          secondary: "How it works",
          availability: "Available now for iPhone and iPad. More platforms are on the way.",
          ready: "Ready",
          button: "Start translation",
        },
        workflow: {
          eyebrow: "How it works",
          title: "Speak nearby. Hear the translation.",
          steps: [
            "Sign in or add your own OpenAI key. Chuchotage uses it only to translate.",
            "Choose the language you want to hear and the microphone you prefer.",
            "Start translation. Chuchotage listens, detects the language, and plays the translation.",
          ],
        },
        languages: {
          eyebrow: "Languages",
          title: "It listens for many languages. You choose the one you want to hear.",
          intro: "You do not need to pick the language being spoken. Choose the language you want Chuchotage to speak back.",
          outputTitle: "Hear translation in",
          outputBody: "The languages Chuchotage can speak back to you.",
          inputTitle: "Understand speech from",
          inputBody: "Languages Chuchotage can recognize while listening.",
        },
        use: {
          eyebrow: "Everyday listening",
          title: "For moments when you want a quiet language bridge.",
          items: [
            "Following a talk or explanation nearby.",
            "Getting the gist of a travel conversation.",
            "Using a headset mic when the room is noisy.",
            "Keeping personal translation simple.",
          ],
        },
        story: {
          eyebrow: "Chuchotage meaning",
          title: "Whispered interpreting, reimagined as one quiet control.",
          body: "In interpreting, chuchotage is a quiet mode: the translation is spoken softly for the listener who needs it. The app borrows that idea for everyday live translation.",
          link: "Read the short origin note",
        },
        detail: {
          eyebrow: "Privacy",
          title: "No ads. No tracking. No saved transcripts.",
          items: [
            "Your sign-in and preferences stay on your device.",
            "Audio is sent for translation only while Chuchotage is running.",
            "Chuchotage does not keep a transcript history.",
          ],
        },
        limits: {
          eyebrow: "Important limits",
          title: "Personal support, not a certified interpreter.",
          body: "Live translation can make mistakes. Do not rely on Chuchotage for emergencies, legal decisions, medical decisions, or anything high-stakes.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Plain answers before you install.",
          items: [
            ["Does Chuchotage work offline?", "No. Chuchotage needs an internet connection while translating."],
            ["Do I need to sign in?", "Yes. You can sign in with ChatGPT where available, use a trial when offered, or use your own OpenAI key. Chuchotage cannot see your ChatGPT chats."],
            ["Does Chuchotage record audio?", "It listens only while translation is active. You control microphone permission, and Chuchotage does not store your audio."],
            ["Can I choose the audio source?", "Yes, depending on the device. Mobile use starts with the microphone. Desktop versions can add more listening options."],
          ],
        },
        cta: {
          eyebrow: "Download",
          title: "Choose your platform and get Chuchotage.",
          action: "Download",
        },
      },
      privacy: {
        updated: "Last updated May 25, 2026",
        title: "Privacy Policy",
        intro: "Chuchotage is a personal app for live speech translation. This policy explains what the app uses and where it goes.",
        sections: [
          {
            heading: "What the app uses",
            paragraphs: ["When you start translation, Chuchotage uses the audio you choose, the language you want to hear, and your saved app settings. It may also use your ChatGPT sign-in, your OpenAI key, or a trial setting if you choose one."],
          },
          {
            heading: "How it is used",
            paragraphs: ["Your audio is used to make the live translation after you press start. Any live text shown in the app is only for the current session. Chuchotage does not save a transcript history."],
          },
          {
            heading: "What stays on your device",
            paragraphs: ["Your sign-in, OpenAI key, trial setting, language choice, and audio settings are stored on your device using the secure storage provided by the operating system. You can remove saved app data from the app or your device settings."],
          },
          {
            heading: "Website language selection",
            paragraphs: ["The website has a language selector. If you have not chosen a language, the site may ask Chuchotage for a rough language suggestion based on country. Your manual language choice is saved in your browser."],
          },
          {
            heading: "What is shared",
            paragraphs: [{ html: "Chuchotage does not sell personal information, show ads, or use tracking tools. During translation, audio is sent to OpenAI so the translation can work. OpenAI handles that data under its own <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">data rules</a>. If you use a trial, Chuchotage may receive basic request information to start translation, but not your transcript text. Audio does not pass through Chuchotage." }],
          },
          {
            heading: "Permissions",
            paragraphs: ["Depending on your device, Chuchotage may ask for microphone access, notification access, Bluetooth-related access for headsets, screen or system-audio permission for device audio, and internet access for translation."],
          },
          {
            heading: "Retention",
            paragraphs: ["The developer does not receive or store your source audio, translated audio, live transcripts, or sign-in through Chuchotage. App data remains on your device until you clear it, replace it, or remove the app. Device backups are controlled by your operating system."],
          },
          {
            heading: "Children",
            paragraphs: ["Chuchotage is not directed to children under 13."],
          },
          {
            heading: "Contact",
            paragraphs: [{ html: "Questions about this policy can be sent to <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }],
          },
        ],
      },
      blog: {
        eyebrow: "Chuchotage notes",
        title: "Small notes from a quiet translation app.",
        lede: "The official notes for Chuchotage: the name, product choices, and the shape of personal live translation.",
        listLabel: "Chuchotage notes",
        noteDate: "May 9, 2026",
        noteTitle: "Why it is called Chuchotage",
        noteSummary: "The app name comes from whispered interpreting, a quiet live translation practice that fits the product better than a generic translator name.",
      },
      story: {
        eyebrow: "Chuchotage meaning",
        title: "Why it is called Chuchotage",
        lede: "The name comes from whispered interpreting: live translation meant for one listener, close enough to help and quiet enough not to take over the room.",
        sections: [
          {
            paragraphs: ["If you found this page by searching for Chuchotage, this is the official site for the Chuchotage app: a personal live translation app for listening across languages."],
          },
          {
            heading: "The word",
            paragraphs: [
              "Chuchotage is a French word used in interpreting circles for whispered interpreting. Instead of speaking into a booth or addressing a whole audience, an interpreter sits near a listener and quietly translates what is being said.",
              "That image is the whole idea. Chuchotage should feel close, useful, and small: a translation companion that helps one person follow along.",
            ],
          },
          {
            heading: "The app",
            paragraphs: ["The app keeps that shape. Open Chuchotage, choose the language you want to hear, and start translation. The main screen stays simple because the job is simple: listen, translate, stop."],
            list: [
              "Chuchotage uses the audio you choose only while translation is active.",
              "Your sign-in stays on your device.",
              "Audio is sent for translation only while Chuchotage is running.",
            ],
          },
          {
            heading: "The promise",
            paragraphs: [
              "A lot of translation software feels like a control room. Chuchotage is named for the opposite feeling: a quiet whisper of meaning arriving at the right moment.",
              "That is why the name stayed. Chuchotage is unusual enough to search, specific enough to remember, and honest about the app's purpose: personal live translation without ads, tracking, or saved transcripts.",
            ],
          },
        ],
        returnLink: "Return to the Chuchotage home page",
      },
    },
    es: {
      shared: {
        language: {
          label: "Idioma",
          aria: "Idioma del sitio",
        },
        nav: { home: "Inicio", how: "Cómo funciona", languages: "Idiomas", story: "Historia", privacy: "Privacidad", contact: "Contacto" },
        footer: { notes: "Notas", privacy: "Política de privacidad" },
      },
      meta: {
        home: {
          title: "Chuchotage | App de traducción de voz en tiempo real",
          description: "Chuchotage es una app personal de traducción de voz en tiempo real, inspirada en la interpretación susurrada y pensada para escuchar traducciones con discreción.",
          ogTitle: "Chuchotage | App de traducción de voz en tiempo real",
          ogDescription: "Una app personal y discreta para traducción de voz en tiempo real, inspirada en la interpretación susurrada.",
        },
        privacy: {
          title: "Política de privacidad | Chuchotage",
          description: "Política de privacidad de Chuchotage, la app personal de traducción de voz en tiempo real para escuchar como en una interpretación susurrada.",
          ogTitle: "Política de privacidad | Chuchotage",
          ogDescription: "Cómo Chuchotage trata el audio seleccionado, credenciales, almacenamiento local y solicitudes de traducción en tiempo real.",
        },
        blog: {
          title: "Notas de Chuchotage | Diario de traducción en tiempo real",
          description: "Notas de Chuchotage, la app de traducción de voz en tiempo real llamada así por la interpretación susurrada.",
          ogTitle: "Notas de Chuchotage",
          ogDescription: "Notas breves sobre el nombre, el producto y las ideas de traducción personal en tiempo real detrás de Chuchotage.",
        },
        story: {
          title: "Por qué se llama Chuchotage | Chuchotage",
          description: "Chuchotage toma su nombre de la interpretación susurrada: una práctica de traducción en vivo que inspiró la app.",
          ogTitle: "Por qué se llama Chuchotage",
          ogDescription: "El significado de Chuchotage, la app de traducción de voz en tiempo real inspirada en la interpretación susurrada.",
        },
      },
      home: {
        hero: {
          eyebrow: "Traducción de voz en tiempo real",
          lede: "Un control personal y discreto para escuchar entre idiomas.",
          primary: "Cómo funciona",
          secondary: "Contacto",
          availability: "Las versiones de Android y Apple se están preparando para su lanzamiento en las tiendas. Diseñada para traducción personal de escucha.",
          ready: "Listo",
          button: "Iniciar traducción",
        },
        workflow: {
          eyebrow: "Cómo funciona",
          title: "Habla cerca. Escucha la traducción.",
          steps: [
            "Inicia sesión con ChatGPT o añade tu propia clave de API de OpenAI. Chuchotage la usa para traducir, no para leer tus chats.",
            "Elige el idioma que quieres escuchar y el micrófono que prefieres.",
            "Inicia la traducción. Chuchotage detecta el idioma de origen y reproduce el audio traducido en el dispositivo.",
          ],
        },
        languages: {
          eyebrow: "Idiomas",
          title: "Detecta automáticamente lo que oyes. Elige cómo lo quieres escuchar.",
          intro: "Chuchotage detecta automáticamente el idioma de origen y reproduce audio traducido en el idioma de salida que elijas.",
          outputTitle: "Idiomas de salida",
          outputBody: "Idiomas disponibles para audio traducido.",
          inputTitle: "Idiomas de entrada",
          inputBody: "65 idiomas de origen se detectan automáticamente desde voz en vivo, sin selector de idioma de origen.",
        },
        use: {
          eyebrow: "Escucha cotidiana",
          title: "Para momentos en los que quieres un puente discreto entre idiomas.",
          items: [
            "Seguir una charla o explicación cercana.",
            "Entender lo esencial de una conversación de viaje.",
            "Usar un micrófono de auriculares cuando la sala tiene ruido.",
            "Mantener la traducción personal simple y local en el dispositivo cuando sea posible.",
          ],
        },
        story: {
          eyebrow: "Significado de Chuchotage",
          title: "Interpretación susurrada, reimaginada como un solo control discreto.",
          body: "En interpretación, chuchotage es un modo silencioso: la traducción se dice suavemente para la persona que la necesita. La app toma esa idea para la traducción cotidiana de voz en tiempo real.",
          link: "Leer la nota breve de origen",
        },
        detail: {
          eyebrow: "Forma de privacidad",
          title: "Sin anuncios, sin analíticas, sin servidor de audio de Chuchotage.",
          items: [
            "Las credenciales y preferencias se guardan localmente con almacenamiento seguro de la plataforma.",
            "La traducción con clave API o ChatGPT conecta desde tu dispositivo con OpenAI.",
            "La prueba patrocinada usa un pequeño endpoint de Chuchotage para un token temporal, no para audio.",
          ],
        },
        limits: {
          eyebrow: "Límites importantes",
          title: "Apoyo personal, no un intérprete certificado.",
          body: "La traducción automática en tiempo real puede perder matices, nombres, tono o contexto. Chuchotage no está pensado para emergencias, asuntos legales, médicos u otras interpretaciones de alto riesgo.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Respuestas claras antes de instalar.",
          items: [
            ["¿Chuchotage funciona sin conexión?", "No. La traducción activa necesita conexión a internet para llegar a OpenAI Realtime Translation."],
            ["¿Necesito una credencial de OpenAI?", "Sí. Puedes iniciar sesión con ChatGPT, incluso con una cuenta gratuita, o usar tu propia clave de API de OpenAI. Chuchotage mantiene el inicio de sesión en tu dispositivo y no puede ver tus chats de ChatGPT."],
            ["¿Chuchotage graba audio?", "La app captura la fuente de audio seleccionada solo mientras la traducción está activa. El micrófono requiere permiso de la plataforma, el audio del dispositivo en Android requiere la aprobación de captura de Android para apps permitidas, y un futuro modo de audio de dispositivo en iOS/iPadOS requeriría un plan separado de ReplayKit. El desarrollador no recibe ni guarda tu audio mediante un servidor de audio de Chuchotage."],
            ["¿Puedo elegir la fuente de audio?", "Sí, donde la plataforma lo permite. Las versiones móviles se centran en la entrada de micrófono; Android también ofrece audio del dispositivo cuando la captura de reproducción es compatible. El audio de apps en el mismo dispositivo iOS/iPadOS solo es posible como una función ReplayKit planificada y no forma parte de la versión móvil actual."],
          ],
        },
        cta: { eyebrow: "Lanzamiento en tiendas", title: "Chuchotage se está preparando para las tiendas.", action: "Contacto" },
      },
      privacy: {
        updated: "Última actualización: 25 de mayo de 2026",
        title: "Política de privacidad",
        intro: "Chuchotage es una app personal de traducción de voz en tiempo real en plataformas compatibles, incluidas versiones de Android y Apple. Esta política explica qué maneja la app, por qué lo maneja y adónde va esa información.",
        sections: [
          { heading: "Información que maneja la app", paragraphs: ["Cuando usas Chuchotage, la app puede manejar la fuente de audio seleccionada, audio traducido, texto de transcripción en vivo, idioma de salida seleccionado, preferencias de fuente de audio y ruta de salida, y tu credencial de OpenAI o modo de prueba. La fuente de audio seleccionada puede ser el micrófono, audio de reproducción de Android que Android permite capturar, o audio de escritorio en versiones de escritorio compatibles. La credencial puede ser una clave de API de OpenAI, tokens tipo ChatGPT/Codex donde estén disponibles, o un identificador de instalación de prueba patrocinada."] },
          { heading: "Cómo se usa la información", paragraphs: ["La fuente de audio seleccionada se usa para ofrecer traducción en tiempo real después de iniciar una sesión. El texto de transcripción en vivo se muestra como interfaz de la sesión actual y no se guarda como historial. El idioma de salida seleccionado se usa para solicitar el idioma del audio traducido. Las credenciales se usan para autenticar solicitudes de traducción y, para inicio de sesión con ChatGPT donde esté disponible, consultar uso o crédito de Codex en OpenAI. Si usas traducción de prueba patrocinada, la app solicita a un endpoint de Chuchotage un secreto de cliente temporal para OpenAI Realtime Translation."] },
          { heading: "Almacenamiento local", paragraphs: ["Las credenciales se guardan en el dispositivo con almacenamiento seguro de la plataforma, como almacenamiento seguro de Android respaldado por Android Keystore o Apple Keychain en plataformas Apple. El modo de prueba patrocinada guarda un identificador aleatorio de instalación en el dispositivo para limitar el uso; no es una credencial de OpenAI. También se guardan en el dispositivo las preferencias de idioma de salida, fuente de audio y ruta de salida. Puedes quitar credenciales guardadas desde los ajustes de la app y eliminar datos locales borrando el almacenamiento de la app donde el sistema operativo lo permita. Las copias de seguridad, restauraciones y el comportamiento del almacenamiento seguro pueden depender de tu sistema operativo."] },
          { heading: "Selección de idioma del sitio", paragraphs: ["El sitio público tiene un selector de idioma. Si no has elegido un idioma, el sitio puede pedir a un endpoint propio de Chuchotage una sugerencia de idioma aproximada derivada del país de la solicitud web. El endpoint devuelve solo un código de país y un idioma sugerido, no usa SDKs de analítica y no devuelve tu dirección IP al navegador. La elección manual se guarda en el almacenamiento local del navegador y reemplaza la detección automática."] },
          { heading: "Compartición y procesadores", paragraphs: [{ html: "Chuchotage no vende información personal, no muestra anuncios y no usa SDKs de analítica. Durante una traducción normal con clave API o ChatGPT, la fuente de audio seleccionada y la configuración de traducción se envían directamente desde el dispositivo a OpenAI para realizar la traducción en tiempo real. OpenAI trata los datos enviados a su API según sus propios <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">controles de datos de API</a> y ajustes de retención. Si usas traducción de prueba patrocinada, Chuchotage recibe el identificador aleatorio de instalación, metadatos de solicitud derivados de IP, idioma de salida seleccionado y si las transcripciones de origen están activadas para crear un secreto de cliente temporal; esto es configuración de sesión, no texto de transcripción, y Chuchotage no recibe contenido de transcripción de origen. El audio sigue transmitiéndose desde la app a OpenAI, no a través de un servidor de audio de Chuchotage. Cuando inicias sesión con ChatGPT, la pantalla de ajustes también puede contactar con OpenAI para mostrar uso o crédito de Codex." }] },
          { heading: "Permisos", paragraphs: ["Según la plataforma y la ruta elegida, la app puede solicitar acceso a micrófono o captura de audio para traducir, acceso a notificaciones para el estado continuo de traducción, acceso relacionado con Bluetooth cuando sea necesario para micrófonos de auriculares o enrutamiento de salida, aprobación de captura de pantalla/audio en Android cuando eliges audio del dispositivo, permiso de grabación de audio del sistema en macOS cuando eliges audio de reproducción del Mac, y acceso a internet para llegar a los servicios de OpenAI. Un futuro modo de audio de apps en iOS/iPadOS requeriría un flujo separado de transmisión de pantalla ReplayKit y revisión de privacidad antes del lanzamiento."] },
          { heading: "Retención", paragraphs: ["El desarrollador no recibe ni almacena tu audio de origen seleccionado, audio traducido, transcripciones en vivo ni credenciales mediante un servidor de Chuchotage. Los metadatos de solicitud de prueba patrocinada se conservan solo en memoria temporal de limitación de uso en el servidor. Los datos locales gestionados por la app permanecen en tu dispositivo hasta que los borres en la app o en el sistema operativo, reemplaces la credencial guardada o los elimines mediante controles de la plataforma. Algunas copias de seguridad o registros de almacenamiento seguro gestionados por la plataforma pueden seguir las reglas de tu sistema operativo."] },
          { heading: "Menores", paragraphs: ["Chuchotage no está dirigido a menores de 13 años."] },
          { heading: "Contacto", paragraphs: [{ html: "Puedes enviar preguntas sobre esta política a <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: {
        eyebrow: "Notas de Chuchotage",
        title: "Pequeñas notas de una app de traducción discreta.",
        lede: "El diario oficial de Chuchotage: nombre, decisiones de producto y la forma de la traducción personal de voz en tiempo real.",
        listLabel: "Notas de Chuchotage",
        noteDate: "9 de mayo de 2026",
        noteTitle: "Por qué se llama Chuchotage",
        noteSummary: "El nombre de la app viene de la interpretación susurrada, una práctica de traducción en vivo y discreta que encaja mejor con el producto que un nombre genérico de traductor.",
      },
      story: {
        eyebrow: "Significado de Chuchotage",
        title: "Por qué se llama Chuchotage",
        lede: "El nombre viene de la interpretación susurrada: traducción en vivo para una persona, lo bastante cercana para ayudar y lo bastante discreta para no ocupar la sala.",
        sections: [
          { paragraphs: ["Si encontraste esta página buscando Chuchotage, este es el sitio oficial de la app Chuchotage: una app personal de traducción de voz en tiempo real para escuchar entre idiomas."] },
          { heading: "La palabra", paragraphs: ["Chuchotage es una palabra francesa usada en interpretación para la interpretación susurrada. En lugar de hablar desde una cabina o dirigirse a toda una audiencia, el intérprete se sienta cerca de una persona y traduce en voz baja lo que se dice.", "Esa imagen es todo el brief del producto. Chuchotage debe sentirse cercano, útil e intencionalmente pequeño: no un sistema de retransmisión, no una plataforma de reuniones, sino un compañero de traducción que ayuda a una persona a seguir el hilo."] },
          { heading: "La app", paragraphs: ["La app mantiene esa forma. Abre Chuchotage, elige el idioma de salida, selecciona la fuente de audio donde la plataforma lo permita e inicia la traducción. La detección del idioma de origen es automática. La pantalla principal se mantiene sencilla porque el trabajo es simple: escuchar, traducir, detener."], list: ["Chuchotage usa la fuente de audio seleccionada solo mientras hay una sesión de traducción activa.", "Las credenciales se guardan en el dispositivo mediante almacenamiento seguro de la plataforma.", "El audio en tiempo real se envía a OpenAI durante el uso activo, no a través de un servidor de audio de Chuchotage."] },
          { heading: "La promesa", paragraphs: ["Mucho software de traducción se siente como una sala de control. Chuchotage toma su nombre de la sensación opuesta: un susurro discreto de significado que llega en el momento adecuado.", "Por eso el nombre se quedó. Chuchotage es lo bastante inusual para buscarse, lo bastante específico para recordarse y honesto sobre el propósito de la app: traducción personal de voz en tiempo real sin anuncios, analíticas ni servidor de audio de Chuchotage."] },
        ],
        returnLink: "Volver a la página principal de Chuchotage",
      },
    },
    it: {
      shared: {
        language: {
          label: "Lingua",
          aria: "Lingua del sito",
        },
        nav: { home: "Home", how: "Come funziona", languages: "Lingue", story: "Storia", privacy: "Privacy", contact: "Contatti" },
        footer: { notes: "Note", privacy: "Informativa privacy" },
      },
      meta: {
        home: {
          title: "Chuchotage | App di traduzione live",
          description: "Chuchotage è un'app personale per la traduzione live, ispirata all'interpretazione sussurrata e pensata per ascoltare con discrezione.",
          ogTitle: "Chuchotage | App di traduzione live",
          ogDescription: "Un'app personale e discreta per la traduzione live, ispirata all'interpretazione sussurrata.",
        },
        privacy: {
          title: "Informativa privacy | Chuchotage",
          description: "Informativa privacy di Chuchotage, l'app personale per traduzione live e ascolto in stile interpretazione sussurrata.",
          ogTitle: "Informativa privacy | Chuchotage",
          ogDescription: "Come Chuchotage gestisce audio, accesso, impostazioni salvate e traduzione.",
        },
        blog: {
          title: "Note di Chuchotage | Note sulla traduzione live",
          description: "Note da Chuchotage, l'app di traduzione live chiamata come l'interpretazione sussurrata.",
          ogTitle: "Note di Chuchotage",
          ogDescription: "Brevi note sul nome, sul prodotto e sulle idee di traduzione personale dietro Chuchotage.",
        },
        story: {
          title: "Perché si chiama Chuchotage | Chuchotage",
          description: "Chuchotage prende il nome dall'interpretazione sussurrata: una pratica di traduzione dal vivo che ha ispirato l'app.",
          ogTitle: "Perché si chiama Chuchotage",
          ogDescription: "Il significato di Chuchotage, l'app di traduzione live ispirata all'interpretazione sussurrata.",
        },
      },
      home: {
        hero: {
          eyebrow: "Traduzione live",
          lede: "Traduzione live nell'orecchio, per le conversazioni intorno a te.",
          primary: "Download",
          secondary: "Come funziona",
          availability: "Disponibile per iPhone, iPad e Mac. Android e Windows arriveranno presto.",
          ready: "Pronto",
          button: "Avvia traduzione",
        },
        workflow: {
          eyebrow: "Come funziona",
          title: "Parla vicino. Ascolta la traduzione.",
          steps: [
            "Accedi o aggiungi la tua chiave OpenAI. Chuchotage la usa solo per tradurre.",
            "Scegli la lingua che vuoi ascoltare e il microfono che preferisci.",
            "Avvia la traduzione. Chuchotage ascolta, riconosce la lingua e riproduce la traduzione.",
          ],
        },
        languages: {
          eyebrow: "Lingue",
          title: "Ascolta molte lingue. Tu scegli quella che vuoi sentire.",
          intro: "Non devi scegliere la lingua parlata. Scegli solo la lingua in cui vuoi sentire Chuchotage.",
          outputTitle: "Traduzione in",
          outputBody: "Le lingue in cui Chuchotage può parlarti.",
          inputTitle: "Capisce il parlato in",
          inputBody: "Le lingue che Chuchotage può riconoscere mentre ascolta.",
        },
        use: {
          eyebrow: "Ascolto quotidiano",
          title: "Per i momenti in cui vuoi un ponte linguistico discreto.",
          items: [
            "Seguire un discorso o una spiegazione vicino a te.",
            "Capire il senso di una conversazione in viaggio.",
            "Usare il microfono delle cuffie quando la stanza è rumorosa.",
            "Tenere semplice la traduzione personale.",
          ],
        },
        story: {
          eyebrow: "Significato di Chuchotage",
          title: "Interpretazione sussurrata, ripensata come un solo controllo discreto.",
          body: "Nell'interpretazione, il chuchotage è una modalità discreta: la traduzione viene detta piano per la persona che ne ha bisogno. L'app prende in prestito questa idea per la traduzione live di tutti i giorni.",
          link: "Leggi la breve nota sull'origine",
        },
        detail: {
          eyebrow: "Privacy",
          title: "Niente annunci. Niente tracciamento. Nessuna cronologia delle trascrizioni.",
          items: [
            "Accesso e preferenze restano sul tuo dispositivo.",
            "L'audio viene inviato per tradurre solo mentre Chuchotage è in funzione.",
            "Chuchotage non salva una cronologia delle trascrizioni.",
          ],
        },
        limits: {
          eyebrow: "Limiti importanti",
          title: "Supporto personale, non un interprete certificato.",
          body: "La traduzione live può sbagliare. Non usare Chuchotage per emergenze, decisioni legali, decisioni mediche o situazioni ad alto rischio.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Risposte semplici prima di installare.",
          items: [
            ["Chuchotage funziona offline?", "No. Chuchotage ha bisogno di internet mentre traduce."],
            ["Devo accedere?", "Sì. Puoi accedere con ChatGPT dove disponibile, usare una prova quando offerta, oppure usare la tua chiave OpenAI. Chuchotage non può vedere le tue chat ChatGPT."],
            ["Chuchotage registra audio?", "Ascolta solo mentre la traduzione è attiva. Gestisci tu il permesso del microfono e Chuchotage non conserva il tuo audio."],
            ["Posso scegliere la sorgente audio?", "Sì, dipende dal dispositivo. Su mobile si parte dal microfono. Le versioni desktop possono aggiungere altre opzioni di ascolto."],
          ],
        },
        cta: { eyebrow: "Download", title: "Scegli il tuo dispositivo e ottieni Chuchotage.", action: "Download" },
      },
      privacy: {
        updated: "Ultimo aggiornamento: 25 maggio 2026",
        title: "Informativa privacy",
        intro: "Chuchotage è un'app personale per la traduzione live. Questa informativa spiega cosa usa l'app e dove vanno queste informazioni.",
        sections: [
          { heading: "Cosa usa l'app", paragraphs: ["Quando avvii la traduzione, Chuchotage usa l'audio che scegli, la lingua che vuoi ascoltare e le impostazioni salvate. Può anche usare il tuo accesso ChatGPT, la tua chiave OpenAI o una prova, se li scegli."] },
          { heading: "Come viene usato", paragraphs: ["Il tuo audio serve a creare la traduzione live dopo che premi start. Il testo mostrato nell'app vale solo per la sessione corrente. Chuchotage non salva una cronologia delle trascrizioni."] },
          { heading: "Cosa resta sul tuo dispositivo", paragraphs: ["Accesso, chiave OpenAI, prova, lingua e impostazioni audio sono salvati sul tuo dispositivo usando la protezione offerta dal sistema operativo. Puoi rimuovere i dati salvati dall'app o dalle impostazioni del dispositivo."] },
          { heading: "Lingua del sito", paragraphs: ["Il sito ha un selettore di lingua. Se non hai scelto una lingua, può chiedere a Chuchotage un suggerimento approssimativo basato sul paese. La scelta manuale viene salvata nel browser."] },
          { heading: "Cosa viene condiviso", paragraphs: [{ html: "Chuchotage non vende informazioni personali, non mostra annunci e non usa strumenti di tracciamento. Durante la traduzione, l'audio viene inviato a OpenAI per far funzionare la traduzione. OpenAI gestisce quei dati secondo le proprie <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">regole sui dati</a>. Se usi una prova, Chuchotage può ricevere informazioni di base per avviare la traduzione, ma non il testo delle trascrizioni. L'audio non passa da Chuchotage." }] },
          { heading: "Permessi", paragraphs: ["A seconda del dispositivo, Chuchotage può chiedere accesso al microfono, notifiche, accesso Bluetooth per le cuffie, permessi per audio di sistema o schermo, e internet per tradurre."] },
          { heading: "Conservazione", paragraphs: ["Lo sviluppatore non riceve né conserva il tuo audio, l'audio tradotto, le trascrizioni live o l'accesso tramite Chuchotage. I dati dell'app restano sul dispositivo finché li cancelli, li sostituisci o rimuovi l'app. I backup dipendono dal sistema operativo."] },
          { heading: "Minori", paragraphs: ["Chuchotage non è rivolta a minori di 13 anni."] },
          { heading: "Contatti", paragraphs: [{ html: "Domande su questa informativa possono essere inviate a <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: {
        eyebrow: "Note di Chuchotage",
        title: "Piccole note da un'app di traduzione discreta.",
        lede: "Il diario ufficiale di Chuchotage: nome, scelte di prodotto e forma della traduzione vocale personale in tempo reale.",
        listLabel: "Note di Chuchotage",
        noteDate: "9 maggio 2026",
        noteTitle: "Perché si chiama Chuchotage",
        noteSummary: "Il nome dell'app viene dall'interpretazione sussurrata, una pratica di traduzione live e discreta che si adatta al prodotto meglio di un nome generico da traduttore.",
      },
      story: {
        eyebrow: "Significato di Chuchotage",
        title: "Perché si chiama Chuchotage",
        lede: "Il nome viene dall'interpretazione sussurrata: traduzione live per una persona, abbastanza vicina da aiutare e abbastanza discreta da non occupare la stanza.",
        sections: [
          { paragraphs: ["Se hai trovato questa pagina cercando Chuchotage, questo è il sito ufficiale dell'app Chuchotage: un'app personale di traduzione live per ascoltare tra le lingue."] },
          { heading: "La parola", paragraphs: ["Chuchotage è una parola francese usata nel mondo dell'interpretazione per indicare l'interpretazione sussurrata. Invece di parlare in cabina o rivolgersi a tutta una platea, l'interprete siede vicino a una persona e traduce a bassa voce ciò che viene detto.", "Quell'immagine è tutta l'idea. Chuchotage deve sentirsi vicina, utile e piccola: un compagno di traduzione che aiuta una persona a seguire."] },
          { heading: "L'app", paragraphs: ["L'app mantiene quella forma. Apri Chuchotage, scegli la lingua che vuoi ascoltare e avvia la traduzione. La schermata principale resta semplice perché il compito è semplice: ascolta, traduci, ferma."], list: ["Chuchotage usa l'audio scelto solo mentre la traduzione è attiva.", "Il tuo accesso resta sul tuo dispositivo.", "L'audio viene inviato per tradurre solo mentre Chuchotage è in funzione."] },
          { heading: "La promessa", paragraphs: ["Molti software di traduzione sembrano una sala di controllo. Chuchotage prende il nome dalla sensazione opposta: un sussurro discreto di significato che arriva al momento giusto.", "Per questo il nome è rimasto. Chuchotage è abbastanza insolito da essere cercabile, abbastanza specifico da essere ricordato e onesto sullo scopo dell'app: traduzione personale live senza annunci, tracciamento o trascrizioni salvate."] },
        ],
        returnLink: "Torna alla home page di Chuchotage",
      },
    },
    fr: {
      shared: {
        language: {
          label: "Langue",
          aria: "Langue du site",
        },
        nav: { home: "Accueil", how: "Fonctionnement", languages: "Langues", story: "Histoire", privacy: "Confidentialité", contact: "Contact" },
        footer: { notes: "Notes", privacy: "Politique de confidentialité" },
      },
      meta: {
        home: {
          title: "Chuchotage | Application de traduction vocale en temps réel",
          description: "Chuchotage est une application personnelle de traduction vocale en temps réel, inspirée de l'interprétation chuchotée et pensée pour une écoute discrète.",
          ogTitle: "Chuchotage | Application de traduction vocale en temps réel",
          ogDescription: "Une application personnelle et discrète de traduction vocale en temps réel, inspirée de l'interprétation chuchotée.",
        },
        privacy: {
          title: "Politique de confidentialité | Chuchotage",
          description: "Politique de confidentialité de Chuchotage, l'application personnelle de traduction vocale en temps réel pour une écoute façon interprétation chuchotée.",
          ogTitle: "Politique de confidentialité | Chuchotage",
          ogDescription: "Comment Chuchotage traite l'audio sélectionné, les identifiants, le stockage local et les demandes de traduction en temps réel.",
        },
        blog: {
          title: "Notes de Chuchotage | Journal de traduction en temps réel",
          description: "Notes de Chuchotage, l'application de traduction vocale en temps réel nommée d'après l'interprétation chuchotée.",
          ogTitle: "Notes de Chuchotage",
          ogDescription: "Courtes notes sur le nom, la forme du produit et les idées de traduction personnelle en temps réel derrière Chuchotage.",
        },
        story: {
          title: "Pourquoi ce nom, Chuchotage | Chuchotage",
          description: "Chuchotage tire son nom de l'interprétation chuchotée, une pratique de traduction en direct qui a inspiré l'application.",
          ogTitle: "Pourquoi ce nom, Chuchotage",
          ogDescription: "Le sens de Chuchotage, l'application de traduction vocale en temps réel inspirée de l'interprétation chuchotée.",
        },
      },
      home: {
        hero: {
          eyebrow: "Traduction vocale en temps réel",
          lede: "Une commande personnelle et discrète pour écouter d'une langue à l'autre.",
          primary: "Fonctionnement",
          secondary: "Contact",
          availability: "Les versions Android et Apple se préparent pour leur lancement dans les stores. Conçue pour la traduction personnelle en écoute.",
          ready: "Prêt",
          button: "Démarrer la traduction",
        },
        workflow: {
          eyebrow: "Fonctionnement",
          title: "Parlez à proximité. Écoutez la traduction.",
          steps: [
            "Connectez-vous avec ChatGPT ou ajoutez votre propre clé API OpenAI. Chuchotage l'utilise pour traduire, pas pour lire vos conversations.",
            "Choisissez la langue que vous voulez entendre et le micro que vous préférez.",
            "Démarrez la traduction. Chuchotage détecte la langue source et lit l'audio traduit sur l'appareil.",
          ],
        },
        languages: {
          eyebrow: "Langues",
          title: "Détection automatique de ce que vous entendez. Choisissez ce que vous entendez en retour.",
          intro: "Chuchotage détecte automatiquement la langue source, puis lit l'audio traduit dans la langue de sortie sélectionnée.",
          outputTitle: "Langues de sortie",
          outputBody: "Langues sélectionnables pour l'audio traduit.",
          inputTitle: "Langues d'entrée",
          inputBody: "65 langues sources sont détectées automatiquement à partir de la parole en direct, sans sélecteur de langue source.",
        },
        use: {
          eyebrow: "Écoute quotidienne",
          title: "Pour les moments où vous voulez un pont linguistique discret.",
          items: [
            "Suivre une présentation ou une explication à proximité.",
            "Saisir l'essentiel d'une conversation en voyage.",
            "Utiliser le micro d'un casque quand la pièce est bruyante.",
            "Garder une traduction personnelle simple et locale à l'appareil quand c'est possible.",
          ],
        },
        story: {
          eyebrow: "Sens de Chuchotage",
          title: "L'interprétation chuchotée, repensée comme une seule commande discrète.",
          body: "En interprétation, le chuchotage est un mode silencieux : la traduction est dite doucement à la personne qui en a besoin. L'application reprend cette idée pour la traduction vocale quotidienne en temps réel.",
          link: "Lire la courte note d'origine",
        },
        detail: {
          eyebrow: "Forme de confidentialité",
          title: "Pas de publicité, pas d'analytics, pas de serveur audio Chuchotage.",
          items: [
            "Les identifiants et préférences sont stockés localement avec le stockage sécurisé de la plateforme.",
            "La traduction avec clé API ou ChatGPT connecte votre appareil à OpenAI.",
            "L'essai sponsorisé utilise un petit endpoint Chuchotage pour un jeton temporaire, pas pour l'audio.",
          ],
        },
        limits: {
          eyebrow: "Limites importantes",
          title: "Une aide personnelle, pas un interprète certifié.",
          body: "La traduction automatique en temps réel peut manquer des nuances, des noms, le ton ou le contexte. Chuchotage n'est pas destinée aux urgences, aux situations juridiques, médicales ou à toute interprétation à enjeu élevé.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Réponses simples avant l'installation.",
          items: [
            ["Chuchotage fonctionne-t-elle hors ligne ?", "Non. La traduction active nécessite une connexion internet pour joindre OpenAI Realtime Translation."],
            ["Ai-je besoin d'un identifiant OpenAI ?", "Oui. Vous pouvez vous connecter avec ChatGPT, y compris avec un compte gratuit, ou utiliser votre propre clé API OpenAI. Chuchotage garde la connexion sur votre appareil et ne peut pas voir vos conversations ChatGPT."],
            ["Chuchotage enregistre-t-elle l'audio ?", "L'application capture la source audio sélectionnée uniquement pendant que la traduction est active. Le micro nécessite l'autorisation de la plateforme, l'audio de l'appareil Android exige l'approbation de capture Android pour les apps autorisées, et un futur mode audio d'appareil iOS/iPadOS demanderait un plan ReplayKit séparé. Le développeur ne reçoit ni ne stocke votre audio via un serveur audio Chuchotage."],
            ["Puis-je choisir la source audio ?", "Oui, lorsque la plateforme le permet. Les versions mobiles se concentrent sur l'entrée micro ; Android propose aussi l'audio de l'appareil quand la capture de lecture est prise en charge. L'audio d'apps sur le même appareil iOS/iPadOS n'est possible que comme fonctionnalité ReplayKit planifiée et ne fait pas partie de la version mobile actuelle."],
          ],
        },
        cta: { eyebrow: "Lancement dans les stores", title: "Chuchotage se prépare pour les stores.", action: "Contact" },
      },
      privacy: {
        updated: "Dernière mise à jour : 25 mai 2026",
        title: "Politique de confidentialité",
        intro: "Chuchotage est une application personnelle de traduction vocale en temps réel sur les plateformes prises en charge, dont Android et les builds Apple. Cette politique explique ce que l'application traite, pourquoi elle le traite et où vont ces informations.",
        sections: [
          { heading: "Informations traitées par l'application", paragraphs: ["Lorsque vous utilisez Chuchotage, l'application peut traiter la source audio sélectionnée, l'audio traduit, le texte de transcription en direct, la langue de sortie sélectionnée, les préférences de source audio et de sortie, ainsi que l'identifiant OpenAI ou le mode d'essai choisi. La source audio sélectionnée peut être le micro, l'audio de lecture Android qu'Android autorise à capturer, ou l'audio de bureau sur les builds de bureau prises en charge. L'identifiant peut être une clé API OpenAI, des jetons de type ChatGPT/Codex lorsque pris en charge, ou un identifiant d'installation pour l'essai sponsorisé."] },
          { heading: "Utilisation des informations", paragraphs: ["La source audio sélectionnée sert à fournir la traduction en temps réel après le démarrage d'une session. Le texte de transcription en direct est affiché dans l'interface de la session en cours et n'est pas enregistré comme historique. La langue de sortie sert à demander la langue de l'audio traduit. Les identifiants servent à authentifier les demandes de traduction et, pour la connexion ChatGPT lorsque prise en charge, à lire l'état d'utilisation ou de crédit Codex auprès d'OpenAI. Si vous utilisez la traduction en essai sponsorisé, l'application demande à un endpoint Chuchotage un secret client temporaire pour OpenAI Realtime Translation."] },
          { heading: "Stockage local", paragraphs: ["Les identifiants sont stockés sur l'appareil avec le stockage sécurisé de la plateforme, comme le stockage sécurisé Android soutenu par Android Keystore ou Apple Keychain sur les plateformes Apple. Le mode d'essai sponsorisé stocke un identifiant d'installation aléatoire sur l'appareil pour limiter l'usage ; ce n'est pas un identifiant OpenAI. La langue de sortie, la source audio et les préférences de sortie sont aussi stockées sur l'appareil. Vous pouvez supprimer les identifiants gérés par l'app dans les réglages, et supprimer les données locales en effaçant le stockage de l'app lorsque votre système le permet. Les sauvegardes, restaurations et comportements de stockage sécurisé peuvent dépendre de votre système d'exploitation."] },
          { heading: "Sélection de langue du site", paragraphs: ["Le site public propose un sélecteur de langue. Si vous n'avez pas choisi de langue, le site peut demander à un endpoint Chuchotage de première partie une suggestion de langue approximative dérivée du pays de la requête web. L'endpoint renvoie uniquement un code pays et une langue suggérée, n'utilise aucun SDK d'analytics et ne renvoie pas votre adresse IP au navigateur. Le choix manuel est enregistré dans le stockage local du navigateur et remplace la détection automatique."] },
          { heading: "Partage et sous-traitants", paragraphs: [{ html: "Chuchotage ne vend pas d'informations personnelles, n'affiche pas de publicités et n'utilise pas de SDK d'analytics. Pendant une traduction normale avec clé API ou ChatGPT, la source audio sélectionnée et la configuration de traduction sont envoyées directement de l'appareil à OpenAI pour effectuer la traduction en temps réel. OpenAI traite les données envoyées à son API selon ses propres <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">contrôles de données API</a> et réglages de conservation. Si vous utilisez l'essai sponsorisé, Chuchotage reçoit l'identifiant aléatoire d'installation, des métadonnées de requête dérivées de l'IP, la langue de sortie sélectionnée et l'état des transcriptions source afin de créer un secret client temporaire ; il s'agit d'un réglage de session, pas d'un texte de transcription, et Chuchotage ne reçoit pas le contenu de transcription source. L'audio est toujours transmis de l'application à OpenAI, pas via un serveur audio Chuchotage. Lorsque vous êtes connecté avec ChatGPT, l'écran des réglages peut aussi contacter OpenAI pour afficher l'usage ou le crédit Codex." }] },
          { heading: "Autorisations", paragraphs: ["Selon la plateforme et le trajet choisi, l'application peut demander l'accès au micro ou à la capture audio pour la traduction, l'accès aux notifications pour l'état continu, des accès liés au Bluetooth quand nécessaires pour les micros de casque ou la sortie audio, l'approbation Android de capture écran/audio lorsque vous choisissez l'audio de l'appareil, l'autorisation macOS d'enregistrement audio système lorsque vous choisissez l'audio de lecture Mac, et l'accès internet pour joindre les services OpenAI. Un futur mode audio d'apps sur le même appareil iOS/iPadOS nécessiterait un flux ReplayKit distinct et une revue de confidentialité avant sortie."] },
          { heading: "Conservation", paragraphs: ["Le développeur ne reçoit ni ne stocke votre audio source sélectionné, audio traduit, transcriptions en direct ou identifiants via un serveur Chuchotage. Les métadonnées de requêtes d'essai sponsorisé ne sont conservées que dans une mémoire temporaire de limitation d'usage sur le serveur. Les données locales gérées par l'app restent sur votre appareil jusqu'à leur suppression dans l'app ou les réglages système, le remplacement de l'identifiant enregistré ou leur suppression via les contrôles de la plateforme. Certaines sauvegardes ou données de stockage sécurisé gérées par la plateforme peuvent suivre les règles de votre système d'exploitation."] },
          { heading: "Enfants", paragraphs: ["Chuchotage ne s'adresse pas aux enfants de moins de 13 ans."] },
          { heading: "Contact", paragraphs: [{ html: "Les questions sur cette politique peuvent être envoyées à <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: {
        eyebrow: "Notes de Chuchotage",
        title: "Petites notes d'une application de traduction discrète.",
        lede: "Le journal officiel de Chuchotage : nom, choix produit et forme de la traduction vocale personnelle en temps réel.",
        listLabel: "Notes de Chuchotage",
        noteDate: "9 mai 2026",
        noteTitle: "Pourquoi ce nom, Chuchotage",
        noteSummary: "Le nom de l'application vient de l'interprétation chuchotée, une pratique discrète de traduction en direct qui correspond mieux au produit qu'un nom de traducteur générique.",
      },
      story: {
        eyebrow: "Sens de Chuchotage",
        title: "Pourquoi ce nom, Chuchotage",
        lede: "Le nom vient de l'interprétation chuchotée : une traduction en direct pour une personne, assez proche pour aider et assez discrète pour ne pas envahir la pièce.",
        sections: [
          { paragraphs: ["Si vous avez trouvé cette page en cherchant Chuchotage, vous êtes sur le site officiel de l'application Chuchotage : une application personnelle de traduction vocale en temps réel pour écouter d'une langue à l'autre."] },
          { heading: "Le mot", paragraphs: ["Chuchotage est un mot français utilisé en interprétation pour désigner l'interprétation chuchotée. Au lieu de parler depuis une cabine ou de s'adresser à tout un public, l'interprète s'assoit près d'une personne et traduit doucement ce qui est dit.", "Cette image est tout le brief produit. Chuchotage doit sembler proche, utile et volontairement petite : pas un système de diffusion, pas une plateforme de réunion, juste un compagnon de traduction qui aide une personne à suivre."] },
          { heading: "L'application", paragraphs: ["L'application garde cette forme. Ouvrez Chuchotage, choisissez la langue de sortie, sélectionnez la source audio lorsque la plateforme le permet, puis démarrez la traduction. La détection de la langue source est automatique. L'écran principal reste épuré car le travail est simple : écouter, traduire, arrêter."], list: ["Chuchotage utilise la source audio sélectionnée uniquement pendant une session de traduction active.", "Les identifiants sont stockés sur l'appareil via le stockage sécurisé de la plateforme.", "L'audio en temps réel est envoyé à OpenAI pendant l'utilisation active, pas via un serveur audio Chuchotage."] },
          { heading: "La promesse", paragraphs: ["Beaucoup de logiciels de traduction ressemblent à une salle de contrôle. Chuchotage porte le nom de la sensation inverse : un murmure discret de sens qui arrive au bon moment.", "C'est pourquoi le nom est resté. Chuchotage est assez inhabituel pour être recherché, assez précis pour être mémorisé et honnête sur le but de l'app : une traduction vocale personnelle en temps réel, sans publicité, analytics ni serveur audio Chuchotage."] },
        ],
        returnLink: "Retour à la page d'accueil de Chuchotage",
      },
    },
    de: {
      shared: {
        language: {
          label: "Sprache",
          aria: "Sprache der Website",
        },
        nav: { home: "Start", how: "So funktioniert es", languages: "Sprachen", story: "Geschichte", privacy: "Datenschutz", contact: "Kontakt" },
        footer: { notes: "Notizen", privacy: "Datenschutzerklärung" },
      },
      meta: {
        home: {
          title: "Chuchotage | App für Echtzeit-Sprachübersetzung",
          description: "Chuchotage ist eine persönliche App für Echtzeit-Sprachübersetzung, inspiriert vom Flüsterdolmetschen und gebaut für diskretes Mithören.",
          ogTitle: "Chuchotage | App für Echtzeit-Sprachübersetzung",
          ogDescription: "Eine leise persönliche App für Echtzeit-Sprachübersetzung, inspiriert vom Flüsterdolmetschen.",
        },
        privacy: {
          title: "Datenschutzerklärung | Chuchotage",
          description: "Datenschutzerklärung für Chuchotage, die persönliche App für Echtzeit-Sprachübersetzung und diskretes Mithören.",
          ogTitle: "Datenschutzerklärung | Chuchotage",
          ogDescription: "Wie Chuchotage ausgewähltes Audio, Zugangsdaten, lokale Speicherung und Echtzeit-Übersetzungsanfragen behandelt.",
        },
        blog: {
          title: "Chuchotage Notizen | Journal zur Echtzeitübersetzung",
          description: "Notizen von Chuchotage, der Echtzeit-Sprachübersetzungs-App, benannt nach dem Flüsterdolmetschen.",
          ogTitle: "Chuchotage Notizen",
          ogDescription: "Kurze Notizen zum Namen, zur Produktform und zu Ideen persönlicher Echtzeit-Sprachübersetzung hinter Chuchotage.",
        },
        story: {
          title: "Warum es Chuchotage heißt | Chuchotage",
          description: "Chuchotage ist nach dem Flüsterdolmetschen benannt: einer leisen Live-Übersetzungspraxis, die die App inspiriert hat.",
          ogTitle: "Warum es Chuchotage heißt",
          ogDescription: "Die Bedeutung von Chuchotage, der Echtzeit-Sprachübersetzungs-App, inspiriert vom Flüsterdolmetschen.",
        },
      },
      home: {
        hero: {
          eyebrow: "Echtzeit-Sprachübersetzung",
          lede: "Eine leise persönliche Steuerung, um über Sprachen hinweg zuzuhören.",
          primary: "So funktioniert es",
          secondary: "Kontakt",
          availability: "Android- und Apple-Builds bereiten sich auf den App-Store-Rollout vor. Gebaut für persönliche Mithör-Übersetzung.",
          ready: "Bereit",
          button: "Übersetzung starten",
        },
        workflow: {
          eyebrow: "So funktioniert es",
          title: "In der Nähe sprechen. Die Übersetzung hören.",
          steps: [
            "Melde dich mit ChatGPT an oder füge deinen eigenen OpenAI-API-Schlüssel hinzu. Chuchotage nutzt ihn zum Übersetzen, nicht zum Lesen deiner Chats.",
            "Wähle die Sprache, die du hören möchtest, und dein bevorzugtes Mikrofon.",
            "Starte die Übersetzung. Chuchotage erkennt die Ausgangssprache und spielt übersetztes Audio auf dem Gerät ab.",
          ],
        },
        languages: {
          eyebrow: "Sprachen",
          title: "Automatisch erkennen, was du hörst. Wählen, was du zurückhörst.",
          intro: "Chuchotage erkennt die Ausgangssprache automatisch und spielt übersetztes Audio in der ausgewählten Zielsprache ab.",
          outputTitle: "Ausgabesprachen",
          outputBody: "Auswählbare Sprachen für übersetztes Audio.",
          inputTitle: "Eingabesprachen",
          inputBody: "65 Ausgangssprachen werden automatisch aus Live-Sprache erkannt, ohne Auswahl der Ausgangssprache.",
        },
        use: {
          eyebrow: "Alltägliches Zuhören",
          title: "Für Momente, in denen du eine leise Sprachbrücke möchtest.",
          items: [
            "Einem Vortrag oder einer Erklärung in der Nähe folgen.",
            "Den Kern eines Reisegesprächs verstehen.",
            "Ein Headset-Mikrofon nutzen, wenn der Raum laut ist.",
            "Persönliche Übersetzung einfach und, wo möglich, gerätenah halten.",
          ],
        },
        story: {
          eyebrow: "Bedeutung von Chuchotage",
          title: "Flüsterdolmetschen, neu gedacht als eine leise Steuerung.",
          body: "Beim Dolmetschen ist Chuchotage eine leise Form: Die Übersetzung wird der Person, die sie braucht, sanft zugesprochen. Die App übernimmt diese Idee für alltägliche Echtzeit-Sprachübersetzung.",
          link: "Die kurze Ursprungsnotiz lesen",
        },
        detail: {
          eyebrow: "Datenschutzform",
          title: "Keine Werbung, keine Analytics, kein Chuchotage-Audioserver.",
          items: [
            "Zugangsdaten und Einstellungen werden lokal mit sicherer Plattform-Speicherung abgelegt.",
            "API-Schlüssel- und ChatGPT-Übersetzung verbinden dein Gerät mit OpenAI.",
            "Der gesponserte Test nutzt einen kleinen Chuchotage-Endpunkt für ein kurzlebiges Token, nicht für Audio.",
          ],
        },
        limits: {
          eyebrow: "Wichtige Grenzen",
          title: "Persönliche Hilfe, kein zertifizierter Dolmetscher.",
          body: "Maschinelle Echtzeitübersetzung kann Nuancen, Namen, Ton oder Kontext verfehlen. Chuchotage ist nicht für Notfälle, rechtliche, medizinische oder andere hochriskante Dolmetschsituationen gedacht.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Klare Antworten vor der Installation.",
          items: [
            ["Funktioniert Chuchotage offline?", "Nein. Aktive Übersetzung braucht eine Internetverbindung zu OpenAI Realtime Translation."],
            ["Brauche ich OpenAI-Zugangsdaten?", "Ja. Du kannst dich mit ChatGPT anmelden, auch mit einem kostenlosen Konto, oder deinen eigenen OpenAI-API-Schlüssel nutzen. Chuchotage hält die Anmeldung auf deinem Gerät und kann deine ChatGPT-Chats nicht sehen."],
            ["Nimmt Chuchotage Audio auf?", "Die App erfasst die ausgewählte Audioquelle nur während aktiver Übersetzung. Mikrofonzugriff benötigt Plattformberechtigung, Android-Geräteaudio benötigt Androids Capture-Freigabe für erlaubte Apps, und ein künftiger iOS/iPadOS-Geräteaudio-Modus würde einen separaten ReplayKit-Plan erfordern. Der Entwickler erhält oder speichert dein Audio nicht über einen Chuchotage-Audioserver."],
            ["Kann ich die Audioquelle wählen?", "Ja, wo die Plattform es unterstützt. Mobile Builds konzentrieren sich auf Mikrofoneingang; Android bietet außerdem Geräteaudio, wo Playback-Capture unterstützt wird. iOS/iPadOS-App-Audio auf demselben Gerät ist nur als geplante ReplayKit-Funktion möglich und nicht Teil des aktuellen mobilen Builds."],
          ],
        },
        cta: { eyebrow: "App-Store-Rollout", title: "Chuchotage bereitet sich auf die Stores vor.", action: "Kontakt" },
      },
      privacy: {
        updated: "Zuletzt aktualisiert: 25. Mai 2026",
        title: "Datenschutzerklärung",
        intro: "Chuchotage ist eine persönliche App für Echtzeit-Sprachübersetzung auf unterstützten Plattformen, einschließlich Android- und Apple-Builds. Diese Erklärung beschreibt, was die App verarbeitet, warum sie es verarbeitet und wohin diese Informationen gehen.",
        sections: [
          { heading: "Informationen, die die App verarbeitet", paragraphs: ["Wenn du Chuchotage nutzt, kann die App die ausgewählte Audioquelle, übersetztes Audio, Live-Transkripttext, die ausgewählte Ausgabesprache, Audioquellen- und Ausgaberouten-Einstellungen sowie deine gewählten OpenAI-Zugangsdaten oder den Testmodus verarbeiten. Die ausgewählte Audioquelle kann Mikrofon-Audio, von Android zugelassenes Android-Wiedergabeaudio oder Desktop-Audio in unterstützten Desktop-Builds sein. Zugangsdaten können ein OpenAI-API-Schlüssel, ChatGPT/Codex-artige Tokens, sofern unterstützt, oder eine Installationskennung für den gesponserten Test sein."] },
          { heading: "Nutzung der Informationen", paragraphs: ["Die ausgewählte Audioquelle wird genutzt, um nach Start einer Übersetzungssitzung Echtzeitübersetzung bereitzustellen. Live-Transkripttext wird als UI der aktuellen Sitzung angezeigt und nicht als Transkriptverlauf gespeichert. Die ausgewählte Ausgabesprache wird genutzt, um die Sprache des übersetzten Audios anzufordern. Zugangsdaten authentifizieren Übersetzungsanfragen und, bei unterstützter ChatGPT-Anmeldung, das Auslesen von Codex-Nutzung oder Guthaben bei OpenAI. Wenn du gesponserte Testübersetzung nutzt, fragt die App einen Chuchotage-Endpunkt nach einem kurzlebigen OpenAI Realtime Translation Client Secret."] },
          { heading: "Lokale Speicherung", paragraphs: ["Zugangsdaten werden auf dem Gerät über sichere Plattform-Speicherung abgelegt, etwa Android Secure Storage mit Android Keystore oder Apple Keychain auf Apple-Plattformen. Der gesponserte Testmodus speichert eine zufällige Installationskennung auf dem Gerät zur Ratenbegrenzung; sie ist kein OpenAI-Zugangsdatenwert. Ausgabesprache, Audioquelle und Ausgaberoute werden ebenfalls auf dem Gerät gespeichert. Du kannst von der App verwaltete Zugangsdaten in den App-Einstellungen entfernen und lokale Daten löschen, indem du den App-Speicher dort leerst, wo dein Betriebssystem dies unterstützt. Plattform-Backups, Wiederherstellung und sichere Speicherung können von deinem Betriebssystem gesteuert werden."] },
          { heading: "Sprachauswahl der Website", paragraphs: ["Die öffentliche Website hat eine Sprachauswahl. Wenn du keine Sprache gewählt hast, kann die Website einen Chuchotage-eigenen Endpunkt nach einem groben, aus dem Land der Webanfrage abgeleiteten Sprachvorschlag fragen. Der Endpunkt gibt nur einen Ländercode und eine vorgeschlagene Sprache zurück, nutzt kein Analytics-SDK und gibt deine IP-Adresse nicht an den Browser zurück. Eine manuelle Sprachwahl wird im lokalen Speicher deines Browsers gespeichert und überschreibt die automatische Erkennung."] },
          { heading: "Weitergabe und Dienstleister", paragraphs: [{ html: "Chuchotage verkauft keine personenbezogenen Informationen, zeigt keine Werbung und nutzt keine Analytics-SDKs. Während normaler Übersetzung mit API-Schlüssel oder ChatGPT werden die ausgewählte Audioquelle und Übersetzungskonfiguration direkt vom Gerät an OpenAI gesendet, um Echtzeitübersetzung auszuführen. OpenAI behandelt an seine API gesendete Daten gemäß den eigenen <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">API-Datenkontrollen</a> und Aufbewahrungseinstellungen. Wenn du die gesponserte Testübersetzung nutzt, erhält Chuchotage die zufällige Installationskennung, IP-abgeleitete Anfragemetadaten, die ausgewählte Ausgabesprache und ob Quelltranskripte aktiviert sind, um ein kurzlebiges Client Secret zu erstellen; das ist eine Sitzungseinstellung, kein Transkripttext, und Chuchotage erhält keinen Quelltranskriptinhalt. Audio streamt weiterhin von der App zu OpenAI, nicht über einen Chuchotage-Audioserver. Wenn du mit ChatGPT angemeldet bist, kann der Einstellungsbildschirm außerdem OpenAI kontaktieren, um Codex-Nutzung oder Guthaben anzuzeigen." }] },
          { heading: "Berechtigungen", paragraphs: ["Je nach Plattform und ausgewählter Route kann die App Mikrofon-/Audioaufnahmezugriff für Übersetzung, Benachrichtigungszugriff für laufenden Übersetzungsstatus, Bluetooth-bezogenen Zugriff für Headset-Mikrofone oder Audioausgabe, Android-Freigabe für Bildschirm-/Audioaufnahme bei Geräteaudio, macOS-Systemaudio-Aufnahmeberechtigung bei Mac-Wiedergabeaudio sowie Internetzugriff auf OpenAI-Dienste anfordern. Ein künftiger iOS/iPadOS-Modus für App-Audio auf demselben Gerät würde vor Veröffentlichung einen separaten ReplayKit-Bildschirmbroadcast-Fluss und Datenschutzprüfung erfordern."] },
          { heading: "Aufbewahrung", paragraphs: ["Der Entwickler erhält oder speichert deine ausgewählte Quell-Audioquelle, übersetztes Audio, Live-Transkripte oder Zugangsdaten nicht über einen Chuchotage-Server. Anfragemetadaten des gesponserten Tests werden nur in kurzlebigem Ratenbegrenzungs-Speicher auf dem Server gehalten. App-verwaltete lokale Daten bleiben auf deinem Gerät, bis du sie in der App oder in den Betriebssystemeinstellungen löschst, gespeicherte Zugangsdaten ersetzt oder über Plattformkontrollen entfernst. Einige plattformverwaltete Backups oder sichere Speicheraufzeichnungen können dem Verhalten deines Betriebssystems folgen."] },
          { heading: "Kinder", paragraphs: ["Chuchotage richtet sich nicht an Kinder unter 13 Jahren."] },
          { heading: "Kontakt", paragraphs: [{ html: "Fragen zu dieser Erklärung können an <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a> gesendet werden." }] },
        ],
      },
      blog: {
        eyebrow: "Chuchotage Notizen",
        title: "Kleine Notizen aus einer leisen Übersetzungs-App.",
        lede: "Das offizielle Journal für Chuchotage: Name, Produktentscheidungen und die Form persönlicher Echtzeit-Sprachübersetzung.",
        listLabel: "Chuchotage Notizen",
        noteDate: "9. Mai 2026",
        noteTitle: "Warum es Chuchotage heißt",
        noteSummary: "Der App-Name kommt vom Flüsterdolmetschen, einer leisen Live-Übersetzungspraxis, die besser zum Produkt passt als ein generischer Übersetzername.",
      },
      story: {
        eyebrow: "Bedeutung von Chuchotage",
        title: "Warum es Chuchotage heißt",
        lede: "Der Name kommt vom Flüsterdolmetschen: Live-Übersetzung für eine Person, nah genug, um zu helfen, und leise genug, um den Raum nicht zu übernehmen.",
        sections: [
          { paragraphs: ["Wenn du diese Seite über die Suche nach Chuchotage gefunden hast: Dies ist die offizielle Website der Chuchotage-App, einer persönlichen App für Echtzeit-Sprachübersetzung über Sprachen hinweg."] },
          { heading: "Das Wort", paragraphs: ["Chuchotage ist ein französisches Wort, das in Dolmetschkreisen für Flüsterdolmetschen verwendet wird. Statt aus einer Kabine zu sprechen oder ein ganzes Publikum anzusprechen, sitzt eine dolmetschende Person nahe bei einem Zuhörer und übersetzt leise, was gesagt wird.", "Dieses Bild ist das ganze Produktbriefing. Chuchotage soll nah, nützlich und bewusst klein wirken: kein Broadcast-System, keine Meeting-Plattform, sondern ein Übersetzungsbegleiter, der einer Person hilft, dranzubleiben."] },
          { heading: "Die App", paragraphs: ["Die App behält diese Form. Chuchotage öffnen, Ausgabesprache wählen, Audioquelle auswählen, wo die Plattform es unterstützt, und Übersetzung starten. Die Erkennung der Ausgangssprache ist automatisch. Der Hauptbildschirm bleibt schlicht, weil die Aufgabe einfach ist: zuhören, übersetzen, stoppen."], list: ["Chuchotage nutzt die ausgewählte Audioquelle nur während einer aktiven Übersetzungssitzung.", "Zugangsdaten werden auf dem Gerät über sichere Plattform-Speicherung abgelegt.", "Echtzeit-Audio wird während aktiver Nutzung an OpenAI gesendet, nicht über einen Chuchotage-Audioserver."] },
          { heading: "Das Versprechen", paragraphs: ["Viele Übersetzungsprogramme fühlen sich wie ein Kontrollraum an. Chuchotage ist nach dem gegenteiligen Gefühl benannt: ein leises Flüstern von Bedeutung, das im richtigen Moment ankommt.", "Darum blieb der Name. Chuchotage ist ungewöhnlich genug, um auffindbar zu sein, spezifisch genug, um im Gedächtnis zu bleiben, und ehrlich über den Zweck der App: persönliche Echtzeit-Sprachübersetzung ohne Werbung, Analytics oder Chuchotage-Audioserver."] },
        ],
        returnLink: "Zurück zur Chuchotage-Startseite",
      },
    },
    pt: {
      shared: {
        language: {
          label: "Idioma",
          aria: "Idioma do site",
        },
        nav: { home: "Início", how: "Como funciona", languages: "Idiomas", story: "História", privacy: "Privacidade", contact: "Contato" },
        footer: { notes: "Notas", privacy: "Política de privacidade" },
      },
      meta: {
        home: {
          title: "Chuchotage | App de tradução de fala em tempo real",
          description: "Chuchotage é um app pessoal de tradução de fala em tempo real, inspirado na interpretação sussurrada e feito para escuta discreta.",
          ogTitle: "Chuchotage | App de tradução de fala em tempo real",
          ogDescription: "Um app pessoal e discreto para tradução de fala em tempo real, inspirado na interpretação sussurrada.",
        },
        privacy: {
          title: "Política de privacidade | Chuchotage",
          description: "Política de privacidade do Chuchotage, o app pessoal de tradução de fala em tempo real para escuta no estilo interpretação sussurrada.",
          ogTitle: "Política de privacidade | Chuchotage",
          ogDescription: "Como o Chuchotage trata áudio selecionado, credenciais, armazenamento local e solicitações de tradução em tempo real.",
        },
        blog: {
          title: "Notas do Chuchotage | Diário de tradução em tempo real",
          description: "Notas do Chuchotage, o app de tradução de fala em tempo real chamado a partir da interpretação sussurrada.",
          ogTitle: "Notas do Chuchotage",
          ogDescription: "Notas curtas sobre o nome, a forma do produto e ideias de tradução pessoal em tempo real por trás do Chuchotage.",
        },
        story: {
          title: "Por que se chama Chuchotage | Chuchotage",
          description: "Chuchotage recebe o nome da interpretação sussurrada: uma prática de tradução ao vivo que inspirou o app.",
          ogTitle: "Por que se chama Chuchotage",
          ogDescription: "O significado de Chuchotage, o app de tradução de fala em tempo real inspirado na interpretação sussurrada.",
        },
      },
      home: {
        hero: {
          eyebrow: "Tradução de fala em tempo real",
          lede: "Um controle pessoal e discreto para escutar entre idiomas.",
          primary: "Como funciona",
          secondary: "Contato",
          availability: "As versões Android e Apple estão sendo preparadas para lançamento nas lojas. Feito para tradução pessoal de escuta.",
          ready: "Pronto",
          button: "Iniciar tradução",
        },
        workflow: {
          eyebrow: "Como funciona",
          title: "Fale por perto. Ouça a tradução.",
          steps: [
            "Entre com ChatGPT ou adicione sua própria chave de API da OpenAI. O Chuchotage usa isso para traduzir, não para ler suas conversas.",
            "Escolha o idioma que você quer ouvir e o microfone que prefere.",
            "Inicie a tradução. O Chuchotage detecta o idioma de origem e reproduz áudio traduzido no dispositivo.",
          ],
        },
        languages: {
          eyebrow: "Idiomas",
          title: "Detecte automaticamente o que você ouve. Escolha o que ouvir de volta.",
          intro: "O Chuchotage detecta automaticamente o idioma de origem e reproduz áudio traduzido no idioma de saída selecionado.",
          outputTitle: "Idiomas de saída",
          outputBody: "Idiomas selecionáveis para áudio traduzido.",
          inputTitle: "Idiomas de entrada",
          inputBody: "65 idiomas de origem são detectados automaticamente a partir da fala ao vivo, sem seletor de idioma de origem.",
        },
        use: {
          eyebrow: "Escuta cotidiana",
          title: "Para momentos em que você quer uma ponte discreta entre idiomas.",
          items: [
            "Acompanhar uma palestra ou explicação por perto.",
            "Entender o essencial de uma conversa em viagem.",
            "Usar o microfone do headset quando o ambiente está barulhento.",
            "Manter a tradução pessoal simples e local ao dispositivo quando possível.",
          ],
        },
        story: {
          eyebrow: "Significado de Chuchotage",
          title: "Interpretação sussurrada, repensada como um único controle discreto.",
          body: "Na interpretação, chuchotage é um modo silencioso: a tradução é falada baixinho para a pessoa que precisa dela. O app empresta essa ideia para a tradução cotidiana de fala em tempo real.",
          link: "Ler a nota curta de origem",
        },
        detail: {
          eyebrow: "Forma de privacidade",
          title: "Sem anúncios, sem analytics, sem servidor de áudio do Chuchotage.",
          items: [
            "Credenciais e preferências são armazenadas localmente com armazenamento seguro da plataforma.",
            "A tradução com chave de API ou ChatGPT conecta seu dispositivo à OpenAI.",
            "O teste patrocinado usa um pequeno endpoint do Chuchotage para um token temporário, não para áudio.",
          ],
        },
        limits: {
          eyebrow: "Limites importantes",
          title: "Apoio pessoal, não um intérprete certificado.",
          body: "A tradução automática em tempo real pode perder nuances, nomes, tom ou contexto. O Chuchotage não se destina a emergências, situações jurídicas, médicas ou outras interpretações de alto risco.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Respostas simples antes de instalar.",
          items: [
            ["O Chuchotage funciona offline?", "Não. A tradução ativa precisa de conexão com a internet para chegar ao OpenAI Realtime Translation."],
            ["Preciso de uma credencial da OpenAI?", "Sim. Você pode entrar com ChatGPT, inclusive com uma conta gratuita, ou usar sua própria chave de API da OpenAI. O Chuchotage mantém o login no seu dispositivo e não pode ver suas conversas do ChatGPT."],
            ["O Chuchotage grava áudio?", "O app captura a fonte de áudio selecionada apenas enquanto a tradução está ativa. O microfone exige permissão da plataforma, o áudio do dispositivo Android exige a aprovação de captura do Android para apps permitidos, e um futuro modo de áudio de dispositivo no iOS/iPadOS exigiria um plano separado de ReplayKit. O desenvolvedor não recebe nem armazena seu áudio por meio de um servidor de áudio do Chuchotage."],
            ["Posso escolher a fonte de áudio?", "Sim, onde a plataforma oferece suporte. As versões móveis focam na entrada de microfone; Android também oferece áudio do dispositivo quando a captura de reprodução é compatível. Áudio de apps no mesmo dispositivo iOS/iPadOS é possível apenas como um recurso ReplayKit planejado e não faz parte da versão móvel atual."],
          ],
        },
        cta: { eyebrow: "Lançamento nas lojas", title: "O Chuchotage está se preparando para as lojas.", action: "Contato" },
      },
      privacy: {
        updated: "Última atualização: 25 de maio de 2026",
        title: "Política de privacidade",
        intro: "Chuchotage é um app pessoal de tradução de fala em tempo real em plataformas compatíveis, incluindo builds Android e Apple. Esta política explica o que o app trata, por que trata e para onde essas informações vão.",
        sections: [
          { heading: "Informações tratadas pelo app", paragraphs: ["Quando você usa o Chuchotage, o app pode tratar a fonte de áudio selecionada, áudio traduzido, texto de transcrição ao vivo, idioma de saída selecionado, preferências de fonte de áudio e rota de saída, e sua credencial OpenAI ou modo de teste escolhido. A fonte de áudio selecionada pode ser o microfone, áudio de reprodução Android que o Android permite capturar, ou áudio de desktop em builds desktop compatíveis. A credencial pode ser uma chave de API OpenAI, tokens no estilo ChatGPT/Codex quando compatíveis, ou um identificador de instalação de teste patrocinado."] },
          { heading: "Como as informações são usadas", paragraphs: ["A fonte de áudio selecionada é usada para fornecer tradução em tempo real após você iniciar uma sessão. O texto de transcrição ao vivo é mostrado como interface da sessão atual e não é salvo como histórico. O idioma de saída selecionado é usado para solicitar o idioma do áudio traduzido. Credenciais são usadas para autenticar solicitações de tradução e, para login com ChatGPT quando compatível, ler uso ou crédito Codex na OpenAI. Se você usar tradução em teste patrocinado, o app solicita a um endpoint do Chuchotage um segredo de cliente temporário para OpenAI Realtime Translation."] },
          { heading: "Armazenamento local", paragraphs: ["Credenciais são armazenadas no dispositivo com armazenamento seguro da plataforma, como armazenamento seguro Android respaldado pelo Android Keystore ou Apple Keychain nas plataformas Apple. O modo de teste patrocinado guarda um identificador aleatório de instalação no dispositivo para limitação de uso; ele não é uma credencial OpenAI. Idioma de saída, fonte de áudio e preferências de rota de saída também são armazenados no dispositivo. Você pode remover credenciais salvas pelo app nas configurações e remover dados locais limpando o armazenamento do app onde o sistema operacional oferece suporte. Backups, restauração e comportamento do armazenamento seguro podem ser controlados pelo seu sistema operacional."] },
          { heading: "Seleção de idioma do site", paragraphs: ["O site público tem um seletor de idioma. Se você não escolheu um idioma, o site pode pedir a um endpoint próprio do Chuchotage uma sugestão aproximada de idioma derivada do país da solicitação web. O endpoint retorna apenas um código de país e idioma sugerido, não usa SDKs de analytics e não devolve seu endereço IP ao navegador. A escolha manual de idioma é salva no armazenamento local do navegador e substitui a detecção automática."] },
          { heading: "Compartilhamento e processadores", paragraphs: [{ html: "O Chuchotage não vende informações pessoais, não mostra anúncios e não usa SDKs de analytics. Durante tradução normal com chave de API ou ChatGPT, a fonte de áudio selecionada e a configuração de tradução são enviadas diretamente do dispositivo para a OpenAI para realizar a tradução em tempo real. A OpenAI trata dados enviados à API segundo seus próprios <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">controles de dados da API</a> e configurações de retenção. Se você usar tradução em teste patrocinado, o Chuchotage recebe o identificador aleatório de instalação, metadados de solicitação derivados de IP, idioma de saída selecionado e se transcrições de origem estão ativadas para criar um segredo de cliente temporário; isso é configuração de sessão, não texto de transcrição, e o Chuchotage não recebe conteúdo de transcrição de origem. O áudio ainda flui do app para a OpenAI, não por um servidor de áudio do Chuchotage. Quando você está conectado com ChatGPT, a tela de configurações também pode contactar a OpenAI para mostrar uso ou crédito Codex." }] },
          { heading: "Permissões", paragraphs: ["Dependendo da plataforma e da rota selecionada, o app pode solicitar acesso a microfone/captura de áudio para tradução, acesso a notificações para status contínuo da tradução, acesso relacionado a Bluetooth quando necessário para microfones de headset ou saída de áudio, aprovação Android de captura de tela/áudio quando você escolhe áudio do dispositivo, permissão macOS de gravação de áudio do sistema quando você escolhe áudio de reprodução do Mac, e acesso à internet para alcançar os serviços da OpenAI. Um futuro modo de áudio de apps no mesmo dispositivo iOS/iPadOS exigiria um fluxo separado de transmissão de tela ReplayKit e revisão de privacidade antes do lançamento."] },
          { heading: "Retenção", paragraphs: ["O desenvolvedor não recebe nem armazena sua fonte de áudio selecionada, áudio traduzido, transcrições ao vivo ou credenciais por meio de um servidor Chuchotage. Metadados de solicitações do teste patrocinado ficam apenas em memória temporária de limitação de uso no servidor. Dados locais gerenciados pelo app permanecem no dispositivo até que você os limpe no app ou nas configurações do sistema operacional, substitua a credencial salva ou os remova por controles da plataforma. Alguns backups ou registros de armazenamento seguro gerenciados pela plataforma podem seguir o comportamento do seu sistema operacional."] },
          { heading: "Crianças", paragraphs: ["O Chuchotage não é direcionado a crianças menores de 13 anos."] },
          { heading: "Contato", paragraphs: [{ html: "Perguntas sobre esta política podem ser enviadas para <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: {
        eyebrow: "Notas do Chuchotage",
        title: "Pequenas notas de um app de tradução discreto.",
        lede: "O diário oficial do Chuchotage: nome, escolhas de produto e a forma da tradução pessoal de fala em tempo real.",
        listLabel: "Notas do Chuchotage",
        noteDate: "9 de maio de 2026",
        noteTitle: "Por que se chama Chuchotage",
        noteSummary: "O nome do app vem da interpretação sussurrada, uma prática discreta de tradução ao vivo que combina melhor com o produto do que um nome genérico de tradutor.",
      },
      story: {
        eyebrow: "Significado de Chuchotage",
        title: "Por que se chama Chuchotage",
        lede: "O nome vem da interpretação sussurrada: tradução ao vivo para uma pessoa, próxima o bastante para ajudar e discreta o bastante para não tomar a sala.",
        sections: [
          { paragraphs: ["Se você encontrou esta página procurando por Chuchotage, este é o site oficial do app Chuchotage: um app pessoal de tradução de fala em tempo real para escutar entre idiomas."] },
          { heading: "A palavra", paragraphs: ["Chuchotage é uma palavra francesa usada no meio da interpretação para interpretação sussurrada. Em vez de falar de uma cabine ou se dirigir a uma plateia inteira, o intérprete se senta perto de uma pessoa e traduz em voz baixa o que está sendo dito.", "Essa imagem é todo o briefing do produto. O Chuchotage deve parecer próximo, útil e intencionalmente pequeno: não um sistema de transmissão, não uma plataforma de reunião, apenas um companheiro de tradução que ajuda uma pessoa a acompanhar."] },
          { heading: "O app", paragraphs: ["O app mantém essa forma. Abra o Chuchotage, escolha o idioma de saída, selecione a fonte de áudio onde a plataforma permitir e inicie a tradução. A detecção do idioma de origem é automática. A tela principal fica simples porque o trabalho é simples: ouvir, traduzir, parar."], list: ["O Chuchotage usa a fonte de áudio selecionada apenas enquanto uma sessão de tradução está ativa.", "Credenciais são armazenadas no dispositivo por meio do armazenamento seguro da plataforma.", "Áudio em tempo real é enviado à OpenAI durante o uso ativo, não por meio de um servidor de áudio do Chuchotage."] },
          { heading: "A promessa", paragraphs: ["Muitos softwares de tradução parecem uma sala de controle. Chuchotage recebeu o nome da sensação oposta: um sussurro discreto de significado chegando no momento certo.", "É por isso que o nome ficou. Chuchotage é incomum o bastante para ser pesquisável, específico o bastante para ser lembrado e honesto sobre o propósito do app: tradução pessoal de fala em tempo real sem anúncios, analytics ou servidor de áudio do Chuchotage."] },
        ],
        returnLink: "Voltar à página inicial do Chuchotage",
      },
    },
  };

  Object.assign(COPY, {
    ja: {
      shared: {
        language: { label: "言語", aria: "サイトの言語" },
        nav: { home: "ホーム", how: "使い方", languages: "言語", story: "ストーリー", privacy: "プライバシー", contact: "連絡先" },
        footer: { notes: "ノート", privacy: "プライバシーポリシー" },
      },
      meta: {
        home: {
          title: "Chuchotage | リアルタイム音声翻訳アプリ",
          description: "Chuchotageは、ささやき通訳に着想を得た、静かに聞きながら使う個人向けリアルタイム音声翻訳アプリです。",
          ogTitle: "Chuchotage | リアルタイム音声翻訳アプリ",
          ogDescription: "ささやき通訳に着想を得た、静かな個人向けリアルタイム音声翻訳アプリ。",
        },
        privacy: {
          title: "プライバシーポリシー | Chuchotage",
          description: "リアルタイム音声翻訳と、ささやき通訳のような聞き取り体験のための個人向けアプリChuchotageのプライバシーポリシー。",
          ogTitle: "プライバシーポリシー | Chuchotage",
          ogDescription: "Chuchotageが選択された音声、認証情報、ローカル保存、リアルタイム翻訳リクエストをどう扱うか。",
        },
        blog: {
          title: "Chuchotageノート | リアルタイム翻訳ジャーナル",
          description: "ささやき通訳にちなんで名付けられたリアルタイム音声翻訳アプリ、Chuchotageからのノート。",
          ogTitle: "Chuchotageノート",
          ogDescription: "Chuchotageという名前、プロダクトの形、個人向けリアルタイム翻訳の考え方についての短いノート。",
        },
        story: {
          title: "Chuchotageという名前の理由 | Chuchotage",
          description: "Chuchotageは、アプリに着想を与えた静かなライブ翻訳の実践、ささやき通訳にちなんで名付けられました。",
          ogTitle: "Chuchotageという名前の理由",
          ogDescription: "ささやき通訳に着想を得たリアルタイム音声翻訳アプリ、Chuchotageの意味。",
        },
      },
      home: {
        hero: {
          eyebrow: "リアルタイム音声翻訳",
          lede: "言語を越えて聞くための、静かな個人用翻訳コントロール。",
          primary: "使い方",
          secondary: "連絡先",
          availability: "Android版とApple版は、アプリストア公開に向けて準備中です。個人の聞き取り翻訳のために作られています。",
          ready: "準備完了",
          button: "翻訳を開始",
        },
        workflow: {
          eyebrow: "使い方",
          title: "近くで話す。翻訳を聞く。",
          steps: [
            "ChatGPTでサインインするか、自分のOpenAI APIキーを追加します。Chuchotageはそれを翻訳に使い、あなたのチャットを読むことはありません。",
            "聞きたい言語と、使いたいマイクを選びます。",
            "翻訳を開始します。Chuchotageが元の言語を検出し、翻訳音声を端末で再生します。",
          ],
        },
        languages: {
          eyebrow: "言語",
          title: "聞こえる言語を自動検出。返ってくる言語は自分で選択。",
          intro: "Chuchotageは元の言語を自動で検出し、選択した出力言語で翻訳音声を再生します。",
          outputTitle: "出力言語",
          outputBody: "翻訳音声として選べる言語です。",
          inputTitle: "入力言語",
          inputBody: "ライブ音声から65の元言語を自動検出します。元言語の選択は不要です。",
        },
        use: {
          eyebrow: "日常の聞き取り",
          title: "静かな言語の橋がほしい瞬間に。",
          items: [
            "近くの講演や説明についていく。",
            "旅先の会話の要点をつかむ。",
            "部屋が騒がしいときにヘッドセットのマイクを使う。",
            "個人の翻訳を、できるだけシンプルで端末内中心に保つ。",
          ],
        },
        story: {
          eyebrow: "Chuchotageの意味",
          title: "ささやき通訳を、ひとつの静かな操作として再構成。",
          body: "通訳の世界でchuchotageは静かな形式です。必要としている聞き手に、翻訳を小さな声で届けます。このアプリは、その考え方を日常のリアルタイム音声翻訳に借りています。",
          link: "名前の由来を読む",
        },
        detail: {
          eyebrow: "プライバシーの形",
          title: "広告なし、分析SDKなし、Chuchotageの音声サーバーなし。",
          items: [
            "認証情報と設定は、プラットフォームの安全な保存機能でローカルに保存されます。",
            "APIキーまたはChatGPTでの翻訳は、あなたの端末からOpenAIへ接続します。",
            "スポンサー付きトライアルは短期間のトークン取得に小さなChuchotageエンドポイントを使いますが、音声には使いません。",
          ],
        },
        limits: {
          eyebrow: "重要な制限",
          title: "個人向けの補助であり、認定通訳ではありません。",
          body: "リアルタイム機械翻訳は、ニュアンス、名前、口調、文脈を取り違えることがあります。Chuchotageは、緊急、法務、医療、その他重大な場面の通訳を目的としていません。",
        },
        faq: {
          eyebrow: "FAQ",
          title: "インストール前の率直な答え。",
          items: [
            ["Chuchotageはオフラインで使えますか？", "いいえ。翻訳中はOpenAI Realtime Translationに接続するため、インターネット接続が必要です。"],
            ["OpenAIの認証情報は必要ですか？", "はい。無料アカウントを含むChatGPTでサインインするか、自分のOpenAI APIキーを使えます。Chuchotageはログインを端末上に保持し、あなたのChatGPTの会話を見ることはできません。"],
            ["Chuchotageは音声を録音しますか？", "アプリは翻訳が有効な間だけ、選択された音声ソースを取り込みます。マイクにはプラットフォームの許可が必要です。Androidの端末音声には、Androidが許可するアプリについてのキャプチャ承認が必要です。将来のiOS/iPadOS端末音声モードには、別のReplayKit計画が必要です。開発者はChuchotageの音声サーバーを通じてあなたの音声を受け取ったり保存したりしません。"],
            ["音声ソースを選べますか？", "はい、プラットフォームが対応している場合に選べます。モバイル版はマイク入力を中心にしています。Androidでは再生キャプチャに対応している場合、端末音声も利用できます。iOS/iPadOSの同一端末アプリ音声は、計画中のReplayKit機能としてのみ可能で、現在のモバイル版には含まれていません。"],
          ],
        },
        cta: { eyebrow: "アプリストア公開", title: "Chuchotageはストア公開に向けて準備中です。", action: "連絡先" },
      },
      privacy: {
        updated: "最終更新日: 2026年5月25日",
        title: "プライバシーポリシー",
        intro: "Chuchotageは、Android版およびAppleプラットフォーム版を含む対応プラットフォーム向けの、個人用リアルタイム音声翻訳アプリです。このポリシーでは、アプリが何を扱い、なぜ扱い、その情報がどこへ行くのかを説明します。",
        sections: [
          { heading: "アプリが扱う情報", paragraphs: ["Chuchotageを使うと、アプリは選択された音声ソース、翻訳音声、ライブ文字起こしテキスト、選択された出力言語、音声ソースと出力経路の設定、選択したOpenAI認証情報またはトライアルモードを扱う場合があります。選択された音声ソースには、マイク音声、Androidがキャプチャを許可する端末再生音声、対応デスクトップ版のデスクトップ再生音声が含まれます。認証情報には、OpenAI APIキー、対応している場合のChatGPT/Codex形式のトークン、またはスポンサー付きトライアルのインストール識別子が含まれます。"] },
          { heading: "情報の使い方", paragraphs: ["選択された音声ソースは、翻訳セッションを開始した後にリアルタイム翻訳を提供するために使われます。ライブ文字起こしテキストは現在のセッションの画面表示として示され、文字起こし履歴として保存されません。選択された出力言語は、翻訳音声の言語をリクエストするために使われます。認証情報は翻訳リクエストの認証に使われ、対応しているChatGPTサインインではOpenAIからCodexの使用状況やクレジット状態を読むために使われます。スポンサー付きトライアル翻訳を使う場合、アプリはChuchotageエンドポイントに短期間のOpenAI Realtime Translationクライアントシークレットをリクエストします。"] },
          { heading: "ローカル保存", paragraphs: ["認証情報は、Android Keystoreに支えられたAndroidの安全な保存機能やAppleプラットフォームのKeychainなど、プラットフォームの安全な保存機能を使って端末上に保存されます。スポンサー付きトライアルモードは、利用制限のためにランダムなインストール識別子を端末に保存します。これはOpenAI認証情報ではありません。出力言語、音声ソース、出力経路の設定も端末に保存されます。アプリの設定からアプリ管理の認証情報を削除でき、OSが対応している場合はアプリのストレージを消去してローカルデータを削除できます。バックアップ、復元、安全な保存の動作はOSによって制御される場合があります。"] },
          { heading: "ウェブサイトの言語選択", paragraphs: ["公開ウェブサイトには言語セレクターがあります。言語を選んでいない場合、サイトはウェブリクエストの国情報に基づく大まかな言語提案を、Chuchotageのファーストパーティエンドポイントに問い合わせることがあります。このエンドポイントは国コードと言語提案だけを返し、分析SDKは使わず、あなたのIPアドレスをブラウザーに返しません。手動で選んだ言語はブラウザーのローカルストレージに保存され、自動検出より優先されます。"] },
          { heading: "共有と処理者", paragraphs: [{ html: "Chuchotageは個人情報を販売せず、広告を表示せず、分析SDKを使用しません。通常のAPIキーまたはChatGPT翻訳では、選択された音声ソースと翻訳設定が、リアルタイム翻訳のために端末からOpenAIへ直接送信されます。OpenAIはAPIに送信されたデータを、OpenAI自身の<a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">APIデータ管理</a>と保持設定に従って扱います。スポンサー付きトライアル翻訳を使う場合、Chuchotageは短期間の翻訳クライアントシークレットを作成するために、ランダムなインストール識別子、IP由来のリクエストメタデータ、選択された出力言語、ソース文字起こしが有効かどうかを受け取ります。これはセッション設定であり、文字起こしテキストではありません。Chuchotageはソース文字起こし内容を受け取りません。音声はChuchotageの音声サーバーではなく、アプリからOpenAIへ送信されます。ChatGPTでサインインしている場合、設定画面がCodexの使用状況やクレジット状態を表示するためにOpenAIへ接続することもあります。" }] },
          { heading: "権限", paragraphs: ["プラットフォームと選択した経路によって、アプリは翻訳のためのマイクまたは音声キャプチャ権限、継続中の翻訳状態のための通知権限、ヘッドセットマイクや音声出力経路に必要なBluetooth関連権限、Androidで端末音声を選ぶ場合の画面/音声キャプチャ承認、Mac再生音声を選ぶ場合のmacOSシステム音声録音権限、OpenAIサービスに接続するためのインターネットアクセスを求める場合があります。将来のiOS/iPadOS同一端末アプリ音声モードには、公開前に別のReplayKit画面配信フローとプライバシーレビューが必要です。"] },
          { heading: "保持", paragraphs: ["開発者は、選択されたソース音声、翻訳音声、ライブ文字起こし、認証情報をChuchotageサーバー経由で受け取ったり保存したりしません。スポンサー付きトライアルのリクエストメタデータは、サーバー上の短期間の利用制限メモリにのみ保持されます。アプリ管理のローカルデータは、アプリまたはOS設定で消去する、保存済み認証情報を置き換える、またはプラットフォームの管理機能で削除するまで端末に残ります。一部のプラットフォーム管理のバックアップや安全な保存記録は、OSの動作に従う場合があります。"] },
          { heading: "子ども", paragraphs: ["Chuchotageは13歳未満の子どもを対象としていません。"] },
          { heading: "連絡先", paragraphs: [{ html: "このポリシーに関する質問は<a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>へ送れます。" }] },
        ],
      },
      blog: {
        eyebrow: "Chuchotageノート",
        title: "静かな翻訳アプリからの小さなノート。",
        lede: "Chuchotageの公式ジャーナルです。名前、プロダクトの選択、個人向けリアルタイム音声翻訳の形について。",
        listLabel: "Chuchotageノート",
        noteDate: "2026年5月9日",
        noteTitle: "Chuchotageという名前の理由",
        noteSummary: "アプリ名は、一般的な翻訳アプリ名よりもプロダクトに合う、静かなライブ翻訳の実践であるささやき通訳に由来します。",
      },
      story: {
        eyebrow: "Chuchotageの意味",
        title: "Chuchotageという名前の理由",
        lede: "名前はささやき通訳に由来します。ひとりの聞き手のためのライブ翻訳で、助けになるほど近く、場を占領しないほど静かなものです。",
        sections: [
          { paragraphs: ["Chuchotageを検索してこのページに来たなら、ここはChuchotageアプリの公式サイトです。言語を越えて聞くための、個人向けリアルタイム音声翻訳アプリです。"] },
          { heading: "言葉", paragraphs: ["Chuchotageは、通訳の世界でささやき通訳を指すフランス語です。ブースから話したり全体に向けて話したりする代わりに、通訳者が聞き手の近くに座り、話されている内容を小さな声で訳します。", "そのイメージがプロダクト全体の要約です。Chuchotageは近く、役に立ち、意図的に小さくあるべきです。配信システムでも会議プラットフォームでもなく、ひとりが話についていくための翻訳の伴走者です。"] },
          { heading: "アプリ", paragraphs: ["アプリもその形を保っています。Chuchotageを開き、出力言語を選び、プラットフォームが対応している場所で音声ソースを選び、翻訳を開始します。元言語の検出は自動です。主画面はシンプルです。仕事は、聞く、翻訳する、止める、だけだからです。"], list: ["Chuchotageは翻訳セッションが有効な間だけ、選択された音声ソースを使います。", "認証情報はプラットフォームの安全な保存機能を通じて端末に保存されます。", "リアルタイム音声は使用中にOpenAIへ送信され、Chuchotageの音声サーバーは通りません。"] },
          { heading: "約束", paragraphs: ["多くの翻訳ソフトは管制室のように感じられます。Chuchotageの名前は、その反対の感覚から来ています。必要な瞬間に届く、意味の静かなささやきです。", "だからこの名前が残りました。Chuchotageは検索できるほど珍しく、覚えられるほど具体的で、アプリの目的に正直です。広告も分析もChuchotageの音声サーバーもない、個人向けリアルタイム音声翻訳です。"] },
        ],
        returnLink: "Chuchotageホームページに戻る",
      },
    },
    ru: {
      shared: {
        language: { label: "Язык", aria: "Язык сайта" },
        nav: { home: "Главная", how: "Как это работает", languages: "Языки", story: "История", privacy: "Приватность", contact: "Контакты" },
        footer: { notes: "Заметки", privacy: "Политика конфиденциальности" },
      },
      meta: {
        home: {
          title: "Chuchotage | Приложение для перевода речи в реальном времени",
          description: "Chuchotage — персональное приложение для перевода речи в реальном времени, вдохновленное шепотным переводом и созданное для тихого прослушивания.",
          ogTitle: "Chuchotage | Приложение для перевода речи в реальном времени",
          ogDescription: "Тихое персональное приложение для перевода речи в реальном времени, вдохновленное шепотным переводом.",
        },
        privacy: {
          title: "Политика конфиденциальности | Chuchotage",
          description: "Политика конфиденциальности Chuchotage, персонального приложения для перевода речи в реальном времени и прослушивания в стиле шепотного перевода.",
          ogTitle: "Политика конфиденциальности | Chuchotage",
          ogDescription: "Как Chuchotage обрабатывает выбранный звук, учетные данные, локальное хранение и запросы перевода в реальном времени.",
        },
        blog: {
          title: "Заметки Chuchotage | Журнал перевода в реальном времени",
          description: "Заметки Chuchotage, приложения для перевода речи в реальном времени, названного в честь шепотного перевода.",
          ogTitle: "Заметки Chuchotage",
          ogDescription: "Короткие заметки о названии, форме продукта и идеях персонального перевода речи в реальном времени за Chuchotage.",
        },
        story: {
          title: "Почему приложение называется Chuchotage | Chuchotage",
          description: "Chuchotage названо в честь шепотного перевода: тихой практики живого перевода, вдохновившей приложение.",
          ogTitle: "Почему приложение называется Chuchotage",
          ogDescription: "Значение Chuchotage, приложения для перевода речи в реальном времени, вдохновленного шепотным переводом.",
        },
      },
      home: {
        hero: {
          eyebrow: "Перевод речи в реальном времени",
          lede: "Тихое персональное управление для прослушивания между языками.",
          primary: "Как это работает",
          secondary: "Контакты",
          availability: "Сборки для Android и Apple готовятся к выпуску в магазинах приложений. Создано для персонального перевода на слух.",
          ready: "Готово",
          button: "Начать перевод",
        },
        workflow: {
          eyebrow: "Как это работает",
          title: "Речь рядом. Перевод в наушниках.",
          steps: [
            "Войдите через ChatGPT или добавьте свой OpenAI API key. Chuchotage использует его для перевода, а не для чтения ваших чатов.",
            "Выберите язык, который хотите слышать, и предпочитаемый микрофон.",
            "Начните перевод. Chuchotage определяет исходный язык и воспроизводит переведенный звук на устройстве.",
          ],
        },
        languages: {
          eyebrow: "Языки",
          title: "Автоматически определяет то, что вы слышите. Вы выбираете, что услышать в ответ.",
          intro: "Chuchotage автоматически определяет исходный язык, а затем воспроизводит переведенный звук на выбранном языке вывода.",
          outputTitle: "Языки вывода",
          outputBody: "Доступные языки переведенного аудио.",
          inputTitle: "Языки ввода",
          inputBody: "65 исходных языков автоматически определяются по живой речи, без выбора исходного языка.",
        },
        use: {
          eyebrow: "Повседневное слушание",
          title: "Для моментов, когда нужен тихий языковой мост.",
          items: [
            "Следить за разговором или объяснением рядом.",
            "Понять суть разговора в путешествии.",
            "Использовать микрофон гарнитуры, когда в комнате шумно.",
            "Сохранять персональный перевод простым и по возможности локальным для устройства.",
          ],
        },
        story: {
          eyebrow: "Значение Chuchotage",
          title: "Шепотный перевод, переосмысленный как одно тихое управление.",
          body: "В устном переводе chuchotage — тихий формат: перевод произносится негромко для человека, которому он нужен. Приложение берет эту идею для повседневного перевода речи в реальном времени.",
          link: "Прочитать короткую заметку о происхождении",
        },
        detail: {
          eyebrow: "Форма приватности",
          title: "Без рекламы, без аналитики, без аудиосервера Chuchotage.",
          items: [
            "Учетные данные и настройки хранятся локально с помощью безопасного хранилища платформы.",
            "Перевод через API key или ChatGPT подключает ваше устройство к OpenAI.",
            "Спонсируемый пробный режим использует небольшой endpoint Chuchotage для краткоживущего токена, а не для аудио.",
          ],
        },
        limits: {
          eyebrow: "Важные ограничения",
          title: "Персональная помощь, а не сертифицированный переводчик.",
          body: "Машинный перевод в реальном времени может упускать нюансы, имена, тон или контекст. Chuchotage не предназначен для чрезвычайных, юридических, медицинских или других ситуаций с высоким риском.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Простые ответы перед установкой.",
          items: [
            ["Работает ли Chuchotage офлайн?", "Нет. Для активного перевода нужно интернет-соединение с OpenAI Realtime Translation."],
            ["Нужны ли учетные данные OpenAI?", "Да. Можно войти через ChatGPT, включая бесплатный аккаунт, или использовать свой OpenAI API key. Chuchotage хранит вход на вашем устройстве и не может видеть ваши чаты ChatGPT."],
            ["Записывает ли Chuchotage аудио?", "Приложение захватывает выбранный источник звука только во время активного перевода. Микрофон требует разрешения платформы, аудио устройства Android требует одобрения захвата Android для разрешенных приложений, а будущий режим аудио устройства iOS/iPadOS потребовал бы отдельного плана ReplayKit. Разработчик не получает и не хранит ваше аудио через аудиосервер Chuchotage."],
            ["Можно ли выбрать источник звука?", "Да, там, где платформа это поддерживает. Мобильные сборки сосредоточены на микрофонном вводе; Android также предлагает аудио устройства, где поддерживается захват воспроизведения. Аудио приложений на том же устройстве iOS/iPadOS возможно только как запланированная функция ReplayKit и не входит в текущую мобильную сборку."],
          ],
        },
        cta: { eyebrow: "Выпуск в магазинах", title: "Chuchotage готовится к магазинам приложений.", action: "Контакты" },
      },
      privacy: {
        updated: "Последнее обновление: 25 мая 2026 г.",
        title: "Политика конфиденциальности",
        intro: "Chuchotage — персональное приложение для перевода речи в реальном времени на поддерживаемых платформах, включая сборки для Android и Apple. Эта политика объясняет, что обрабатывает приложение, зачем оно это обрабатывает и куда попадает эта информация.",
        sections: [
          { heading: "Информация, которую обрабатывает приложение", paragraphs: ["При использовании Chuchotage приложение может обрабатывать выбранный источник звука, переведенное аудио, текст живой транскрипции, выбранный язык вывода, настройки источника и маршрута аудио, а также выбранные учетные данные OpenAI или пробный режим. Выбранным источником звука может быть микрофон, аудио воспроизведения Android, которое Android разрешает захватывать, или аудио рабочего стола в поддерживаемых настольных сборках. Учетными данными могут быть OpenAI API key, токены в стиле ChatGPT/Codex там, где они поддерживаются, или идентификатор установки для спонсируемого пробного режима."] },
          { heading: "Как используется информация", paragraphs: ["Выбранный источник звука используется для перевода в реальном времени после запуска сеанса. Текст живой транскрипции показывается как интерфейс текущего сеанса и не сохраняется как история транскрипций. Выбранный язык вывода используется для запроса языка переведенного аудио. Учетные данные используются для аутентификации запросов перевода и, при поддерживаемом входе через ChatGPT, для чтения состояния использования или кредитов Codex у OpenAI. Если вы используете спонсируемый пробный перевод, приложение запрашивает у endpoint Chuchotage краткоживущий client secret OpenAI Realtime Translation."] },
          { heading: "Локальное хранение", paragraphs: ["Учетные данные хранятся на устройстве с помощью безопасного хранилища платформы, например Android secure storage на основе Android Keystore или Apple Keychain на платформах Apple. Спонсируемый пробный режим хранит на устройстве случайный идентификатор установки для ограничения использования; это не учетные данные OpenAI. Язык вывода, источник аудио и настройки маршрута вывода также хранятся на устройстве. Вы можете удалить сохраненные приложением учетные данные в настройках приложения и удалить локальные данные, очистив хранилище приложения там, где это поддерживает операционная система. Резервные копии, восстановление и поведение безопасного хранилища могут контролироваться операционной системой."] },
          { heading: "Выбор языка сайта", paragraphs: ["На публичном сайте есть переключатель языка. Если вы не выбрали язык, сайт может запросить у собственного endpoint Chuchotage приблизительную языковую рекомендацию, основанную на стране веб-запроса. Endpoint возвращает только код страны и предложенный язык, не использует SDK аналитики и не возвращает ваш IP-адрес браузеру. Ручной выбор языка сохраняется в локальном хранилище браузера и имеет приоритет над автоматическим определением."] },
          { heading: "Передача и обработчики", paragraphs: [{ html: "Chuchotage не продает персональную информацию, не показывает рекламу и не использует SDK аналитики. При обычном переводе через API key или ChatGPT выбранный источник звука и конфигурация перевода отправляются напрямую с устройства в OpenAI для выполнения перевода в реальном времени. OpenAI обрабатывает данные, отправленные в API, согласно своим <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">средствам управления данными API</a> и настройкам хранения. Если вы используете спонсируемый пробный перевод, Chuchotage получает случайный идентификатор установки, метаданные запроса, производные от IP, выбранный язык вывода и сведения о том, включены ли исходные транскрипции, чтобы создать краткоживущий client secret перевода; это настройка сеанса, а не текст транскрипции, и Chuchotage не получает содержимое исходной транскрипции. Аудио по-прежнему передается из приложения в OpenAI, а не через аудиосервер Chuchotage. Когда вы вошли через ChatGPT, экран настроек также может обращаться к OpenAI, чтобы показать использование или кредиты Codex." }] },
          { heading: "Разрешения", paragraphs: ["В зависимости от платформы и выбранного маршрута приложение может запросить доступ к микрофону или захвату аудио для перевода, доступ к уведомлениям для статуса текущего перевода, доступы, связанные с Bluetooth, когда они нужны для микрофонов гарнитуры или маршрутизации аудиовыхода, одобрение Android на захват экрана/аудио при выборе аудио устройства, разрешение macOS на запись системного аудио при выборе воспроизведения Mac и доступ в интернет для связи с сервисами OpenAI. Будущий режим аудио приложений на том же устройстве iOS/iPadOS потребовал бы отдельного потока ReplayKit screen broadcast и проверки приватности перед выпуском."] },
          { heading: "Хранение", paragraphs: ["Разработчик не получает и не хранит выбранный исходный звук, переведенное аудио, живые транскрипции или учетные данные через сервер Chuchotage. Метаданные запросов спонсируемого пробного режима хранятся только в краткоживущей памяти ограничения использования на сервере. Локальные данные, которыми управляет приложение, остаются на устройстве, пока вы не удалите их в приложении или настройках ОС, не замените сохраненные учетные данные или не удалите их через средства платформы. Некоторые управляемые платформой резервные копии или записи безопасного хранилища могут следовать правилам вашей операционной системы."] },
          { heading: "Дети", paragraphs: ["Chuchotage не предназначен для детей младше 13 лет."] },
          { heading: "Контакты", paragraphs: [{ html: "Вопросы об этой политике можно отправлять на <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: {
        eyebrow: "Заметки Chuchotage",
        title: "Небольшие заметки из тихого приложения для перевода.",
        lede: "Официальный журнал Chuchotage: название, продуктовые решения и форма персонального перевода речи в реальном времени.",
        listLabel: "Заметки Chuchotage",
        noteDate: "9 мая 2026 г.",
        noteTitle: "Почему приложение называется Chuchotage",
        noteSummary: "Название приложения пришло из шепотного перевода, тихой практики живого перевода, которая подходит продукту лучше, чем обычное название переводчика.",
      },
      story: {
        eyebrow: "Значение Chuchotage",
        title: "Почему приложение называется Chuchotage",
        lede: "Название пришло из шепотного перевода: живого перевода для одного слушателя, достаточно близкого, чтобы помочь, и достаточно тихого, чтобы не захватывать комнату.",
        sections: [
          { paragraphs: ["Если вы нашли эту страницу, поискав Chuchotage, это официальный сайт приложения Chuchotage: персонального приложения для перевода речи в реальном времени и прослушивания между языками."] },
          { heading: "Слово", paragraphs: ["Chuchotage — французское слово, используемое в устном переводе для шепотного перевода. Вместо того чтобы говорить из кабины или обращаться ко всей аудитории, переводчик сидит рядом со слушателем и тихо переводит сказанное.", "Этот образ и есть весь продуктовый бриф. Chuchotage должно ощущаться близким, полезным и намеренно небольшим: не система трансляции, не платформа для встреч, а спутник перевода, который помогает одному человеку следить за происходящим."] },
          { heading: "Приложение", paragraphs: ["Приложение сохраняет эту форму. Откройте Chuchotage, выберите язык вывода, выберите источник звука там, где платформа это поддерживает, и начните перевод. Исходный язык определяется автоматически. Главный экран остается простым, потому что задача проста: слушать, переводить, остановить."], list: ["Chuchotage использует выбранный источник звука только во время активного сеанса перевода.", "Учетные данные хранятся на устройстве через безопасное хранилище платформы.", "Аудио в реальном времени отправляется в OpenAI во время активного использования, а не через аудиосервер Chuchotage."] },
          { heading: "Обещание", paragraphs: ["Многие программы перевода ощущаются как диспетчерская. Chuchotage названо в честь противоположного чувства: тихого шепота смысла, который приходит в нужный момент.", "Поэтому название осталось. Chuchotage достаточно необычно для поиска, достаточно конкретно, чтобы запомниться, и честно говорит о назначении приложения: персональный перевод речи в реальном времени без рекламы, аналитики и аудиосервера Chuchotage."] },
        ],
        returnLink: "Вернуться на главную страницу Chuchotage",
      },
    },
    zh: {
      shared: {
        language: { label: "语言", aria: "网站语言" },
        nav: { home: "首页", how: "工作原理", languages: "语言", story: "故事", privacy: "隐私", contact: "联系" },
        footer: { notes: "笔记", privacy: "隐私政策" },
      },
      meta: {
        home: {
          title: "Chuchotage | 实时语音翻译应用",
          description: "Chuchotage 是一款个人实时语音翻译应用，灵感来自耳语传译，适合安静地边听边翻译。",
          ogTitle: "Chuchotage | 实时语音翻译应用",
          ogDescription: "一款安静的个人实时语音翻译应用，灵感来自耳语传译。",
        },
        privacy: {
          title: "隐私政策 | Chuchotage",
          description: "Chuchotage 的隐私政策。Chuchotage 是一款用于实时语音翻译和耳语传译式聆听的个人应用。",
          ogTitle: "隐私政策 | Chuchotage",
          ogDescription: "Chuchotage 如何处理所选音频、凭据、本地存储和实时翻译请求。",
        },
        blog: {
          title: "Chuchotage 笔记 | 实时翻译日志",
          description: "来自 Chuchotage 的笔记。这款实时语音翻译应用以耳语传译命名。",
          ogTitle: "Chuchotage 笔记",
          ogDescription: "关于 Chuchotage 名称、产品形态和个人实时翻译想法的简短笔记。",
        },
        story: {
          title: "为什么叫 Chuchotage | Chuchotage",
          description: "Chuchotage 的名字来自耳语传译，这种安静的现场翻译实践启发了这款应用。",
          ogTitle: "为什么叫 Chuchotage",
          ogDescription: "Chuchotage 的含义：一款受耳语传译启发的实时语音翻译应用。",
        },
      },
      home: {
        hero: {
          eyebrow: "实时语音翻译",
          lede: "一个安静的个人翻译控制，用来跨语言聆听。",
          primary: "工作原理",
          secondary: "联系",
          availability: "Android 和 Apple 版本正在准备应用商店发布。为个人边听边译而构建。",
          ready: "就绪",
          button: "开始翻译",
        },
        workflow: {
          eyebrow: "工作原理",
          title: "附近有人说话。你听到翻译。",
          steps: [
            "使用 ChatGPT 登录，或添加你自己的 OpenAI API key。Chuchotage 用它来翻译，不会读取你的聊天内容。",
            "选择你想听到的语言和你偏好的麦克风。",
            "开始翻译。Chuchotage 会检测源语言，并在设备上播放翻译后的音频。",
          ],
        },
        languages: {
          eyebrow: "语言",
          title: "自动检测你听到的内容。选择你想听回来的语言。",
          intro: "Chuchotage 自动检测源语言，然后用你选择的输出语言播放翻译音频。",
          outputTitle: "输出语言",
          outputBody: "可选择的翻译音频语言。",
          inputTitle: "输入语言",
          inputBody: "65 种源语言可从实时语音中自动检测，无需源语言选择器。",
        },
        use: {
          eyebrow: "日常聆听",
          title: "当你需要一座安静的语言桥时。",
          items: [
            "跟上附近的演讲或解释。",
            "理解旅行对话的大意。",
            "房间嘈杂时使用耳机麦克风。",
            "让个人翻译尽可能简单，并在可行时保持设备本地优先。",
          ],
        },
        story: {
          eyebrow: "Chuchotage 的含义",
          title: "把耳语传译重新想象成一个安静的控制。",
          body: "在传译中，chuchotage 是一种安静模式：译文轻声说给需要它的听者。这个应用借用了这个想法，用于日常实时语音翻译。",
          link: "阅读简短的名称来源",
        },
        detail: {
          eyebrow: "隐私形态",
          title: "无广告，无分析 SDK，无 Chuchotage 音频服务器。",
          items: [
            "凭据和偏好设置通过平台安全存储保存在本地。",
            "API key 和 ChatGPT 翻译会从你的设备连接到 OpenAI。",
            "赞助试用只使用一个小型 Chuchotage endpoint 来获取短期 token，不用于音频。",
          ],
        },
        limits: {
          eyebrow: "重要限制",
          title: "个人辅助，不是认证口译员。",
          body: "实时机器翻译可能遗漏细微含义、姓名、语气或上下文。Chuchotage 不适用于紧急、法律、医疗或其他高风险口译场景。",
        },
        faq: {
          eyebrow: "FAQ",
          title: "安装前的直接回答。",
          items: [
            ["Chuchotage 可以离线工作吗？", "不能。主动翻译需要互联网连接以访问 OpenAI Realtime Translation。"],
            ["我需要 OpenAI 凭据吗？", "需要。你可以使用 ChatGPT 登录，包括免费账号，也可以使用自己的 OpenAI API key。Chuchotage 会把登录保留在你的设备上，不能查看你的 ChatGPT 聊天。"],
            ["Chuchotage 会录音吗？", "应用只会在翻译启用时捕获所选音频源。麦克风需要平台权限，Android 设备音频需要 Android 对允许应用的捕获批准，未来的 iOS/iPadOS 设备音频模式需要单独的 ReplayKit 计划。开发者不会通过 Chuchotage 音频服务器接收或存储你的音频。"],
            ["我可以选择音频源吗？", "可以，在平台支持的地方可以选择。移动版本主要关注麦克风输入；Android 在支持播放捕获时也提供设备音频。同一台 iOS/iPadOS 设备上的应用音频只可能作为计划中的 ReplayKit 功能，目前的移动版本不包含它。"],
          ],
        },
        cta: { eyebrow: "应用商店发布", title: "Chuchotage 正在为商店发布做准备。", action: "联系" },
      },
      privacy: {
        updated: "最后更新：2026 年 5 月 25 日",
        title: "隐私政策",
        intro: "Chuchotage 是一款在受支持平台上运行的个人实时语音翻译应用，包括 Android 和 Apple 平台版本。本政策说明应用处理什么信息、为什么处理，以及这些信息会去哪里。",
        sections: [
          { heading: "应用处理的信息", paragraphs: ["使用 Chuchotage 时，应用可能处理所选音频源、翻译音频、实时转写文本、所选输出语言、音频源和输出路由偏好，以及你选择的 OpenAI 凭据或试用模式。所选音频源可以是麦克风音频、Android 允许应用捕获的设备播放音频，或受支持桌面版本上的桌面播放音频。凭据可以是 OpenAI API key、受支持时的 ChatGPT/Codex 风格 token，或赞助试用安装标识符。"] },
          { heading: "信息如何使用", paragraphs: ["所选音频源用于在你启动翻译会话后提供实时翻译。实时转写文本作为当前会话界面显示，不会保存为转写历史。所选输出语言用于请求翻译音频的语言。凭据用于认证翻译请求，并在支持 ChatGPT 登录时用于从 OpenAI 读取 Codex 使用量或额度状态。如果你使用赞助试用翻译，应用会向 Chuchotage endpoint 请求一个短期 OpenAI Realtime Translation client secret。"] },
          { heading: "本地存储", paragraphs: ["凭据使用平台安全存储保存在设备上，例如由 Android Keystore 支持的 Android secure storage，或 Apple 平台上的 Apple Keychain。赞助试用模式会在设备上保存一个随机安装标识符用于限流；它不是 OpenAI 凭据。输出语言、音频源和输出路由偏好也保存在设备上。你可以在应用设置中移除由应用管理的已保存凭据，也可以在操作系统支持的地方通过清除应用存储来移除本地数据。平台备份、设备恢复和安全存储行为可能由你的操作系统控制。"] },
          { heading: "网站语言选择", paragraphs: ["公开网站提供语言选择器。如果你还没有选择语言，网站可能会向 Chuchotage 第一方 endpoint 请求基于网页请求国家的大致语言建议。该 endpoint 只返回国家代码和建议语言，不使用分析 SDK，也不会把你的 IP 地址返回给浏览器。手动选择的语言会保存在浏览器本地存储中，并覆盖自动检测。"] },
          { heading: "共享和处理方", paragraphs: [{ html: "Chuchotage 不出售个人信息，不显示广告，也不使用分析 SDK。在普通 API key 或 ChatGPT 翻译期间，所选音频源和翻译配置会直接从设备发送到 OpenAI，以执行实时翻译。OpenAI 会根据其自身的 <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">API 数据控制</a>和保留设置处理发送到 API 的数据。如果你使用赞助试用翻译，Chuchotage 会接收随机安装标识符、IP 派生的请求元数据、所选输出语言，以及是否启用源转写，用来创建短期翻译 client secret；这是会话设置，不是转写文本，Chuchotage 不会接收源转写内容。音频仍然从应用传输到 OpenAI，而不是经过 Chuchotage 音频服务器。当你使用 ChatGPT 登录时，设置屏幕也可能联系 OpenAI 来显示 Codex 使用量或额度状态。" }] },
          { heading: "权限", paragraphs: ["根据平台和所选路径，应用可能请求用于翻译的麦克风/音频捕获访问、用于持续翻译状态的通知访问、在耳机麦克风或音频输出路由需要时的 Bluetooth 相关访问、选择 Android 设备音频时的 Android 屏幕/音频捕获批准、选择 Mac 播放音频时的 macOS 系统音频录制权限，以及访问 OpenAI 服务所需的互联网访问。未来同一台 iOS/iPadOS 设备上的应用音频模式需要单独的 ReplayKit 屏幕广播流程，并在发布前进行隐私审查。"] },
          { heading: "保留", paragraphs: ["开发者不会通过 Chuchotage 服务器接收或存储你选择的源音频、翻译音频、实时转写或凭据。赞助试用请求元数据只会保存在服务器短期限流内存中。应用管理的本地数据会保留在你的设备上，直到你在应用或操作系统设置中清除、替换已保存凭据，或通过平台控制删除它们。一些由平台管理的备份或安全存储记录可能遵循你操作系统自身的行为。"] },
          { heading: "儿童", paragraphs: ["Chuchotage 不面向 13 岁以下儿童。"] },
          { heading: "联系", paragraphs: [{ html: "有关本政策的问题可发送至 <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>。" }] },
        ],
      },
      blog: {
        eyebrow: "Chuchotage 笔记",
        title: "来自一款安静翻译应用的小笔记。",
        lede: "Chuchotage 的官方日志：名称、产品选择，以及个人实时语音翻译的形态。",
        listLabel: "Chuchotage 笔记",
        noteDate: "2026 年 5 月 9 日",
        noteTitle: "为什么叫 Chuchotage",
        noteSummary: "应用名称来自耳语传译，这种安静的现场翻译实践比普通翻译器名称更符合产品。",
      },
      story: {
        eyebrow: "Chuchotage 的含义",
        title: "为什么叫 Chuchotage",
        lede: "名字来自耳语传译：为一个听者进行的现场翻译，足够靠近以提供帮助，也足够安静以不占据整个房间。",
        sections: [
          { paragraphs: ["如果你是搜索 Chuchotage 找到此页面，这里是 Chuchotage 应用的官方网站：一款用于跨语言聆听的个人实时语音翻译应用。"] },
          { heading: "这个词", paragraphs: ["Chuchotage 是传译领域用于耳语传译的法语词。译员不是在同传间讲话，也不是面对整场观众，而是坐在一位听者旁边，轻声翻译正在说的话。", "这个画面就是整个产品简报。Chuchotage 应该感觉亲近、有用，并且有意保持小巧：不是广播系统，不是会议平台，只是帮助一个人跟上内容的翻译伙伴。"] },
          { heading: "这款应用", paragraphs: ["应用保持这种形态。打开 Chuchotage，选择输出语言，在平台支持的地方选择音频源，然后开始翻译。源语言会自动检测。主屏幕保持简洁，因为任务很简单：听、翻译、停止。"], list: ["Chuchotage 只在翻译会话处于活动状态时使用所选音频源。", "凭据通过平台安全存储保存在设备上。", "实时音频在使用期间发送到 OpenAI，而不是经过 Chuchotage 音频服务器。"] },
          { heading: "承诺", paragraphs: ["很多翻译软件感觉像控制室。Chuchotage 的名字来自相反的感觉：在合适时刻到来的安静意义耳语。", "这就是这个名字留下来的原因。Chuchotage 足够特别，便于搜索；足够具体，便于记住；也诚实地说明应用目的：个人实时语音翻译，没有广告、分析或 Chuchotage 音频服务器。"] },
        ],
        returnLink: "返回 Chuchotage 首页",
      },
    },
    ko: {
      shared: {
        language: { label: "언어", aria: "웹사이트 언어" },
        nav: { home: "홈", how: "작동 방식", languages: "언어", story: "이야기", privacy: "개인정보", contact: "연락처" },
        footer: { notes: "노트", privacy: "개인정보 처리방침" },
      },
      meta: {
        home: {
          title: "Chuchotage | 실시간 음성 번역 앱",
          description: "Chuchotage는 속삭임 통역에서 영감을 받아 조용히 들으며 쓰도록 만든 개인용 실시간 음성 번역 앱입니다.",
          ogTitle: "Chuchotage | 실시간 음성 번역 앱",
          ogDescription: "속삭임 통역에서 영감을 받은 조용한 개인용 실시간 음성 번역 앱입니다.",
        },
        privacy: {
          title: "개인정보 처리방침 | Chuchotage",
          description: "실시간 음성 번역과 속삭임 통역식 듣기를 위한 개인용 앱 Chuchotage의 개인정보 처리방침입니다.",
          ogTitle: "개인정보 처리방침 | Chuchotage",
          ogDescription: "Chuchotage가 선택된 오디오, 자격 증명, 로컬 저장, 실시간 번역 요청을 처리하는 방식입니다.",
        },
        blog: {
          title: "Chuchotage 노트 | 실시간 번역 저널",
          description: "속삭임 통역에서 이름을 딴 실시간 음성 번역 앱 Chuchotage의 노트입니다.",
          ogTitle: "Chuchotage 노트",
          ogDescription: "Chuchotage라는 이름, 제품 형태, 개인용 실시간 번역 아이디어에 관한 짧은 노트입니다.",
        },
        story: {
          title: "Chuchotage라는 이름의 이유 | Chuchotage",
          description: "Chuchotage는 앱에 영감을 준 조용한 실시간 번역 방식인 속삭임 통역에서 이름을 얻었습니다.",
          ogTitle: "Chuchotage라는 이름의 이유",
          ogDescription: "속삭임 통역에서 영감을 받은 실시간 음성 번역 앱 Chuchotage의 의미입니다.",
        },
      },
      home: {
        hero: {
          eyebrow: "실시간 음성 번역",
          lede: "언어를 넘어 듣기 위한 조용한 개인 번역 컨트롤.",
          primary: "작동 방식",
          secondary: "연락처",
          availability: "Android와 Apple 빌드는 앱 스토어 출시를 준비 중입니다. 개인적인 듣기 번역을 위해 만들어졌습니다.",
          ready: "준비됨",
          button: "번역 시작",
        },
        workflow: {
          eyebrow: "작동 방식",
          title: "가까이에서 말하면 번역을 듣습니다.",
          steps: [
            "ChatGPT로 로그인하거나 자신의 OpenAI API key를 추가합니다. Chuchotage는 이를 번역에 사용하며, 채팅을 읽는 데 사용하지 않습니다.",
            "듣고 싶은 언어와 선호하는 마이크를 선택합니다.",
            "번역을 시작합니다. Chuchotage가 원어를 감지하고 번역된 오디오를 기기에서 재생합니다.",
          ],
        },
        languages: {
          eyebrow: "언어",
          title: "들은 언어를 자동 감지하고, 다시 들을 언어를 선택합니다.",
          intro: "Chuchotage는 원어를 자동으로 감지한 뒤 선택한 출력 언어로 번역 오디오를 재생합니다.",
          outputTitle: "출력 언어",
          outputBody: "번역 오디오로 선택할 수 있는 언어입니다.",
          inputTitle: "입력 언어",
          inputBody: "실시간 음성에서 65개 원어가 자동으로 감지되며, 원어 선택기는 없습니다.",
        },
        use: {
          eyebrow: "일상적인 듣기",
          title: "조용한 언어 다리가 필요할 때.",
          items: [
            "가까운 발표나 설명을 따라가기.",
            "여행 중 대화의 요지를 이해하기.",
            "방이 시끄러울 때 헤드셋 마이크 사용하기.",
            "개인 번역을 단순하게, 가능하면 기기 중심으로 유지하기.",
          ],
        },
        story: {
          eyebrow: "Chuchotage의 의미",
          title: "속삭임 통역을 하나의 조용한 컨트롤로 다시 상상했습니다.",
          body: "통역에서 chuchotage는 조용한 방식입니다. 필요한 사람에게 번역을 낮은 목소리로 전달합니다. 이 앱은 그 아이디어를 일상적인 실시간 음성 번역에 빌려왔습니다.",
          link: "짧은 이름 이야기 읽기",
        },
        detail: {
          eyebrow: "개인정보 형태",
          title: "광고 없음, 분석 SDK 없음, Chuchotage 오디오 서버 없음.",
          items: [
            "자격 증명과 설정은 플랫폼 보안 저장소로 로컬에 저장됩니다.",
            "API key 또는 ChatGPT 번역은 사용자의 기기에서 OpenAI로 연결됩니다.",
            "스폰서 체험은 짧은 수명 token을 위해 작은 Chuchotage endpoint를 사용하며, 오디오에는 사용하지 않습니다.",
          ],
        },
        limits: {
          eyebrow: "중요한 한계",
          title: "개인 지원 도구이지 공인 통역사가 아닙니다.",
          body: "실시간 기계 번역은 뉘앙스, 이름, 어조, 맥락을 놓칠 수 있습니다. Chuchotage는 응급, 법률, 의료 또는 기타 고위험 통역 상황을 위한 것이 아닙니다.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "설치 전에 보는 간단한 답변.",
          items: [
            ["Chuchotage는 오프라인으로 작동하나요?", "아니요. 활성 번역은 OpenAI Realtime Translation에 연결하기 위해 인터넷 연결이 필요합니다."],
            ["OpenAI 자격 증명이 필요한가요?", "예. 무료 계정을 포함해 ChatGPT로 로그인하거나 자신의 OpenAI API key를 사용할 수 있습니다. Chuchotage는 로그인을 기기에 보관하며 사용자의 ChatGPT 채팅을 볼 수 없습니다."],
            ["Chuchotage가 오디오를 녹음하나요?", "앱은 번역이 활성화된 동안에만 선택한 오디오 소스를 캡처합니다. 마이크는 플랫폼 권한이 필요하고, Android 기기 오디오는 Android가 허용한 앱에 대해 캡처 승인이 필요하며, 향후 iOS/iPadOS 기기 오디오 모드는 별도의 ReplayKit 계획이 필요합니다. 개발자는 Chuchotage 오디오 서버를 통해 사용자의 오디오를 받거나 저장하지 않습니다."],
            ["오디오 소스를 선택할 수 있나요?", "예, 플랫폼이 지원하는 곳에서는 가능합니다. 모바일 빌드는 마이크 입력에 집중합니다. Android는 재생 캡처가 지원되는 경우 기기 오디오도 제공합니다. 같은 iOS/iPadOS 기기의 앱 오디오는 계획된 ReplayKit 기능으로만 가능하며 현재 모바일 빌드에는 포함되어 있지 않습니다."],
          ],
        },
        cta: { eyebrow: "앱 스토어 출시", title: "Chuchotage가 스토어 출시를 준비하고 있습니다.", action: "연락처" },
      },
      privacy: {
        updated: "마지막 업데이트: 2026년 5월 25일",
        title: "개인정보 처리방침",
        intro: "Chuchotage는 Android 및 Apple 플랫폼 빌드를 포함한 지원 플랫폼에서 작동하는 개인용 실시간 음성 번역 앱입니다. 이 방침은 앱이 무엇을 처리하고, 왜 처리하며, 그 정보가 어디로 가는지 설명합니다.",
        sections: [
          { heading: "앱이 처리하는 정보", paragraphs: ["Chuchotage를 사용할 때 앱은 선택한 오디오 소스, 번역 오디오, 실시간 전사 텍스트, 선택한 출력 언어, 오디오 소스 및 출력 경로 설정, 선택한 OpenAI 자격 증명 또는 체험 모드를 처리할 수 있습니다. 선택한 오디오 소스는 마이크 오디오, Android가 앱에 캡처를 허용한 Android 기기 재생 오디오, 또는 지원되는 데스크톱 빌드의 데스크톱 재생 오디오일 수 있습니다. 자격 증명은 OpenAI API key, 지원되는 경우 ChatGPT/Codex 방식 token, 또는 스폰서 체험 설치 식별자일 수 있습니다."] },
          { heading: "정보 사용 방식", paragraphs: ["선택한 오디오 소스는 번역 세션을 시작한 뒤 실시간 번역을 제공하는 데 사용됩니다. 실시간 전사 텍스트는 현재 세션 UI로 표시되며 전사 기록으로 저장되지 않습니다. 선택한 출력 언어는 번역 오디오 언어를 요청하는 데 사용됩니다. 자격 증명은 번역 요청을 인증하고, 지원되는 ChatGPT 로그인에서는 OpenAI에서 Codex 사용량 또는 크레딧 상태를 읽는 데 사용됩니다. 스폰서 체험 번역을 사용하는 경우 앱은 Chuchotage endpoint에 짧은 수명의 OpenAI Realtime Translation client secret을 요청합니다."] },
          { heading: "로컬 저장", paragraphs: ["자격 증명은 Android Keystore 기반 Android 보안 저장소 또는 Apple 플랫폼의 Apple Keychain 같은 플랫폼 보안 저장소를 사용해 기기에 저장됩니다. 스폰서 체험 모드는 사용 제한을 위해 임의의 설치 식별자를 기기에 저장합니다. 이는 OpenAI 자격 증명이 아닙니다. 출력 언어, 오디오 소스, 출력 경로 설정도 기기에 저장됩니다. 앱 설정에서 앱이 관리하는 저장된 자격 증명을 제거할 수 있고, 운영체제가 지원하는 경우 앱 저장소를 지워 로컬 데이터를 제거할 수 있습니다. 플랫폼 백업, 기기 복원, 보안 저장소 동작은 운영체제가 제어할 수 있습니다."] },
          { heading: "웹사이트 언어 선택", paragraphs: ["공개 웹사이트에는 언어 선택기가 있습니다. 언어를 선택하지 않은 경우 사이트는 웹 요청의 국가에서 파생한 대략적인 언어 제안을 Chuchotage의 퍼스트파티 endpoint에 요청할 수 있습니다. 이 endpoint는 국가 코드와 제안 언어만 반환하며 분석 SDK를 사용하지 않고 사용자의 IP 주소를 브라우저에 반환하지 않습니다. 수동 언어 선택은 브라우저의 로컬 저장소에 저장되며 자동 감지보다 우선합니다."] },
          { heading: "공유 및 처리자", paragraphs: [{ html: "Chuchotage는 개인정보를 판매하지 않고, 광고를 표시하지 않으며, 분석 SDK를 사용하지 않습니다. 일반 API key 또는 ChatGPT 번역 중에는 선택한 오디오 소스와 번역 설정이 실시간 번역을 수행하기 위해 기기에서 OpenAI로 직접 전송됩니다. OpenAI는 API로 전송된 데이터를 자체 <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">API 데이터 제어</a> 및 보존 설정에 따라 처리합니다. 스폰서 체험 번역을 사용하는 경우 Chuchotage는 짧은 수명의 번역 client secret을 만들기 위해 임의 설치 식별자, IP에서 파생된 요청 메타데이터, 선택한 출력 언어, 소스 전사 활성화 여부를 받습니다. 이는 세션 설정이지 전사 텍스트가 아니며, Chuchotage는 소스 전사 내용을 받지 않습니다. 오디오는 Chuchotage 오디오 서버를 거치지 않고 앱에서 OpenAI로 전송됩니다. ChatGPT로 로그인한 경우 설정 화면이 Codex 사용량 또는 크레딧 상태를 표시하기 위해 OpenAI에 연결할 수도 있습니다." }] },
          { heading: "권한", paragraphs: ["플랫폼과 선택한 경로에 따라 앱은 번역을 위한 마이크/오디오 캡처 접근, 진행 중인 번역 상태를 위한 알림 접근, 헤드셋 마이크 또는 오디오 출력 라우팅에 필요한 Bluetooth 관련 접근, Android 기기 오디오를 선택할 때 Android 화면/오디오 캡처 승인, Mac 재생 오디오를 선택할 때 macOS 시스템 오디오 녹음 권한, OpenAI 서비스 연결을 위한 인터넷 접근을 요청할 수 있습니다. 향후 iOS/iPadOS 동일 기기 앱 오디오 모드는 출시 전 별도의 ReplayKit 화면 방송 흐름과 개인정보 검토가 필요합니다."] },
          { heading: "보존", paragraphs: ["개발자는 Chuchotage 서버를 통해 사용자의 선택한 소스 오디오, 번역 오디오, 실시간 전사 또는 자격 증명을 받거나 저장하지 않습니다. 스폰서 체험 요청 메타데이터는 서버의 짧은 수명 사용 제한 메모리에만 보관됩니다. 앱이 관리하는 로컬 데이터는 사용자가 앱 또는 운영체제 설정에서 지우거나, 저장된 자격 증명을 교체하거나, 플랫폼 제어를 통해 제거할 때까지 기기에 남아 있습니다. 일부 플랫폼 관리 백업 또는 보안 저장소 기록은 운영체제의 동작을 따를 수 있습니다."] },
          { heading: "아동", paragraphs: ["Chuchotage는 13세 미만 아동을 대상으로 하지 않습니다."] },
          { heading: "연락처", paragraphs: [{ html: "이 방침에 관한 질문은 <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>로 보낼 수 있습니다." }] },
        ],
      },
      blog: {
        eyebrow: "Chuchotage 노트",
        title: "조용한 번역 앱에서 온 작은 노트.",
        lede: "Chuchotage의 공식 저널: 이름, 제품 선택, 개인용 실시간 음성 번역의 형태.",
        listLabel: "Chuchotage 노트",
        noteDate: "2026년 5월 9일",
        noteTitle: "Chuchotage라는 이름의 이유",
        noteSummary: "앱 이름은 일반적인 번역기 이름보다 제품에 더 잘 맞는 조용한 실시간 번역 방식인 속삭임 통역에서 왔습니다.",
      },
      story: {
        eyebrow: "Chuchotage의 의미",
        title: "Chuchotage라는 이름의 이유",
        lede: "이름은 속삭임 통역에서 왔습니다. 한 명의 청자를 위한 실시간 번역, 도움이 될 만큼 가깝고 방을 차지하지 않을 만큼 조용한 번역입니다.",
        sections: [
          { paragraphs: ["Chuchotage를 검색해 이 페이지를 찾았다면, 여기는 Chuchotage 앱의 공식 사이트입니다. 언어를 넘어 듣기 위한 개인용 실시간 음성 번역 앱입니다."] },
          { heading: "그 단어", paragraphs: ["Chuchotage는 통역 분야에서 속삭임 통역을 뜻하는 프랑스어입니다. 부스에서 말하거나 전체 청중에게 말하는 대신, 통역사가 한 청자 가까이에 앉아 말해지는 내용을 낮은 목소리로 번역합니다.", "그 이미지가 제품 설명의 전부입니다. Chuchotage는 가깝고 유용하며 의도적으로 작게 느껴져야 합니다. 방송 시스템도, 회의 플랫폼도 아닌, 한 사람이 내용을 따라가도록 돕는 번역 동반자입니다."] },
          { heading: "앱", paragraphs: ["앱은 그 형태를 유지합니다. Chuchotage를 열고, 출력 언어를 고르고, 플랫폼이 지원하는 곳에서 오디오 소스를 선택한 뒤 번역을 시작합니다. 원어 감지는 자동입니다. 주요 화면은 단순하게 유지됩니다. 할 일은 듣고, 번역하고, 멈추는 것이기 때문입니다."], list: ["Chuchotage는 번역 세션이 활성화된 동안에만 선택한 오디오 소스를 사용합니다.", "자격 증명은 플랫폼 보안 저장소를 통해 기기에 저장됩니다.", "실시간 오디오는 활성 사용 중 OpenAI로 전송되며 Chuchotage 오디오 서버를 거치지 않습니다."] },
          { heading: "약속", paragraphs: ["많은 번역 소프트웨어는 관제실처럼 느껴집니다. Chuchotage는 그 반대의 느낌, 필요한 순간에 도착하는 조용한 의미의 속삭임에서 이름을 얻었습니다.", "그래서 이 이름이 남았습니다. Chuchotage는 검색할 수 있을 만큼 독특하고, 기억할 만큼 구체적이며, 앱의 목적에 솔직합니다. 광고, 분석, Chuchotage 오디오 서버 없는 개인용 실시간 음성 번역입니다."] },
        ],
        returnLink: "Chuchotage 홈으로 돌아가기",
      },
    },
    hi: {
      shared: {
        language: { label: "भाषा", aria: "वेबसाइट भाषा" },
        nav: { home: "होम", how: "कैसे काम करता है", languages: "भाषाएं", story: "कहानी", privacy: "गोपनीयता", contact: "संपर्क" },
        footer: { notes: "नोट्स", privacy: "गोपनीयता नीति" },
      },
      meta: {
        home: {
          title: "Chuchotage | रियलटाइम स्पीच ट्रांसलेशन ऐप",
          description: "Chuchotage एक निजी रियलटाइम स्पीच ट्रांसलेशन ऐप है, जो फुसफुसाकर की जाने वाली इंटरप्रेटिंग से प्रेरित है और शांत सुनने के लिए बनाया गया है।",
          ogTitle: "Chuchotage | रियलटाइम स्पीच ट्रांसलेशन ऐप",
          ogDescription: "फुसफुसाकर की जाने वाली इंटरप्रेटिंग से प्रेरित एक शांत निजी रियलटाइम स्पीच ट्रांसलेशन ऐप।",
        },
        privacy: {
          title: "गोपनीयता नीति | Chuchotage",
          description: "Chuchotage की गोपनीयता नीति, जो रियलटाइम स्पीच ट्रांसलेशन और फुसफुसाहट जैसे सुनने के उपयोग के लिए निजी ऐप है।",
          ogTitle: "गोपनीयता नीति | Chuchotage",
          ogDescription: "Chuchotage चुने गए ऑडियो, क्रेडेंशियल, लोकल स्टोरेज और रियलटाइम ट्रांसलेशन अनुरोधों को कैसे संभालता है।",
        },
        blog: {
          title: "Chuchotage नोट्स | रियलटाइम ट्रांसलेशन जर्नल",
          description: "Chuchotage से नोट्स, वह रियलटाइम स्पीच ट्रांसलेशन ऐप जिसका नाम फुसफुसाकर की जाने वाली इंटरप्रेटिंग पर है।",
          ogTitle: "Chuchotage नोट्स",
          ogDescription: "Chuchotage के नाम, उत्पाद आकार और निजी रियलटाइम ट्रांसलेशन विचारों पर छोटे नोट्स।",
        },
        story: {
          title: "इसे Chuchotage क्यों कहा जाता है | Chuchotage",
          description: "Chuchotage का नाम फुसफुसाकर की जाने वाली इंटरप्रेटिंग से आता है: एक शांत लाइव अनुवाद अभ्यास जिसने ऐप को प्रेरित किया।",
          ogTitle: "इसे Chuchotage क्यों कहा जाता है",
          ogDescription: "Chuchotage का अर्थ, फुसफुसाकर की जाने वाली इंटरप्रेटिंग से प्रेरित रियलटाइम स्पीच ट्रांसलेशन ऐप।",
        },
      },
      home: {
        hero: {
          eyebrow: "रियलटाइम स्पीच ट्रांसलेशन",
          lede: "भाषाओं के पार सुनने के लिए एक शांत निजी अनुवाद नियंत्रण।",
          primary: "कैसे काम करता है",
          secondary: "संपर्क",
          availability: "Android और Apple बिल्ड ऐप स्टोर रोलआउट की तैयारी में हैं। निजी सुनकर अनुवाद के लिए बनाया गया।",
          ready: "तैयार",
          button: "अनुवाद शुरू करें",
        },
        workflow: {
          eyebrow: "कैसे काम करता है",
          title: "पास में बोला जाए। आप अनुवाद सुनें।",
          steps: [
            "ChatGPT से साइन इन करें या अपनी OpenAI API key जोड़ें। Chuchotage इसे अनुवाद के लिए इस्तेमाल करता है, आपकी चैट पढ़ने के लिए नहीं।",
            "वह भाषा चुनें जिसे आप सुनना चाहते हैं और वह माइक्रोफोन चुनें जिसे आप पसंद करते हैं।",
            "अनुवाद शुरू करें। Chuchotage स्रोत भाषा पहचानता है और डिवाइस पर अनुवादित ऑडियो चलाता है।",
          ],
        },
        languages: {
          eyebrow: "भाषाएं",
          title: "जो आप सुनते हैं उसे अपने आप पहचानें। जो वापस सुनना है उसे चुनें।",
          intro: "Chuchotage स्रोत भाषा को अपने आप पहचानता है, फिर आपके चुने हुए आउटपुट भाषा में अनुवादित ऑडियो चलाता है।",
          outputTitle: "आउटपुट भाषाएं",
          outputBody: "अनुवादित ऑडियो के लिए चुनी जा सकने वाली भाषाएं।",
          inputTitle: "इनपुट भाषाएं",
          inputBody: "लाइव speech से 65 स्रोत भाषाएं अपने आप पहचानी जाती हैं, बिना स्रोत-भाषा picker के।",
        },
        use: {
          eyebrow: "रोजमर्रा की सुनवाई",
          title: "जब आपको एक शांत भाषा पुल चाहिए।",
          items: [
            "पास की बात या व्याख्या को समझना।",
            "यात्रा की बातचीत का सार पकड़ना।",
            "कमरा शोर वाला हो तो headset mic इस्तेमाल करना।",
            "निजी अनुवाद को सरल और जहां संभव हो device-local रखना।",
          ],
        },
        story: {
          eyebrow: "Chuchotage का अर्थ",
          title: "फुसफुसाकर की जाने वाली इंटरप्रेटिंग, एक शांत नियंत्रण के रूप में फिर से सोची गई।",
          body: "इंटरप्रेटिंग में chuchotage एक शांत तरीका है: अनुवाद धीरे से उस श्रोता के लिए कहा जाता है जिसे इसकी जरूरत है। ऐप रोजमर्रा के रियलटाइम स्पीच ट्रांसलेशन के लिए इसी विचार को अपनाता है।",
          link: "नाम की छोटी कहानी पढ़ें",
        },
        detail: {
          eyebrow: "गोपनीयता का रूप",
          title: "कोई विज्ञापन नहीं, कोई analytics SDK नहीं, कोई Chuchotage ऑडियो सर्वर नहीं।",
          items: [
            "क्रेडेंशियल और पसंदें platform secure storage के साथ local रूप से रखी जाती हैं।",
            "API key और ChatGPT अनुवाद आपके डिवाइस से OpenAI से जुड़ते हैं।",
            "Sponsored trial छोटे Chuchotage endpoint का इस्तेमाल short-lived token के लिए करता है, ऑडियो के लिए नहीं।",
          ],
        },
        limits: {
          eyebrow: "महत्वपूर्ण सीमाएं",
          title: "निजी सहायता, certified interpreter नहीं।",
          body: "रियलटाइम machine translation nuance, नाम, tone या context चूक सकता है। Chuchotage emergency, legal, medical या अन्य high-stakes interpreting के लिए नहीं है।",
        },
        faq: {
          eyebrow: "FAQ",
          title: "इंस्टॉल करने से पहले साफ जवाब।",
          items: [
            ["क्या Chuchotage offline काम करता है?", "नहीं। active translation को OpenAI Realtime Translation तक पहुंचने के लिए internet connection चाहिए।"],
            ["क्या OpenAI credential चाहिए?", "हां। आप free account सहित ChatGPT से sign in कर सकते हैं, या अपनी OpenAI API key इस्तेमाल कर सकते हैं। Chuchotage login को आपके device पर रखता है और आपकी ChatGPT chats नहीं देख सकता।"],
            ["क्या Chuchotage audio record करता है?", "ऐप selected audio source को केवल translation active होने पर capture करता है। Microphone के लिए platform permission चाहिए, Android device audio के लिए Android का capture approval चाहिए उन apps के लिए जिन्हें Android अनुमति देता है, और future iOS/iPadOS device-audio mode के लिए अलग ReplayKit plan चाहिए होगा। Developer आपका audio Chuchotage audio server के जरिए receive या store नहीं करता।"],
            ["क्या मैं audio source चुन सकता हूं?", "हां, जहां platform support करता है। Mobile builds microphone input पर केंद्रित हैं; Android playback capture support होने पर device audio भी देता है। उसी iOS/iPadOS device पर app audio केवल planned ReplayKit feature के रूप में संभव है और current mobile build का हिस्सा नहीं है।"],
          ],
        },
        cta: { eyebrow: "ऐप स्टोर रोलआउट", title: "Chuchotage stores के लिए तैयार हो रहा है।", action: "संपर्क" },
      },
      privacy: {
        updated: "अंतिम अपडेट: 25 मई 2026",
        title: "गोपनीयता नीति",
        intro: "Chuchotage supported platforms पर निजी रियलटाइम स्पीच ट्रांसलेशन ऐप है, जिसमें Android और Apple platform builds शामिल हैं। यह policy बताती है कि ऐप क्या संभालता है, क्यों संभालता है, और वह जानकारी कहां जाती है।",
        sections: [
          { heading: "ऐप जो जानकारी संभालता है", paragraphs: ["जब आप Chuchotage इस्तेमाल करते हैं, ऐप selected audio source, translated audio, live transcript text, selected output language, audio-source और output-route preferences, और आपका चुना हुआ OpenAI credential या trial mode संभाल सकता है। selected audio source microphone audio, Android device playback audio जिसे Android app को capture करने देता है, या supported desktop builds पर desktop playback audio हो सकता है। credential OpenAI API key, जहां supported हो ChatGPT/Codex-style tokens, या sponsored trial installation identifier हो सकता है।"] },
          { heading: "जानकारी कैसे इस्तेमाल होती है", paragraphs: ["selected audio source translation session शुरू करने के बाद realtime translation देने के लिए इस्तेमाल होता है। live transcript text current-session UI के रूप में दिखाया जाता है और transcript history के रूप में save नहीं होता। selected output language translated audio language मांगने के लिए इस्तेमाल होती है। credentials translation requests authenticate करने के लिए इस्तेमाल होते हैं और, जहां ChatGPT sign-in supported है, OpenAI से Codex usage या credit status पढ़ने के लिए। अगर आप sponsored trial translation इस्तेमाल करते हैं, ऐप Chuchotage endpoint से short-lived OpenAI Realtime Translation client secret मांगता है।"] },
          { heading: "स्थानीय संग्रहण", paragraphs: ["Credentials device पर platform secure storage से store होते हैं, जैसे Android Keystore backed Android secure storage या Apple platforms पर Apple Keychain। Sponsored trial mode rate limiting के लिए device पर random installation identifier store करता है; यह OpenAI credential नहीं है। Output language, audio-source और output-route preferences भी device पर store होते हैं। आप app settings से app-managed saved credentials हटा सकते हैं, और जहां operating system support करता है वहां app storage clear करके local data हटा सकते हैं। Platform backups, device restore features और secure-storage behavior आपके operating system से controlled हो सकते हैं।"] },
          { heading: "वेबसाइट भाषा चयन", paragraphs: ["Public website में language selector है। अगर आपने भाषा नहीं चुनी है, site web request के country से निकला coarse language suggestion first-party Chuchotage endpoint से मांग सकती है। endpoint केवल country code और suggested language लौटाता है, analytics SDK इस्तेमाल नहीं करता, और आपका IP address browser को वापस नहीं देता। Manual language choice browser local storage में save होती है और automatic detection को override करती है।"] },
          { heading: "साझा करना और प्रोसेसर", paragraphs: [{ html: "Chuchotage personal information नहीं बेचता, ads नहीं दिखाता, और analytics SDKs इस्तेमाल नहीं करता। Normal API-key या ChatGPT translation के दौरान selected audio source और translation configuration realtime translation करने के लिए device से सीधे OpenAI को भेजे जाते हैं। OpenAI API को भेजे गए data को अपनी <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">API data controls</a> और retention settings के तहत संभालता है। अगर आप sponsored trial translation इस्तेमाल करते हैं, Chuchotage short-lived translation client secret बनाने के लिए random installation identifier, IP-derived request metadata, selected output language, और source transcripts enabled हैं या नहीं, यह प्राप्त करता है; यह session setting है, transcript text नहीं, और Chuchotage source transcript content प्राप्त नहीं करता। Audio फिर भी app से OpenAI को stream होता है, Chuchotage audio server से नहीं। ChatGPT से signed in होने पर settings screen Codex usage या credit status दिखाने के लिए OpenAI से भी संपर्क कर सकती है." }] },
          { heading: "अनुमतियां", paragraphs: ["Platform और चुने गए route के आधार पर app translation के लिए microphone/audio capture access, ongoing translation status के लिए notification access, headset microphones या audio output routing के लिए जरूरत पड़ने पर Bluetooth-related access, Android device audio चुनने पर Android screen/audio capture approval, Mac playback audio चुनने पर macOS system audio recording permission, और OpenAI services तक पहुंचने के लिए internet access मांग सकता है। Future iOS/iPadOS same-device app-audio mode को release से पहले अलग ReplayKit screen-broadcast flow और privacy review चाहिए होगा।"] },
          { heading: "संग्रह अवधि", paragraphs: ["Developer आपका selected source audio, translated audio, live transcripts या credentials किसी Chuchotage server के जरिए receive या store नहीं करता। Sponsored trial request metadata server पर केवल short-lived rate-limit memory में रखा जाता है। App-managed local data आपके device पर रहता है जब तक आप उसे app या operating system settings में clear नहीं करते, saved credential replace नहीं करते, या platform controls से remove नहीं करते। कुछ platform-managed backups या secure-storage records आपके operating system के behavior का पालन कर सकते हैं।"] },
          { heading: "बच्चे", paragraphs: ["Chuchotage 13 साल से कम उम्र के बच्चों के लिए निर्देशित नहीं है।"] },
          { heading: "संपर्क", paragraphs: [{ html: "इस policy पर सवाल <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a> पर भेजे जा सकते हैं।" }] },
        ],
      },
      blog: {
        eyebrow: "Chuchotage नोट्स",
        title: "एक शांत translation app से छोटे नोट्स।",
        lede: "Chuchotage का official journal: नाम, product choices और personal realtime speech translation का आकार।",
        listLabel: "Chuchotage नोट्स",
        noteDate: "9 मई 2026",
        noteTitle: "इसे Chuchotage क्यों कहा जाता है",
        noteSummary: "ऐप का नाम whispered interpreting से आता है, एक शांत live translation practice जो generic translator name से बेहतर product को fit करती है।",
      },
      story: {
        eyebrow: "Chuchotage का अर्थ",
        title: "इसे Chuchotage क्यों कहा जाता है",
        lede: "नाम whispered interpreting से आता है: एक listener के लिए live translation, मदद करने के लिए काफी पास और room पर हावी न होने के लिए काफी शांत।",
        sections: [
          { paragraphs: ["अगर आप Chuchotage खोजकर इस page पर आए हैं, यह Chuchotage app की official site है: भाषाओं के पार सुनने के लिए personal realtime speech translation app।"] },
          { heading: "शब्द", paragraphs: ["Chuchotage interpreting circles में whispered interpreting के लिए इस्तेमाल होने वाला French word है। booth में बोलने या पूरे audience को संबोधित करने के बजाय, interpreter listener के पास बैठता है और जो कहा जा रहा है उसे धीरे से translate करता है।", "यही image पूरा product brief है। Chuchotage को करीब, useful और जानबूझकर छोटा महसूस होना चाहिए: broadcast system नहीं, meeting platform नहीं, बस translation companion जो एक व्यक्ति को साथ बने रहने में मदद करे।"] },
          { heading: "ऐप", paragraphs: ["ऐप वही आकार रखता है। Chuchotage खोलें, output language चुनें, platform जहां support करता है वहां audio source चुनें, और translation शुरू करें। Source language detection automatic है। Main screen sparse रहती है क्योंकि काम simple है: सुनना, translate करना, रोकना।"], list: ["Chuchotage selected audio source को केवल active translation session के दौरान इस्तेमाल करता है।", "Credentials device पर platform secure storage के जरिए store होते हैं।", "Realtime audio active use के दौरान OpenAI को भेजा जाता है, Chuchotage audio server से नहीं।"] },
          { heading: "वादा", paragraphs: ["बहुत सा translation software control room जैसा लगता है। Chuchotage का नाम उलटी भावना से है: meaning की शांत whisper जो सही moment पर आती है।", "इसीलिए नाम रहा। Chuchotage इतना unusual है कि search हो सके, इतना specific है कि याद रहे, और ऐप के purpose के बारे में honest है: ads, analytics या Chuchotage audio server के बिना personal realtime speech translation।"] },
        ],
        returnLink: "Chuchotage home page पर लौटें",
      },
    },
    id: {
      shared: {
        language: { label: "Bahasa", aria: "Bahasa situs web" },
        nav: { home: "Beranda", how: "Cara kerja", languages: "Bahasa", story: "Cerita", privacy: "Privasi", contact: "Kontak" },
        footer: { notes: "Catatan", privacy: "Kebijakan privasi" },
      },
      meta: {
        home: {
          title: "Chuchotage | Aplikasi Terjemahan Ucapan Real-Time",
          description: "Chuchotage adalah aplikasi pribadi untuk terjemahan ucapan real-time, terinspirasi dari interpretasi berbisik dan dibuat untuk mendengarkan terjemahan secara tenang.",
          ogTitle: "Chuchotage | Aplikasi Terjemahan Ucapan Real-Time",
          ogDescription: "Aplikasi pribadi yang tenang untuk terjemahan ucapan real-time, terinspirasi dari interpretasi berbisik.",
        },
        privacy: {
          title: "Kebijakan Privasi | Chuchotage",
          description: "Kebijakan privasi untuk Chuchotage, aplikasi pribadi untuk terjemahan ucapan real-time dan mendengarkan seperti interpretasi berbisik.",
          ogTitle: "Kebijakan Privasi | Chuchotage",
          ogDescription: "Bagaimana Chuchotage menangani audio yang dipilih, kredensial, penyimpanan lokal, dan permintaan terjemahan real-time.",
        },
        blog: {
          title: "Catatan Chuchotage | Jurnal Terjemahan Real-Time",
          description: "Catatan dari Chuchotage, aplikasi terjemahan ucapan real-time yang dinamai dari interpretasi berbisik.",
          ogTitle: "Catatan Chuchotage",
          ogDescription: "Catatan singkat tentang nama, bentuk produk, dan ide terjemahan pribadi real-time di balik Chuchotage.",
        },
        story: {
          title: "Mengapa Namanya Chuchotage | Chuchotage",
          description: "Chuchotage dinamai dari interpretasi berbisik: praktik terjemahan langsung yang tenang dan menginspirasi aplikasi ini.",
          ogTitle: "Mengapa Namanya Chuchotage",
          ogDescription: "Makna Chuchotage, aplikasi terjemahan ucapan real-time yang terinspirasi dari interpretasi berbisik.",
        },
      },
      home: {
        hero: {
          eyebrow: "Terjemahan ucapan real-time",
          lede: "Kontrol terjemahan pribadi yang tenang untuk mendengarkan lintas bahasa.",
          primary: "Cara kerja",
          secondary: "Kontak",
          availability: "Build Android dan Apple sedang disiapkan untuk peluncuran app store. Dibuat untuk terjemahan pribadi sambil mendengarkan.",
          ready: "Siap",
          button: "Mulai terjemahan",
        },
        workflow: {
          eyebrow: "Cara kerja",
          title: "Ada yang bicara di dekat Anda. Dengarkan terjemahannya.",
          steps: [
            "Masuk dengan ChatGPT atau tambahkan OpenAI API key milik Anda. Chuchotage menggunakannya untuk menerjemahkan, bukan untuk membaca chat Anda.",
            "Pilih bahasa yang ingin Anda dengar dan mikrofon yang Anda sukai.",
            "Mulai terjemahan. Chuchotage mendeteksi bahasa sumber dan memutar audio terjemahan di perangkat.",
          ],
        },
        languages: {
          eyebrow: "Bahasa",
          title: "Deteksi otomatis apa yang Anda dengar. Pilih bahasa yang ingin Anda dengar kembali.",
          intro: "Chuchotage mendeteksi bahasa sumber secara otomatis, lalu memutar audio terjemahan dalam bahasa output yang Anda pilih.",
          outputTitle: "Bahasa output",
          outputBody: "Bahasa audio terjemahan yang dapat dipilih.",
          inputTitle: "Bahasa input",
          inputBody: "65 bahasa sumber dideteksi otomatis dari ucapan langsung, tanpa pemilih bahasa sumber.",
        },
        use: {
          eyebrow: "Mendengarkan sehari-hari",
          title: "Untuk saat ketika Anda butuh jembatan bahasa yang tenang.",
          items: [
            "Mengikuti pembicaraan atau penjelasan di sekitar.",
            "Memahami inti percakapan saat bepergian.",
            "Menggunakan mikrofon headset saat ruangan berisik.",
            "Menjaga terjemahan pribadi tetap sederhana dan lokal ke perangkat bila memungkinkan.",
          ],
        },
        story: {
          eyebrow: "Makna Chuchotage",
          title: "Interpretasi berbisik, dibayangkan ulang sebagai satu kontrol yang tenang.",
          body: "Dalam interpretasi, chuchotage adalah mode yang tenang: terjemahan diucapkan pelan untuk pendengar yang membutuhkannya. Aplikasi ini meminjam ide itu untuk terjemahan ucapan real-time sehari-hari.",
          link: "Baca catatan singkat asal nama",
        },
        detail: {
          eyebrow: "Bentuk privasi",
          title: "Tanpa iklan, tanpa analytics SDK, tanpa server audio Chuchotage.",
          items: [
            "Kredensial dan preferensi disimpan lokal dengan penyimpanan aman platform.",
            "Terjemahan dengan API key atau ChatGPT menghubungkan perangkat Anda ke OpenAI.",
            "Trial bersponsor menggunakan endpoint kecil Chuchotage untuk token singkat, bukan untuk audio.",
          ],
        },
        limits: {
          eyebrow: "Batas penting",
          title: "Dukungan pribadi, bukan interpreter bersertifikat.",
          body: "Terjemahan mesin real-time dapat melewatkan nuansa, nama, nada, atau konteks. Chuchotage tidak ditujukan untuk keadaan darurat, hukum, medis, atau interpretasi berisiko tinggi lainnya.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Jawaban sederhana sebelum memasang.",
          items: [
            ["Apakah Chuchotage bekerja offline?", "Tidak. Terjemahan aktif membutuhkan koneksi internet untuk menjangkau OpenAI Realtime Translation."],
            ["Apakah saya perlu kredensial OpenAI?", "Ya. Anda dapat masuk dengan ChatGPT, termasuk akun gratis, atau menggunakan OpenAI API key milik Anda. Chuchotage menyimpan login di perangkat Anda dan tidak dapat melihat chat ChatGPT Anda."],
            ["Apakah Chuchotage merekam audio?", "Aplikasi menangkap sumber audio yang dipilih hanya saat terjemahan aktif. Mikrofon membutuhkan izin platform, audio perangkat Android membutuhkan persetujuan capture Android untuk aplikasi yang diizinkan Android, dan mode audio perangkat iOS/iPadOS di masa depan membutuhkan rencana ReplayKit terpisah. Pengembang tidak menerima atau menyimpan audio Anda melalui server audio Chuchotage."],
            ["Bisakah saya memilih sumber audio?", "Ya, jika platform mendukungnya. Build mobile berfokus pada input mikrofon; Android juga menawarkan audio perangkat jika capture pemutaran didukung. Audio aplikasi di perangkat iOS/iPadOS yang sama hanya mungkin sebagai fitur ReplayKit yang direncanakan dan bukan bagian dari build mobile saat ini."],
          ],
        },
        cta: { eyebrow: "Peluncuran app store", title: "Chuchotage sedang bersiap untuk store.", action: "Kontak" },
      },
      privacy: {
        updated: "Terakhir diperbarui 25 Mei 2026",
        title: "Kebijakan Privasi",
        intro: "Chuchotage adalah aplikasi pribadi untuk terjemahan ucapan real-time di platform yang didukung, termasuk build Android dan Apple. Kebijakan ini menjelaskan apa yang ditangani aplikasi, mengapa aplikasi menanganinya, dan ke mana informasi itu pergi.",
        sections: [
          { heading: "Informasi yang ditangani aplikasi", paragraphs: ["Saat Anda menggunakan Chuchotage, aplikasi dapat menangani sumber audio yang dipilih, audio terjemahan, teks transkrip live, bahasa output yang dipilih, preferensi sumber audio dan rute output, serta kredensial OpenAI atau mode trial yang Anda pilih. Sumber audio yang dipilih dapat berupa audio mikrofon, audio pemutaran perangkat Android yang diizinkan Android untuk ditangkap aplikasi, atau audio pemutaran desktop pada build desktop yang didukung. Kredensial dapat berupa OpenAI API key, token bergaya ChatGPT/Codex jika didukung, atau pengenal instalasi trial bersponsor."] },
          { heading: "Bagaimana informasi digunakan", paragraphs: ["Sumber audio yang dipilih digunakan untuk menyediakan terjemahan real-time setelah Anda memulai sesi terjemahan. Teks transkrip live ditampilkan sebagai UI sesi saat ini dan tidak disimpan sebagai riwayat transkrip. Bahasa output yang dipilih digunakan untuk meminta bahasa audio terjemahan. Kredensial digunakan untuk mengautentikasi permintaan terjemahan dan, untuk masuk ChatGPT jika didukung, membaca status penggunaan atau kredit Codex dari OpenAI. Jika Anda menggunakan terjemahan trial bersponsor, aplikasi meminta client secret OpenAI Realtime Translation yang singkat dari endpoint Chuchotage."] },
          { heading: "Penyimpanan lokal", paragraphs: ["Kredensial disimpan di perangkat menggunakan penyimpanan aman platform, seperti penyimpanan aman Android yang didukung Android Keystore atau Apple Keychain di platform Apple. Mode trial bersponsor menyimpan pengenal instalasi acak di perangkat untuk pembatasan penggunaan; itu bukan kredensial OpenAI. Bahasa output, sumber audio, dan preferensi rute output juga disimpan di perangkat. Anda dapat menghapus kredensial tersimpan yang dikelola aplikasi dari pengaturan aplikasi, dan menghapus data lokal dengan membersihkan penyimpanan aplikasi jika sistem operasi mendukungnya. Backup platform, pemulihan perangkat, dan perilaku penyimpanan aman dapat dikendalikan oleh sistem operasi Anda."] },
          { heading: "Pemilihan bahasa situs web", paragraphs: ["Situs publik memiliki pemilih bahasa. Jika Anda belum memilih bahasa, situs dapat meminta saran bahasa kasar dari endpoint pihak pertama Chuchotage berdasarkan negara permintaan web. Endpoint hanya mengembalikan kode negara dan bahasa yang disarankan, tidak menggunakan analytics SDK, dan tidak mengembalikan alamat IP Anda ke browser. Pilihan bahasa manual disimpan di penyimpanan lokal browser dan menggantikan deteksi otomatis."] },
          { heading: "Berbagi dan pemroses", paragraphs: [{ html: "Chuchotage tidak menjual informasi pribadi, tidak menampilkan iklan, dan tidak menggunakan analytics SDK. Selama terjemahan normal dengan API key atau ChatGPT, sumber audio yang dipilih dan konfigurasi terjemahan dikirim langsung dari perangkat ke OpenAI untuk melakukan terjemahan real-time. OpenAI menangani data yang dikirim ke API-nya sesuai <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">kontrol data API</a> dan pengaturan retensinya sendiri. Jika Anda menggunakan terjemahan trial bersponsor, Chuchotage menerima pengenal instalasi acak, metadata permintaan turunan IP, bahasa output yang dipilih, dan apakah transkrip sumber diaktifkan untuk membuat client secret terjemahan singkat; ini adalah pengaturan sesi, bukan teks transkrip, dan Chuchotage tidak menerima konten transkrip sumber. Audio tetap mengalir dari aplikasi ke OpenAI, bukan melalui server audio Chuchotage. Saat Anda masuk dengan ChatGPT, layar pengaturan juga dapat menghubungi OpenAI untuk menampilkan penggunaan atau kredit Codex." }] },
          { heading: "Izin", paragraphs: ["Tergantung platform dan rute yang dipilih, aplikasi dapat meminta akses mikrofon/capture audio untuk terjemahan, akses notifikasi untuk status terjemahan berjalan, akses terkait Bluetooth jika diperlukan untuk mikrofon headset atau routing output audio, persetujuan capture layar/audio Android saat Anda memilih audio perangkat Android, izin perekaman audio sistem macOS saat Anda memilih audio pemutaran Mac, dan akses internet untuk menjangkau layanan OpenAI. Mode audio aplikasi di perangkat iOS/iPadOS yang sama di masa depan akan membutuhkan alur screen broadcast ReplayKit terpisah dan peninjauan privasi sebelum rilis."] },
          { heading: "Retensi", paragraphs: ["Pengembang tidak menerima atau menyimpan sumber audio yang Anda pilih, audio terjemahan, transkrip live, atau kredensial melalui server Chuchotage. Metadata permintaan trial bersponsor disimpan hanya dalam memori pembatasan penggunaan yang singkat di server. Data lokal yang dikelola aplikasi tetap berada di perangkat sampai Anda menghapusnya di aplikasi atau pengaturan sistem operasi, mengganti kredensial tersimpan, atau menghapusnya melalui kontrol platform. Beberapa backup atau catatan penyimpanan aman yang dikelola platform dapat mengikuti perilaku sistem operasi Anda."] },
          { heading: "Anak-anak", paragraphs: ["Chuchotage tidak ditujukan untuk anak-anak di bawah 13 tahun."] },
          { heading: "Kontak", paragraphs: [{ html: "Pertanyaan tentang kebijakan ini dapat dikirim ke <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: {
        eyebrow: "Catatan Chuchotage",
        title: "Catatan kecil dari aplikasi terjemahan yang tenang.",
        lede: "Jurnal resmi Chuchotage: nama, pilihan produk, dan bentuk terjemahan ucapan pribadi real-time.",
        listLabel: "Catatan Chuchotage",
        noteDate: "9 Mei 2026",
        noteTitle: "Mengapa namanya Chuchotage",
        noteSummary: "Nama aplikasi berasal dari interpretasi berbisik, praktik terjemahan langsung yang tenang dan lebih cocok dengan produk daripada nama penerjemah generik.",
      },
      story: {
        eyebrow: "Makna Chuchotage",
        title: "Mengapa namanya Chuchotage",
        lede: "Nama ini berasal dari interpretasi berbisik: terjemahan langsung untuk satu pendengar, cukup dekat untuk membantu dan cukup tenang untuk tidak menguasai ruangan.",
        sections: [
          { paragraphs: ["Jika Anda menemukan halaman ini dengan mencari Chuchotage, ini adalah situs resmi aplikasi Chuchotage: aplikasi pribadi untuk terjemahan ucapan real-time dan mendengarkan lintas bahasa."] },
          { heading: "Kata itu", paragraphs: ["Chuchotage adalah kata Prancis yang digunakan dalam dunia interpretasi untuk interpretasi berbisik. Alih-alih berbicara dari booth atau kepada seluruh audiens, interpreter duduk dekat seorang pendengar dan menerjemahkan apa yang dikatakan dengan pelan.", "Gambar itu adalah seluruh ringkasan produk. Chuchotage harus terasa dekat, berguna, dan sengaja kecil: bukan sistem siaran, bukan platform rapat, hanya pendamping terjemahan yang membantu satu orang mengikuti pembicaraan."] },
          { heading: "Aplikasi", paragraphs: ["Aplikasi mempertahankan bentuk itu. Buka Chuchotage, pilih bahasa output, pilih sumber audio jika platform mendukungnya, lalu mulai terjemahan. Deteksi bahasa sumber otomatis. Layar utama tetap sederhana karena tugasnya sederhana: dengar, terjemahkan, berhenti."], list: ["Chuchotage menggunakan sumber audio yang dipilih hanya saat sesi terjemahan aktif.", "Kredensial disimpan di perangkat melalui penyimpanan aman platform.", "Audio real-time dikirim ke OpenAI selama penggunaan aktif, bukan melalui server audio Chuchotage."] },
          { heading: "Janji", paragraphs: ["Banyak perangkat lunak terjemahan terasa seperti ruang kontrol. Chuchotage dinamai dari perasaan sebaliknya: bisikan makna yang tenang dan datang pada saat yang tepat.", "Itulah mengapa nama ini tetap dipakai. Chuchotage cukup tidak biasa untuk dicari, cukup spesifik untuk diingat, dan jujur tentang tujuan aplikasi: terjemahan ucapan pribadi real-time tanpa iklan, analytics, atau server audio Chuchotage."] },
        ],
        returnLink: "Kembali ke beranda Chuchotage",
      },
    },
    vi: {
      shared: {
        language: { label: "Ngôn ngữ", aria: "Ngôn ngữ trang web" },
        nav: { home: "Trang chủ", how: "Cách hoạt động", languages: "Ngôn ngữ", story: "Câu chuyện", privacy: "Quyền riêng tư", contact: "Liên hệ" },
        footer: { notes: "Ghi chú", privacy: "Chính sách quyền riêng tư" },
      },
      meta: {
        home: {
          title: "Chuchotage | Ứng dụng dịch giọng nói theo thời gian thực",
          description: "Chuchotage là ứng dụng cá nhân để dịch giọng nói theo thời gian thực, lấy cảm hứng từ phiên dịch thì thầm và được tạo ra để nghe bản dịch một cách kín đáo.",
          ogTitle: "Chuchotage | Ứng dụng dịch giọng nói theo thời gian thực",
          ogDescription: "Một ứng dụng cá nhân yên tĩnh để dịch giọng nói theo thời gian thực, lấy cảm hứng từ phiên dịch thì thầm.",
        },
        privacy: {
          title: "Chính sách quyền riêng tư | Chuchotage",
          description: "Chính sách quyền riêng tư của Chuchotage, ứng dụng cá nhân để dịch giọng nói theo thời gian thực và nghe theo kiểu phiên dịch thì thầm.",
          ogTitle: "Chính sách quyền riêng tư | Chuchotage",
          ogDescription: "Cách Chuchotage xử lý âm thanh đã chọn, thông tin xác thực, lưu trữ cục bộ và yêu cầu dịch theo thời gian thực.",
        },
        blog: {
          title: "Ghi chú Chuchotage | Nhật ký dịch thời gian thực",
          description: "Ghi chú từ Chuchotage, ứng dụng dịch giọng nói theo thời gian thực được đặt theo tên phiên dịch thì thầm.",
          ogTitle: "Ghi chú Chuchotage",
          ogDescription: "Ghi chú ngắn về tên gọi, hình dạng sản phẩm và ý tưởng dịch cá nhân theo thời gian thực phía sau Chuchotage.",
        },
        story: {
          title: "Vì sao gọi là Chuchotage | Chuchotage",
          description: "Chuchotage được đặt theo phiên dịch thì thầm: một thực hành dịch trực tiếp yên tĩnh đã truyền cảm hứng cho ứng dụng.",
          ogTitle: "Vì sao gọi là Chuchotage",
          ogDescription: "Ý nghĩa của Chuchotage, ứng dụng dịch giọng nói theo thời gian thực lấy cảm hứng từ phiên dịch thì thầm.",
        },
      },
      home: {
        hero: {
          eyebrow: "Dịch giọng nói theo thời gian thực",
          lede: "Một điều khiển dịch cá nhân yên tĩnh để lắng nghe qua các ngôn ngữ.",
          primary: "Cách hoạt động",
          secondary: "Liên hệ",
          availability: "Các bản Android và Apple đang chuẩn bị phát hành trên app store. Được xây dựng cho dịch cá nhân khi nghe.",
          ready: "Sẵn sàng",
          button: "Bắt đầu dịch",
        },
        workflow: {
          eyebrow: "Cách hoạt động",
          title: "Có người nói gần bạn. Bạn nghe bản dịch.",
          steps: [
            "Đăng nhập bằng ChatGPT hoặc thêm OpenAI API key của bạn. Chuchotage dùng nó để dịch, không phải để đọc các cuộc trò chuyện của bạn.",
            "Chọn ngôn ngữ bạn muốn nghe và micro bạn muốn dùng.",
            "Bắt đầu dịch. Chuchotage phát hiện ngôn ngữ nguồn và phát âm thanh đã dịch trên thiết bị.",
          ],
        },
        languages: {
          eyebrow: "Ngôn ngữ",
          title: "Tự động phát hiện điều bạn nghe. Chọn điều bạn muốn nghe lại.",
          intro: "Chuchotage tự động phát hiện ngôn ngữ nguồn, sau đó phát âm thanh đã dịch bằng ngôn ngữ đầu ra bạn chọn.",
          outputTitle: "Ngôn ngữ đầu ra",
          outputBody: "Các ngôn ngữ âm thanh đã dịch có thể chọn.",
          inputTitle: "Ngôn ngữ đầu vào",
          inputBody: "65 ngôn ngữ nguồn được tự động phát hiện từ lời nói trực tiếp, không cần bộ chọn ngôn ngữ nguồn.",
        },
        use: {
          eyebrow: "Lắng nghe hằng ngày",
          title: "Cho những lúc bạn muốn một cây cầu ngôn ngữ yên tĩnh.",
          items: [
            "Theo dõi một bài nói hoặc lời giải thích gần bạn.",
            "Nắm ý chính của một cuộc trò chuyện khi đi du lịch.",
            "Dùng micro tai nghe khi phòng ồn.",
            "Giữ dịch cá nhân đơn giản và cục bộ trên thiết bị khi có thể.",
          ],
        },
        story: {
          eyebrow: "Ý nghĩa của Chuchotage",
          title: "Phiên dịch thì thầm, được hình dung lại như một điều khiển yên tĩnh.",
          body: "Trong phiên dịch, chuchotage là một cách làm yên tĩnh: bản dịch được nói nhỏ cho người nghe cần nó. Ứng dụng mượn ý tưởng đó cho dịch giọng nói hằng ngày theo thời gian thực.",
          link: "Đọc ghi chú ngắn về nguồn gốc",
        },
        detail: {
          eyebrow: "Hình dạng quyền riêng tư",
          title: "Không quảng cáo, không analytics SDK, không máy chủ âm thanh Chuchotage.",
          items: [
            "Thông tin xác thực và tùy chọn được lưu cục bộ bằng lưu trữ an toàn của nền tảng.",
            "Dịch bằng API key hoặc ChatGPT kết nối thiết bị của bạn với OpenAI.",
            "Bản dùng thử được tài trợ dùng một endpoint nhỏ của Chuchotage để lấy token ngắn hạn, không dùng cho âm thanh.",
          ],
        },
        limits: {
          eyebrow: "Giới hạn quan trọng",
          title: "Hỗ trợ cá nhân, không phải phiên dịch viên được chứng nhận.",
          body: "Dịch máy theo thời gian thực có thể bỏ lỡ sắc thái, tên riêng, giọng điệu hoặc ngữ cảnh. Chuchotage không dành cho cấp cứu, pháp lý, y tế hoặc các tình huống phiên dịch rủi ro cao khác.",
        },
        faq: {
          eyebrow: "FAQ",
          title: "Câu trả lời rõ ràng trước khi cài đặt.",
          items: [
            ["Chuchotage có hoạt động offline không?", "Không. Dịch đang hoạt động cần kết nối internet để truy cập OpenAI Realtime Translation."],
            ["Tôi có cần thông tin xác thực OpenAI không?", "Có. Bạn có thể đăng nhập bằng ChatGPT, kể cả tài khoản miễn phí, hoặc dùng OpenAI API key của riêng bạn. Chuchotage giữ đăng nhập trên thiết bị của bạn và không thể xem các cuộc trò chuyện ChatGPT của bạn."],
            ["Chuchotage có ghi âm không?", "Ứng dụng chỉ thu nguồn âm thanh đã chọn khi dịch đang hoạt động. Micro cần quyền của nền tảng, âm thanh thiết bị Android cần phê duyệt capture của Android cho các ứng dụng được Android cho phép, và chế độ âm thanh thiết bị iOS/iPadOS trong tương lai sẽ cần kế hoạch ReplayKit riêng. Nhà phát triển không nhận hoặc lưu âm thanh của bạn qua máy chủ âm thanh Chuchotage."],
            ["Tôi có thể chọn nguồn âm thanh không?", "Có, ở nơi nền tảng hỗ trợ. Các bản mobile tập trung vào đầu vào micro; Android cũng cung cấp âm thanh thiết bị khi hỗ trợ capture phát lại. Âm thanh ứng dụng trên cùng thiết bị iOS/iPadOS chỉ có thể là một tính năng ReplayKit dự kiến và không thuộc bản mobile hiện tại."],
          ],
        },
        cta: { eyebrow: "Phát hành app store", title: "Chuchotage đang chuẩn bị lên store.", action: "Liên hệ" },
      },
      privacy: {
        updated: "Cập nhật lần cuối ngày 25 tháng 5 năm 2026",
        title: "Chính sách quyền riêng tư",
        intro: "Chuchotage là ứng dụng cá nhân để dịch giọng nói theo thời gian thực trên các nền tảng được hỗ trợ, bao gồm các bản Android và Apple. Chính sách này giải thích ứng dụng xử lý những gì, vì sao xử lý và thông tin đó đi đâu.",
        sections: [
          { heading: "Thông tin ứng dụng xử lý", paragraphs: ["Khi bạn dùng Chuchotage, ứng dụng có thể xử lý nguồn âm thanh đã chọn, âm thanh đã dịch, văn bản transcript trực tiếp, ngôn ngữ đầu ra đã chọn, tùy chọn nguồn âm thanh và tuyến đầu ra, cũng như thông tin xác thực OpenAI hoặc chế độ dùng thử bạn chọn. Nguồn âm thanh đã chọn có thể là âm thanh micro, âm thanh phát lại của thiết bị Android mà Android cho phép ứng dụng thu, hoặc âm thanh phát lại desktop trên các bản desktop được hỗ trợ. Thông tin xác thực có thể là OpenAI API key, token kiểu ChatGPT/Codex nếu được hỗ trợ, hoặc mã định danh cài đặt dùng thử được tài trợ."] },
          { heading: "Cách thông tin được sử dụng", paragraphs: ["Nguồn âm thanh đã chọn được dùng để cung cấp dịch theo thời gian thực sau khi bạn bắt đầu một phiên dịch. Văn bản transcript trực tiếp được hiển thị như giao diện của phiên hiện tại và không được lưu như lịch sử transcript. Ngôn ngữ đầu ra đã chọn được dùng để yêu cầu ngôn ngữ của âm thanh đã dịch. Thông tin xác thực được dùng để xác thực yêu cầu dịch và, với đăng nhập ChatGPT nếu được hỗ trợ, đọc trạng thái sử dụng hoặc tín dụng Codex từ OpenAI. Nếu bạn dùng dịch dùng thử được tài trợ, ứng dụng yêu cầu một OpenAI Realtime Translation client secret ngắn hạn từ endpoint Chuchotage."] },
          { heading: "Lưu trữ cục bộ", paragraphs: ["Thông tin xác thực được lưu trên thiết bị bằng lưu trữ an toàn của nền tảng, như lưu trữ an toàn Android dựa trên Android Keystore hoặc Apple Keychain trên các nền tảng Apple. Chế độ dùng thử được tài trợ lưu một mã định danh cài đặt ngẫu nhiên trên thiết bị để giới hạn tần suất; đó không phải là thông tin xác thực OpenAI. Ngôn ngữ đầu ra, nguồn âm thanh và tùy chọn tuyến đầu ra cũng được lưu trên thiết bị. Bạn có thể xóa thông tin xác thực đã lưu do ứng dụng quản lý trong cài đặt ứng dụng, và xóa dữ liệu cục bộ bằng cách xóa bộ nhớ ứng dụng ở nơi hệ điều hành hỗ trợ. Sao lưu nền tảng, khôi phục thiết bị và hành vi lưu trữ an toàn có thể do hệ điều hành của bạn kiểm soát."] },
          { heading: "Lựa chọn ngôn ngữ website", paragraphs: ["Website công khai có bộ chọn ngôn ngữ. Nếu bạn chưa chọn ngôn ngữ, site có thể hỏi một endpoint Chuchotage bên thứ nhất để lấy gợi ý ngôn ngữ thô dựa trên quốc gia của yêu cầu web. Endpoint chỉ trả về mã quốc gia và ngôn ngữ gợi ý, không dùng analytics SDK và không trả địa chỉ IP của bạn về trình duyệt. Lựa chọn ngôn ngữ thủ công được lưu trong local storage của trình duyệt và thay thế phát hiện tự động."] },
          { heading: "Chia sẻ và bên xử lý", paragraphs: [{ html: "Chuchotage không bán thông tin cá nhân, không hiển thị quảng cáo và không dùng analytics SDK. Trong quá trình dịch thông thường bằng API key hoặc ChatGPT, nguồn âm thanh đã chọn và cấu hình dịch được gửi trực tiếp từ thiết bị đến OpenAI để thực hiện dịch theo thời gian thực. OpenAI xử lý dữ liệu gửi đến API của họ theo <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">các kiểm soát dữ liệu API</a> và cài đặt lưu giữ của riêng họ. Nếu bạn dùng dịch dùng thử được tài trợ, Chuchotage nhận mã định danh cài đặt ngẫu nhiên, metadata yêu cầu suy ra từ IP, ngôn ngữ đầu ra đã chọn và việc transcript nguồn có bật hay không để tạo client secret dịch ngắn hạn; đây là cài đặt phiên, không phải văn bản transcript, và Chuchotage không nhận nội dung transcript nguồn. Âm thanh vẫn truyền từ ứng dụng đến OpenAI, không qua máy chủ âm thanh Chuchotage. Khi bạn đăng nhập bằng ChatGPT, màn hình cài đặt cũng có thể liên hệ OpenAI để hiển thị trạng thái sử dụng hoặc tín dụng Codex." }] },
          { heading: "Quyền", paragraphs: ["Tùy nền tảng và tuyến đã chọn, ứng dụng có thể yêu cầu quyền truy cập micro/capture âm thanh để dịch, quyền thông báo cho trạng thái dịch đang diễn ra, quyền liên quan đến Bluetooth khi cần cho micro tai nghe hoặc định tuyến đầu ra âm thanh, phê duyệt capture màn hình/âm thanh Android khi bạn chọn âm thanh thiết bị Android, quyền ghi âm hệ thống macOS khi bạn chọn âm thanh phát lại Mac, và truy cập internet để kết nối dịch vụ OpenAI. Chế độ âm thanh ứng dụng trên cùng thiết bị iOS/iPadOS trong tương lai sẽ cần luồng screen broadcast ReplayKit riêng và đánh giá quyền riêng tư trước khi phát hành."] },
          { heading: "Lưu giữ", paragraphs: ["Nhà phát triển không nhận hoặc lưu nguồn âm thanh đã chọn, âm thanh đã dịch, transcript trực tiếp hoặc thông tin xác thực của bạn qua máy chủ Chuchotage. Metadata yêu cầu dùng thử được tài trợ chỉ được giữ trong bộ nhớ giới hạn tần suất ngắn hạn trên máy chủ. Dữ liệu cục bộ do ứng dụng quản lý vẫn ở trên thiết bị cho đến khi bạn xóa trong ứng dụng hoặc cài đặt hệ điều hành, thay thế thông tin xác thực đã lưu, hoặc xóa qua điều khiển của nền tảng. Một số bản sao lưu hoặc bản ghi lưu trữ an toàn do nền tảng quản lý có thể tuân theo hành vi của hệ điều hành của bạn."] },
          { heading: "Trẻ em", paragraphs: ["Chuchotage không hướng đến trẻ em dưới 13 tuổi."] },
          { heading: "Liên hệ", paragraphs: [{ html: "Câu hỏi về chính sách này có thể gửi đến <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: {
        eyebrow: "Ghi chú Chuchotage",
        title: "Những ghi chú nhỏ từ một ứng dụng dịch yên tĩnh.",
        lede: "Nhật ký chính thức của Chuchotage: tên gọi, lựa chọn sản phẩm và hình dạng của dịch giọng nói cá nhân theo thời gian thực.",
        listLabel: "Ghi chú Chuchotage",
        noteDate: "9 tháng 5 năm 2026",
        noteTitle: "Vì sao gọi là Chuchotage",
        noteSummary: "Tên ứng dụng đến từ phiên dịch thì thầm, một thực hành dịch trực tiếp yên tĩnh phù hợp với sản phẩm hơn một tên dịch thuật chung chung.",
      },
      story: {
        eyebrow: "Ý nghĩa của Chuchotage",
        title: "Vì sao gọi là Chuchotage",
        lede: "Tên gọi đến từ phiên dịch thì thầm: dịch trực tiếp cho một người nghe, đủ gần để giúp và đủ yên tĩnh để không chiếm lấy căn phòng.",
        sections: [
          { paragraphs: ["Nếu bạn tìm thấy trang này bằng cách tìm Chuchotage, đây là site chính thức của ứng dụng Chuchotage: ứng dụng cá nhân để dịch giọng nói theo thời gian thực và lắng nghe qua các ngôn ngữ."] },
          { heading: "Từ này", paragraphs: ["Chuchotage là một từ tiếng Pháp được dùng trong giới phiên dịch để chỉ phiên dịch thì thầm. Thay vì nói từ cabin hoặc nói với cả khán phòng, phiên dịch viên ngồi gần một người nghe và dịch nhỏ những gì đang được nói.", "Hình ảnh đó là toàn bộ bản tóm tắt sản phẩm. Chuchotage nên tạo cảm giác gần gũi, hữu ích và cố ý nhỏ gọn: không phải hệ thống phát sóng, không phải nền tảng họp, chỉ là một người bạn đồng hành dịch giúp một người theo kịp."] },
          { heading: "Ứng dụng", paragraphs: ["Ứng dụng giữ hình dạng đó. Mở Chuchotage, chọn ngôn ngữ đầu ra, chọn nguồn âm thanh ở nơi nền tảng hỗ trợ, rồi bắt đầu dịch. Phát hiện ngôn ngữ nguồn là tự động. Màn hình chính giữ sự giản dị vì nhiệm vụ rất đơn giản: nghe, dịch, dừng."], list: ["Chuchotage chỉ dùng nguồn âm thanh đã chọn khi một phiên dịch đang hoạt động.", "Thông tin xác thực được lưu trên thiết bị qua lưu trữ an toàn của nền tảng.", "Âm thanh thời gian thực được gửi đến OpenAI trong khi sử dụng, không qua máy chủ âm thanh Chuchotage."] },
          { heading: "Lời hứa", paragraphs: ["Nhiều phần mềm dịch tạo cảm giác như một phòng điều khiển. Chuchotage được đặt theo cảm giác ngược lại: một lời thì thầm yên tĩnh của ý nghĩa đến đúng lúc.", "Vì vậy cái tên này ở lại. Chuchotage đủ lạ để tìm kiếm, đủ cụ thể để nhớ và trung thực với mục đích của ứng dụng: dịch giọng nói cá nhân theo thời gian thực, không quảng cáo, không analytics và không máy chủ âm thanh Chuchotage."] },
        ],
        returnLink: "Quay lại trang chủ Chuchotage",
      },
    },
  });

  function mergeCopy(target, source) {
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        target[key] = target[key] || {};
        mergeCopy(target[key], value);
      } else {
        target[key] = value;
      }
    });
  }

  Object.entries({
    es: {
      meta: {
        home: { title: "Chuchotage | App de traducción en vivo", description: "Chuchotage es una app personal de traducción en vivo, inspirada en la interpretación susurrada.", ogTitle: "Chuchotage | App de traducción en vivo", ogDescription: "Una app personal y discreta para traducción en vivo." },
        privacy: { description: "Política de privacidad de Chuchotage, la app personal de traducción en vivo.", ogDescription: "Cómo Chuchotage maneja audio, inicio de sesión, ajustes guardados y traducción." },
        blog: { title: "Notas de Chuchotage | Notas de traducción en vivo", description: "Notas de Chuchotage, la app de traducción en vivo llamada así por la interpretación susurrada.", ogDescription: "Notas breves sobre el nombre, el producto y las ideas detrás de Chuchotage." },
        story: { ogDescription: "El significado de Chuchotage, la app de traducción en vivo inspirada en la interpretación susurrada." },
      },
      home: {
        hero: { eyebrow: "Traducción en vivo", lede: "Traducción en vivo en tu oído, para las conversaciones a tu alrededor.", primary: "Descargar", secondary: "Cómo funciona", availability: "Disponible para iPhone, iPad y Mac. Android y Windows llegarán pronto." },
        workflow: { steps: ["Inicia sesión o añade tu clave OpenAI. Chuchotage la usa solo para traducir.", "Elige el idioma que quieres escuchar y el micrófono que prefieres.", "Inicia la traducción. Chuchotage escucha, reconoce el idioma y reproduce la traducción."] },
        languages: { title: "Escucha muchos idiomas. Tú eliges el que quieres oír.", intro: "No tienes que elegir el idioma que se habla. Elige solo el idioma en el que quieres escuchar a Chuchotage.", outputTitle: "Traducción en", outputBody: "Los idiomas en los que Chuchotage puede hablarte.", inputTitle: "Entiende habla en", inputBody: "Los idiomas que Chuchotage puede reconocer mientras escucha." },
        use: { items: ["Seguir una charla o explicación cercana.", "Entender lo esencial de una conversación de viaje.", "Usar un micrófono de auriculares cuando la sala tiene ruido.", "Mantener simple la traducción personal."] },
        story: { body: "En interpretación, chuchotage es una forma discreta: la traducción se dice suavemente para la persona que la necesita. La app toma esa idea para la traducción en vivo de todos los días." },
        detail: { eyebrow: "Privacidad", title: "Sin anuncios. Sin seguimiento. Sin historial de transcripciones.", items: ["Tu inicio de sesión y preferencias permanecen en tu dispositivo.", "El audio se envía para traducir solo mientras Chuchotage está funcionando.", "Chuchotage no guarda un historial de transcripciones."] },
        limits: { body: "La traducción en vivo puede cometer errores. No uses Chuchotage para emergencias, decisiones legales, decisiones médicas o situaciones de alto riesgo." },
        faq: { items: [["¿Chuchotage funciona sin conexión?", "No. Chuchotage necesita internet mientras traduce."], ["¿Tengo que iniciar sesión?", "Sí. Puedes iniciar sesión con ChatGPT donde esté disponible, usar una prueba cuando exista, o usar tu clave OpenAI. Chuchotage no puede ver tus chats de ChatGPT."], ["¿Chuchotage graba audio?", "Escucha solo mientras la traducción está activa. Tú controlas el permiso del micrófono y Chuchotage no guarda tu audio."], ["¿Puedo elegir la fuente de audio?", "Sí, según el dispositivo. En móvil se empieza con el micrófono. Las versiones de escritorio pueden añadir más opciones de escucha."]] },
        cta: { eyebrow: "Descargar", title: "Elige tu dispositivo y obtén Chuchotage.", action: "Descargar" },
      },
      privacy: {
        intro: "Chuchotage es una app personal de traducción en vivo. Esta política explica qué usa la app y adónde va esa información.",
        sections: [
          { heading: "Qué usa la app", paragraphs: ["Cuando inicias la traducción, Chuchotage usa el audio que eliges, el idioma que quieres escuchar y tus ajustes guardados. También puede usar tu inicio de sesión de ChatGPT, tu clave OpenAI o una prueba si eliges una."] },
          { heading: "Cómo se usa", paragraphs: ["Tu audio se usa para crear la traducción en vivo después de pulsar start. El texto que aparece en la app es solo para la sesión actual. Chuchotage no guarda un historial de transcripciones."] },
          { heading: "Qué queda en tu dispositivo", paragraphs: ["Tu inicio de sesión, clave OpenAI, prueba, idioma y ajustes de audio se guardan en tu dispositivo usando la protección del sistema operativo. Puedes borrar los datos guardados desde la app o los ajustes del dispositivo."] },
          { heading: "Idioma del sitio", paragraphs: ["El sitio tiene un selector de idioma. Si no elegiste uno, puede pedir a Chuchotage una sugerencia aproximada basada en el país. Tu elección manual se guarda en el navegador."] },
          { heading: "Qué se comparte", paragraphs: [{ html: "Chuchotage no vende información personal, no muestra anuncios y no usa herramientas de seguimiento. Durante la traducción, el audio se envía a OpenAI para que la traducción funcione. OpenAI maneja esos datos bajo sus propias <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">reglas de datos</a>. Si usas una prueba, Chuchotage puede recibir información básica para iniciar la traducción, pero no el texto de tus transcripciones. El audio no pasa por Chuchotage." }] },
          { heading: "Permisos", paragraphs: ["Según tu dispositivo, Chuchotage puede pedir acceso al micrófono, notificaciones, Bluetooth para auriculares, permisos de audio del sistema o pantalla, e internet para traducir."] },
          { heading: "Conservación", paragraphs: ["El desarrollador no recibe ni guarda tu audio, audio traducido, transcripciones en vivo o inicio de sesión mediante Chuchotage. Los datos de la app permanecen en tu dispositivo hasta que los borras, los reemplazas o quitas la app. Las copias de seguridad dependen del sistema operativo."] },
          { heading: "Menores", paragraphs: ["Chuchotage no está dirigido a menores de 13 años."] },
          { heading: "Contacto", paragraphs: [{ html: "Puedes enviar preguntas sobre esta política a <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: { lede: "Notas oficiales de Chuchotage: el nombre, las decisiones de producto y la forma de la traducción personal en vivo." },
      story: { sections: [
        { paragraphs: ["Si encontraste esta página buscando Chuchotage, este es el sitio oficial de la app Chuchotage: una app personal de traducción en vivo para escuchar entre idiomas."] },
        { heading: "La palabra", paragraphs: ["Chuchotage es una palabra francesa usada en interpretación para la interpretación susurrada. En lugar de hablar desde una cabina o dirigirse a toda una audiencia, el intérprete se sienta cerca de una persona y traduce en voz baja lo que se dice.", "Esa imagen es toda la idea. Chuchotage debe sentirse cercano, útil y pequeño: un compañero de traducción que ayuda a una persona a seguir el hilo."] },
        { heading: "La app", paragraphs: ["La app mantiene esa forma. Abre Chuchotage, elige el idioma que quieres escuchar e inicia la traducción. La pantalla principal se mantiene simple porque el trabajo es simple: escuchar, traducir, detener."], list: ["Chuchotage usa el audio elegido solo mientras la traducción está activa.", "Tu inicio de sesión permanece en tu dispositivo.", "El audio se envía para traducir solo mientras Chuchotage está funcionando."] },
        { heading: "La promesa", paragraphs: ["Mucho software de traducción se siente como una sala de control. Chuchotage toma su nombre de la sensación opuesta: un susurro discreto de significado que llega en el momento adecuado.", "Por eso el nombre se quedó. Chuchotage es lo bastante inusual para buscarse, lo bastante específico para recordarse y honesto sobre el propósito de la app: traducción personal en vivo sin anuncios, seguimiento ni transcripciones guardadas."] },
      ] },
    },
    fr: {
      meta: {
        home: { title: "Chuchotage | Application de traduction en direct", description: "Chuchotage est une application personnelle de traduction en direct, inspirée de l'interprétation chuchotée.", ogTitle: "Chuchotage | Application de traduction en direct", ogDescription: "Une application personnelle et discrète de traduction en direct." },
        privacy: { description: "Politique de confidentialité de Chuchotage, l'application personnelle de traduction en direct.", ogDescription: "Comment Chuchotage gère l'audio, la connexion, les réglages enregistrés et la traduction." },
        blog: { title: "Notes de Chuchotage | Notes de traduction en direct", description: "Notes de Chuchotage, l'application de traduction en direct nommée d'après l'interprétation chuchotée.", ogDescription: "Courtes notes sur le nom, le produit et les idées derrière Chuchotage." },
        story: { ogDescription: "Le sens de Chuchotage, l'application de traduction en direct inspirée de l'interprétation chuchotée." },
      },
      home: {
        hero: { eyebrow: "Traduction en direct", lede: "La traduction en direct dans votre oreille, pour les conversations autour de vous.", primary: "Télécharger", secondary: "Fonctionnement", availability: "Disponible pour iPhone, iPad et Mac. Android et Windows arrivent bientôt." },
        workflow: { steps: ["Connectez-vous ou ajoutez votre clé OpenAI. Chuchotage l'utilise seulement pour traduire.", "Choisissez la langue que vous voulez entendre et le micro que vous préférez.", "Démarrez la traduction. Chuchotage écoute, reconnaît la langue et lit la traduction."] },
        languages: { title: "Elle écoute de nombreuses langues. Vous choisissez celle que vous voulez entendre.", intro: "Vous n'avez pas besoin de choisir la langue parlée. Choisissez seulement la langue dans laquelle Chuchotage doit vous parler.", outputTitle: "Traduction en", outputBody: "Les langues dans lesquelles Chuchotage peut vous parler.", inputTitle: "Comprend la parole en", inputBody: "Les langues que Chuchotage peut reconnaître en écoutant." },
        use: { items: ["Suivre une présentation ou une explication à proximité.", "Saisir l'essentiel d'une conversation en voyage.", "Utiliser le micro d'un casque quand la pièce est bruyante.", "Garder la traduction personnelle simple."] },
        story: { body: "En interprétation, le chuchotage est une forme discrète : la traduction est dite doucement à la personne qui en a besoin. L'application reprend cette idée pour la traduction en direct du quotidien." },
        detail: { eyebrow: "Confidentialité", title: "Pas de publicité. Pas de suivi. Pas d'historique de transcription.", items: ["Votre connexion et vos préférences restent sur votre appareil.", "L'audio est envoyé pour traduire seulement quand Chuchotage fonctionne.", "Chuchotage ne garde pas d'historique de transcription."] },
        limits: { body: "La traduction en direct peut se tromper. N'utilisez pas Chuchotage pour les urgences, les décisions juridiques, les décisions médicales ou les situations à fort enjeu." },
        faq: { items: [["Chuchotage fonctionne-t-elle hors ligne ?", "Non. Chuchotage a besoin d'internet pendant la traduction."], ["Dois-je me connecter ?", "Oui. Vous pouvez vous connecter avec ChatGPT quand c'est disponible, utiliser un essai s'il est proposé, ou utiliser votre clé OpenAI. Chuchotage ne peut pas voir vos conversations ChatGPT."], ["Chuchotage enregistre-t-elle l'audio ?", "Elle écoute seulement pendant que la traduction est active. Vous contrôlez l'autorisation du micro et Chuchotage ne conserve pas votre audio."], ["Puis-je choisir la source audio ?", "Oui, selon l'appareil. Sur mobile, on commence par le micro. Les versions ordinateur peuvent ajouter d'autres options d'écoute."]] },
        cta: { eyebrow: "Télécharger", title: "Choisissez votre appareil et obtenez Chuchotage.", action: "Télécharger" },
      },
      privacy: {
        intro: "Chuchotage est une application personnelle de traduction en direct. Cette politique explique ce que l'application utilise et où vont ces informations.",
        sections: [
          { heading: "Ce que l'app utilise", paragraphs: ["Quand vous lancez la traduction, Chuchotage utilise l'audio choisi, la langue que vous voulez entendre et vos réglages enregistrés. Elle peut aussi utiliser votre connexion ChatGPT, votre clé OpenAI ou un essai si vous en choisissez un."] },
          { heading: "Comment c'est utilisé", paragraphs: ["Votre audio sert à créer la traduction en direct après avoir appuyé sur start. Le texte affiché dans l'app vaut seulement pour la session en cours. Chuchotage ne garde pas d'historique de transcription."] },
          { heading: "Ce qui reste sur votre appareil", paragraphs: ["Votre connexion, clé OpenAI, essai, langue et réglages audio sont enregistrés sur votre appareil avec la protection du système. Vous pouvez supprimer les données enregistrées depuis l'app ou les réglages de l'appareil."] },
          { heading: "Langue du site", paragraphs: ["Le site a un sélecteur de langue. Si vous n'avez pas choisi de langue, il peut demander à Chuchotage une suggestion approximative basée sur le pays. Votre choix manuel est enregistré dans le navigateur."] },
          { heading: "Ce qui est partagé", paragraphs: [{ html: "Chuchotage ne vend pas d'informations personnelles, n'affiche pas de publicité et n'utilise pas d'outils de suivi. Pendant la traduction, l'audio est envoyé à OpenAI pour que la traduction fonctionne. OpenAI gère ces données selon ses propres <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">règles de données</a>. Si vous utilisez un essai, Chuchotage peut recevoir des informations de base pour lancer la traduction, mais pas le texte de vos transcriptions. L'audio ne passe pas par Chuchotage." }] },
          { heading: "Autorisations", paragraphs: ["Selon votre appareil, Chuchotage peut demander l'accès au micro, aux notifications, au Bluetooth pour les casques, à l'audio système ou à l'écran, et à internet pour traduire."] },
          { heading: "Conservation", paragraphs: ["Le développeur ne reçoit ni ne conserve votre audio, l'audio traduit, les transcriptions en direct ou votre connexion via Chuchotage. Les données de l'app restent sur votre appareil jusqu'à ce que vous les supprimiez, les remplaciez ou supprimiez l'app. Les sauvegardes dépendent du système d'exploitation."] },
          { heading: "Enfants", paragraphs: ["Chuchotage ne s'adresse pas aux enfants de moins de 13 ans."] },
          { heading: "Contact", paragraphs: [{ html: "Les questions sur cette politique peuvent être envoyées à <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: { lede: "Notes officielles de Chuchotage : le nom, les choix produit et la forme de la traduction personnelle en direct." },
      story: { sections: [
        { paragraphs: ["Si vous avez trouvé cette page en cherchant Chuchotage, vous êtes sur le site officiel de l'application Chuchotage : une application personnelle de traduction en direct pour écouter d'une langue à l'autre."] },
        { heading: "Le mot", paragraphs: ["Chuchotage est un mot français utilisé en interprétation pour désigner l'interprétation chuchotée. Au lieu de parler depuis une cabine ou de s'adresser à tout un public, l'interprète s'assoit près d'une personne et traduit doucement ce qui est dit.", "Cette image est toute l'idée. Chuchotage doit sembler proche, utile et petite : un compagnon de traduction qui aide une personne à suivre."] },
        { heading: "L'application", paragraphs: ["L'application garde cette forme. Ouvrez Chuchotage, choisissez la langue que vous voulez entendre et démarrez la traduction. L'écran principal reste simple, car le travail est simple : écouter, traduire, arrêter."], list: ["Chuchotage utilise l'audio choisi seulement pendant que la traduction est active.", "Votre connexion reste sur votre appareil.", "L'audio est envoyé pour traduire seulement quand Chuchotage fonctionne."] },
        { heading: "La promesse", paragraphs: ["Beaucoup de logiciels de traduction ressemblent à une salle de contrôle. Chuchotage porte le nom de la sensation inverse : un murmure discret de sens qui arrive au bon moment.", "C'est pourquoi le nom est resté. Chuchotage est assez inhabituel pour être recherché, assez précis pour être mémorisé et honnête sur le but de l'app : une traduction personnelle en direct, sans publicité, suivi ni transcriptions enregistrées."] },
      ] },
    },
    de: {
      meta: {
        home: { title: "Chuchotage | Live-Übersetzungs-App", description: "Chuchotage ist eine persönliche App für Live-Übersetzung, inspiriert vom Flüsterdolmetschen.", ogTitle: "Chuchotage | Live-Übersetzungs-App", ogDescription: "Eine leise persönliche App für Live-Übersetzung." },
        privacy: { description: "Datenschutzerklärung für Chuchotage, die persönliche App für Live-Übersetzung.", ogDescription: "Wie Chuchotage Audio, Anmeldung, gespeicherte Einstellungen und Übersetzung nutzt." },
        blog: { title: "Chuchotage Notizen | Notizen zur Live-Übersetzung", description: "Notizen von Chuchotage, der nach dem Flüsterdolmetschen benannten App für Live-Übersetzung.", ogDescription: "Kurze Notizen zum Namen, Produkt und den Ideen hinter Chuchotage." },
        story: { ogDescription: "Die Bedeutung von Chuchotage, der vom Flüsterdolmetschen inspirierten App für Live-Übersetzung." },
      },
      home: {
        hero: { eyebrow: "Live-Übersetzung", lede: "Live-Übersetzung in deinem Ohr, für Gespräche um dich herum.", primary: "Download", secondary: "So funktioniert es", availability: "Verfügbar für iPhone, iPad und Mac. Android und Windows kommen bald." },
        workflow: { steps: ["Melde dich an oder füge deinen OpenAI-Schlüssel hinzu. Chuchotage nutzt ihn nur zum Übersetzen.", "Wähle die Sprache, die du hören möchtest, und dein bevorzugtes Mikrofon.", "Starte die Übersetzung. Chuchotage hört zu, erkennt die Sprache und spielt die Übersetzung ab."] },
        languages: { title: "Es hört viele Sprachen. Du wählst, was du hören willst.", intro: "Du musst die gesprochene Sprache nicht auswählen. Wähle nur die Sprache, in der Chuchotage zu dir sprechen soll.", outputTitle: "Übersetzung in", outputBody: "Die Sprachen, in denen Chuchotage zu dir sprechen kann.", inputTitle: "Versteht Sprache in", inputBody: "Die Sprachen, die Chuchotage beim Zuhören erkennen kann." },
        use: { items: ["Einem Vortrag oder einer Erklärung in der Nähe folgen.", "Den Kern eines Reisegesprächs verstehen.", "Ein Headset-Mikrofon nutzen, wenn der Raum laut ist.", "Persönliche Übersetzung einfach halten."] },
        story: { body: "Beim Dolmetschen ist Chuchotage eine leise Form: Die Übersetzung wird der Person, die sie braucht, sanft zugesprochen. Die App übernimmt diese Idee für alltägliche Live-Übersetzung." },
        detail: { eyebrow: "Datenschutz", title: "Keine Werbung. Kein Tracking. Kein gespeicherter Transkriptverlauf.", items: ["Deine Anmeldung und Einstellungen bleiben auf deinem Gerät.", "Audio wird nur zum Übersetzen gesendet, während Chuchotage läuft.", "Chuchotage speichert keinen Transkriptverlauf."] },
        limits: { body: "Live-Übersetzung kann Fehler machen. Nutze Chuchotage nicht für Notfälle, rechtliche Entscheidungen, medizinische Entscheidungen oder Situationen mit hohem Risiko." },
        faq: { items: [["Funktioniert Chuchotage offline?", "Nein. Chuchotage braucht während der Übersetzung Internet."], ["Muss ich mich anmelden?", "Ja. Du kannst dich mit ChatGPT anmelden, wo verfügbar, einen Test nutzen, wenn angeboten, oder deinen OpenAI-Schlüssel verwenden. Chuchotage kann deine ChatGPT-Chats nicht sehen."], ["Nimmt Chuchotage Audio auf?", "Es hört nur zu, während die Übersetzung aktiv ist. Du kontrollierst die Mikrofonberechtigung und Chuchotage speichert dein Audio nicht."], ["Kann ich die Audioquelle wählen?", "Ja, je nach Gerät. Mobil beginnt es mit dem Mikrofon. Desktop-Versionen können weitere Hörmöglichkeiten hinzufügen."]] },
        cta: { eyebrow: "Download", title: "Wähle dein Gerät und hol dir Chuchotage.", action: "Download" },
      },
      privacy: {
        intro: "Chuchotage ist eine persönliche App für Live-Übersetzung. Diese Erklärung erklärt, was die App nutzt und wohin diese Informationen gehen.",
        sections: [
          { heading: "Was die App nutzt", paragraphs: ["Wenn du die Übersetzung startest, nutzt Chuchotage das von dir gewählte Audio, die Sprache, die du hören möchtest, und deine gespeicherten Einstellungen. Es kann auch deine ChatGPT-Anmeldung, deinen OpenAI-Schlüssel oder einen Test nutzen, wenn du das auswählst."] },
          { heading: "Wie es genutzt wird", paragraphs: ["Dein Audio wird nach dem Starten für die Live-Übersetzung genutzt. Text, der in der App erscheint, gilt nur für die aktuelle Sitzung. Chuchotage speichert keinen Transkriptverlauf."] },
          { heading: "Was auf deinem Gerät bleibt", paragraphs: ["Anmeldung, OpenAI-Schlüssel, Test, Sprache und Audioeinstellungen werden auf deinem Gerät mit dem Schutz des Betriebssystems gespeichert. Du kannst gespeicherte Daten in der App oder den Geräteeinstellungen löschen."] },
          { heading: "Sprache der Website", paragraphs: ["Die Website hat eine Sprachauswahl. Wenn du keine Sprache gewählt hast, kann sie Chuchotage nach einem groben Vorschlag anhand des Landes fragen. Deine manuelle Wahl wird im Browser gespeichert."] },
          { heading: "Was geteilt wird", paragraphs: [{ html: "Chuchotage verkauft keine personenbezogenen Informationen, zeigt keine Werbung und nutzt keine Tracking-Tools. Während der Übersetzung wird Audio an OpenAI gesendet, damit die Übersetzung funktioniert. OpenAI verarbeitet diese Daten nach den eigenen <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">Datenregeln</a>. Wenn du einen Test nutzt, kann Chuchotage grundlegende Informationen zum Starten der Übersetzung erhalten, aber nicht den Text deiner Transkripte. Audio läuft nicht über Chuchotage." }] },
          { heading: "Berechtigungen", paragraphs: ["Je nach Gerät kann Chuchotage Zugriff auf Mikrofon, Benachrichtigungen, Bluetooth für Headsets, Systemaudio oder Bildschirm sowie Internet für die Übersetzung anfragen."] },
          { heading: "Aufbewahrung", paragraphs: ["Der Entwickler erhält oder speichert dein Audio, übersetztes Audio, Live-Transkripte oder deine Anmeldung nicht über Chuchotage. App-Daten bleiben auf deinem Gerät, bis du sie löschst, ersetzt oder die App entfernst. Backups hängen vom Betriebssystem ab."] },
          { heading: "Kinder", paragraphs: ["Chuchotage richtet sich nicht an Kinder unter 13 Jahren."] },
          { heading: "Kontakt", paragraphs: [{ html: "Fragen zu dieser Erklärung können an <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a> gesendet werden." }] },
        ],
      },
      blog: { lede: "Offizielle Notizen zu Chuchotage: der Name, Produktentscheidungen und die Form persönlicher Live-Übersetzung." },
      story: { sections: [
        { paragraphs: ["Wenn du diese Seite über die Suche nach Chuchotage gefunden hast: Dies ist die offizielle Website der Chuchotage-App, einer persönlichen App für Live-Übersetzung über Sprachen hinweg."] },
        { heading: "Das Wort", paragraphs: ["Chuchotage ist ein französisches Wort, das in Dolmetschkreisen für Flüsterdolmetschen verwendet wird. Statt aus einer Kabine zu sprechen oder ein ganzes Publikum anzusprechen, sitzt eine dolmetschende Person nahe bei einer Person und übersetzt leise, was gesagt wird.", "Dieses Bild ist die ganze Idee. Chuchotage soll nah, nützlich und klein wirken: ein Übersetzungsbegleiter, der einer Person hilft, dranzubleiben."] },
        { heading: "Die App", paragraphs: ["Die App behält diese Form. Chuchotage öffnen, die gewünschte Sprache wählen und Übersetzung starten. Der Hauptbildschirm bleibt einfach, weil die Aufgabe einfach ist: zuhören, übersetzen, stoppen."], list: ["Chuchotage nutzt das gewählte Audio nur, während die Übersetzung aktiv ist.", "Deine Anmeldung bleibt auf deinem Gerät.", "Audio wird nur zum Übersetzen gesendet, während Chuchotage läuft."] },
        { heading: "Das Versprechen", paragraphs: ["Viele Übersetzungsprogramme fühlen sich wie ein Kontrollraum an. Chuchotage ist nach dem gegenteiligen Gefühl benannt: ein leises Flüstern von Bedeutung, das im richtigen Moment ankommt.", "Darum blieb der Name. Chuchotage ist ungewöhnlich genug, um auffindbar zu sein, spezifisch genug, um im Gedächtnis zu bleiben, und ehrlich über den Zweck der App: persönliche Live-Übersetzung ohne Werbung, Tracking oder gespeicherte Transkripte."] },
      ] },
    },
    pt: {
      meta: {
        home: { title: "Chuchotage | App de tradução ao vivo", description: "Chuchotage é um app pessoal de tradução ao vivo, inspirado na interpretação sussurrada.", ogTitle: "Chuchotage | App de tradução ao vivo", ogDescription: "Um app pessoal e discreto para tradução ao vivo." },
        privacy: { description: "Política de privacidade do Chuchotage, o app pessoal de tradução ao vivo.", ogDescription: "Como o Chuchotage usa áudio, login, ajustes salvos e tradução." },
        blog: { title: "Notas do Chuchotage | Notas de tradução ao vivo", description: "Notas do Chuchotage, o app de tradução ao vivo chamado como a interpretação sussurrada.", ogDescription: "Notas curtas sobre o nome, o produto e as ideias por trás do Chuchotage." },
        story: { ogDescription: "O significado de Chuchotage, o app de tradução ao vivo inspirado na interpretação sussurrada." },
      },
      home: {
        hero: { eyebrow: "Tradução ao vivo", lede: "Tradução ao vivo no seu ouvido, para as conversas ao seu redor.", primary: "Download", secondary: "Como funciona", availability: "Disponível para iPhone, iPad e Mac. Android e Windows chegam em breve." },
        workflow: { steps: ["Entre ou adicione sua chave OpenAI. O Chuchotage usa isso apenas para traduzir.", "Escolha o idioma que você quer ouvir e o microfone que prefere.", "Inicie a tradução. O Chuchotage escuta, reconhece o idioma e toca a tradução."] },
        languages: { title: "Ele escuta muitos idiomas. Você escolhe o que quer ouvir.", intro: "Você não precisa escolher o idioma falado. Escolha apenas o idioma em que quer ouvir o Chuchotage.", outputTitle: "Tradução em", outputBody: "Os idiomas em que o Chuchotage pode falar com você.", inputTitle: "Entende fala em", inputBody: "Os idiomas que o Chuchotage pode reconhecer enquanto escuta." },
        use: { items: ["Acompanhar uma palestra ou explicação por perto.", "Entender o essencial de uma conversa em viagem.", "Usar o microfone do headset quando o ambiente está barulhento.", "Manter a tradução pessoal simples."] },
        story: { body: "Na interpretação, chuchotage é uma forma discreta: a tradução é falada baixinho para a pessoa que precisa dela. O app empresta essa ideia para a tradução ao vivo do dia a dia." },
        detail: { eyebrow: "Privacidade", title: "Sem anúncios. Sem rastreamento. Sem histórico de transcrições.", items: ["Seu login e preferências ficam no dispositivo.", "O áudio é enviado para traduzir apenas enquanto o Chuchotage está funcionando.", "O Chuchotage não guarda histórico de transcrições."] },
        limits: { body: "A tradução ao vivo pode errar. Não use o Chuchotage para emergências, decisões jurídicas, decisões médicas ou situações de alto risco." },
        faq: { items: [["O Chuchotage funciona offline?", "Não. O Chuchotage precisa de internet enquanto traduz."], ["Preciso entrar?", "Sim. Você pode entrar com ChatGPT onde houver suporte, usar um teste quando oferecido, ou usar sua chave OpenAI. O Chuchotage não pode ver suas conversas do ChatGPT."], ["O Chuchotage grava áudio?", "Ele escuta apenas enquanto a tradução está ativa. Você controla a permissão do microfone e o Chuchotage não guarda seu áudio."], ["Posso escolher a fonte de áudio?", "Sim, dependendo do dispositivo. No celular, começa pelo microfone. Versões desktop podem adicionar mais opções de escuta."]] },
        cta: { eyebrow: "Download", title: "Escolha seu dispositivo e obtenha Chuchotage.", action: "Download" },
      },
      privacy: {
        intro: "Chuchotage é um app pessoal de tradução ao vivo. Esta política explica o que o app usa e para onde essas informações vão.",
        sections: [
          { heading: "O que o app usa", paragraphs: ["Quando você inicia a tradução, o Chuchotage usa o áudio que você escolhe, o idioma que quer ouvir e seus ajustes salvos. Ele também pode usar seu login do ChatGPT, sua chave OpenAI ou um teste, se você escolher."] },
          { heading: "Como é usado", paragraphs: ["Seu áudio é usado para criar a tradução ao vivo depois que você aperta start. O texto mostrado no app vale apenas para a sessão atual. O Chuchotage não guarda histórico de transcrições."] },
          { heading: "O que fica no dispositivo", paragraphs: ["Seu login, chave OpenAI, teste, idioma e ajustes de áudio são salvos no dispositivo usando a proteção do sistema operacional. Você pode apagar dados salvos pelo app ou pelas configurações do dispositivo."] },
          { heading: "Idioma do site", paragraphs: ["O site tem um seletor de idioma. Se você não escolheu um idioma, ele pode pedir ao Chuchotage uma sugestão aproximada baseada no país. Sua escolha manual fica salva no navegador."] },
          { heading: "O que é compartilhado", paragraphs: [{ html: "O Chuchotage não vende informações pessoais, não mostra anúncios e não usa ferramentas de rastreamento. Durante a tradução, o áudio é enviado à OpenAI para a tradução funcionar. A OpenAI lida com esses dados segundo suas próprias <a href=\"https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint\">regras de dados</a>. Se você usar um teste, o Chuchotage pode receber informações básicas para iniciar a tradução, mas não o texto das suas transcrições. O áudio não passa pelo Chuchotage." }] },
          { heading: "Permissões", paragraphs: ["Dependendo do dispositivo, o Chuchotage pode pedir acesso ao microfone, notificações, Bluetooth para fones, áudio do sistema ou tela, e internet para traduzir."] },
          { heading: "Retenção", paragraphs: ["O desenvolvedor não recebe nem guarda seu áudio, áudio traduzido, transcrições ao vivo ou login por meio do Chuchotage. Os dados do app ficam no dispositivo até você apagar, substituir ou remover o app. Backups dependem do sistema operacional."] },
          { heading: "Crianças", paragraphs: ["O Chuchotage não é direcionado a crianças menores de 13 anos."] },
          { heading: "Contato", paragraphs: [{ html: "Perguntas sobre esta política podem ser enviadas para <a href=\"mailto:support@chuchotage.ai\">support@chuchotage.ai</a>." }] },
        ],
      },
      blog: { lede: "Notas oficiais do Chuchotage: o nome, as escolhas de produto e a forma da tradução pessoal ao vivo." },
      story: { sections: [
        { paragraphs: ["Se você encontrou esta página procurando por Chuchotage, este é o site oficial do app Chuchotage: um app pessoal de tradução ao vivo para escutar entre idiomas."] },
        { heading: "A palavra", paragraphs: ["Chuchotage é uma palavra francesa usada no meio da interpretação para interpretação sussurrada. Em vez de falar de uma cabine ou se dirigir a uma plateia inteira, o intérprete se senta perto de uma pessoa e traduz em voz baixa o que está sendo dito.", "Essa imagem é toda a ideia. O Chuchotage deve parecer próximo, útil e pequeno: um companheiro de tradução que ajuda uma pessoa a acompanhar."] },
        { heading: "O app", paragraphs: ["O app mantém essa forma. Abra o Chuchotage, escolha o idioma que quer ouvir e inicie a tradução. A tela principal fica simples porque o trabalho é simples: ouvir, traduzir, parar."], list: ["O Chuchotage usa o áudio escolhido apenas enquanto a tradução está ativa.", "Seu login fica no dispositivo.", "O áudio é enviado para traduzir apenas enquanto o Chuchotage está funcionando."] },
        { heading: "A promessa", paragraphs: ["Muitos softwares de tradução parecem uma sala de controle. Chuchotage recebeu o nome da sensação oposta: um sussurro discreto de significado chegando no momento certo.", "É por isso que o nome ficou. Chuchotage é incomum o bastante para ser pesquisável, específico o bastante para ser lembrado e honesto sobre o propósito do app: tradução pessoal ao vivo sem anúncios, rastreamento ou transcrições salvas."] },
      ] },
    },
  }).forEach(([language, overrides]) => mergeCopy(COPY[language], overrides));

  function supportedLanguage(language) {
    return LANGUAGES.some((item) => item.code === language);
  }

  function normalizeLanguage(language) {
    if (!language) return "";
    const normalized = String(language).toLowerCase().split("-")[0];
    return supportedLanguage(normalized) ? normalized : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getPathValue(source, path) {
    return path.split(".").reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), source);
  }

  function displayLanguageName(code, locale) {
    try {
      const displayNames = new Intl.DisplayNames([locale], { type: "language" });
      return displayNames.of(code) || code;
    } catch {
      return code;
    }
  }

  function renderLanguageList(codes, locale, withCode) {
    return codes
      .map((code) => {
        const name = escapeHtml(displayLanguageName(code, locale));
        const suffix = withCode ? ` <span>${escapeHtml(code)}</span>` : "";
        return `<li>${name}${suffix}</li>`;
      })
      .join("");
  }

  function renderParagraphs(paragraphs = []) {
    return paragraphs
      .map((paragraph) => {
        if (paragraph && typeof paragraph === "object" && paragraph.html) {
          return `<p>${paragraph.html}</p>`;
        }
        return `<p>${escapeHtml(paragraph)}</p>`;
      })
      .join("");
  }

  function storeIcon(store) {
    if (store === "play") {
      return `<svg class="store-icon play-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="#00D2FF" d="M3.2 2.1c-.3.3-.5.7-.5 1.2v17.4c0 .5.2.9.5 1.2l.1.1 9.8-9.8v-.2L3.3 2l-.1.1z"></path>
        <path fill="#FFCE00" d="M16.3 15.5l-3.2-3.2v-.2l3.2-3.2.1.1 3.8 2.2c1.1.6 1.1 1.6 0 2.2l-3.8 2.2-.1-.1z"></path>
        <path fill="#FF3A44" d="M16.4 15.4l-3.3-3.3-9.9 9.9c.5.5 1.2.5 2.1 0l11.1-6.6z"></path>
        <path fill="#00F076" d="M16.4 8.8 5.3 2.2c-.9-.5-1.6-.5-2.1 0l9.9 9.9 3.3-3.3z"></path>
      </svg>`;
    }

    return `<svg class="store-icon app-store-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M17.7 13.1c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.4-.8 1.6 0 2.1.8 3.4.8 1.4 0 2.3-1.2 3.2-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.9-4.2zM15.3 5.9c.7-.9 1.2-2.1 1.1-3.3-1 .1-2.2.7-2.9 1.6-.6.8-1.2 2-1.1 3.2 1.1.1 2.2-.6 2.9-1.5z"></path>
    </svg>`;
  }

  const DOWNLOAD_PAGES = {
    en: {
      nav: "Download",
      homeAvailability: "Available now for iPhone, iPad, Android, and Mac. Windows is coming soon.",
      homeCtaTitle: "Choose your device and get Chuchotage.",
      meta: {
        title: "Get Chuchotage | Download the Live Translation App",
        description: "Get Chuchotage for iPhone, iPad, Android, and Mac, and see what is coming next.",
        ogTitle: "Get Chuchotage",
        ogDescription: "Choose your device and install Chuchotage for quiet live translation.",
      },
      hero: {
        eyebrow: "Download",
        title: "Get Chuchotage",
        lede: "Choose your device and install the quiet live translation app.",
        primary: "Open App Store",
        secondary: "Mac download",
      },
      platforms: {
        eyebrow: "Devices",
        title: "Start with the version that fits what you use.",
        iosBody: "Install Chuchotage from the App Store.",
        androidBody: "Install Chuchotage from Google Play.",
        macBody: "Download Chuchotage for Mac.",
        windowsBody: "The Windows download is coming soon.",
        store: "Open App Store",
        play: "Open Google Play",
        macAction: "Download for Mac",
        soon: "Coming soon",
      },
      qr: {
        eyebrow: "Scan to install",
        title: "Scan. Get the right store.",
        body: "Point your phone at the code to open Chuchotage in App Store or Google Play.",
        action: "Open on this device",
        alt: "QR code for Chuchotage download",
      },
      direct: {
        eyebrow: "Desktop",
        title: "Download the Mac app. Windows is next.",
        macStatus: "Ready to download",
        windowsStatus: "Coming soon",
      },
      notes: {
        eyebrow: "Before you start",
        title: "Sign in, then wear headphones.",
        items: [
          "Use ChatGPT sign-in where supported, a trial when available, or your own OpenAI key.",
          "Headphones help keep translated audio private and reduce feedback into the microphone.",
          "Chuchotage has no ads, no tracking, and no saved transcript history.",
        ],
      },
    },
    es: {
      nav: "Descargar",
      homeAvailability: "Disponible para iPhone, iPad, Android y Mac. Windows llegará pronto.",
      homeCtaTitle: "Elige tu dispositivo y obtén Chuchotage.",
      meta: { title: "Obtén Chuchotage | Descarga la app de traducción en vivo", description: "Obtén Chuchotage para iPhone, iPad, Android y Mac, y mira qué llega después.", ogTitle: "Obtén Chuchotage", ogDescription: "Elige tu dispositivo e instala Chuchotage para traducción en vivo discreta." },
      hero: { eyebrow: "Descargar", title: "Obtén Chuchotage", lede: "Elige tu dispositivo e instala la app discreta de traducción en vivo.", primary: "Abrir App Store", secondary: "Descargar para Mac" },
      platforms: { eyebrow: "Dispositivos", title: "Empieza con la versión para lo que usas.", iosBody: "Instala Chuchotage desde App Store.", androidBody: "Instala Chuchotage desde Google Play.", macBody: "Descarga Chuchotage para Mac.", windowsBody: "La descarga para Windows llegará pronto.", store: "Abrir App Store", play: "Abrir Google Play", macAction: "Descargar para Mac", soon: "Próximamente" },
      qr: { eyebrow: "Escanea para instalar", title: "Escanea. Ve a la tienda correcta.", body: "Apunta tu teléfono al código para abrir Chuchotage en App Store o Google Play.", action: "Abrir en este dispositivo", alt: "Código QR para descargar Chuchotage" },
      direct: { eyebrow: "Escritorio", title: "Descarga la app para Mac. Windows es lo siguiente.", macStatus: "Lista para descargar", windowsStatus: "Próximamente" },
      notes: { eyebrow: "Antes de empezar", title: "Inicia sesión y usa auriculares.", items: ["Usa inicio de sesión con ChatGPT donde esté disponible, una prueba cuando exista, o tu propia clave de OpenAI.", "Los auriculares mantienen la traducción más privada y reducen el retorno al micrófono.", "Chuchotage no tiene anuncios, seguimiento ni historial de transcripciones guardado."] },
    },
    it: {
      nav: "Download",
      homeAvailability: "Disponibile per iPhone, iPad, Android e Mac. Windows arriverà presto.",
      homeCtaTitle: "Scegli il tuo dispositivo e ottieni Chuchotage.",
      meta: { title: "Ottieni Chuchotage | Scarica l'app di traduzione live", description: "Ottieni Chuchotage per iPhone, iPad, Android e Mac, e scopri cosa arriverà dopo.", ogTitle: "Ottieni Chuchotage", ogDescription: "Scegli il tuo dispositivo e installa Chuchotage per una traduzione live discreta." },
      hero: { eyebrow: "Download", title: "Ottieni Chuchotage", lede: "Scegli il tuo dispositivo e installa l'app discreta per la traduzione live.", primary: "Apri App Store", secondary: "Download per Mac" },
      platforms: { eyebrow: "Dispositivi", title: "Inizia dalla versione adatta a ciò che usi.", iosBody: "Installa Chuchotage da App Store.", androidBody: "Installa Chuchotage da Google Play.", macBody: "Scarica Chuchotage per Mac.", windowsBody: "Il download per Windows arriverà presto.", store: "Apri App Store", play: "Apri Google Play", macAction: "Download per Mac", soon: "In arrivo" },
      qr: { eyebrow: "Scansiona per installare", title: "Scansiona. Vai allo store giusto.", body: "Punta il telefono sul codice per aprire Chuchotage su App Store o Google Play.", action: "Apri su questo dispositivo", alt: "Codice QR per scaricare Chuchotage" },
      direct: { eyebrow: "Desktop", title: "Scarica l'app per Mac. Windows è il prossimo.", macStatus: "Pronto da scaricare", windowsStatus: "In arrivo" },
      notes: { eyebrow: "Prima di iniziare", title: "Accedi, poi usa le cuffie.", items: ["Usa l'accesso ChatGPT dove supportato, una prova quando disponibile, o la tua chiave OpenAI.", "Le cuffie aiutano a tenere la traduzione più privata e riducono il rientro nel microfono.", "Chuchotage non ha annunci, tracciamento o cronologia delle trascrizioni salvata."] },
    },
    fr: {
      nav: "Télécharger",
      homeAvailability: "Disponible pour iPhone, iPad, Android et Mac. Windows arrive bientôt.",
      homeCtaTitle: "Choisissez votre appareil et obtenez Chuchotage.",
      meta: { title: "Obtenir Chuchotage | Télécharger l'app de traduction en direct", description: "Obtenez Chuchotage pour iPhone, iPad, Android et Mac, et voyez ce qui arrive ensuite.", ogTitle: "Obtenir Chuchotage", ogDescription: "Choisissez votre appareil et installez Chuchotage pour une traduction en direct discrète." },
      hero: { eyebrow: "Télécharger", title: "Obtenir Chuchotage", lede: "Choisissez votre appareil et installez l'app discrète de traduction en direct.", primary: "Ouvrir l'App Store", secondary: "Télécharger pour Mac" },
      platforms: { eyebrow: "Appareils", title: "Commencez avec la version adaptée à ce que vous utilisez.", iosBody: "Installez Chuchotage depuis l'App Store.", androidBody: "Installez Chuchotage depuis Google Play.", macBody: "Téléchargez Chuchotage pour Mac.", windowsBody: "Le téléchargement Windows arrive bientôt.", store: "Ouvrir l'App Store", play: "Ouvrir Google Play", macAction: "Télécharger pour Mac", soon: "Bientôt" },
      qr: { eyebrow: "Scanner pour installer", title: "Scannez. Ouvrez la bonne boutique.", body: "Pointez votre téléphone vers le code pour ouvrir Chuchotage dans l'App Store ou Google Play.", action: "Ouvrir sur cet appareil", alt: "Code QR pour télécharger Chuchotage" },
      direct: { eyebrow: "Ordinateur", title: "Téléchargez l'app Mac. Windows arrive ensuite.", macStatus: "Prêt à télécharger", windowsStatus: "Bientôt" },
      notes: { eyebrow: "Avant de commencer", title: "Connectez-vous, puis portez un casque.", items: ["Utilisez la connexion ChatGPT quand elle est disponible, un essai si proposé, ou votre propre clé OpenAI.", "Le casque garde la traduction plus privée et réduit le retour dans le micro.", "Chuchotage n'a pas de publicité, pas de suivi et pas d'historique de transcription enregistré."] },
    },
    de: {
      nav: "Download",
      homeAvailability: "Verfügbar für iPhone, iPad, Android und Mac. Windows kommt bald.",
      homeCtaTitle: "Wähle dein Gerät und hol dir Chuchotage.",
      meta: { title: "Chuchotage holen | Live-Übersetzungs-App herunterladen", description: "Hol dir Chuchotage für iPhone, iPad, Android und Mac und sieh, was als Nächstes kommt.", ogTitle: "Chuchotage holen", ogDescription: "Wähle dein Gerät und installiere Chuchotage für ruhige Live-Übersetzung." },
      hero: { eyebrow: "Download", title: "Chuchotage holen", lede: "Wähle dein Gerät und installiere die ruhige App für Live-Übersetzung.", primary: "App Store öffnen", secondary: "Mac-Download" },
      platforms: { eyebrow: "Geräte", title: "Starte mit der Version für das, was du nutzt.", iosBody: "Installiere Chuchotage aus dem App Store.", androidBody: "Installiere Chuchotage aus Google Play.", macBody: "Lade Chuchotage für Mac herunter.", windowsBody: "Der Windows-Download kommt bald.", store: "App Store öffnen", play: "Google Play öffnen", macAction: "Für Mac herunterladen", soon: "Demnächst" },
      qr: { eyebrow: "Scannen zum Installieren", title: "Scannen. Den passenden Store öffnen.", body: "Richte dein Telefon auf den Code, um Chuchotage im App Store oder bei Google Play zu öffnen.", action: "Auf diesem Gerät öffnen", alt: "QR-Code zum Herunterladen von Chuchotage" },
      direct: { eyebrow: "Desktop", title: "Lade die Mac-App herunter. Windows kommt als Nächstes.", macStatus: "Bereit zum Download", windowsStatus: "Demnächst" },
      notes: { eyebrow: "Vor dem Start", title: "Melde dich an und trage Kopfhörer.", items: ["Nutze ChatGPT-Anmeldung, wo unterstützt, einen Test, wenn verfügbar, oder deinen eigenen OpenAI-Schlüssel.", "Kopfhörer halten die Übersetzung privater und reduzieren Rückkopplung ins Mikrofon.", "Chuchotage hat keine Werbung, kein Tracking und keinen gespeicherten Transkriptverlauf."] },
    },
    pt: {
      nav: "Download",
      homeAvailability: "Disponível para iPhone, iPad, Android e Mac. Windows chega em breve.",
      homeCtaTitle: "Escolha seu dispositivo e obtenha Chuchotage.",
      meta: { title: "Obter Chuchotage | Baixar o app de tradução ao vivo", description: "Obtenha Chuchotage para iPhone, iPad, Android e Mac e veja o que vem depois.", ogTitle: "Obter Chuchotage", ogDescription: "Escolha seu dispositivo e instale Chuchotage para tradução ao vivo discreta." },
      hero: { eyebrow: "Download", title: "Obter Chuchotage", lede: "Escolha seu dispositivo e instale o app discreto de tradução ao vivo.", primary: "Abrir App Store", secondary: "Download para Mac" },
      platforms: { eyebrow: "Dispositivos", title: "Comece pela versão para o que você usa.", iosBody: "Instale Chuchotage pela App Store.", androidBody: "Instale Chuchotage pelo Google Play.", macBody: "Baixe Chuchotage para Mac.", windowsBody: "O download para Windows chega em breve.", store: "Abrir App Store", play: "Abrir Google Play", macAction: "Baixar para Mac", soon: "Em breve" },
      qr: { eyebrow: "Escaneie para instalar", title: "Escaneie. Abra a loja certa.", body: "Aponte seu telefone para o código para abrir o Chuchotage na App Store ou no Google Play.", action: "Abrir neste dispositivo", alt: "Código QR para baixar o Chuchotage" },
      direct: { eyebrow: "Desktop", title: "Baixe o app para Mac. Windows vem depois.", macStatus: "Pronto para baixar", windowsStatus: "Em breve" },
      notes: { eyebrow: "Antes de começar", title: "Faça login e use fones.", items: ["Use login com ChatGPT onde houver suporte, um teste quando disponível, ou sua própria chave OpenAI.", "Fones ajudam a manter a tradução mais privada e reduzem retorno no microfone.", "Chuchotage não tem anúncios, rastreamento nem histórico de transcrições salvo."] },
    },
  };

  ["ja", "ru", "zh", "ko", "hi", "id", "vi"].forEach((language) => {
    DOWNLOAD_PAGES[language] = { ...DOWNLOAD_PAGES.en };
  });

  Object.entries(DOWNLOAD_PAGES).forEach(([language, pageCopy]) => {
    if (!COPY[language]) return;
    COPY[language].download = pageCopy;
    COPY[language].meta.download = pageCopy.meta;
    COPY[language].shared.nav.download = pageCopy.nav;
  });

  function renderHome(copy, locale) {
    const home = copy.home;
    const download = copy.download || DOWNLOAD_PAGES.en;
    return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">${escapeHtml(home.hero.eyebrow)}</p>
          <h1>Chuchotage</h1>
          <p class="lede">${escapeHtml(home.hero.lede)}</p>
          <div class="hero-actions">
            <a class="primary-link" href="download/">${escapeHtml(download.nav)}</a>
            <a class="secondary-link" href="#how-it-works">${escapeHtml(copy.shared.nav.how)}</a>
          </div>
          <p class="availability-note">${escapeHtml(download.homeAvailability || home.hero.availability)}</p>
        </div>
        <div class="product-visual" aria-hidden="true">
          <div class="phone-shell">
            <div class="phone-speaker" aria-hidden="true"></div>
            <div class="preview-top">
              <span>Chuchotage</span>
              <span>${escapeHtml(home.hero.ready)}</span>
            </div>
            <div class="preview-control" aria-hidden="true">
              <span class="preview-ring"></span>
              <span class="preview-wave preview-wave-one"></span>
              <span class="preview-wave preview-wave-two"></span>
              <span class="preview-wave preview-wave-three"></span>
            </div>
            <p class="preview-button-label">${escapeHtml(home.hero.button)}</p>
          </div>
        </div>
      </section>

      <section class="workflow-section" id="how-it-works">
        <div class="section-inner two-column">
          <div>
            <p class="eyebrow">${escapeHtml(home.workflow.eyebrow)}</p>
            <h2>${escapeHtml(home.workflow.title)}</h2>
          </div>
          <ol class="step-list" aria-label="Chuchotage setup steps">
            ${home.workflow.steps.map((step, index) => `
              <li>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <p>${escapeHtml(step)}</p>
              </li>
            `).join("")}
          </ol>
        </div>
      </section>

      <section class="language-section" id="languages">
        <div class="section-inner language-layout">
          <div>
            <p class="eyebrow">${escapeHtml(home.languages.eyebrow)}</p>
            <h2>${escapeHtml(home.languages.title)}</h2>
          </div>
          <div>
            <p class="language-intro">${escapeHtml(home.languages.intro)}</p>
            <div class="language-groups">
              <section class="language-group" aria-labelledby="output-languages-title">
                <div class="language-group-header">
                  <h3 id="output-languages-title">${escapeHtml(home.languages.outputTitle)}</h3>
                  <p>${escapeHtml(home.languages.outputBody)}</p>
                </div>
                <ul class="language-list output-language-list" aria-label="Supported Chuchotage output languages">
                  ${renderLanguageList(OUTPUT_LANGUAGES, locale, true)}
                </ul>
              </section>

              <section class="language-group" id="supported-input-languages" aria-labelledby="input-languages-title">
                <div class="language-group-header">
                  <h3 id="input-languages-title">${escapeHtml(home.languages.inputTitle)}</h3>
                  <p>${escapeHtml(home.languages.inputBody)}</p>
                </div>
                <ul class="language-list input-language-list" aria-label="Automatically detected Chuchotage input languages">
                  ${renderLanguageList(INPUT_LANGUAGES, locale, false)}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section class="use-section">
        <div class="section-inner">
          <p class="eyebrow">${escapeHtml(home.use.eyebrow)}</p>
          <h2>${escapeHtml(home.use.title)}</h2>
          <div class="use-list" aria-label="Chuchotage use cases">
            ${home.use.items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
          </div>
        </div>
      </section>

      <section class="story-section" id="meaning">
        <div class="section-inner story-layout">
          <p class="eyebrow">${escapeHtml(home.story.eyebrow)}</p>
          <h2>${escapeHtml(home.story.title)}</h2>
          <p>${escapeHtml(home.story.body)}</p>
          <a class="text-link" href="blog/why-chuchotage/">${escapeHtml(home.story.link)}</a>
        </div>
      </section>

      <section class="detail-section">
        <div class="section-inner">
          <p class="eyebrow">${escapeHtml(home.detail.eyebrow)}</p>
          <h2>${escapeHtml(home.detail.title)}</h2>
          <div class="detail-grid" aria-label="Chuchotage privacy highlights">
            ${home.detail.items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
          </div>
        </div>
      </section>

      <section class="limits-section">
        <div class="section-inner two-column">
          <div>
            <p class="eyebrow">${escapeHtml(home.limits.eyebrow)}</p>
            <h2>${escapeHtml(home.limits.title)}</h2>
          </div>
          <p>${escapeHtml(home.limits.body)}</p>
        </div>
      </section>

      <section class="faq-section" aria-label="Frequently asked questions">
        <div class="section-inner">
          <p class="eyebrow">${escapeHtml(home.faq.eyebrow)}</p>
          <h2>${escapeHtml(home.faq.title)}</h2>
          <div class="faq-list">
            ${home.faq.items.map(([question, answer]) => `
              <details>
                <summary>${escapeHtml(question)}</summary>
                <p>${escapeHtml(answer)}</p>
              </details>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="cta-section">
        <div class="section-inner cta-layout cta-layout-with-qr">
          <div class="cta-copy">
            <p class="eyebrow">${escapeHtml(download.nav)}</p>
            <h2>${escapeHtml(download.homeCtaTitle || home.cta.title)}</h2>
            <p>${escapeHtml(download.qr.body)}</p>
            <div class="hero-actions">
              <a class="secondary-link" href="download/">${escapeHtml(download.nav)}</a>
              <a class="text-link" href="${STORE_REDIRECT_URL}">${escapeHtml(download.qr.action)}</a>
            </div>
          </div>
          <a class="qr-frame cta-qr-frame" href="${STORE_REDIRECT_URL}" aria-label="${escapeHtml(download.qr.action)}">
            <img class="qr-code-image" src="${STORE_QR_URL}" alt="${escapeHtml(download.qr.alt)}">
          </a>
        </div>
      </section>
    `;
  }

  function renderDownload(copy) {
    const download = copy.download || DOWNLOAD_PAGES.en;
    return `
      <section class="download-hero">
        <div class="download-hero-copy">
          <p class="eyebrow">${escapeHtml(download.hero.eyebrow)}</p>
          <h1>${escapeHtml(download.hero.title)}</h1>
          <p class="lede">${escapeHtml(download.hero.lede)}</p>
          <div class="hero-actions">
            <a class="primary-link store-action-link" href="${APP_STORE_URL}">${storeIcon("app")}<span>${escapeHtml(download.hero.primary)}</span></a>
            <a class="secondary-link store-action-link" href="${PLAY_STORE_URL}">${storeIcon("play")}<span>${escapeHtml(download.platforms.play)}</span></a>
            <a class="secondary-link" href="#desktop-downloads">${escapeHtml(download.hero.secondary)}</a>
          </div>
        </div>
        <div class="download-signal" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>

      <section class="download-section store-qr-section" id="phone-qr">
        <div class="section-inner store-qr-layout">
          <div class="store-qr-copy">
            <p class="eyebrow">${escapeHtml(download.qr.eyebrow)}</p>
            <h2>${escapeHtml(download.qr.title)}</h2>
            <p>${escapeHtml(download.qr.body)}</p>
            <a class="text-link" href="${STORE_REDIRECT_URL}">${escapeHtml(download.qr.action)}</a>
          </div>
          <a class="qr-frame" href="${STORE_REDIRECT_URL}" aria-label="${escapeHtml(download.qr.action)}">
            <img class="qr-code-image" src="${STORE_QR_URL}" alt="${escapeHtml(download.qr.alt)}">
          </a>
        </div>
      </section>

      <section class="download-section" id="platforms">
        <div class="section-inner">
          <div class="download-section-heading">
            <p class="eyebrow">${escapeHtml(download.platforms.eyebrow)}</p>
            <h2>${escapeHtml(download.platforms.title)}</h2>
          </div>
          <div class="platform-list">
            <section class="platform-row platform-row-live">
              <div>
                <p class="platform-kicker">iPhone and iPad</p>
                <h3>iOS App Store</h3>
                <p>${escapeHtml(download.platforms.iosBody)}</p>
              </div>
              <a class="store-link" href="${APP_STORE_URL}">${storeIcon("app")}<span>${escapeHtml(download.platforms.store)}</span></a>
            </section>
            <section class="platform-row platform-row-live">
              <div>
                <p class="platform-kicker">Android</p>
                <h3>Google Play</h3>
                <p>${escapeHtml(download.platforms.androidBody)}</p>
              </div>
              <a class="store-link" href="${PLAY_STORE_URL}">${storeIcon("play")}<span>${escapeHtml(download.platforms.play)}</span></a>
            </section>
            <section class="platform-row">
              <div>
                <p class="platform-kicker">Mac</p>
                <h3>Mac app</h3>
                <p>${escapeHtml(download.platforms.macBody)}</p>
              </div>
              <a class="store-link" href="/download/macos/Chuchotage-0.1.1-macOS.dmg">${escapeHtml(download.platforms.macAction)}</a>
            </section>
            <section class="platform-row">
              <div>
                <p class="platform-kicker">Windows</p>
                <h3>Windows app</h3>
                <p>${escapeHtml(download.platforms.windowsBody)}</p>
              </div>
              <span class="store-link store-link-disabled">${escapeHtml(download.platforms.soon)}</span>
            </section>
          </div>
        </div>
      </section>

      <section class="download-section direct-download-section" id="desktop-downloads">
        <div class="section-inner download-detail-layout">
          <div>
            <p class="eyebrow">${escapeHtml(download.direct.eyebrow)}</p>
            <h2>${escapeHtml(download.direct.title)}</h2>
          </div>
          <div class="download-table">
            <a class="download-row" href="/download/macos/Chuchotage-0.1.1-macOS.dmg">
              <span>macOS</span>
              <span>Chuchotage for Mac</span>
              <span>${escapeHtml(download.direct.macStatus)}</span>
            </a>
            <div class="download-row download-row-disabled">
              <span>Windows</span>
              <span>Chuchotage for Windows</span>
              <span>${escapeHtml(download.direct.windowsStatus)}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="download-section install-note-section">
        <div class="section-inner download-detail-layout">
          <div>
            <p class="eyebrow">${escapeHtml(download.notes.eyebrow)}</p>
            <h2>${escapeHtml(download.notes.title)}</h2>
          </div>
          <div class="install-notes">
            ${download.notes.items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderPrivacy(copy) {
    const privacy = copy.privacy;
    return `
      <article class="policy">
        <p class="eyebrow">${escapeHtml(privacy.updated)}</p>
        <h1>${escapeHtml(privacy.title)}</h1>
        <p>${escapeHtml(privacy.intro)}</p>
        ${privacy.sections.map((section) => `
          <h2>${escapeHtml(section.heading)}</h2>
          ${renderParagraphs(section.paragraphs)}
        `).join("")}
      </article>
    `;
  }

  function renderBlog(copy) {
    const blog = copy.blog;
    return `
      <section class="article-hero">
        <p class="eyebrow">${escapeHtml(blog.eyebrow)}</p>
        <h1>${escapeHtml(blog.title)}</h1>
        <p class="lede">${escapeHtml(blog.lede)}</p>
      </section>

      <section class="article-body" aria-label="${escapeHtml(blog.listLabel)}">
        <div class="note-list">
          <a class="note-link" href="why-chuchotage/">
            <span class="eyebrow">${escapeHtml(blog.noteDate)}</span>
            <span class="note-title">${escapeHtml(blog.noteTitle)}</span>
            <span class="note-summary">${escapeHtml(blog.noteSummary)}</span>
          </a>
        </div>
      </section>
    `;
  }

  function renderStory(copy) {
    const story = copy.story;
    return `
      <article>
        <header class="article-hero">
          <p class="eyebrow">${escapeHtml(story.eyebrow)}</p>
          <h1>${escapeHtml(story.title)}</h1>
          <p class="lede">${escapeHtml(story.lede)}</p>
        </header>

        <div class="article-body">
          ${story.sections.map((section) => `
            ${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ""}
            ${renderParagraphs(section.paragraphs)}
            ${section.list ? `<ul>${section.list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
          `).join("")}
          <p><a href="../../">${escapeHtml(story.returnLink)}</a>.</p>
        </div>
      </article>
    `;
  }

  const RENDERERS = {
    home: renderHome,
    download: renderDownload,
    privacy: renderPrivacy,
    blog: renderBlog,
    story: renderStory,
  };

  function updateTextBindings(copy) {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = getPathValue(copy.shared, element.dataset.i18n);
      if (value) {
        element.textContent = value;
      }
    });
  }

  function updateMetadata(copy, page) {
    const meta = copy.meta[page];
    if (!meta) return;
    document.title = meta.title;
    setMeta("description", meta.description);
    setProperty("og:title", meta.ogTitle);
    setProperty("og:description", meta.ogDescription);
  }

  function setMeta(name, content) {
    const element = document.querySelector(`meta[name="${name}"]`);
    if (element) element.setAttribute("content", content);
  }

  function setProperty(property, content) {
    const element = document.querySelector(`meta[property="${property}"]`);
    if (element) element.setAttribute("content", content);
  }

  function languageOptionsMarkup() {
    return LANGUAGES.map(({ code, label }) => `<option value="${code}">${label}</option>`).join("");
  }

  function hydrateLanguageSelectors(language, copy) {
    document.querySelectorAll(".site-language-select").forEach((selector) => {
      if (!selector.dataset.optionsReady) {
        selector.innerHTML = languageOptionsMarkup();
        selector.dataset.optionsReady = "true";
      }
      selector.value = language;
      selector.setAttribute("aria-label", copy.shared.language.aria);

      if (selector.dataset.languageBound !== "true") {
        selector.addEventListener("change", () => {
          const selectedLanguage = normalizeLanguage(selector.value) || "en";
          setStoredLanguage(selectedLanguage);
          renderPage(selectedLanguage);
        });
        selector.dataset.languageBound = "true";
      }
    });
  }

  function renderPage(language) {
    const page = document.body.dataset.page || "home";
    const copy = COPY[language] || COPY.en;
    const renderer = RENDERERS[page];
    const main = document.querySelector("main");

    document.documentElement.lang = language;
    updateTextBindings(copy);
    updateMetadata(copy, page);

    if (main && renderer) {
      main.innerHTML = renderer(copy, language);
    }

    hydrateLanguageSelectors(language, copy);
  }

  function setStoredLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage can be disabled; the selector should still work for the current page.
    }
  }

  function getStoredLanguage() {
    try {
      return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    } catch {
      return "";
    }
  }

  function getQueryLanguage() {
    try {
      return normalizeLanguage(new URLSearchParams(window.location.search).get("lang"));
    } catch {
      return "";
    }
  }

  function getBrowserLanguage() {
    const candidates = [navigator.language, ...(navigator.languages || [])];
    for (const candidate of candidates) {
      const language = normalizeLanguage(candidate);
      if (language) return language;
    }
    return "";
  }

  async function getGeoLanguage() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1400);
    try {
      const response = await fetch(GEO_ENDPOINT, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return "";
      const json = await response.json();
      return normalizeLanguage(json.language);
    } catch {
      return "";
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function init() {
    hydrateLanguageSelectors("en", COPY.en);

    const queryLanguage = getQueryLanguage();
    if (queryLanguage) {
      setStoredLanguage(queryLanguage);
      renderPage(queryLanguage);
      return;
    }

    const storedLanguage = getStoredLanguage();
    if (storedLanguage) {
      renderPage(storedLanguage);
      return;
    }

    renderPage("en");

    const geoLanguage = await getGeoLanguage();
    renderPage(geoLanguage || getBrowserLanguage() || "en");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
