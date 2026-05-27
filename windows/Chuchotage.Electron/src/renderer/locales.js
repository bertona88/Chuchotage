(function () {
  const supportedLocales = ["en", "es", "pt", "fr", "ja", "ru", "zh", "de", "ko", "hi", "id", "vi", "it"];
  const supportedOutputLanguages = supportedLocales;

  const englishLanguageNames = {
    en: "English",
    es: "Spanish",
    pt: "Portuguese",
    fr: "French",
    ja: "Japanese",
    ru: "Russian",
    zh: "Chinese",
    de: "German",
    ko: "Korean",
    hi: "Hindi",
    id: "Indonesian",
    vi: "Vietnamese",
    it: "Italian",
  };

  const messages = {
    en: {
      app: { subtitle: "Windows audio translation" },
      status: { ready: "Ready", connecting: "Connecting", listening: "Listening", error: "Error", unknown: "{status}" },
      start: { start: "Start translation", stop: "Stop translation" },
      signal: {
        label: "Input signal",
        idle: "Idle",
        live: "Live signal",
        none: "No signal yet",
        aria: "Audio input signal: {status}",
        ariaIdle: "Audio input signal: Idle",
      },
      route: {
        kicker: "Audio routing",
        heading: "Choose how Chuchotage avoids feedback",
        checking: "Checking route",
        setupAria: "Audio routing setup",
        mode: {
          singleHeadset: { title: "Single headset", detail: "No admin" },
          separateDevices: { title: "Separate devices", detail: "No admin fallback" },
          virtualDevice: { title: "Virtual device", detail: "Admin route" },
        },
        status: {
          chooseDevices: "Choose devices",
          singleReady: "Single headset ready",
          useOneDevice: "Use one device",
          secondDeviceNeeded: "Second device needed",
          chooseSeparate: "Choose separate devices",
          virtualReady: "Virtual route selected",
          twoDeviceReady: "Two-device route ready",
        },
        content: {
          singleHeadset: {
            copy: "Use this first when the source app and translated audio should both use the same headset.",
            steps: [
              "Choose the headset for Capture output.",
              "Chuchotage will use the same headset for Translated playback.",
              "If capture fails on this Windows route, switch to Separate devices or Virtual device.",
            ],
            note: "This uses Windows process-loopback capture to listen to PC audio while excluding Chuchotage playback. It needs Windows 11 or Windows 10 Build 20348 or newer.",
          },
          separateDevices: {
            copy: "Use this no-admin fallback when the single-headset route is not available.",
            steps: [
              "Connect two active playback devices.",
              "Route Teams, a browser, or the source app to the first device in Windows.",
              "Set Capture output to that source device and Translated playback to the device you will listen to.",
            ],
            note: "Keep the two Chuchotage device selections different to avoid translating its own playback.",
          },
          virtualDevice: {
            copy: "Use this when an admin can create or approve a virtual playback device.",
            steps: [
              "Create or enable the virtual device outside Chuchotage.",
              "Route the source app audio to that virtual device.",
              "Set Capture output to the virtual device and Translated playback to your real headphones.",
            ],
            note: "Chuchotage does not install audio drivers; it uses devices that Windows already exposes.",
          },
        },
      },
      field: {
        originalApp: "Original app",
        outputLanguage: "Output language",
        supportedInputLanguages: "Supported input languages",
        captureOutput: "Capture output",
        translatedPlayback: "Translated playback",
      },
      mix: { title: "Mix", label: "Translated {translated}% / Original {original}%" },
      credential: {
        placeholder: "OpenAI API key, saved key, or Codex auth",
        remember: "Remember on this Windows account",
        saved: "Saved API key available. Leave the field empty to use it.",
        codex: "Codex auth found. Leave the field empty to use Codex.",
        enter: "Enter an API key, or sign in with Codex first.",
      },
      button: { refreshDevices: "Refresh devices" },
      session: { none: "Do not control original app" },
      routeError: {
        chooseDevices: "Choose capture and translated playback devices before starting.",
        singleSame: "Single-headset mode uses the same device for Capture output and Translated playback.",
        virtualSeparate: "Choose the virtual device for Capture output and your real headphones for Translated playback.",
        separateNeedsTwo: "Separate-devices mode needs two different playback devices. Add a second output, refresh devices, then choose one for Translated playback.",
      },
      backend: {
        logPath: "Log: {path}",
        exited: "Chuchotage backend exited.",
        commandFailed: "Chuchotage backend command failed.",
        alreadyRunning: "Translation is already running.",
        unknownCommand: "Unknown backend command: {command}",
        missingCredential: "Enter an OpenAI API key, or sign in with Codex so ~/.codex/auth.json exists.",
        chooseCapture: "Choose a capture output device.",
        choosePlayback: "Choose a translated playback device.",
        connectionFailed: "OpenAI Realtime connection failed. Detail: {detail}",
        playbackFailed: "Could not start translated playback on {device}. Detail: {detail}",
        captureFailed: "Could not capture audio from {device}. Detail: {detail}",
        unknownCapture: "Could not choose an audio capture route.",
        socketClosed: "Realtime translation socket closed.",
        audioCaptureFailed: "Audio capture failed. Detail: {detail}",
        audioChannel: "Audio channel is not initialized.",
        realtimeClient: "Realtime client is not initialized.",
        realtimeFailed: "Realtime translation failed.",
        unexpected: "Translation stopped unexpectedly.",
      },
    },
    es: {
      app: { subtitle: "Traducción de audio de Windows" },
      status: { ready: "Listo", connecting: "Conectando", listening: "Escuchando", error: "Error", unknown: "{status}" },
      start: { start: "Iniciar traducción", stop: "Detener traducción" },
      signal: {
        label: "Señal de entrada",
        idle: "Inactivo",
        live: "Señal activa",
        none: "Sin señal aún",
        aria: "Señal de audio de entrada: {status}",
        ariaIdle: "Señal de audio de entrada: Inactivo",
      },
      route: {
        kicker: "Enrutamiento de audio",
        heading: "Elige cómo Chuchotage evita el acople",
        checking: "Comprobando ruta",
        setupAria: "Configuración de enrutamiento de audio",
        mode: {
          singleHeadset: { title: "Un solo auricular", detail: "Sin admin" },
          separateDevices: { title: "Dispositivos separados", detail: "Alternativa sin admin" },
          virtualDevice: { title: "Dispositivo virtual", detail: "Ruta admin" },
        },
        status: {
          chooseDevices: "Elige dispositivos",
          singleReady: "Auricular único listo",
          useOneDevice: "Usa un dispositivo",
          secondDeviceNeeded: "Se necesita otro dispositivo",
          chooseSeparate: "Elige dispositivos separados",
          virtualReady: "Ruta virtual seleccionada",
          twoDeviceReady: "Ruta de dos dispositivos lista",
        },
        content: {
          singleHeadset: {
            copy: "Usa esto primero cuando la app de origen y el audio traducido deban usar el mismo auricular.",
            steps: [
              "Elige el auricular en Salida a capturar.",
              "Chuchotage usará el mismo auricular para Reproducción traducida.",
              "Si falla la captura en esta ruta de Windows, cambia a Dispositivos separados o Dispositivo virtual.",
            ],
            note: "Usa la captura de bucle por proceso de Windows para escuchar el audio del PC excluyendo la reproducción de Chuchotage. Necesita Windows 11 o Windows 10 Build 20348 o posterior.",
          },
          separateDevices: {
            copy: "Usa esta alternativa sin admin cuando la ruta de auricular único no esté disponible.",
            steps: [
              "Conecta dos dispositivos de reproducción activos.",
              "Envía Teams, un navegador o la app de origen al primer dispositivo en Windows.",
              "Pon Salida a capturar en ese dispositivo de origen y Reproducción traducida en el dispositivo que escucharás.",
            ],
            note: "Mantén distintas las dos selecciones de dispositivos de Chuchotage para evitar traducir su propia reproducción.",
          },
          virtualDevice: {
            copy: "Usa esto cuando un admin pueda crear o aprobar un dispositivo de reproducción virtual.",
            steps: [
              "Crea o habilita el dispositivo virtual fuera de Chuchotage.",
              "Envía el audio de la app de origen a ese dispositivo virtual.",
              "Pon Salida a capturar en el dispositivo virtual y Reproducción traducida en tus auriculares reales.",
            ],
            note: "Chuchotage no instala controladores de audio; usa los dispositivos que Windows ya muestra.",
          },
        },
      },
      field: {
        originalApp: "App original",
        outputLanguage: "Idioma de salida",
        supportedInputLanguages: "Idiomas de entrada compatibles",
        captureOutput: "Salida a capturar",
        translatedPlayback: "Reproducción traducida",
      },
      mix: { title: "Mezcla", label: "Traducido {translated}% / Original {original}%" },
      credential: {
        placeholder: "Clave de API de OpenAI, clave guardada o auth de Codex",
        remember: "Recordar en esta cuenta de Windows",
        saved: "Hay una clave de API guardada. Deja el campo vacío para usarla.",
        codex: "Se encontró auth de Codex. Deja el campo vacío para usar Codex.",
        enter: "Introduce una clave de API o inicia sesión con Codex primero.",
      },
      button: { refreshDevices: "Actualizar dispositivos" },
      session: { none: "No controlar la app original" },
      routeError: {
        chooseDevices: "Elige los dispositivos de captura y reproducción traducida antes de iniciar.",
        singleSame: "El modo de un solo auricular usa el mismo dispositivo para Salida a capturar y Reproducción traducida.",
        virtualSeparate: "Elige el dispositivo virtual para Salida a capturar y tus auriculares reales para Reproducción traducida.",
        separateNeedsTwo: "El modo de dispositivos separados necesita dos dispositivos de reproducción distintos. Añade una segunda salida, actualiza dispositivos y elige una para Reproducción traducida.",
      },
      backend: {
        logPath: "Registro: {path}",
        exited: "El backend de Chuchotage se cerró.",
        commandFailed: "Falló el comando del backend de Chuchotage.",
        alreadyRunning: "La traducción ya está en ejecución.",
        unknownCommand: "Comando de backend desconocido: {command}",
        missingCredential: "Introduce una clave de API de OpenAI o inicia sesión con Codex para que exista ~/.codex/auth.json.",
        chooseCapture: "Elige un dispositivo de salida a capturar.",
        choosePlayback: "Elige un dispositivo de reproducción traducida.",
        connectionFailed: "Falló la conexión con OpenAI Realtime. Detalle: {detail}",
        playbackFailed: "No se pudo iniciar la reproducción traducida en {device}. Detalle: {detail}",
        captureFailed: "No se pudo capturar audio desde {device}. Detalle: {detail}",
        unknownCapture: "No se pudo elegir una ruta de captura de audio.",
        socketClosed: "Se cerró el socket de Realtime Translation.",
        audioCaptureFailed: "Falló la captura de audio. Detalle: {detail}",
        audioChannel: "El canal de audio no está inicializado.",
        realtimeClient: "El cliente Realtime no está inicializado.",
        realtimeFailed: "Falló Realtime Translation.",
        unexpected: "La traducción se detuvo inesperadamente.",
      },
    },
    pt: {
      app: { subtitle: "Tradução de áudio do Windows" },
      status: { ready: "Pronto", connecting: "Conectando", listening: "Ouvindo", error: "Erro", unknown: "{status}" },
      start: { start: "Iniciar tradução", stop: "Parar tradução" },
      signal: {
        label: "Sinal de entrada",
        idle: "Inativo",
        live: "Sinal ativo",
        none: "Ainda sem sinal",
        aria: "Sinal de áudio de entrada: {status}",
        ariaIdle: "Sinal de áudio de entrada: Inativo",
      },
      route: {
        kicker: "Roteamento de áudio",
        heading: "Escolha como o Chuchotage evita retorno",
        checking: "Verificando rota",
        setupAria: "Configuração de roteamento de áudio",
        mode: {
          singleHeadset: { title: "Headset único", detail: "Sem admin" },
          separateDevices: { title: "Dispositivos separados", detail: "Alternativa sem admin" },
          virtualDevice: { title: "Dispositivo virtual", detail: "Rota admin" },
        },
        status: {
          chooseDevices: "Escolha dispositivos",
          singleReady: "Headset único pronto",
          useOneDevice: "Use um dispositivo",
          secondDeviceNeeded: "Segundo dispositivo necessário",
          chooseSeparate: "Escolha dispositivos separados",
          virtualReady: "Rota virtual selecionada",
          twoDeviceReady: "Rota com dois dispositivos pronta",
        },
        content: {
          singleHeadset: {
            copy: "Use isto primeiro quando o app de origem e o áudio traduzido devem usar o mesmo headset.",
            steps: [
              "Escolha o headset em Saída de captura.",
              "O Chuchotage usará o mesmo headset para Reprodução traduzida.",
              "Se a captura falhar nesta rota do Windows, mude para Dispositivos separados ou Dispositivo virtual.",
            ],
            note: "Isto usa captura de loopback por processo do Windows para ouvir o áudio do PC excluindo a reprodução do Chuchotage. Precisa do Windows 11 ou Windows 10 Build 20348 ou mais recente.",
          },
          separateDevices: {
            copy: "Use esta alternativa sem admin quando a rota de headset único não estiver disponível.",
            steps: [
              "Conecte dois dispositivos de reprodução ativos.",
              "Envie o Teams, um navegador ou o app de origem para o primeiro dispositivo no Windows.",
              "Defina Saída de captura para esse dispositivo de origem e Reprodução traduzida para o dispositivo que você vai ouvir.",
            ],
            note: "Mantenha diferentes as duas seleções de dispositivo do Chuchotage para evitar traduzir a própria reprodução.",
          },
          virtualDevice: {
            copy: "Use isto quando um admin puder criar ou aprovar um dispositivo de reprodução virtual.",
            steps: [
              "Crie ou habilite o dispositivo virtual fora do Chuchotage.",
              "Envie o áudio do app de origem para esse dispositivo virtual.",
              "Defina Saída de captura para o dispositivo virtual e Reprodução traduzida para seus fones reais.",
            ],
            note: "O Chuchotage não instala drivers de áudio; ele usa os dispositivos que o Windows já expõe.",
          },
        },
      },
      field: {
        originalApp: "App original",
        outputLanguage: "Idioma de saída",
        supportedInputLanguages: "Idiomas de entrada compatíveis",
        captureOutput: "Saída de captura",
        translatedPlayback: "Reprodução traduzida",
      },
      mix: { title: "Mistura", label: "Traduzido {translated}% / Original {original}%" },
      credential: {
        placeholder: "Chave de API da OpenAI, chave salva ou auth do Codex",
        remember: "Lembrar nesta conta do Windows",
        saved: "Há uma chave de API salva. Deixe o campo vazio para usá-la.",
        codex: "Auth do Codex encontrado. Deixe o campo vazio para usar o Codex.",
        enter: "Insira uma chave de API ou entre com o Codex primeiro.",
      },
      button: { refreshDevices: "Atualizar dispositivos" },
      session: { none: "Não controlar o app original" },
      routeError: {
        chooseDevices: "Escolha os dispositivos de captura e reprodução traduzida antes de iniciar.",
        singleSame: "O modo de headset único usa o mesmo dispositivo para Saída de captura e Reprodução traduzida.",
        virtualSeparate: "Escolha o dispositivo virtual para Saída de captura e seus fones reais para Reprodução traduzida.",
        separateNeedsTwo: "O modo de dispositivos separados precisa de dois dispositivos de reprodução diferentes. Adicione uma segunda saída, atualize os dispositivos e escolha uma para Reprodução traduzida.",
      },
      backend: {
        logPath: "Log: {path}",
        exited: "O backend do Chuchotage foi encerrado.",
        commandFailed: "Falha no comando do backend do Chuchotage.",
        alreadyRunning: "A tradução já está em execução.",
        unknownCommand: "Comando de backend desconhecido: {command}",
        missingCredential: "Insira uma chave de API da OpenAI ou entre com o Codex para que ~/.codex/auth.json exista.",
        chooseCapture: "Escolha um dispositivo de saída de captura.",
        choosePlayback: "Escolha um dispositivo de reprodução traduzida.",
        connectionFailed: "Falha na conexão com o OpenAI Realtime. Detalhe: {detail}",
        playbackFailed: "Não foi possível iniciar a reprodução traduzida em {device}. Detalhe: {detail}",
        captureFailed: "Não foi possível capturar áudio de {device}. Detalhe: {detail}",
        unknownCapture: "Não foi possível escolher uma rota de captura de áudio.",
        socketClosed: "O socket do Realtime Translation foi fechado.",
        audioCaptureFailed: "Falha na captura de áudio. Detalhe: {detail}",
        audioChannel: "O canal de áudio não foi inicializado.",
        realtimeClient: "O cliente Realtime não foi inicializado.",
        realtimeFailed: "Falha no Realtime Translation.",
        unexpected: "A tradução parou inesperadamente.",
      },
    },
    fr: {
      app: { subtitle: "Traduction audio Windows" },
      status: { ready: "Prêt", connecting: "Connexion", listening: "Écoute", error: "Erreur", unknown: "{status}" },
      start: { start: "Démarrer la traduction", stop: "Arrêter la traduction" },
      signal: {
        label: "Signal d'entrée",
        idle: "Inactif",
        live: "Signal actif",
        none: "Aucun signal pour l'instant",
        aria: "Signal audio d'entrée : {status}",
        ariaIdle: "Signal audio d'entrée : Inactif",
      },
      route: {
        kicker: "Routage audio",
        heading: "Choisir comment Chuchotage évite le retour audio",
        checking: "Vérification du routage",
        setupAria: "Configuration du routage audio",
        mode: {
          singleHeadset: { title: "Un seul casque", detail: "Sans admin" },
          separateDevices: { title: "Appareils séparés", detail: "Solution sans admin" },
          virtualDevice: { title: "Appareil virtuel", detail: "Route admin" },
        },
        status: {
          chooseDevices: "Choisir les appareils",
          singleReady: "Casque unique prêt",
          useOneDevice: "Utiliser un appareil",
          secondDeviceNeeded: "Deuxième appareil requis",
          chooseSeparate: "Choisir des appareils séparés",
          virtualReady: "Route virtuelle sélectionnée",
          twoDeviceReady: "Route à deux appareils prête",
        },
        content: {
          singleHeadset: {
            copy: "À essayer d'abord lorsque l'application source et l'audio traduit doivent utiliser le même casque.",
            steps: [
              "Choisissez le casque pour Sortie à capturer.",
              "Chuchotage utilisera le même casque pour Lecture traduite.",
              "Si la capture échoue avec cette route Windows, passez à Appareils séparés ou Appareil virtuel.",
            ],
            note: "Cela utilise la capture loopback par processus de Windows pour écouter l'audio du PC en excluant la lecture de Chuchotage. Windows 11 ou Windows 10 Build 20348 ou plus récent est requis.",
          },
          separateDevices: {
            copy: "Utilisez cette solution sans admin lorsque la route avec un seul casque n'est pas disponible.",
            steps: [
              "Connectez deux appareils de lecture actifs.",
              "Acheminez Teams, un navigateur ou l'application source vers le premier appareil dans Windows.",
              "Réglez Sortie à capturer sur cet appareil source et Lecture traduite sur l'appareil que vous écouterez.",
            ],
            note: "Gardez les deux sélections d'appareil Chuchotage différentes pour éviter de traduire sa propre lecture.",
          },
          virtualDevice: {
            copy: "Utilisez ceci lorsqu'un admin peut créer ou approuver un appareil de lecture virtuel.",
            steps: [
              "Créez ou activez l'appareil virtuel hors de Chuchotage.",
              "Acheminez l'audio de l'application source vers cet appareil virtuel.",
              "Réglez Sortie à capturer sur l'appareil virtuel et Lecture traduite sur votre vrai casque.",
            ],
            note: "Chuchotage n'installe pas de pilotes audio ; il utilise les appareils déjà exposés par Windows.",
          },
        },
      },
      field: {
        originalApp: "Application d'origine",
        outputLanguage: "Langue de sortie",
        supportedInputLanguages: "Langues d'entrée prises en charge",
        captureOutput: "Sortie à capturer",
        translatedPlayback: "Lecture traduite",
      },
      mix: { title: "Mixage", label: "Traduit {translated}% / Original {original}%" },
      credential: {
        placeholder: "Clé API OpenAI, clé enregistrée ou auth Codex",
        remember: "Mémoriser sur ce compte Windows",
        saved: "Une clé API enregistrée est disponible. Laissez le champ vide pour l'utiliser.",
        codex: "Auth Codex trouvée. Laissez le champ vide pour utiliser Codex.",
        enter: "Saisissez une clé API ou connectez-vous d'abord avec Codex.",
      },
      button: { refreshDevices: "Actualiser les appareils" },
      session: { none: "Ne pas contrôler l'application d'origine" },
      routeError: {
        chooseDevices: "Choisissez les appareils de capture et de lecture traduite avant de démarrer.",
        singleSame: "Le mode casque unique utilise le même appareil pour Sortie à capturer et Lecture traduite.",
        virtualSeparate: "Choisissez l'appareil virtuel pour Sortie à capturer et votre vrai casque pour Lecture traduite.",
        separateNeedsTwo: "Le mode appareils séparés exige deux appareils de lecture différents. Ajoutez une deuxième sortie, actualisez les appareils, puis choisissez-en une pour Lecture traduite.",
      },
      backend: {
        logPath: "Journal : {path}",
        exited: "Le backend Chuchotage s'est arrêté.",
        commandFailed: "La commande du backend Chuchotage a échoué.",
        alreadyRunning: "La traduction est déjà en cours.",
        unknownCommand: "Commande backend inconnue : {command}",
        missingCredential: "Saisissez une clé API OpenAI ou connectez-vous avec Codex pour que ~/.codex/auth.json existe.",
        chooseCapture: "Choisissez un appareil de sortie à capturer.",
        choosePlayback: "Choisissez un appareil de lecture traduite.",
        connectionFailed: "La connexion à OpenAI Realtime a échoué. Détail : {detail}",
        playbackFailed: "Impossible de démarrer la lecture traduite sur {device}. Détail : {detail}",
        captureFailed: "Impossible de capturer l'audio depuis {device}. Détail : {detail}",
        unknownCapture: "Impossible de choisir une route de capture audio.",
        socketClosed: "Le socket Realtime Translation s'est fermé.",
        audioCaptureFailed: "La capture audio a échoué. Détail : {detail}",
        audioChannel: "Le canal audio n'est pas initialisé.",
        realtimeClient: "Le client Realtime n'est pas initialisé.",
        realtimeFailed: "Realtime Translation a échoué.",
        unexpected: "La traduction s'est arrêtée de façon inattendue.",
      },
    },
    ja: {
      app: { subtitle: "Windowsの音声翻訳" },
      status: { ready: "準備完了", connecting: "接続中", listening: "リスニング中", error: "エラー", unknown: "{status}" },
      start: { start: "翻訳を開始", stop: "翻訳を停止" },
      signal: {
        label: "入力信号",
        idle: "待機中",
        live: "信号あり",
        none: "まだ信号がありません",
        aria: "入力音声信号: {status}",
        ariaIdle: "入力音声信号: 待機中",
      },
      route: {
        kicker: "音声ルーティング",
        heading: "Chuchotageがフィードバックを避ける方法を選択",
        checking: "ルートを確認中",
        setupAria: "音声ルーティング設定",
        mode: {
          singleHeadset: { title: "単一ヘッドセット", detail: "管理者不要" },
          separateDevices: { title: "別々のデバイス", detail: "管理者不要の代替" },
          virtualDevice: { title: "仮想デバイス", detail: "管理者ルート" },
        },
        status: {
          chooseDevices: "デバイスを選択",
          singleReady: "単一ヘッドセット準備完了",
          useOneDevice: "1つのデバイスを使用",
          secondDeviceNeeded: "2つ目のデバイスが必要",
          chooseSeparate: "別々のデバイスを選択",
          virtualReady: "仮想ルートを選択済み",
          twoDeviceReady: "2デバイスルート準備完了",
        },
        content: {
          singleHeadset: {
            copy: "ソースアプリと翻訳音声の両方で同じヘッドセットを使う場合は、まずこれを使います。",
            steps: [
              "キャプチャ出力にヘッドセットを選びます。",
              "Chuchotageは翻訳再生にも同じヘッドセットを使います。",
              "このWindowsルートでキャプチャに失敗する場合は、別々のデバイスまたは仮想デバイスに切り替えます。",
            ],
            note: "Windowsのプロセスループバックキャプチャを使い、Chuchotageの再生を除外しながらPC音声を聞きます。Windows 11またはWindows 10 Build 20348以降が必要です。",
          },
          separateDevices: {
            copy: "単一ヘッドセットのルートが使えない場合の、管理者不要の代替です。",
            steps: [
              "有効な再生デバイスを2つ接続します。",
              "Teams、ブラウザー、またはソースアプリをWindowsで1つ目のデバイスにルーティングします。",
              "キャプチャ出力をそのソースデバイスに、翻訳再生を聞くデバイスに設定します。",
            ],
            note: "Chuchotage自身の再生を翻訳しないよう、2つのデバイス選択は別々にしてください。",
          },
          virtualDevice: {
            copy: "管理者が仮想再生デバイスを作成または承認できる場合に使います。",
            steps: [
              "Chuchotageの外で仮想デバイスを作成または有効化します。",
              "ソースアプリの音声をその仮想デバイスへルーティングします。",
              "キャプチャ出力を仮想デバイスに、翻訳再生を実際のヘッドホンに設定します。",
            ],
            note: "Chuchotageは音声ドライバーをインストールしません。Windowsがすでに公開しているデバイスを使います。",
          },
        },
      },
      field: {
        originalApp: "元のアプリ",
        outputLanguage: "出力言語",
        supportedInputLanguages: "対応入力言語",
        captureOutput: "キャプチャ出力",
        translatedPlayback: "翻訳再生",
      },
      mix: { title: "ミックス", label: "翻訳 {translated}% / 原音 {original}%" },
      credential: {
        placeholder: "OpenAI APIキー、保存済みキー、またはCodex認証",
        remember: "このWindowsアカウントに保存",
        saved: "保存済みAPIキーがあります。使うにはフィールドを空のままにします。",
        codex: "Codex認証が見つかりました。Codexを使うにはフィールドを空のままにします。",
        enter: "APIキーを入力するか、先にCodexでサインインしてください。",
      },
      button: { refreshDevices: "デバイスを更新" },
      session: { none: "元のアプリを制御しない" },
      routeError: {
        chooseDevices: "開始する前にキャプチャと翻訳再生のデバイスを選んでください。",
        singleSame: "単一ヘッドセットモードでは、キャプチャ出力と翻訳再生に同じデバイスを使います。",
        virtualSeparate: "キャプチャ出力には仮想デバイス、翻訳再生には実際のヘッドホンを選んでください。",
        separateNeedsTwo: "別々のデバイスモードには異なる再生デバイスが2つ必要です。2つ目の出力を追加し、デバイスを更新して、翻訳再生用に選んでください。",
      },
      backend: {
        logPath: "ログ: {path}",
        exited: "Chuchotageバックエンドが終了しました。",
        commandFailed: "Chuchotageバックエンドコマンドに失敗しました。",
        alreadyRunning: "翻訳はすでに実行中です。",
        unknownCommand: "不明なバックエンドコマンド: {command}",
        missingCredential: "OpenAI APIキーを入力するか、~/.codex/auth.jsonが存在するようにCodexでサインインしてください。",
        chooseCapture: "キャプチャ出力デバイスを選んでください。",
        choosePlayback: "翻訳再生デバイスを選んでください。",
        connectionFailed: "OpenAI Realtimeへの接続に失敗しました。詳細: {detail}",
        playbackFailed: "{device}で翻訳再生を開始できませんでした。詳細: {detail}",
        captureFailed: "{device}から音声をキャプチャできませんでした。詳細: {detail}",
        unknownCapture: "音声キャプチャルートを選べませんでした。",
        socketClosed: "Realtime Translationソケットが閉じました。",
        audioCaptureFailed: "音声キャプチャに失敗しました。詳細: {detail}",
        audioChannel: "音声チャンネルが初期化されていません。",
        realtimeClient: "Realtimeクライアントが初期化されていません。",
        realtimeFailed: "Realtime Translationに失敗しました。",
        unexpected: "翻訳が予期せず停止しました。",
      },
    },
    ru: {
      app: { subtitle: "Перевод аудио Windows" },
      status: { ready: "Готово", connecting: "Подключение", listening: "Прослушивание", error: "Ошибка", unknown: "{status}" },
      start: { start: "Начать перевод", stop: "Остановить перевод" },
      signal: {
        label: "Входной сигнал",
        idle: "Ожидание",
        live: "Сигнал есть",
        none: "Сигнала пока нет",
        aria: "Входной аудиосигнал: {status}",
        ariaIdle: "Входной аудиосигнал: Ожидание",
      },
      route: {
        kicker: "Маршрутизация аудио",
        heading: "Выберите, как Chuchotage избегает обратной связи",
        checking: "Проверка маршрута",
        setupAria: "Настройка маршрутизации аудио",
        mode: {
          singleHeadset: { title: "Одна гарнитура", detail: "Без админа" },
          separateDevices: { title: "Разные устройства", detail: "Запасной вариант без админа" },
          virtualDevice: { title: "Виртуальное устройство", detail: "Маршрут админа" },
        },
        status: {
          chooseDevices: "Выберите устройства",
          singleReady: "Одна гарнитура готова",
          useOneDevice: "Используйте одно устройство",
          secondDeviceNeeded: "Нужно второе устройство",
          chooseSeparate: "Выберите разные устройства",
          virtualReady: "Виртуальный маршрут выбран",
          twoDeviceReady: "Маршрут с двумя устройствами готов",
        },
        content: {
          singleHeadset: {
            copy: "Сначала используйте это, если исходное приложение и переведенный звук должны идти через одну гарнитуру.",
            steps: [
              "Выберите гарнитуру для Выхода захвата.",
              "Chuchotage будет использовать ту же гарнитуру для Воспроизведения перевода.",
              "Если захват на этом маршруте Windows не сработает, переключитесь на Разные устройства или Виртуальное устройство.",
            ],
            note: "Используется Windows process-loopback capture: звук ПК слушается без воспроизведения Chuchotage. Нужна Windows 11 или Windows 10 Build 20348 и новее.",
          },
          separateDevices: {
            copy: "Используйте этот вариант без админа, если маршрут с одной гарнитурой недоступен.",
            steps: [
              "Подключите два активных устройства воспроизведения.",
              "Направьте Teams, браузер или исходное приложение на первое устройство в Windows.",
              "Установите Выход захвата на это исходное устройство, а Воспроизведение перевода на устройство, которое будете слушать.",
            ],
            note: "Выберите разные устройства Chuchotage, чтобы не переводить собственное воспроизведение.",
          },
          virtualDevice: {
            copy: "Используйте это, когда админ может создать или разрешить виртуальное устройство воспроизведения.",
            steps: [
              "Создайте или включите виртуальное устройство вне Chuchotage.",
              "Направьте звук исходного приложения на это виртуальное устройство.",
              "Установите Выход захвата на виртуальное устройство, а Воспроизведение перевода на реальные наушники.",
            ],
            note: "Chuchotage не устанавливает аудиодрайверы; он использует устройства, которые уже показывает Windows.",
          },
        },
      },
      field: {
        originalApp: "Исходное приложение",
        outputLanguage: "Язык вывода",
        supportedInputLanguages: "Поддерживаемые входные языки",
        captureOutput: "Выход захвата",
        translatedPlayback: "Воспроизведение перевода",
      },
      mix: { title: "Микс", label: "Перевод {translated}% / Оригинал {original}%" },
      credential: {
        placeholder: "API-ключ OpenAI, сохраненный ключ или авторизация Codex",
        remember: "Запомнить в этой учетной записи Windows",
        saved: "Есть сохраненный API-ключ. Оставьте поле пустым, чтобы использовать его.",
        codex: "Найдена авторизация Codex. Оставьте поле пустым, чтобы использовать Codex.",
        enter: "Введите API-ключ или сначала войдите через Codex.",
      },
      button: { refreshDevices: "Обновить устройства" },
      session: { none: "Не управлять исходным приложением" },
      routeError: {
        chooseDevices: "Перед запуском выберите устройства захвата и воспроизведения перевода.",
        singleSame: "Режим одной гарнитуры использует одно и то же устройство для Выхода захвата и Воспроизведения перевода.",
        virtualSeparate: "Выберите виртуальное устройство для Выхода захвата и реальные наушники для Воспроизведения перевода.",
        separateNeedsTwo: "Для режима разных устройств нужны два разных устройства воспроизведения. Добавьте второй выход, обновите устройства и выберите один для Воспроизведения перевода.",
      },
      backend: {
        logPath: "Журнал: {path}",
        exited: "Бэкенд Chuchotage завершил работу.",
        commandFailed: "Команда бэкенда Chuchotage не выполнена.",
        alreadyRunning: "Перевод уже запущен.",
        unknownCommand: "Неизвестная команда бэкенда: {command}",
        missingCredential: "Введите API-ключ OpenAI или войдите через Codex, чтобы существовал ~/.codex/auth.json.",
        chooseCapture: "Выберите устройство выхода захвата.",
        choosePlayback: "Выберите устройство воспроизведения перевода.",
        connectionFailed: "Не удалось подключиться к OpenAI Realtime. Подробности: {detail}",
        playbackFailed: "Не удалось запустить воспроизведение перевода на {device}. Подробности: {detail}",
        captureFailed: "Не удалось захватить аудио с {device}. Подробности: {detail}",
        unknownCapture: "Не удалось выбрать маршрут захвата аудио.",
        socketClosed: "Сокет Realtime Translation закрылся.",
        audioCaptureFailed: "Сбой захвата аудио. Подробности: {detail}",
        audioChannel: "Аудиоканал не инициализирован.",
        realtimeClient: "Клиент Realtime не инициализирован.",
        realtimeFailed: "Realtime Translation завершился с ошибкой.",
        unexpected: "Перевод неожиданно остановился.",
      },
    },
    zh: {
      app: { subtitle: "Windows 音频翻译" },
      status: { ready: "就绪", connecting: "正在连接", listening: "正在聆听", error: "错误", unknown: "{status}" },
      start: { start: "开始翻译", stop: "停止翻译" },
      signal: {
        label: "输入信号",
        idle: "空闲",
        live: "有实时信号",
        none: "尚无信号",
        aria: "音频输入信号：{status}",
        ariaIdle: "音频输入信号：空闲",
      },
      route: {
        kicker: "音频路由",
        heading: "选择 Chuchotage 避免回授的方式",
        checking: "正在检查路由",
        setupAria: "音频路由设置",
        mode: {
          singleHeadset: { title: "单个耳机", detail: "无需管理员" },
          separateDevices: { title: "分离设备", detail: "无需管理员的备用方案" },
          virtualDevice: { title: "虚拟设备", detail: "管理员路由" },
        },
        status: {
          chooseDevices: "选择设备",
          singleReady: "单耳机已就绪",
          useOneDevice: "使用一个设备",
          secondDeviceNeeded: "需要第二个设备",
          chooseSeparate: "选择分离设备",
          virtualReady: "已选择虚拟路由",
          twoDeviceReady: "双设备路由已就绪",
        },
        content: {
          singleHeadset: {
            copy: "当源应用和翻译音频都应使用同一个耳机时，先使用此方式。",
            steps: [
              "为捕获输出选择耳机。",
              "Chuchotage 会使用同一个耳机进行翻译播放。",
              "如果此 Windows 路由无法捕获，请切换到分离设备或虚拟设备。",
            ],
            note: "这使用 Windows 进程回环捕获来监听电脑音频，同时排除 Chuchotage 播放。需要 Windows 11 或 Windows 10 Build 20348 及更新版本。",
          },
          separateDevices: {
            copy: "当单耳机路由不可用时，使用这个无需管理员的备用方案。",
            steps: [
              "连接两个活动播放设备。",
              "在 Windows 中将 Teams、浏览器或源应用路由到第一个设备。",
              "将捕获输出设为该源设备，将翻译播放设为你要收听的设备。",
            ],
            note: "保持两个 Chuchotage 设备选择不同，以免翻译自己的播放音频。",
          },
          virtualDevice: {
            copy: "当管理员可以创建或批准虚拟播放设备时使用此方式。",
            steps: [
              "在 Chuchotage 外部创建或启用虚拟设备。",
              "将源应用音频路由到该虚拟设备。",
              "将捕获输出设为虚拟设备，将翻译播放设为真实耳机。",
            ],
            note: "Chuchotage 不安装音频驱动；它使用 Windows 已经公开的设备。",
          },
        },
      },
      field: {
        originalApp: "原始应用",
        outputLanguage: "输出语言",
        supportedInputLanguages: "支持的输入语言",
        captureOutput: "捕获输出",
        translatedPlayback: "翻译播放",
      },
      mix: { title: "混音", label: "翻译 {translated}% / 原音 {original}%" },
      credential: {
        placeholder: "OpenAI API 密钥、已保存密钥或 Codex 认证",
        remember: "在此 Windows 帐户上记住",
        saved: "有已保存的 API 密钥。留空即可使用。",
        codex: "已找到 Codex 认证。留空即可使用 Codex。",
        enter: "请输入 API 密钥，或先使用 Codex 登录。",
      },
      button: { refreshDevices: "刷新设备" },
      session: { none: "不控制原始应用" },
      routeError: {
        chooseDevices: "开始前请选择捕获和翻译播放设备。",
        singleSame: "单耳机模式对捕获输出和翻译播放使用同一个设备。",
        virtualSeparate: "为捕获输出选择虚拟设备，为翻译播放选择真实耳机。",
        separateNeedsTwo: "分离设备模式需要两个不同的播放设备。添加第二个输出，刷新设备，然后选择一个用于翻译播放。",
      },
      backend: {
        logPath: "日志：{path}",
        exited: "Chuchotage 后端已退出。",
        commandFailed: "Chuchotage 后端命令失败。",
        alreadyRunning: "翻译已在运行。",
        unknownCommand: "未知后端命令：{command}",
        missingCredential: "请输入 OpenAI API 密钥，或使用 Codex 登录以生成 ~/.codex/auth.json。",
        chooseCapture: "请选择捕获输出设备。",
        choosePlayback: "请选择翻译播放设备。",
        connectionFailed: "OpenAI Realtime 连接失败。详情：{detail}",
        playbackFailed: "无法在 {device} 上开始翻译播放。详情：{detail}",
        captureFailed: "无法从 {device} 捕获音频。详情：{detail}",
        unknownCapture: "无法选择音频捕获路由。",
        socketClosed: "Realtime Translation 套接字已关闭。",
        audioCaptureFailed: "音频捕获失败。详情：{detail}",
        audioChannel: "音频通道尚未初始化。",
        realtimeClient: "Realtime 客户端尚未初始化。",
        realtimeFailed: "Realtime Translation 失败。",
        unexpected: "翻译意外停止。",
      },
    },
    de: {
      app: { subtitle: "Windows-Audioübersetzung" },
      status: { ready: "Bereit", connecting: "Verbinden", listening: "Hört zu", error: "Fehler", unknown: "{status}" },
      start: { start: "Übersetzung starten", stop: "Übersetzung stoppen" },
      signal: {
        label: "Eingangssignal",
        idle: "Inaktiv",
        live: "Signal aktiv",
        none: "Noch kein Signal",
        aria: "Audio-Eingangssignal: {status}",
        ariaIdle: "Audio-Eingangssignal: Inaktiv",
      },
      route: {
        kicker: "Audio-Routing",
        heading: "Auswählen, wie Chuchotage Rückkopplung vermeidet",
        checking: "Route wird geprüft",
        setupAria: "Audio-Routing-Einrichtung",
        mode: {
          singleHeadset: { title: "Ein Headset", detail: "Ohne Admin" },
          separateDevices: { title: "Getrennte Geräte", detail: "Fallback ohne Admin" },
          virtualDevice: { title: "Virtuelles Gerät", detail: "Admin-Route" },
        },
        status: {
          chooseDevices: "Geräte auswählen",
          singleReady: "Ein Headset bereit",
          useOneDevice: "Ein Gerät verwenden",
          secondDeviceNeeded: "Zweites Gerät nötig",
          chooseSeparate: "Getrennte Geräte auswählen",
          virtualReady: "Virtuelle Route ausgewählt",
          twoDeviceReady: "Zwei-Geräte-Route bereit",
        },
        content: {
          singleHeadset: {
            copy: "Zuerst verwenden, wenn Quell-App und übersetztes Audio dasselbe Headset nutzen sollen.",
            steps: [
              "Wählen Sie das Headset für Aufnahmeausgang.",
              "Chuchotage verwendet dasselbe Headset für Übersetzte Wiedergabe.",
              "Wenn die Aufnahme auf dieser Windows-Route fehlschlägt, wechseln Sie zu Getrennte Geräte oder Virtuelles Gerät.",
            ],
            note: "Dies nutzt Windows Process-Loopback-Aufnahme, um PC-Audio zu hören und Chuchotage-Wiedergabe auszuschließen. Erforderlich ist Windows 11 oder Windows 10 Build 20348 oder neuer.",
          },
          separateDevices: {
            copy: "Diesen Fallback ohne Admin verwenden, wenn die Ein-Headset-Route nicht verfügbar ist.",
            steps: [
              "Verbinden Sie zwei aktive Wiedergabegeräte.",
              "Routen Sie Teams, einen Browser oder die Quell-App in Windows auf das erste Gerät.",
              "Setzen Sie Aufnahmeausgang auf dieses Quellgerät und Übersetzte Wiedergabe auf das Gerät, das Sie hören.",
            ],
            note: "Halten Sie die beiden Chuchotage-Geräte unterschiedlich, damit die eigene Wiedergabe nicht übersetzt wird.",
          },
          virtualDevice: {
            copy: "Verwenden, wenn ein Admin ein virtuelles Wiedergabegerät erstellen oder freigeben kann.",
            steps: [
              "Erstellen oder aktivieren Sie das virtuelle Gerät außerhalb von Chuchotage.",
              "Routen Sie das Audio der Quell-App auf dieses virtuelle Gerät.",
              "Setzen Sie Aufnahmeausgang auf das virtuelle Gerät und Übersetzte Wiedergabe auf Ihre echten Kopfhörer.",
            ],
            note: "Chuchotage installiert keine Audiotreiber; es nutzt Geräte, die Windows bereits bereitstellt.",
          },
        },
      },
      field: {
        originalApp: "Original-App",
        outputLanguage: "Ausgabesprache",
        supportedInputLanguages: "Unterstützte Eingabesprachen",
        captureOutput: "Aufnahmeausgang",
        translatedPlayback: "Übersetzte Wiedergabe",
      },
      mix: { title: "Mix", label: "Übersetzt {translated}% / Original {original}%" },
      credential: {
        placeholder: "OpenAI-API-Schlüssel, gespeicherter Schlüssel oder Codex-Auth",
        remember: "Auf diesem Windows-Konto merken",
        saved: "Gespeicherter API-Schlüssel verfügbar. Feld leer lassen, um ihn zu verwenden.",
        codex: "Codex-Auth gefunden. Feld leer lassen, um Codex zu verwenden.",
        enter: "API-Schlüssel eingeben oder zuerst mit Codex anmelden.",
      },
      button: { refreshDevices: "Geräte aktualisieren" },
      session: { none: "Original-App nicht steuern" },
      routeError: {
        chooseDevices: "Wählen Sie vor dem Start Aufnahme- und Übersetzte-Wiedergabe-Geräte.",
        singleSame: "Der Ein-Headset-Modus verwendet dasselbe Gerät für Aufnahmeausgang und Übersetzte Wiedergabe.",
        virtualSeparate: "Wählen Sie das virtuelle Gerät für Aufnahmeausgang und Ihre echten Kopfhörer für Übersetzte Wiedergabe.",
        separateNeedsTwo: "Der Modus Getrennte Geräte benötigt zwei verschiedene Wiedergabegeräte. Fügen Sie einen zweiten Ausgang hinzu, aktualisieren Sie die Geräte und wählen Sie einen für Übersetzte Wiedergabe.",
      },
      backend: {
        logPath: "Protokoll: {path}",
        exited: "Das Chuchotage-Backend wurde beendet.",
        commandFailed: "Der Chuchotage-Backend-Befehl ist fehlgeschlagen.",
        alreadyRunning: "Die Übersetzung läuft bereits.",
        unknownCommand: "Unbekannter Backend-Befehl: {command}",
        missingCredential: "Geben Sie einen OpenAI-API-Schlüssel ein oder melden Sie sich mit Codex an, damit ~/.codex/auth.json existiert.",
        chooseCapture: "Wählen Sie ein Aufnahmeausgangsgerät.",
        choosePlayback: "Wählen Sie ein Gerät für übersetzte Wiedergabe.",
        connectionFailed: "OpenAI Realtime-Verbindung fehlgeschlagen. Detail: {detail}",
        playbackFailed: "Übersetzte Wiedergabe auf {device} konnte nicht gestartet werden. Detail: {detail}",
        captureFailed: "Audio von {device} konnte nicht aufgenommen werden. Detail: {detail}",
        unknownCapture: "Es konnte keine Audio-Aufnahmeroute gewählt werden.",
        socketClosed: "Realtime-Translation-Socket wurde geschlossen.",
        audioCaptureFailed: "Audioaufnahme fehlgeschlagen. Detail: {detail}",
        audioChannel: "Audiokanal ist nicht initialisiert.",
        realtimeClient: "Realtime-Client ist nicht initialisiert.",
        realtimeFailed: "Realtime Translation fehlgeschlagen.",
        unexpected: "Die Übersetzung wurde unerwartet beendet.",
      },
    },
    ko: {
      app: { subtitle: "Windows 오디오 번역" },
      status: { ready: "준비됨", connecting: "연결 중", listening: "듣는 중", error: "오류", unknown: "{status}" },
      start: { start: "번역 시작", stop: "번역 중지" },
      signal: {
        label: "입력 신호",
        idle: "대기 중",
        live: "실시간 신호",
        none: "아직 신호 없음",
        aria: "오디오 입력 신호: {status}",
        ariaIdle: "오디오 입력 신호: 대기 중",
      },
      route: {
        kicker: "오디오 라우팅",
        heading: "Chuchotage가 피드백을 피하는 방법 선택",
        checking: "경로 확인 중",
        setupAria: "오디오 라우팅 설정",
        mode: {
          singleHeadset: { title: "단일 헤드셋", detail: "관리자 불필요" },
          separateDevices: { title: "분리된 장치", detail: "관리자 없는 대안" },
          virtualDevice: { title: "가상 장치", detail: "관리자 경로" },
        },
        status: {
          chooseDevices: "장치 선택",
          singleReady: "단일 헤드셋 준비됨",
          useOneDevice: "장치 하나 사용",
          secondDeviceNeeded: "두 번째 장치 필요",
          chooseSeparate: "분리된 장치 선택",
          virtualReady: "가상 경로 선택됨",
          twoDeviceReady: "두 장치 경로 준비됨",
        },
        content: {
          singleHeadset: {
            copy: "소스 앱과 번역 오디오가 같은 헤드셋을 사용해야 할 때 먼저 사용하세요.",
            steps: [
              "캡처 출력에 사용할 헤드셋을 선택합니다.",
              "Chuchotage는 번역 재생에도 같은 헤드셋을 사용합니다.",
              "이 Windows 경로에서 캡처가 실패하면 분리된 장치 또는 가상 장치로 전환하세요.",
            ],
            note: "Windows 프로세스 루프백 캡처를 사용해 Chuchotage 재생을 제외하고 PC 오디오를 듣습니다. Windows 11 또는 Windows 10 Build 20348 이상이 필요합니다.",
          },
          separateDevices: {
            copy: "단일 헤드셋 경로를 사용할 수 없을 때 쓰는 관리자 없는 대안입니다.",
            steps: [
              "활성 재생 장치 두 개를 연결합니다.",
              "Windows에서 Teams, 브라우저 또는 소스 앱을 첫 번째 장치로 라우팅합니다.",
              "캡처 출력은 해당 소스 장치로, 번역 재생은 들을 장치로 설정합니다.",
            ],
            note: "Chuchotage의 자체 재생이 번역되지 않도록 두 장치 선택을 서로 다르게 유지하세요.",
          },
          virtualDevice: {
            copy: "관리자가 가상 재생 장치를 만들거나 승인할 수 있을 때 사용하세요.",
            steps: [
              "Chuchotage 밖에서 가상 장치를 만들거나 활성화합니다.",
              "소스 앱 오디오를 해당 가상 장치로 라우팅합니다.",
              "캡처 출력은 가상 장치로, 번역 재생은 실제 헤드폰으로 설정합니다.",
            ],
            note: "Chuchotage는 오디오 드라이버를 설치하지 않습니다. Windows가 이미 노출한 장치를 사용합니다.",
          },
        },
      },
      field: {
        originalApp: "원본 앱",
        outputLanguage: "출력 언어",
        supportedInputLanguages: "지원되는 입력 언어",
        captureOutput: "캡처 출력",
        translatedPlayback: "번역 재생",
      },
      mix: { title: "믹스", label: "번역 {translated}% / 원본 {original}%" },
      credential: {
        placeholder: "OpenAI API 키, 저장된 키 또는 Codex 인증",
        remember: "이 Windows 계정에 기억",
        saved: "저장된 API 키가 있습니다. 사용하려면 필드를 비워 두세요.",
        codex: "Codex 인증을 찾았습니다. Codex를 사용하려면 필드를 비워 두세요.",
        enter: "API 키를 입력하거나 먼저 Codex로 로그인하세요.",
      },
      button: { refreshDevices: "장치 새로 고침" },
      session: { none: "원본 앱 제어 안 함" },
      routeError: {
        chooseDevices: "시작하기 전에 캡처 및 번역 재생 장치를 선택하세요.",
        singleSame: "단일 헤드셋 모드는 캡처 출력과 번역 재생에 같은 장치를 사용합니다.",
        virtualSeparate: "캡처 출력에는 가상 장치를, 번역 재생에는 실제 헤드폰을 선택하세요.",
        separateNeedsTwo: "분리된 장치 모드에는 서로 다른 재생 장치 두 개가 필요합니다. 두 번째 출력을 추가하고 장치를 새로 고친 다음 번역 재생용 장치를 선택하세요.",
      },
      backend: {
        logPath: "로그: {path}",
        exited: "Chuchotage 백엔드가 종료되었습니다.",
        commandFailed: "Chuchotage 백엔드 명령이 실패했습니다.",
        alreadyRunning: "번역이 이미 실행 중입니다.",
        unknownCommand: "알 수 없는 백엔드 명령: {command}",
        missingCredential: "OpenAI API 키를 입력하거나 ~/.codex/auth.json이 있도록 Codex로 로그인하세요.",
        chooseCapture: "캡처 출력 장치를 선택하세요.",
        choosePlayback: "번역 재생 장치를 선택하세요.",
        connectionFailed: "OpenAI Realtime 연결에 실패했습니다. 세부 정보: {detail}",
        playbackFailed: "{device}에서 번역 재생을 시작할 수 없습니다. 세부 정보: {detail}",
        captureFailed: "{device}에서 오디오를 캡처할 수 없습니다. 세부 정보: {detail}",
        unknownCapture: "오디오 캡처 경로를 선택할 수 없습니다.",
        socketClosed: "Realtime Translation 소켓이 닫혔습니다.",
        audioCaptureFailed: "오디오 캡처에 실패했습니다. 세부 정보: {detail}",
        audioChannel: "오디오 채널이 초기화되지 않았습니다.",
        realtimeClient: "Realtime 클라이언트가 초기화되지 않았습니다.",
        realtimeFailed: "Realtime Translation에 실패했습니다.",
        unexpected: "번역이 예기치 않게 중지되었습니다.",
      },
    },
    hi: {
      app: { subtitle: "Windows ऑडियो अनुवाद" },
      status: { ready: "तैयार", connecting: "कनेक्ट हो रहा है", listening: "सुन रहा है", error: "त्रुटि", unknown: "{status}" },
      start: { start: "अनुवाद शुरू करें", stop: "अनुवाद रोकें" },
      signal: {
        label: "इनपुट सिग्नल",
        idle: "निष्क्रिय",
        live: "लाइव सिग्नल",
        none: "अभी कोई सिग्नल नहीं",
        aria: "ऑडियो इनपुट सिग्नल: {status}",
        ariaIdle: "ऑडियो इनपुट सिग्नल: निष्क्रिय",
      },
      route: {
        kicker: "ऑडियो रूटिंग",
        heading: "चुनें कि Chuchotage फीडबैक से कैसे बचे",
        checking: "रूट जांचा जा रहा है",
        setupAria: "ऑडियो रूटिंग सेटअप",
        mode: {
          singleHeadset: { title: "एक हेडसेट", detail: "एडमिन नहीं" },
          separateDevices: { title: "अलग डिवाइस", detail: "बिना एडमिन विकल्प" },
          virtualDevice: { title: "वर्चुअल डिवाइस", detail: "एडमिन रूट" },
        },
        status: {
          chooseDevices: "डिवाइस चुनें",
          singleReady: "एक हेडसेट तैयार",
          useOneDevice: "एक डिवाइस उपयोग करें",
          secondDeviceNeeded: "दूसरा डिवाइस चाहिए",
          chooseSeparate: "अलग डिवाइस चुनें",
          virtualReady: "वर्चुअल रूट चुना गया",
          twoDeviceReady: "दो-डिवाइस रूट तैयार",
        },
        content: {
          singleHeadset: {
            copy: "जब स्रोत ऐप और अनुवादित ऑडियो दोनों को एक ही हेडसेट इस्तेमाल करना हो, तो पहले इसे इस्तेमाल करें।",
            steps: [
              "कैप्चर आउटपुट के लिए हेडसेट चुनें।",
              "Chuchotage अनुवादित प्लेबैक के लिए वही हेडसेट इस्तेमाल करेगा।",
              "यदि इस Windows रूट पर कैप्चर विफल हो, तो अलग डिवाइस या वर्चुअल डिवाइस पर जाएं।",
            ],
            note: "यह Windows process-loopback capture का उपयोग करके Chuchotage प्लेबैक को हटाते हुए PC ऑडियो सुनता है। इसके लिए Windows 11 या Windows 10 Build 20348 या नया चाहिए।",
          },
          separateDevices: {
            copy: "जब एक-हेडसेट रूट उपलब्ध न हो, तो यह बिना एडमिन विकल्प इस्तेमाल करें।",
            steps: [
              "दो सक्रिय प्लेबैक डिवाइस कनेक्ट करें।",
              "Windows में Teams, ब्राउज़र या स्रोत ऐप को पहले डिवाइस पर रूट करें।",
              "कैप्चर आउटपुट को उस स्रोत डिवाइस पर और अनुवादित प्लेबैक को उस डिवाइस पर सेट करें जिसे आप सुनेंगे।",
            ],
            note: "Chuchotage के दोनों डिवाइस चयन अलग रखें ताकि वह अपना ही प्लेबैक अनुवाद न करे।",
          },
          virtualDevice: {
            copy: "जब कोई एडमिन वर्चुअल प्लेबैक डिवाइस बना या अनुमोदित कर सके, तब इसे इस्तेमाल करें।",
            steps: [
              "Chuchotage के बाहर वर्चुअल डिवाइस बनाएं या सक्षम करें।",
              "स्रोत ऐप ऑडियो को उस वर्चुअल डिवाइस पर रूट करें।",
              "कैप्चर आउटपुट को वर्चुअल डिवाइस पर और अनुवादित प्लेबैक को अपने असली हेडफोन पर सेट करें।",
            ],
            note: "Chuchotage ऑडियो ड्राइवर इंस्टॉल नहीं करता; यह Windows द्वारा पहले से दिखाए गए डिवाइस उपयोग करता है।",
          },
        },
      },
      field: {
        originalApp: "मूल ऐप",
        outputLanguage: "आउटपुट भाषा",
        supportedInputLanguages: "समर्थित इनपुट भाषाएँ",
        captureOutput: "कैप्चर आउटपुट",
        translatedPlayback: "अनुवादित प्लेबैक",
      },
      mix: { title: "मिक्स", label: "अनुवादित {translated}% / मूल {original}%" },
      credential: {
        placeholder: "OpenAI API कुंजी, सहेजी कुंजी, या Codex auth",
        remember: "इस Windows खाते पर याद रखें",
        saved: "सहेजी गई API कुंजी उपलब्ध है। उपयोग के लिए फ़ील्ड खाली छोड़ें।",
        codex: "Codex auth मिला। Codex उपयोग करने के लिए फ़ील्ड खाली छोड़ें।",
        enter: "API कुंजी डालें, या पहले Codex से साइन इन करें।",
      },
      button: { refreshDevices: "डिवाइस रीफ़्रेश करें" },
      session: { none: "मूल ऐप नियंत्रित न करें" },
      routeError: {
        chooseDevices: "शुरू करने से पहले कैप्चर और अनुवादित प्लेबैक डिवाइस चुनें।",
        singleSame: "एक-हेडसेट मोड कैप्चर आउटपुट और अनुवादित प्लेबैक के लिए वही डिवाइस इस्तेमाल करता है।",
        virtualSeparate: "कैप्चर आउटपुट के लिए वर्चुअल डिवाइस और अनुवादित प्लेबैक के लिए असली हेडफोन चुनें।",
        separateNeedsTwo: "अलग-डिवाइस मोड के लिए दो अलग प्लेबैक डिवाइस चाहिए। दूसरा आउटपुट जोड़ें, डिवाइस रीफ़्रेश करें, फिर अनुवादित प्लेबैक के लिए एक चुनें।",
      },
      backend: {
        logPath: "लॉग: {path}",
        exited: "Chuchotage बैकएंड बंद हो गया।",
        commandFailed: "Chuchotage बैकएंड कमांड विफल हुआ।",
        alreadyRunning: "अनुवाद पहले से चल रहा है।",
        unknownCommand: "अज्ञात बैकएंड कमांड: {command}",
        missingCredential: "OpenAI API कुंजी डालें, या Codex से साइन इन करें ताकि ~/.codex/auth.json मौजूद हो।",
        chooseCapture: "कैप्चर आउटपुट डिवाइस चुनें।",
        choosePlayback: "अनुवादित प्लेबैक डिवाइस चुनें।",
        connectionFailed: "OpenAI Realtime कनेक्शन विफल हुआ। विवरण: {detail}",
        playbackFailed: "{device} पर अनुवादित प्लेबैक शुरू नहीं हो सका। विवरण: {detail}",
        captureFailed: "{device} से ऑडियो कैप्चर नहीं हो सका। विवरण: {detail}",
        unknownCapture: "ऑडियो कैप्चर रूट नहीं चुना जा सका।",
        socketClosed: "Realtime Translation सॉकेट बंद हो गया।",
        audioCaptureFailed: "ऑडियो कैप्चर विफल हुआ। विवरण: {detail}",
        audioChannel: "ऑडियो चैनल शुरू नहीं है।",
        realtimeClient: "Realtime क्लाइंट शुरू नहीं है।",
        realtimeFailed: "Realtime Translation विफल हुआ।",
        unexpected: "अनुवाद अप्रत्याशित रूप से रुक गया।",
      },
    },
    id: {
      app: { subtitle: "Terjemahan audio Windows" },
      status: { ready: "Siap", connecting: "Menghubungkan", listening: "Mendengarkan", error: "Kesalahan", unknown: "{status}" },
      start: { start: "Mulai terjemahan", stop: "Hentikan terjemahan" },
      signal: {
        label: "Sinyal input",
        idle: "Diam",
        live: "Sinyal aktif",
        none: "Belum ada sinyal",
        aria: "Sinyal audio input: {status}",
        ariaIdle: "Sinyal audio input: Diam",
      },
      route: {
        kicker: "Perutean audio",
        heading: "Pilih cara Chuchotage menghindari umpan balik",
        checking: "Memeriksa rute",
        setupAria: "Pengaturan perutean audio",
        mode: {
          singleHeadset: { title: "Satu headset", detail: "Tanpa admin" },
          separateDevices: { title: "Perangkat terpisah", detail: "Cadangan tanpa admin" },
          virtualDevice: { title: "Perangkat virtual", detail: "Rute admin" },
        },
        status: {
          chooseDevices: "Pilih perangkat",
          singleReady: "Satu headset siap",
          useOneDevice: "Gunakan satu perangkat",
          secondDeviceNeeded: "Perlu perangkat kedua",
          chooseSeparate: "Pilih perangkat terpisah",
          virtualReady: "Rute virtual dipilih",
          twoDeviceReady: "Rute dua perangkat siap",
        },
        content: {
          singleHeadset: {
            copy: "Gunakan ini terlebih dahulu saat aplikasi sumber dan audio terjemahan harus memakai headset yang sama.",
            steps: [
              "Pilih headset untuk Output tangkapan.",
              "Chuchotage akan memakai headset yang sama untuk Pemutaran terjemahan.",
              "Jika tangkapan gagal pada rute Windows ini, beralih ke Perangkat terpisah atau Perangkat virtual.",
            ],
            note: "Ini memakai tangkapan process-loopback Windows untuk mendengarkan audio PC sambil mengecualikan pemutaran Chuchotage. Membutuhkan Windows 11 atau Windows 10 Build 20348 atau lebih baru.",
          },
          separateDevices: {
            copy: "Gunakan cadangan tanpa admin ini saat rute satu headset tidak tersedia.",
            steps: [
              "Hubungkan dua perangkat pemutaran aktif.",
              "Rutekan Teams, browser, atau aplikasi sumber ke perangkat pertama di Windows.",
              "Atur Output tangkapan ke perangkat sumber itu dan Pemutaran terjemahan ke perangkat yang akan Anda dengarkan.",
            ],
            note: "Jaga agar dua pilihan perangkat Chuchotage berbeda agar tidak menerjemahkan pemutarannya sendiri.",
          },
          virtualDevice: {
            copy: "Gunakan ini saat admin dapat membuat atau menyetujui perangkat pemutaran virtual.",
            steps: [
              "Buat atau aktifkan perangkat virtual di luar Chuchotage.",
              "Rutekan audio aplikasi sumber ke perangkat virtual itu.",
              "Atur Output tangkapan ke perangkat virtual dan Pemutaran terjemahan ke headphone asli Anda.",
            ],
            note: "Chuchotage tidak memasang driver audio; ia memakai perangkat yang sudah ditampilkan Windows.",
          },
        },
      },
      field: {
        originalApp: "Aplikasi asli",
        outputLanguage: "Bahasa output",
        supportedInputLanguages: "Bahasa input yang didukung",
        captureOutput: "Output tangkapan",
        translatedPlayback: "Pemutaran terjemahan",
      },
      mix: { title: "Campuran", label: "Terjemahan {translated}% / Asli {original}%" },
      credential: {
        placeholder: "Kunci API OpenAI, kunci tersimpan, atau auth Codex",
        remember: "Ingat di akun Windows ini",
        saved: "Kunci API tersimpan tersedia. Kosongkan kolom untuk memakainya.",
        codex: "Auth Codex ditemukan. Kosongkan kolom untuk memakai Codex.",
        enter: "Masukkan kunci API, atau masuk dengan Codex terlebih dahulu.",
      },
      button: { refreshDevices: "Segarkan perangkat" },
      session: { none: "Jangan kontrol aplikasi asli" },
      routeError: {
        chooseDevices: "Pilih perangkat tangkapan dan pemutaran terjemahan sebelum memulai.",
        singleSame: "Mode satu headset memakai perangkat yang sama untuk Output tangkapan dan Pemutaran terjemahan.",
        virtualSeparate: "Pilih perangkat virtual untuk Output tangkapan dan headphone asli Anda untuk Pemutaran terjemahan.",
        separateNeedsTwo: "Mode perangkat terpisah membutuhkan dua perangkat pemutaran berbeda. Tambahkan output kedua, segarkan perangkat, lalu pilih satu untuk Pemutaran terjemahan.",
      },
      backend: {
        logPath: "Log: {path}",
        exited: "Backend Chuchotage keluar.",
        commandFailed: "Perintah backend Chuchotage gagal.",
        alreadyRunning: "Terjemahan sudah berjalan.",
        unknownCommand: "Perintah backend tidak dikenal: {command}",
        missingCredential: "Masukkan kunci API OpenAI, atau masuk dengan Codex agar ~/.codex/auth.json ada.",
        chooseCapture: "Pilih perangkat output tangkapan.",
        choosePlayback: "Pilih perangkat pemutaran terjemahan.",
        connectionFailed: "Koneksi OpenAI Realtime gagal. Detail: {detail}",
        playbackFailed: "Tidak dapat memulai pemutaran terjemahan di {device}. Detail: {detail}",
        captureFailed: "Tidak dapat menangkap audio dari {device}. Detail: {detail}",
        unknownCapture: "Tidak dapat memilih rute tangkapan audio.",
        socketClosed: "Socket Realtime Translation tertutup.",
        audioCaptureFailed: "Tangkapan audio gagal. Detail: {detail}",
        audioChannel: "Kanal audio belum diinisialisasi.",
        realtimeClient: "Klien Realtime belum diinisialisasi.",
        realtimeFailed: "Realtime Translation gagal.",
        unexpected: "Terjemahan berhenti tiba-tiba.",
      },
    },
    vi: {
      app: { subtitle: "Dịch âm thanh Windows" },
      status: { ready: "Sẵn sàng", connecting: "Đang kết nối", listening: "Đang nghe", error: "Lỗi", unknown: "{status}" },
      start: { start: "Bắt đầu dịch", stop: "Dừng dịch" },
      signal: {
        label: "Tín hiệu đầu vào",
        idle: "Nhàn rỗi",
        live: "Có tín hiệu",
        none: "Chưa có tín hiệu",
        aria: "Tín hiệu âm thanh đầu vào: {status}",
        ariaIdle: "Tín hiệu âm thanh đầu vào: Nhàn rỗi",
      },
      route: {
        kicker: "Định tuyến âm thanh",
        heading: "Chọn cách Chuchotage tránh phản hồi âm",
        checking: "Đang kiểm tra tuyến",
        setupAria: "Thiết lập định tuyến âm thanh",
        mode: {
          singleHeadset: { title: "Một tai nghe", detail: "Không cần admin" },
          separateDevices: { title: "Thiết bị riêng", detail: "Dự phòng không admin" },
          virtualDevice: { title: "Thiết bị ảo", detail: "Tuyến admin" },
        },
        status: {
          chooseDevices: "Chọn thiết bị",
          singleReady: "Một tai nghe sẵn sàng",
          useOneDevice: "Dùng một thiết bị",
          secondDeviceNeeded: "Cần thiết bị thứ hai",
          chooseSeparate: "Chọn thiết bị riêng",
          virtualReady: "Đã chọn tuyến ảo",
          twoDeviceReady: "Tuyến hai thiết bị sẵn sàng",
        },
        content: {
          singleHeadset: {
            copy: "Dùng cách này trước khi ứng dụng nguồn và âm thanh dịch đều dùng cùng một tai nghe.",
            steps: [
              "Chọn tai nghe cho Đầu ra thu âm.",
              "Chuchotage sẽ dùng cùng tai nghe đó cho Phát bản dịch.",
              "Nếu thu âm thất bại trên tuyến Windows này, chuyển sang Thiết bị riêng hoặc Thiết bị ảo.",
            ],
            note: "Cách này dùng thu loopback theo tiến trình của Windows để nghe âm thanh PC trong khi loại trừ phát lại của Chuchotage. Cần Windows 11 hoặc Windows 10 Build 20348 trở lên.",
          },
          separateDevices: {
            copy: "Dùng phương án dự phòng không admin này khi tuyến một tai nghe không khả dụng.",
            steps: [
              "Kết nối hai thiết bị phát đang hoạt động.",
              "Định tuyến Teams, trình duyệt hoặc ứng dụng nguồn tới thiết bị đầu tiên trong Windows.",
              "Đặt Đầu ra thu âm thành thiết bị nguồn đó và Phát bản dịch thành thiết bị bạn sẽ nghe.",
            ],
            note: "Giữ hai lựa chọn thiết bị Chuchotage khác nhau để tránh dịch chính âm thanh phát lại của nó.",
          },
          virtualDevice: {
            copy: "Dùng cách này khi admin có thể tạo hoặc phê duyệt thiết bị phát ảo.",
            steps: [
              "Tạo hoặc bật thiết bị ảo bên ngoài Chuchotage.",
              "Định tuyến âm thanh ứng dụng nguồn tới thiết bị ảo đó.",
              "Đặt Đầu ra thu âm thành thiết bị ảo và Phát bản dịch thành tai nghe thật của bạn.",
            ],
            note: "Chuchotage không cài trình điều khiển âm thanh; nó dùng các thiết bị Windows đã hiển thị.",
          },
        },
      },
      field: {
        originalApp: "Ứng dụng gốc",
        outputLanguage: "Ngôn ngữ đầu ra",
        supportedInputLanguages: "Ngôn ngữ đầu vào được hỗ trợ",
        captureOutput: "Đầu ra thu âm",
        translatedPlayback: "Phát bản dịch",
      },
      mix: { title: "Trộn", label: "Bản dịch {translated}% / Gốc {original}%" },
      credential: {
        placeholder: "Khóa API OpenAI, khóa đã lưu hoặc auth Codex",
        remember: "Ghi nhớ trên tài khoản Windows này",
        saved: "Có khóa API đã lưu. Để trống trường này để dùng khóa đó.",
        codex: "Đã tìm thấy auth Codex. Để trống trường này để dùng Codex.",
        enter: "Nhập khóa API, hoặc đăng nhập bằng Codex trước.",
      },
      button: { refreshDevices: "Làm mới thiết bị" },
      session: { none: "Không điều khiển ứng dụng gốc" },
      routeError: {
        chooseDevices: "Chọn thiết bị thu âm và phát bản dịch trước khi bắt đầu.",
        singleSame: "Chế độ một tai nghe dùng cùng một thiết bị cho Đầu ra thu âm và Phát bản dịch.",
        virtualSeparate: "Chọn thiết bị ảo cho Đầu ra thu âm và tai nghe thật cho Phát bản dịch.",
        separateNeedsTwo: "Chế độ thiết bị riêng cần hai thiết bị phát khác nhau. Thêm đầu ra thứ hai, làm mới thiết bị, rồi chọn một thiết bị cho Phát bản dịch.",
      },
      backend: {
        logPath: "Nhật ký: {path}",
        exited: "Backend Chuchotage đã thoát.",
        commandFailed: "Lệnh backend Chuchotage thất bại.",
        alreadyRunning: "Bản dịch đang chạy.",
        unknownCommand: "Lệnh backend không xác định: {command}",
        missingCredential: "Nhập khóa API OpenAI, hoặc đăng nhập bằng Codex để ~/.codex/auth.json tồn tại.",
        chooseCapture: "Chọn thiết bị đầu ra thu âm.",
        choosePlayback: "Chọn thiết bị phát bản dịch.",
        connectionFailed: "Kết nối OpenAI Realtime thất bại. Chi tiết: {detail}",
        playbackFailed: "Không thể bắt đầu phát bản dịch trên {device}. Chi tiết: {detail}",
        captureFailed: "Không thể thu âm từ {device}. Chi tiết: {detail}",
        unknownCapture: "Không thể chọn tuyến thu âm.",
        socketClosed: "Socket Realtime Translation đã đóng.",
        audioCaptureFailed: "Thu âm thất bại. Chi tiết: {detail}",
        audioChannel: "Kênh âm thanh chưa được khởi tạo.",
        realtimeClient: "Máy khách Realtime chưa được khởi tạo.",
        realtimeFailed: "Realtime Translation thất bại.",
        unexpected: "Bản dịch dừng ngoài dự kiến.",
      },
    },
    it: {
      app: { subtitle: "Traduzione audio Windows" },
      status: { ready: "Pronto", connecting: "Connessione", listening: "In ascolto", error: "Errore", unknown: "{status}" },
      start: { start: "Avvia traduzione", stop: "Ferma traduzione" },
      signal: {
        label: "Segnale in ingresso",
        idle: "Inattivo",
        live: "Segnale attivo",
        none: "Nessun segnale ancora",
        aria: "Segnale audio in ingresso: {status}",
        ariaIdle: "Segnale audio in ingresso: Inattivo",
      },
      route: {
        kicker: "Routing audio",
        heading: "Scegli come Chuchotage evita il feedback",
        checking: "Controllo del percorso",
        setupAria: "Configurazione routing audio",
        mode: {
          singleHeadset: { title: "Singolo headset", detail: "Senza admin" },
          separateDevices: { title: "Dispositivi separati", detail: "Alternativa senza admin" },
          virtualDevice: { title: "Dispositivo virtuale", detail: "Percorso admin" },
        },
        status: {
          chooseDevices: "Scegli dispositivi",
          singleReady: "Singolo headset pronto",
          useOneDevice: "Usa un dispositivo",
          secondDeviceNeeded: "Serve un secondo dispositivo",
          chooseSeparate: "Scegli dispositivi separati",
          virtualReady: "Percorso virtuale selezionato",
          twoDeviceReady: "Percorso a due dispositivi pronto",
        },
        content: {
          singleHeadset: {
            copy: "Usalo per primo quando l'app sorgente e l'audio tradotto devono usare lo stesso headset.",
            steps: [
              "Scegli l'headset per Uscita da catturare.",
              "Chuchotage userà lo stesso headset per Riproduzione tradotta.",
              "Se la cattura fallisce su questo percorso Windows, passa a Dispositivi separati o Dispositivo virtuale.",
            ],
            note: "Usa la cattura process-loopback di Windows per ascoltare l'audio del PC escludendo la riproduzione di Chuchotage. Richiede Windows 11 o Windows 10 Build 20348 o successivo.",
          },
          separateDevices: {
            copy: "Usa questa alternativa senza admin quando il percorso con singolo headset non è disponibile.",
            steps: [
              "Collega due dispositivi di riproduzione attivi.",
              "Instrada Teams, un browser o l'app sorgente al primo dispositivo in Windows.",
              "Imposta Uscita da catturare su quel dispositivo sorgente e Riproduzione tradotta sul dispositivo che ascolterai.",
            ],
            note: "Mantieni diverse le due selezioni dispositivo di Chuchotage per evitare di tradurre la sua stessa riproduzione.",
          },
          virtualDevice: {
            copy: "Usalo quando un admin può creare o approvare un dispositivo di riproduzione virtuale.",
            steps: [
              "Crea o abilita il dispositivo virtuale fuori da Chuchotage.",
              "Instrada l'audio dell'app sorgente a quel dispositivo virtuale.",
              "Imposta Uscita da catturare sul dispositivo virtuale e Riproduzione tradotta sulle tue cuffie reali.",
            ],
            note: "Chuchotage non installa driver audio; usa i dispositivi che Windows espone già.",
          },
        },
      },
      field: {
        originalApp: "App originale",
        outputLanguage: "Lingua di output",
        supportedInputLanguages: "Lingue di input supportate",
        captureOutput: "Uscita da catturare",
        translatedPlayback: "Riproduzione tradotta",
      },
      mix: { title: "Mix", label: "Tradotto {translated}% / Originale {original}%" },
      credential: {
        placeholder: "Chiave API OpenAI, chiave salvata o auth Codex",
        remember: "Ricorda su questo account Windows",
        saved: "Chiave API salvata disponibile. Lascia il campo vuoto per usarla.",
        codex: "Auth Codex trovata. Lascia il campo vuoto per usare Codex.",
        enter: "Inserisci una chiave API o accedi prima con Codex.",
      },
      button: { refreshDevices: "Aggiorna dispositivi" },
      session: { none: "Non controllare l'app originale" },
      routeError: {
        chooseDevices: "Scegli i dispositivi di cattura e riproduzione tradotta prima di iniziare.",
        singleSame: "La modalità singolo headset usa lo stesso dispositivo per Uscita da catturare e Riproduzione tradotta.",
        virtualSeparate: "Scegli il dispositivo virtuale per Uscita da catturare e le cuffie reali per Riproduzione tradotta.",
        separateNeedsTwo: "La modalità dispositivi separati richiede due dispositivi di riproduzione diversi. Aggiungi una seconda uscita, aggiorna i dispositivi, poi scegline uno per Riproduzione tradotta.",
      },
      backend: {
        logPath: "Log: {path}",
        exited: "Il backend Chuchotage è uscito.",
        commandFailed: "Comando del backend Chuchotage non riuscito.",
        alreadyRunning: "La traduzione è già in esecuzione.",
        unknownCommand: "Comando backend sconosciuto: {command}",
        missingCredential: "Inserisci una chiave API OpenAI o accedi con Codex in modo che ~/.codex/auth.json esista.",
        chooseCapture: "Scegli un dispositivo per l'uscita da catturare.",
        choosePlayback: "Scegli un dispositivo per la riproduzione tradotta.",
        connectionFailed: "Connessione a OpenAI Realtime non riuscita. Dettaglio: {detail}",
        playbackFailed: "Impossibile avviare la riproduzione tradotta su {device}. Dettaglio: {detail}",
        captureFailed: "Impossibile catturare audio da {device}. Dettaglio: {detail}",
        unknownCapture: "Impossibile scegliere un percorso di cattura audio.",
        socketClosed: "Socket Realtime Translation chiuso.",
        audioCaptureFailed: "Cattura audio non riuscita. Dettaglio: {detail}",
        audioChannel: "Il canale audio non è inizializzato.",
        realtimeClient: "Il client Realtime non è inizializzato.",
        realtimeFailed: "Realtime Translation non riuscita.",
        unexpected: "La traduzione si è interrotta in modo inatteso.",
      },
    },
  };

  const statusKeys = {
    Ready: "status.ready",
    Connecting: "status.connecting",
    Listening: "status.listening",
    Error: "status.error",
  };

  const routeModes = ["singleHeadset", "separateDevices", "virtualDevice"];

  function normalizeLocale(value) {
    const primary = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
    return supportedLocales.includes(primary) ? primary : null;
  }

  function pickLocale(languages) {
    for (const language of languages || []) {
      const locale = normalizeLocale(language);
      if (locale) {
        return locale;
      }
    }
    return normalizeLocale(navigator.language) || "en";
  }

  const locale = pickLocale(navigator.languages || []);
  document.documentElement.lang = locale;

  function readMessage(localeCode, path) {
    return path.split(".").reduce((value, part) => {
      if (!value || typeof value !== "object") {
        return undefined;
      }
      return value[part];
    }, messages[localeCode]);
  }

  function format(value, vars = {}) {
    if (typeof value !== "string") {
      return value;
    }
    return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : "";
    });
  }

  function t(path, vars = {}) {
    const value = readMessage(locale, path) ?? readMessage("en", path);
    if (value === undefined) {
      return path;
    }
    return format(value, vars);
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
  }

  function languageName(code) {
    const languageCode = String(code || "").toLowerCase();
    if (!supportedOutputLanguages.includes(languageCode)) {
      return code || "";
    }

    try {
      const displayNames = new Intl.DisplayNames([locale], { type: "language" });
      return displayNames.of(languageCode) || englishLanguageNames[languageCode] || languageCode;
    } catch {
      return englishLanguageNames[languageCode] || languageCode;
    }
  }

  function statusText(status) {
    const key = statusKeys[status];
    return key ? t(key) : t("status.unknown", { status: status || "" });
  }

  function routeContent(mode) {
    const routeMode = routeModes.includes(mode) ? mode : "singleHeadset";
    const content = readMessage(locale, `route.content.${routeMode}`) ?? readMessage("en", `route.content.${routeMode}`);
    return {
      copy: format(content.copy),
      steps: content.steps.map((step) => format(step)),
      note: format(content.note),
    };
  }

  const backendErrorPatterns = [
    { pattern: /^Chuchotage backend exited\.$/, key: "backend.exited" },
    { pattern: /^Chuchotage backend command failed\.$/, key: "backend.commandFailed" },
    { pattern: /^Translation is already running\.$/, key: "backend.alreadyRunning" },
    { pattern: /^Unknown command: (.+)$/s, key: "backend.unknownCommand", vars: (match) => ({ command: match[1] }) },
    {
      pattern: /^Enter an OpenAI API key, or sign in with Codex so ~\/\.codex\/auth\.json exists\.$/,
      key: "backend.missingCredential",
    },
    { pattern: /^Choose a capture output device\.$/, key: "backend.chooseCapture" },
    { pattern: /^Choose a translated playback device\.$/, key: "backend.choosePlayback" },
    {
      pattern: /^OpenAI Realtime connection failed: (.+)$/s,
      key: "backend.connectionFailed",
      vars: (match) => ({ detail: match[1] }),
    },
    {
      pattern: /^Could not start translated playback on "(.+?)": (.+)$/s,
      key: "backend.playbackFailed",
      vars: (match) => ({ device: match[1], detail: match[2] }),
    },
    {
      pattern: /^Could not capture audio from "(.+?)": (.+)$/s,
      key: "backend.captureFailed",
      vars: (match) => ({ device: match[1], detail: match[2] }),
    },
    { pattern: /^Unknown capture source\.$/, key: "backend.unknownCapture" },
    { pattern: /^Realtime translation socket closed\.$/, key: "backend.socketClosed" },
    {
      pattern: /^Audio capture failed: (.+)$/s,
      key: "backend.audioCaptureFailed",
      vars: (match) => ({ detail: match[1] }),
    },
    { pattern: /^Audio channel is not initialized\.$/, key: "backend.audioChannel" },
    { pattern: /^Realtime client is not initialized\.$/, key: "backend.realtimeClient" },
    { pattern: /^Realtime translation failed\.$/, key: "backend.realtimeFailed" },
    { pattern: /^Translation stopped unexpectedly\.$/, key: "backend.unexpected" },
  ];

  function translateBackendCore(message) {
    for (const entry of backendErrorPatterns) {
      const match = message.match(entry.pattern);
      if (match) {
        return t(entry.key, entry.vars ? entry.vars(match) : {});
      }
    }
    return message;
  }

  function backendErrorMessage(message) {
    const text = String(message || "");
    if (!text) {
      return "";
    }

    const logMatch = text.match(/^(.*)\r?\nLog: (.*)$/s);
    if (!logMatch) {
      return translateBackendCore(text);
    }

    return `${translateBackendCore(logMatch[1])}\n${t("backend.logPath", { path: logMatch[2] })}`;
  }

  window.chuchotageI18n = {
    locale,
    supportedLocales,
    t,
    apply,
    languageName,
    statusText,
    routeContent,
    backendErrorMessage,
  };
})();
