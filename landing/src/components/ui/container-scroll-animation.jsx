// Adapted from Aceternity UI's ContainerScroll (TSX/Next) for this Vite + JS project.
// The card starts tilted back 20° in 3D and straightens + settles as you scroll.
import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

export function ContainerScroll({ titleComponent, children }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.85, 0.97] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[58rem] items-start justify-center p-2 sm:h-[68rem] md:h-[88rem] md:items-center md:p-12"
    >
      <div className="relative w-full py-6 md:py-32" style={{ perspective: '1000px' }}>
        <motion.div style={{ translateY: translate }} className="mx-auto max-w-3xl text-center">
          {titleComponent}
        </motion.div>

        <motion.div
          style={{
            rotateX: rotate,
            scale,
            boxShadow:
              '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
          }}
          className="mx-auto mt-10 h-[17rem] w-full max-w-5xl rounded-[28px] border border-white/10 bg-pine p-1.5 sm:h-[26rem] md:mt-12 md:h-[38rem] md:p-2.5"
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-ink">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
