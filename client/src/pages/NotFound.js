import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiArrowLeft, FiSearch, FiMapPin } from '../icons/feather';
import PageLayout from '../components/layout/PageLayout';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const canvasRef = useRef(null);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    const particles = [];
    const particleCount = 50;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.color = `hsl(${Math.random() * 60 + 30}, 70%, 60%)`;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>{t('notFound.metaTitle')}</title>
        <meta name="description" content={t('notFound.metaDescription')} />
      </Helmet>

      <PageLayout>
      <div className="min-h-screen bg-[#131c2b] relative overflow-hidden" dir={i18n.dir()}>
        {/* Animated Background Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1 }}
        />

        {/* Background Effects */}
        <div className="absolute inset-0 z-2">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/10"></div>
          <div className="absolute top-20 right-20 w-96 h-96 bg-[#A88B32]/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#A88B32]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-4xl mx-auto">
            {/* 404 Number with Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: 'spring', bounce: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-[12rem] md:text-[16rem] lg:text-[20rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-[#A88B32] via-[#C09C3D] to-[#A88B32] leading-none">
                404
              </h1>
            </motion.div>

            {/* Error Message */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-12"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading">
                {t('notFound.hero.title')}
              </h2>
              <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                {t('notFound.hero.subtitle')}
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className={`flex flex-col sm:flex-row gap-6 justify-center items-center mb-16 ${isRTL ? 'sm:flex-row-reverse' : ''}`}
            >
              <Link
                to="/"
                className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-r from-[#A88B32] to-[#C09C3D] px-8 py-4 font-heading text-lg font-bold uppercase tracking-[0.2em] text-white transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#A88B32]/50 hover:scale-105"
              >
                <span className={`relative z-10 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FiHome className="w-5 h-5" />
                  {t('notFound.actions.home')}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#C09C3D] to-[#A88B32] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>

              <Link
                to="/properties"
                className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/[0.1] via-white/[0.05] to-white/[0.02] border-2 border-[#A88B32]/40 px-8 py-4 font-heading text-lg font-bold uppercase tracking-[0.2em] text-[#A88B32] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#A88B32]/30 hover:scale-105 hover:bg-gradient-to-br hover:from-white/[0.15] hover:via-white/[0.08] hover:to-white/[0.04]"
              >
                <span className={`relative z-10 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FiSearch className="w-5 h-5" />
                  {t('notFound.actions.browse')}
                </span>
              </Link>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto"
            >
              <Link
                to="/about"
                className="group p-4 rounded-xl backdrop-blur-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-[#A88B32]/20 hover:border-[#A88B32]/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-[#A88B32] mb-2 group-hover:scale-110 transition-transform duration-300">
                  <FiMapPin className="w-6 h-6 mx-auto" />
                </div>
                <p className="text-sm font-medium text-white group-hover:text-[#A88B32] transition-colors duration-300">
                  {t('notFound.links.about')}
                </p>
              </Link>

              <Link
                to="/developers"
                className="group p-4 rounded-xl backdrop-blur-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-[#A88B32]/20 hover:border-[#A88B32]/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-[#A88B32] mb-2 group-hover:scale-110 transition-transform duration-300">
                  <FiHome className="w-6 h-6 mx-auto" />
                </div>
                <p className="text-sm font-medium text-white group-hover:text-[#A88B32] transition-colors duration-300">
                  {t('notFound.links.developers')}
                </p>
              </Link>

              <Link
                to="/launches"
                className="group p-4 rounded-xl backdrop-blur-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-[#A88B32]/20 hover:border-[#A88B32]/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-[#A88B32] mb-2 group-hover:scale-110 transition-transform duration-300">
                  <FiSearch className="w-6 h-6 mx-auto" />
                </div>
                <p className="text-sm font-medium text-white group-hover:text-[#A88B32] transition-colors duration-300">
                  {t('notFound.links.launches')}
                </p>
              </Link>

              <Link
                to="/contact"
                className="group p-4 rounded-xl backdrop-blur-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-[#A88B32]/20 hover:border-[#A88B32]/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-[#A88B32] mb-2 group-hover:scale-110 transition-transform duration-300">
                  <FiArrowLeft className={`w-6 h-6 mx-auto ${isRTL ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-sm font-medium text-white group-hover:text-[#A88B32] transition-colors duration-300">
                  {t('notFound.links.contact')}
                </p>
              </Link>
            </motion.div>

            {/* Floating Elements */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#A88B32] rounded-full animate-ping opacity-60"></div>
            <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-[#C09C3D] rounded-full animate-pulse opacity-40"></div>
            <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-[#A88B32]/30 rounded-full animate-bounce"></div>
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-[#C09C3D]/50 rounded-full animate-ping opacity-50"></div>
          </div>
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className={`fixed top-8 z-20 ${isRTL ? 'right-8' : 'left-8'}`}
        >
          <button
            onClick={() => window.history.back()}
            className={`group flex items-center gap-3 px-6 py-3 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/[0.1] to-white/[0.05] border border-[#A88B32]/30 text-white hover:border-[#A88B32]/50 hover:bg-gradient-to-br hover:from-white/[0.15] hover:to-white/[0.08] transition-all duration-300 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <FiArrowLeft
              className={`w-5 h-5 transition-transform duration-300 ${
                isRTL ? 'group-hover:translate-x-1 rotate-180' : 'group-hover:-translate-x-1'
              }`}
            />
            <span className="font-medium">{t('notFound.backButton')}</span>
          </button>
        </motion.div>
      </div>
      </PageLayout>
    </>
  );
};

export default NotFound;