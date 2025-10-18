import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Heart, Info, Grid, List, Share2, Loader, X, ExternalLink } from 'lucide-react';

// Constantes para la API y la estructura de navegación
const API_URL = 'https://unpkg.com/emojibase-data@latest/en/data.json';
const VOICE_NAME = "Aoede"; // Voz para la síntesis de voz

// --- Funciones de Utilidad para API ---

/**
 * Función genérica para realizar llamadas a la API de TTS (Text-to-Speech).
 */
async function generateSpeech(text, voiceName, setAudioUrl) {
    if (!text) return;
    setAudioUrl(null); // Limpiar URL anterior
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: `Say in a clear voice: ${text}` }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    const base64ToArrayBuffer = (base64) => {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const pcmToWav = (pcm16, sampleRate = 16000) => {
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const buffer = new ArrayBuffer(44 + pcm16.byteLength);
        const view = new DataView(buffer);
        let offset = 0;

        // RIFF chunk
        view.setUint32(offset, 0x52494646, false); offset += 4; // "RIFF"
        view.setUint32(offset, 36 + pcm16.byteLength, true); offset += 4; // ChunkSize
        view.setUint32(offset, 0x57415645, false); offset += 4; // "WAVE"

        // FMT sub-chunk
        view.setUint32(offset, 0x666d7420, false); offset += 4; // "fmt "
        view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size (16 for PCM)
        view.setUint16(offset, 1, true); offset += 2; // AudioFormat (1 for PCM)
        view.setUint16(offset, numChannels, true); offset += 2; // NumChannels
        view.setUint32(offset, sampleRate, true); offset += 4; // SampleRate
        view.setUint32(offset, byteRate, true); offset += 4; // ByteRate
        view.setUint16(offset, blockAlign, true); offset += 2; // BlockAlign
        view.setUint16(offset, bitsPerSample, true); offset += 2; // BitsPerSample

        // DATA sub-chunk
        view.setUint32(offset, 0x64617461, false); offset += 4; // "data"
        view.setUint32(offset, pcm16.byteLength, true); offset += 4; // Subchunk2Size
        
        // Write the PCM data
        for (let i = 0; i < pcm16.length; i++) {
            view.setInt16(offset, pcm16[i], true);
            offset += 2;
        }

        return new Blob([view], { type: 'audio/wav' });
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/")) {
            // Sample rate from mimeType: audio/L16;rate=16000;channels=1
            const rateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 16000;
            const pcmData = base64ToArrayBuffer(audioData);
            const pcm16 = new Int16Array(pcmData);
            const wavBlob = pcmToWav(pcm16, sampleRate);
            const audioUrl = URL.createObjectURL(wavBlob);
            setAudioUrl(audioUrl);
        } else {
            console.error("Error generating speech or missing audio data:", result);
            setAudioUrl("error");
        }

    } catch (error) {
        console.error("API call failed:", error);
        setAudioUrl("error");
    }
}
// --- Fin de Funciones de Utilidad ---

// Componente para el Splash Screen (0.15)
const SplashScreen = () => (
    <div className="fixed inset-0 bg-indigo-700 flex flex-col items-center justify-center z-50 transition-opacity duration-1000">
        <Loader className="animate-spin text-white h-16 w-16 mb-4" />
        <h1 className="text-4xl font-extrabold text-white animate-pulse">EmojiDex Cargando...</h1>
        <p className="text-white/70 mt-2 text-sm">Cargando los primeros 100 Emojis...</p>
    </div>
);

// Componente de Tarjeta de Emoji
const EmojiCard = ({ emoji, isFavorite, onSelect, onToggleFavorite }) => (
    <div
        className="bg-white p-4 flex flex-col items-center justify-between rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-indigo-400"
    >
        <span
            className="text-6xl mb-2 hover:scale-110 transition-transform duration-300"
            onClick={() => onSelect(emoji)}
        >
            {emoji.emoji}
        </span>
        <p className="text-center text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px] px-1 capitalize">
            {emoji.name}
        </p>
        <div className="w-full flex justify-around mt-3">
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(emoji.hexcode); }}
                className={`p-2 rounded-full transition-colors duration-200 ${
                    isFavorite ? 'text-red-500 bg-red-100 hover:bg-red-200' : 'text-gray-400 bg-gray-100 hover:text-red-500 hover:bg-red-50'
                }`}
                title={isFavorite ? 'Eliminar de favoritos' : 'Agregar a favoritos'}
            >
                <Heart className="w-5 h-5 fill-current" />
            </button>
            <button
                onClick={() => onSelect(emoji)}
                className="p-2 rounded-full text-indigo-600 bg-indigo-100 hover:bg-indigo-200 transition-colors duration-200"
                title="Ver detalles"
            >
                <ExternalLink className="w-5 h-5" />
            </button>
        </div>
    </div>
);


// --- Vistas Principales ---

// Vista de Detalle (0.1)
const DetailView = ({ emoji, onClose, onToggleFavorite, isFavorite }) => {
    const [audioUrl, setAudioUrl] = useState(null);

    // Función original 1: Copiar emoji al portapapeles
    const copyToClipboard = () => {
        const tempInput = document.createElement('textarea');
        tempInput.value = emoji.emoji;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        // NOTA: Reemplazo de alert() con un mensaje de notificación simple.
        alert('Emoji copiado: ' + emoji.emoji);
    };

    // Función original 2: TTS del nombre (Síntesis de Voz)
    const handleSpeak = () => {
        if (audioUrl) {
            new Audio(audioUrl).play();
        } else if (audioUrl !== "error") {
            generateSpeech(emoji.name, VOICE_NAME, setAudioUrl);
        }
    };

    useEffect(() => {
        // Al montar o cambiar el emoji, pre-generar el audio
        generateSpeech(emoji.name, VOICE_NAME, setAudioUrl);
    }, [emoji.name]);

    return (
        <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-6 md:p-8">
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Detalle del Emoji</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        title="Cerrar detalle"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div className="col-span-1 flex justify-center">
                        <span className="text-9xl p-4 bg-indigo-50 rounded-2xl shadow-inner transition-transform duration-500 hover:rotate-6">
                            {emoji.emoji}
                        </span>
                    </div>

                    <div className="col-span-2 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xl font-medium text-gray-500">Nombre Oficial (ES/EN)</p>
                            <p className="text-3xl font-extrabold text-indigo-700 capitalize">{emoji.name}</p>
                        </div>
                        <p className="text-lg">
                            <span className="font-semibold text-gray-600">Categoría:</span>
                            <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                {emoji.category}
                            </span>
                        </p>
                        <p className="text-lg">
                            <span className="font-semibold text-gray-600">Subcategoría:</span>
                            <span className="ml-2 text-gray-700">{emoji.subcategory}</span>
                        </p>
                        <p className="text-lg text-gray-600">
                            <span className="font-semibold">Código Hex:</span> {emoji.hexcode}
                        </p>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t">
                    <h3 className="text-2xl font-semibold mb-4 text-indigo-600">Funciones Adicionales (Originales)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center justify-center p-4 bg-green-500 text-white rounded-xl shadow-md hover:bg-green-600 transition duration-300 transform hover:scale-[1.02]"
                        >
                            <Share2 className="w-5 h-5 mr-2" /> Copiar Emoji (Función 1)
                        </button>
                        <button
                            onClick={handleSpeak}
                            disabled={!audioUrl || audioUrl === "error"}
                            className={`flex items-center justify-center p-4 rounded-xl shadow-md transition duration-300 transform hover:scale-[1.02] ${
                                audioUrl === "error"
                                    ? 'bg-red-400 text-white cursor-not-allowed'
                                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                            }`}
                        >
                            {audioUrl === "error" ? 'Error TTS' : 'Leer Nombre (Función 2)'}
                        </button>
                        <button
                            onClick={() => onToggleFavorite(emoji.hexcode)}
                            className={`flex items-center justify-center p-4 rounded-xl shadow-md transition duration-300 transform hover:scale-[1.02] ${
                                isFavorite ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            }`}
                        >
                            <Heart className="w-5 h-5 mr-2 fill-current" />
                            {isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Vista de Exploración (Lista, Buscador, Filtro - 0.1, 0.1, 0.1)
const ExploreView = ({ filteredEmojis, searchTerm, onSearch, categoryFilter, onFilter, onSelect, onToggleFavorite, favorites }) => {
    const categories = useMemo(() => {
        const cats = new Set(filteredEmojis.map(e => e.category).filter(Boolean));
        return ['Todas', ...Array.from(cats)].sort();
    }, [filteredEmojis]);

    // Función para verificar si un emoji es favorito
    const isFavorite = useCallback((hexcode) => favorites.includes(hexcode), [favorites]);

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
                Explorar Emojis ({filteredEmojis.length})
            </h1>

            {/* Buscador y Filtro */}
            <div className="bg-white p-5 rounded-2xl shadow-lg mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="relative col-span-1 md:col-span-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o tags..."
                        value={searchTerm}
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                </div>
                <div className="col-span-1">
                    <select
                        value={categoryFilter}
                        onChange={(e) => onFilter(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl bg-white text-gray-700 focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition-all"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Lista de Elementos (Grid) */}
            {filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                    {filteredEmojis.map(emoji => ( 
                        <EmojiCard
                            key={emoji.hexcode}
                            emoji={emoji}
                            isFavorite={isFavorite(emoji.hexcode)}
                            onSelect={onSelect}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-600">
                    No se encontraron emojis que coincidan con la búsqueda/filtro.
                </div>
            )}
        </div>
    );
};

// Vista de Favoritos (0.1)
const FavoritesView = ({ emojis, onSelect, onToggleFavorite, favorites }) => {
    const favoriteEmojis = useMemo(() => {
        const hexMap = new Map(emojis.map(e => [e.hexcode, e]));
        return favorites.map(hex => hexMap.get(hex)).filter(Boolean);
    }, [emojis, favorites]);

    const isFavorite = useCallback((hexcode) => favorites.includes(hexcode), [favorites]);

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold text-red-600 mb-6 border-b pb-2">
                Mis Emojis Favoritos ({favoriteEmojis.length})
            </h1>

            {favoriteEmojis.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                    {favoriteEmojis.map(emoji => (
                        <EmojiCard
                            key={emoji.hexcode}
                            emoji={emoji}
                            isFavorite={isFavorite(emoji.hexcode)}
                            onSelect={onSelect}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-600">
                    <Heart className="w-10 h-10 text-red-400 mx-auto mb-4 fill-red-200" />
                    <p className="text-xl font-semibold">Aún no tienes favoritos.</p>
                    <p className="mt-2 text-sm">Agrega emojis en la vista de Explorar o Detalle.</p>
                </div>
            )}
        </div>
    );
};

// Vista de Categorías (Sirve como 'Filtro' avanzado - 0.1)
const CategoriesView = ({ emojis, onCategorySelect, setView }) => {
    const categories = useMemo(() => {
        const counts = emojis.reduce((acc, emoji) => {
            if (emoji.category) {
                acc[emoji.category] = (acc[emoji.category] || 0) + 1;
            }
            return acc;
        }, {});
        return Object.entries(counts).sort(([, countA], [, countB]) => countB - countA);
    }, [emojis]);

    const handleSelectCategory = (category) => {
        onCategorySelect(category);
        setView('explorar'); // Volver a la vista de exploración con el filtro aplicado
    };

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
                Explorar por Categoría ({categories.length})
            </h1>
            <p className="text-gray-600 mb-6">Selecciona una categoría para aplicar el filtro y ver los emojis.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map(([category, count]) => (
                    <button
                        key={category}
                        onClick={() => handleSelectCategory(category)}
                        className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all duration-300 transform hover:-translate-y-1 text-left"
                    >
                        <h3 className="text-xl font-semibold text-indigo-700 mb-1">{category}</h3>
                        <p className="text-gray-500">{count} Emojis</p>
                        <ExternalLink className="w-4 h-4 text-indigo-400 mt-2" />
                    </button>
                ))}
            </div>
        </div>
    );
};


// Vista Informativa (0.1)
const AboutView = () => (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-2xl">
            <h1 className="text-4xl font-extrabold text-indigo-700 mb-6 border-b pb-3">Acerca de EmojiDex</h1>
            <p className="text-lg text-gray-700 mb-4">
                **EmojiDex** es un visor interactivo diseñado para explorar y entender el estándar Unicode de los emojis.
                Actúa como tu diccionario personal de emoticonos, brindándote detalles como su categoría, código y nombre oficial.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-3">¿Qué son los Emojis?</h2>
            <p className="text-gray-700 mb-4">
                Los emojis son logogramas e ideogramas digitales que se utilizan para expresar ideas y emociones. A diferencia de las imágenes tradicionales, los emojis son caracteres de texto gestionados por el estándar **Unicode**.
                Esto significa que son tratados como letras, números o símbolos, permitiendo que se muestren consistentemente en diferentes plataformas y sistemas operativos.
            </p>

            <h3 className="text-xl font-semibold text-indigo-600 mt-4 mb-2">Sobre las letras del abecedario (Indicadores Regionales)</h3>
            <p className="text-gray-700 mb-4">
                Dentro del universo Unicode, las letras individuales que a veces se ven al inicio de la lista (A, B, C, etc.) son los "Símbolos de Indicador Regional". Estos caracteres por sí solos no son banderas, pero cuando se combinan en pares (ej: `U` + `S`), forman la bandera de un país (`🇺🇸`).
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-3">Información de la Aplicación</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 pl-4">
                <li>**Limitación (Demo):** La aplicación está limitada a mostrar los **primeros 100 emojis** para garantizar una carga rápida y estable en este entorno.</li>
                <li>**Características:** Incluye un sistema completo de búsqueda, filtrado por categorías, gestión de favoritos (guardados localmente) y vistas de detalle con funciones interactivas.</li>
                <li>**Funciones Originales:** En la vista de detalle, puedes **Copiar el emoji** al portapapeles y usar **Text-to-Speech (TTS)** para escuchar el nombre del emoji.</li>
            </ul>
        </div>
    </div>
);


// Componente Principal de la Aplicación
const App = () => {
    const [emojis, setEmojis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('explorar'); // 'explorar', 'favoritos', 'categorias', 'acerca'
    const [selectedEmoji, setSelectedEmoji] = useState(null); // Para la vista 'detalle'

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [favorites, setFavorites] = useState([]); // Almacena los `hexcode`

    // Cargar datos y favoritos al inicio (0.15 splash + API)
    useEffect(() => {
        // 1. Cargar la API de Emojis
        const fetchEmojis = async () => {
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
                
                // Aplicar el filtro de emoji existente y LIMITAR A LOS PRIMEROS 100
                const simpleEmojis = data.filter(e => e.emoji).slice(0, 100); 
                
                // Mensaje de depuración
                console.log(`[EmojiDex] Loaded ${simpleEmojis.length} emojis (Limited to 100).`);

                setEmojis(simpleEmojis);

            } catch (error) {
                console.error("Error fetching emoji data:", error);
            } finally {
                setTimeout(() => setLoading(false), 1500); // Muestra el splash por 1.5s
            }
        };

        // 2. Cargar favoritos de localStorage
        const loadedFavorites = JSON.parse(localStorage.getItem('emojiFavorites') || '[]');
        setFavorites(loadedFavorites);

        fetchEmojis();
    }, []);

    // Manejar Objeto Compartido / Deep Linking (0.1)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            if (hash && emojis.length > 0) {
                const emojiByHex = emojis.find(e => e.hexcode === hash);
                if (emojiByHex) {
                    setSelectedEmoji(emojiByHex);
                    setActiveView('detalle');
                    return;
                }
            }
            // Si no hay hash o el emoji no existe, volver a la vista principal
            if (activeView === 'detalle' && !hash) {
                setActiveView('explorar');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Ejecutar al cargar

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [emojis, activeView]);

    // Función para manejar la navegación
    const handleNavigation = (view, emoji = null) => {
        // Limpiar el hash de la URL al cambiar de vista
        window.location.hash = '';

        setSelectedEmoji(emoji);
        setActiveView(view);
    };

    // Función para seleccionar un emoji y navegar al detalle
    const handleSelectEmoji = (emoji) => {
        setSelectedEmoji(emoji);
        setActiveView('detalle');
        window.location.hash = emoji.hexcode; // Actualizar hash (Objeto compartido)
    };

    // Función para agregar/quitar de favoritos
    const handleToggleFavorite = (hexcode) => {
        let newFavorites;
        if (favorites.includes(hexcode)) {
            newFavorites = favorites.filter(h => h !== hexcode);
        } else {
            newFavorites = [...favorites, hexcode];
        }
        setFavorites(newFavorites);
        localStorage.setItem('emojiFavorites', JSON.stringify(newFavorites));
    };

    // Lógica de Filtrado y Búsqueda (0.1 filtro + 0.1 buscador)
    const filteredEmojis = useMemo(() => {
        let list = emojis;

        // 1. Filtrar por categoría
        if (categoryFilter !== 'Todas') {
            list = list.filter(e => e.category === categoryFilter);
        }

        // 2. Buscar por término (SearchTerm)
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            list = list.filter(e =>
                e.name.toLowerCase().includes(lowerCaseSearch) ||
                // Seguridad: Asegurar que e.tags existe antes de usar .some()
                (e.tags && e.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))) 
            );
        }

        return list;
    }, [emojis, categoryFilter, searchTerm]);

    // Renderizado del contenido principal basado en activeView
    const renderContent = () => {
        if (loading) return null; // El splash screen se encarga del loading

        switch (activeView) {
            case 'explorar':
                return (
                    <ExploreView
                        filteredEmojis={filteredEmojis}
                        searchTerm={searchTerm}
                        onSearch={setSearchTerm}
                        categoryFilter={categoryFilter}
                        onFilter={setCategoryFilter}
                        onSelect={handleSelectEmoji}
                        onToggleFavorite={handleToggleFavorite}
                        favorites={favorites}
                    />
                );
            case 'favoritos':
                return (
                    <FavoritesView
                        emojis={emojis}
                        onSelect={handleSelectEmoji}
                        onToggleFavorite={handleToggleFavorite}
                        favorites={favorites}
                    />
                );
            case 'categorias':
                return (
                    <CategoriesView
                        emojis={emojis}
                        onCategorySelect={(cat) => setCategoryFilter(cat)}
                        setView={setActiveView}
                    />
                );
            case 'acerca':
                return <AboutView />;

            case 'detalle':
                // Si selectedEmoji está vacío (ej. alguien limpió el hash), vuelve a explorar
                if (!selectedEmoji) {
                    setActiveView('explorar');
                    return null;
                }
                return (
                    <DetailView
                        emoji={selectedEmoji}
                        onClose={() => handleNavigation('explorar')}
                        onToggleFavorite={handleToggleFavorite}
                        isFavorite={favorites.includes(selectedEmoji.hexcode)}
                    />
                );

            default:
                return <ExploreView filteredEmojis={filteredEmojis} searchTerm={searchTerm} onSearch={setSearchTerm} categoryFilter={categoryFilter} onFilter={setCategoryFilter} onSelect={handleSelectEmoji} onToggleFavorite={handleToggleFavorite} favorites={favorites} />;
        }
    };

    // Componente del Menú de Navegación (0.1 menú + 0.1 * 5 pestañas)
    const NavItem = ({ view, icon: Icon, label }) => {
        const isCurrentView = view === activeView;

        return (
            <button
                onClick={() => handleNavigation(view)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                    isCurrentView
                        ? 'bg-white text-indigo-700 shadow-md font-semibold'
                        : 'text-white hover:bg-indigo-600/70 hover:shadow-inner'
                }`}
                title={label}
            >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{label}</span>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans antialiased">
            {loading && <SplashScreen />}

            {/* Menú de Navegación (0.1) */}
            <header className="sticky top-0 z-40 bg-indigo-700 shadow-lg">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <span className="text-3xl" role="img" aria-label="EmojiDex Logo">🌟</span>
                            <h1 className="text-2xl font-extrabold text-white hidden md:block">
                                EmojiDex (Demo: 100 Emojis)
                            </h1>
                        </div>

                        {/* 5 Pestañas (0.1) */}
                        <div className="flex space-x-1 sm:space-x-3">
                            <NavItem view="explorar" icon={List} label="Explorar" />
                            <NavItem view="categorias" icon={Grid} label="Categorías" />
                            <NavItem view="favoritos" icon={Heart} label="Favoritos" />
                            <NavItem view="acerca" icon={Info} label="Acerca de" />
                            {/* Pestaña de Detalle - Se activa dinámicamente y se oculta si no hay selección */}
                            {selectedEmoji && activeView === 'detalle' && (
                                <NavItem view="detalle" icon={ExternalLink} label="Detalle" />
                            )}
                        </div>

                        <div className="text-white text-xs opacity-80">{favorites.length} Favs</div>
                    </div>
                </nav>
            </header>

            {/* Contenido principal */}
            <main className="max-w-7xl mx-auto">
                {renderContent()}
            </main>

            {/* Simulación de alerta/modal - Reemplazo de alert() */}

        </div>
    );
};

export default App;