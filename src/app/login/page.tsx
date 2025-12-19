
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ShieldAlert, Loader2, ArrowRight } from "lucide-react";

// Cores BMV
const colors = {
  green: '#3A452D',
  yellow: '#ECAE2F',
  blue: '#394054',
  black: '#231F20',
  white: '#FFFFFF',
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <FirebaseClientProvider>
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* Background com imagem e sobreposição */}
        <motion.div 
          className="fixed inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src="https://picsum.photos/seed/tech/1920/1080"
            alt="Background"
            fill
            priority
            quality={100}
            className="object-cover"
          />
          <div 
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${colors.green}80 0%, ${colors.blue}90 100%)`,
              backdropFilter: 'blur(0px)'
            }}
          />
        </motion.div>

        <AnimatePresence>
          {isLoading ? (
            <motion.div 
              className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center"
              >
                <Image 
                  src="/image/BMV.png" 
                  alt="SGI Logo" 
                  width={100}
                  height={28}
                  className="mb-4 animate-pulse"
                  priority
                />
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.main 
              className="relative flex min-h-screen items-center justify-end p-4 sm:p-8"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              <motion.div 
                className="w-full max-w-md ml-auto mr-20"
                variants={fadeIn}
              >
                <Card 
                  className="w-full bg-white/90 backdrop-blur-sm border border-white/20 shadow-xl overflow-hidden relative group"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  style={{
                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {/* Barra superior com cor de destaque */}
                  <div 
                    className="h-2 w-full"
                    style={{ backgroundColor: colors.green }}
                  />
                  
                  <div className="p-8">
                    <motion.div 
                      className="flex flex-col items-center py-8 px-6"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="mb-6">
                        <Image 
                          src="/image/BMV.png" 
                          alt="BMV Logo" 
                          width={120}
                          height={34}
                          className="mx-auto"
                          priority
                        />
                      </div>
                      
                      <h1 
                        className="text-4xl font-extrabold mb-2"
                        style={{
                          fontFamily: 'Raleway, sans-serif',
                          color: colors.green,
                          letterSpacing: '-0.5px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                      >
                        SGI
                      </h1>
                      <p 
                        className="text-gray-700 text-sm font-medium"
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          textShadow: '0 1px 1px rgba(255,255,255,0.5)'
                        }}
                      >
                        Sistema de Gestão Integrada
                      </p>
                    </motion.div>

                    <motion.div 
                      className="w-full space-y-6"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.1
                          }
                        }
                      }}
                    >
                      <motion.div 
                        className="text-left px-6 pb-2"
                        variants={fadeIn}
                      >
                        <h2 
                          className="text-2xl font-bold mb-1"
                          style={{
                            fontFamily: 'Raleway, sans-serif',
                            color: colors.green,
                            fontWeight: 800
                          }}
                        >
                          Bem-vindo
                        </h2>
                        <p 
                          className="text-gray-600 text-sm"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 400
                          }}
                        >
                          Acesse sua conta para continuar
                        </p>
                      </motion.div>

                      <LoginForm />

                      <motion.div 
                        className="text-center text-xs text-gray-500 flex items-center justify-center gap-2 p-4 border-t border-gray-100 mt-6"
                        variants={fadeIn}
                      >
                        <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" style={{ color: colors.green }} />
                        <p className="text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          Uso restrito. As informações são confidenciais.
                        </p>
                      </motion.div>
                    </motion.div>
                  </div>
                </Card>

                <motion.div 
                  className="mt-8 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <a 
                    href="#" 
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors group"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Precisa de ajuda? Fale com o suporte
                    <ArrowRight 
                      className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" 
                      style={{ color: colors.green }}
                    />
                  </a>
                </motion.div>
              </motion.div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </FirebaseClientProvider>
  );
}
