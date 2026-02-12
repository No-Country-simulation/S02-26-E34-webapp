'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-12 md:mb-0">
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Convierte Videos Horizontales en Verticales Automáticamente
            </motion.h1>
            <motion.p 
              className="text-lg text-gray-600 mt-6 mb-8 max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Optimiza tus videos para TikTok, Instagram Reels y YouTube Shorts en segundos. 
              Sube tu video horizontal (16:9) y obtén una versión vertical (9:16) lista para compartir.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <Link 
                href="/dashboard" 
                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-center"
              >
                Comenzar Gratis
              </Link>
              <Link 
                href="/#features" 
                className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200 text-center"
              >
                Ver Demo
              </Link>
            </motion.div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <motion.div 
              className="relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="bg-white p-4 rounded-xl shadow-xl w-64 h-80 border-2 border-gray-200">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center text-gray-500">
                  Vista previa del video
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-blue-600 p-4 rounded-xl shadow-xl w-48 h-64 transform rotate-6">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center text-gray-500 text-xs">
                  Video verticalizado
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 bg-white rounded-2xl m-8 shadow-sm">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800">Características Principales</h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Herramientas potentes para convertir y mejorar tus videos para redes sociales
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Conversión Automática",
              description: "Transforma videos horizontales (16:9) en verticales (9:16) con un solo clic.",
              icon: "🔄"
            },
            {
              title: "Subtítulos Inteligentes",
              description: "Agrega subtítulos automáticos para mejorar la accesibilidad y engagement.",
              icon: "💬"
            },
            {
              title: "Marca Personalizada",
              description: "Agrega tu logo o marca para aumentar la visibilidad de tu contenido.",
              icon: "🏷️"
            }
          ].map((feature, index) => (
            <motion.div 
              key={index}
              className="bg-gray-50 p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-4">¿Listo para transformar tus videos?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Únete a miles de creadores que ya están optimizando su contenido para redes sociales
          </p>
          <Link 
            href="/dashboard" 
            className="inline-block px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            Comienza Ahora - Gratis
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">VideoConverter</h3>
              <p className="text-gray-400">
                La solución definitiva para convertir videos horizontales en verticales.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Características</a></li>
                <li><a href="#" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">Casos de Uso</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Recursos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Documentación</a></li>
                <li><a href="#" className="hover:text-white">Soporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Términos</a></li>
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} VideoConverter. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}