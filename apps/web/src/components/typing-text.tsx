"use client";

import { motion, type Variants } from "framer-motion";

export default function TypingText({
    text,
    className,
    speed = 1
}: {
    text: string;
    className?: string;
    speed?: number;
}) {
    const characters = text.split("");

    const container: Variants = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: {
                staggerChildren: 0.1 / speed,
                delayChildren: (i * 0.1) / speed
            }
        })
    };

    const child: Variants = {
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
                duration: 0.1 / speed
            }
        },
        hidden: {
            opacity: 0,
            x: -20,
            y: 10,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
                duration: 0.1 / speed
            }
        }
    };

    return (
        <motion.span variants={container} initial="hidden" animate="visible" className={className}>
            {characters.map((char, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Characters have no stable identity and never reorder.
                <motion.span key={`${char}-${index}`} variants={child}>
                    {char}
                </motion.span>
            ))}
        </motion.span>
    );
}
