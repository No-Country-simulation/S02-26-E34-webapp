// frontend/components/LandingPage.tsx
'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';

const LandingPage = () => {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "Conversión Automática",
      description: "Transforma videos horizontales (16:9) a verticales (9:16) en segundos",
      icon: "🔄"
    },
    {
      title: "Recorte Inteligente",
      description: "Nuestra IA detecta rostros y objetos para mantenerlos centrados",
      icon: "🤖"
    },
    {
      title: "Subtítulos Automáticos",
      description: "Transcripción automática y quemado de subtítulos en el video",
      icon: "💬"
    },
    {
      title: "Branding Personalizado",
      description: "Agrega tu logo y texto para potenciar tu marca",
      icon: "🏷️"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Influencer",
      content: "Este tool me ahorró horas de edición. Ahora puedo adaptar mi contenido para TikTok en segundos.",
      avatar: "👩‍💼"
    },
    {
      name: "Carlos Rodríguez",
      role: "Community Manager",
      content: "Increíble herramienta para adaptar contenido rápidamente. Mis clientes aman los resultados.",
      avatar: "👨‍💼"
    }
  ];

  return (
    <>
      <Head>
        <title>Conversor Video - Optimiza tu contenido para redes sociales</title>
        <meta name="description" content="Plataforma SaaS que convierte automáticamente videos horizontales (16:9) en verticales (9:16) optimizados para TikTok, Instagram Reels y YouTube Shorts." />
      </Head>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 w-8 h-8 rounded-lg"></div>
            <span className="text-xl font-bold text-gray-800">VideoConverter</span>
          </div>

          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Características</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">Cómo funciona</a>
            <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">Testimonios</a>
          </nav>

          <button
            onClick={() => router.push('/upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Comenzar
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Convierte Videos Horizontales en <span className="text-blue-600">Verticales</span> Perfectos
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Optimiza tu contenido para TikTok, Instagram Reels y YouTube Shorts en segundos con IA inteligente
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => router.push('/upload')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Probar ahora gratis
            </button>
            <button className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-8 rounded-lg text-lg border border-gray-300 transition-colors">
              Ver demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Características Potentes</h2>
            <p className="text-gray-600">
              Nuestra plataforma utiliza inteligencia artificial para ofrecer resultados profesionales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Cómo Funciona</h2>
            <p className="text-gray-600">
              Transforma tu contenido en solo 3 pasos simples
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sube tu video</h3>
              <p className="text-gray-600">Arrastra y suelta tu video horizontal (MP4, hasta 100MB)</p>
            </div>

            <div className="hidden md:block text-gray-400 text-3xl">→</div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Procesamiento IA</h3>
              <p className="text-gray-600">Nuestra IA convierte, recorta y agrega subtítulos automáticamente</p>
            </div>

            <div className="hidden md:block text-gray-400 text-3xl">→</div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Descarga resultado</h3>
              <p className="text-gray-600">Obtén tu video vertical optimizado para redes sociales</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Lo Que Dicen Nuestros Usuarios</h2>
            <p className="text-gray-600">
              Miles de creadores de contenido ya están usando nuestra plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-4">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">&quot;{testimonial.content}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-linear-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">¿Listo para optimizar tu contenido?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Únete a miles de creadores que ya están aprovechando al máximo su contenido en redes sociales
          </p>
          <button
            onClick={() => router.push('/upload')}
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Comienza ahora gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-blue-600 w-8 h-8 rounded-lg"></div>
                <span className="text-xl font-bold">VideoConverter</span>
              </div>
              <p className="text-gray-400">
                La solución definitiva para convertir contenido horizontal en vertical.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Casos de uso</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Recursos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trabaja con nosotros</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} VideoConverter. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;