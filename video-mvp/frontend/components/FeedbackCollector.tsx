// frontend/components/FeedbackCollector.tsx
'use client';

import { useEffect, useState } from 'react';

const FeedbackCollector = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: '',
    email: ''
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRating = (rating: number) => {
    setFeedback({ ...feedback, rating });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFeedback({ ...feedback, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Aquí iría la lógica para enviar el feedback al backend
    console.log('Feedback enviado:', feedback);

    // Simular envío exitoso
    setSubmitted(true);
    setTimeout(() => {
      setIsOpen(false);
      setSubmitted(false);
      setFeedback({ rating: 0, comment: '', email: '' });
    }, 2000);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Botón flotante de feedback */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 bg-[#3b2bee] text-white p-3 sm:p-4 rounded-full shadow-[0_0_20px_rgba(59,43,238,0.5)] hover:bg-[#3b2bee]/90 border border-[#3b2bee]/40 z-40 transition-all"
        aria-label="Enviar feedback"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Modal de feedback */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 relative shadow-[0_0_40px_rgba(0,0,0,0.4)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-foreground mb-4">Tu opinion nos importa</h2>

            {submitted ? (
              <div className="text-center py-8">
                <div className="text-emerald-400 text-5xl mb-4">✓</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Gracias por tu feedback</h3>
                <p className="text-slate-400">Tu opinion nos ayuda a mejorar continuamente.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-slate-300 font-medium mb-2">Que te parecio la experiencia?</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRating(star)}
                        className={`text-2xl transition-colors ${star <= feedback.rating ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="comment" className="block text-slate-300 font-medium mb-2">
                    Comentarios (opcional)
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    value={feedback.comment}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2bee]/50 focus:border-[#3b2bee]/50"
                    placeholder="Que podemos mejorar?"
                  ></textarea>
                </div>

                <div className="mb-6">
                  <label htmlFor="email" className="block text-slate-300 font-medium mb-2">
                    Correo electronico (opcional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={feedback.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2bee]/50 focus:border-[#3b2bee]/50"
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-slate-300 hover:text-foreground hover:border-[#3b2bee]/40 hover:bg-[#3b2bee]/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={feedback.rating === 0}
                    className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold transition-colors ${feedback.rating === 0
                      ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                      : 'bg-[#3b2bee] hover:bg-[#3b2bee]/90'
                      }`}
                  >
                    Enviar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackCollector;