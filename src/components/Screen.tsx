import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'curtain' | 'rise';
}

const variants = {
  fade: {
    initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -10, filter: 'blur(6px)' },
  },
  rise: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.03 },
  },
  curtain: {
    initial: { opacity: 0, clipPath: 'inset(0 50% 0 50%)' },
    animate: { opacity: 1, clipPath: 'inset(0 0% 0 0%)' },
    exit: { opacity: 0, clipPath: 'inset(0 50% 0 50%)' },
  },
};

export function Screen({ children, className = '', variant = 'fade' }: Props) {
  return (
    <motion.div
      className={`screen ${className}`}
      {...variants[variant]}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
