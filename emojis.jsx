import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Heart, Info, Grid, List, Share2, Loader, X, ExternalLink, Volume2 } from 'lucide-react';

// Constante para la API de Emojis
const API_URL = 'https://unpkg.com/emojibase-data@latest/en/data.json';

// --- Funciones de Utilidad (TTS y Notificaciones) ---

/**
 * Función moderna para copiar al portapapeles.
 */
const copyToClipboard = async (text, setNotification) => {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            setNotification({ message: 'Emoji copiado: ' + text, type: 'success' });
        } else {
            // Fallback para entornos no seguros/antiguos (aunque obsoleto)
            const tempInput = document.createElement('textarea');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            setNotification({ message: 'Emoji copiado (Fallback): ' + text, type: 'warning' });
        }
    } catch (err) {
        console.error("Error al copiar:", err);
        setNotification({ message: 'Error al copiar al portapapeles.', type: 'error' });
    }
};

/**
 * Función nativa del navegador para Text-to-Speech.
 */
const speakText = (text) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Se mantiene en inglés, ya que los nombres son en-US
        window.speechSynthesis.speak(utterance);
    } else {
        alert("El navegador no soporta la Síntesis de Voz.");
    }
};

// Componente de Notificación Flotante (Toast)
const ToastNotification = ({ notification, setNotification }) => {
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification, setNotification]);

    if (!notification) return null;

    const baseStyle = "fixed bottom-5 right-5 p-4 rounded-xl shadow-2xl transition-opacity duration-300 z-[60] flex items-center";
    let style = "";
    
    switch (notification.type) {
        case 'success':
            style = "bg-green-500 text-white";
            break;
        case 'warning':
            style = "bg-yellow-500 text-gray-800";
            break;
        case 'error':
            style = "bg-red-500 text-white";
            break;
        default:
            style = "bg-indigo-500 text-white";
    }

    return (
        <div className={`${baseStyle} ${style}`}>
            <Info className="w-5 h-5 mr-2" />
            <span>{notification.message}</span>
        </div>
    );
};

// Componente para el Splash Screen
const SplashScreen = () => (
    <div className="fixed inset-0 bg-indigo-700 flex flex-col items-center justify-center z-50 transition-opacity duration-1000">
        <Loader className="animate-spin text-white h-16 w-16 mb-4" />
        <h1 className="text-4xl font-extrabold text-white animate-pulse">EmojiDex Cargando...</h1>
        <p className="text-white/70 mt-2 text-sm">Cargando los primeros 100 Emojis...</p>
    </div>
);

// Componente de Tarjeta de Emoji
const EmojiCard = React.memo(({ emoji, isFavorite, onSelect, onToggleFavorite }) => (
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
));


// --- Vistas Principales ---

// Vista de Detalle
const DetailView = ({ emoji, onClose, onToggleFavorite, isFavorite, setNotification }) => {

    // Función: Copiar emoji al portapapeles (usa la función corregida)
    const handleCopy = () => {
        copyToClipboard(emoji.emoji, setNotification);
    };

    // Función: TTS del nombre (usa la función corregida)
    const handleSpeak = () => {
        speakText(emoji.name);
        setNotification({ message: `Leyendo: "${emoji.name}"`, type: 'info' });
    };

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
                    <h3 className="text-2xl font-semibold mb-4 text-indigo-600">Funciones Interactivas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center p-4 bg-green-500 text-white rounded-xl shadow-md hover:bg-green-600 transition duration-300 transform hover:scale-[1.02]"
                        >
                            <Share2 className="w-5 h-5 mr-2" /> Copiar Emoji
                        </button>
                        <button
                            onClick={handleSpeak}
                            className="flex items-center justify-center p-4 rounded-xl shadow-md transition duration-300 transform hover:scale-[1.02] bg-indigo-500 text-white hover:bg-indigo-600"
                            title="Leer el nombre del emoji"
                        >
                            <Volume2 className="w-5 h-5 mr-2" /> Leer Nombre (TTS)
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

// Vista de Exploración (Lista, Buscador, Filtro)
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

// Vista de Favoritos
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

// Vista de Categorías
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


// Vista Informativa
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

            <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-3">Información de la Aplicación</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 pl-4">
                <li>**Limitación (Demo):** La aplicación está limitada a mostrar los **primeros 100 emojis** para garantizar una carga rápida y estable en este entorno.</li>
                <li>**Características:** Incluye un sistema completo de búsqueda, filtrado por categorías, gestión de favoritos (guardados localmente) y vistas de detalle con funciones interactivas.</li>
                <li>**Funciones Corregidas:** Ahora usa la API nativa de **Text-to-Speech (TTS)** para leer los nombres de los emojis y la API moderna de **Portapapeles** para copiar.</li>
            </ul>
        </div>
    </div>
);


// Componente Principal de la Aplicación
const App = () => {
    const [emojis, setEmojis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('explorar'); // 'explorar', 'favoritos', 'categorias', 'acerca', 'detalle'
    const [selectedEmoji, setSelectedEmoji] = useState(null); // Para la vista 'detalle'

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [favorites, setFavorites] = useState([]); // Almacena los `hexcode`
    const [notification, setNotification] = useState(null); // Para el Toast

    // Cargar datos y favoritos al inicio
    useEffect(() => {
        // 1. Cargar la API de Emojis
        const fetchEmojis = async () => {
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
                
                // Aplicar el filtro de emoji existente y LIMITAR A LOS PRIMEROS 100
                const simpleEmojis = data.filter(e => e.emoji).slice(0, 100); 
                setEmojis(simpleEmojis);

            } catch (error) {
                console.error("Error fetching emoji data:", error);
                setNotification({ message: 'Error al cargar los emojis. Intenta recargar.', type: 'error' });
            } finally {
                setTimeout(() => setLoading(false), 1500); // Muestra el splash por 1.5s
            }
        };

        // 2. Cargar favoritos de localStorage
        const loadedFavorites = JSON.parse(localStorage.getItem('emojiFavorites') || '[]');
        setFavorites(loadedFavorites);

        fetchEmojis();
    }, []);

    // Manejar Objeto Compartido / Deep Linking
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
            // Si no hay hash o el emoji no existe, volver a la vista principal si estamos en detalle
            if (activeView === 'detalle' && !hash) {
                setActiveView('explorar');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        // Esperar a que los emojis carguen antes de ejecutar handleHashChange la primera vez
        if (!loading && emojis.length > 0) {
            handleHashChange(); 
        }

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [emojis, activeView, loading]);

    // Función para manejar la navegación
    const handleNavigation = (view, emoji = null) => {
        // Limpiar el hash de la URL al cambiar de vista a no-detalle
        if (view !== 'detalle') {
            window.location.hash = '';
        }

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
        let message;
        if (favorites.includes(hexcode)) {
            newFavorites = favorites.filter(h => h !== hexcode);
            message = "Emoji eliminado de favoritos.";
        } else {
            newFavorites = [...favorites, hexcode];
            message = "Emoji añadido a favoritos!";
        }
        setFavorites(newFavorites);
        localStorage.setItem('emojiFavorites', JSON.stringify(newFavorites));
        setNotification({ message: message, type: 'info' });
    };

    // Lógica de Filtrado y Búsqueda
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
                        setNotification={setNotification}
                    />
                );

            default:
                return <ExploreView filteredEmojis={filteredEmojis} searchTerm={searchTerm} onSearch={setSearchTerm} categoryFilter={categoryFilter} onFilter={setCategoryFilter} onSelect={handleSelectEmoji} onToggleFavorite={handleToggleFavorite} favorites={favorites} />;
        }
    };

    // Componente del Menú de Navegación
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

            {/* Menú de Navegación */}
            <header className="sticky top-0 z-40 bg-indigo-700 shadow-lg">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <span className="text-3xl" role="img" aria-label="EmojiDex Logo"></span>
                            <h1 className="text-2xl font-extrabold text-white hidden md:block">
                                EmojiDex
                            </h1>
                        </div>

                        {/* Pestañas */}
                        <div className="flex space-x-1 sm:space-x-3">
                            <NavItem view="explorar" icon={List} label="Explorar" />
                            <NavItem view="categorias" icon={Grid} label="Categorías" />
                            <NavItem view="favoritos" icon={Heart} label="Favoritos" />
                            <NavItem view="acerca" icon={Info} label="Acerca de" />
                            {/* Pestaña de Detalle - Se activa dinámicamente */}
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

            {/* Notificación Toast (Corregida) */}
            <ToastNotification notification={notification} setNotification={setNotification} />

        </div>
    );
};

export default App;
