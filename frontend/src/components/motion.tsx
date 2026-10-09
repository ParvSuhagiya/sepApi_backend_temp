import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade-up reveal on scroll into view. Instant when reduced motion is set. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered fade-up for grids of cards. */
export function Stagger({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'ol' | 'ul';
}) {
  const Component = as === 'ol' ? motion.ol : as === 'ul' ? motion.ul : motion.div;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-48px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}) {
  const reduce = useReducedMotion();
  const Component = as === 'li' ? motion.li : motion.div;
  return (
    <Component
      className={className}
      variants={
        reduce
          ? { hidden: {}, show: {} }
          : {
              hidden: { opacity: 0, y: 18 },
              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
            }
      }
    >
      {children}
    </Component>
  );
}

/** Animated number that counts up when scrolled into view. */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-48px' });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 1200, bounce: 0 });

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      motionValue.set(value);
      return;
    }
    motionValue.set(0);
    spring.set(value);
  }, [inView, reduce, value, motionValue, spring]);

  useEffect(() => {
    const render = (latest: number) => {
      if (ref.current) ref.current.textContent = format(Math.round(latest));
    };
    render(motionValue.get());
    const stop = spring.on('change', render);
    return stop;
  }, [spring, motionValue, format]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
