import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const SHAPES = [
    "M25 55a15 15 0 0 1 0-30 20 20 0 0 1 38-8 17 17 0 0 1 17 17 11 11 0 0 1-8 21z",
    "M10 50a12 12 0 0 1 4-23 15 15 0 0 1 24-9 14 14 0 0 1 21 6 13 13 0 0 1 13 12 10 10 0 0 1-8 14z",
    "M30 48a14 14 0 0 1 2-27 16 16 0 0 1 30 2 12 12 0 0 1 4 25z",
    "M16 52a13 13 0 0 1 6-25 22 22 0 0 1 40-6 15 15 0 0 1 14 14 11 11 0 0 1-6 17z"
];

// Independent timings keep the cloud loops from syncing up.
const CLOUDS = [
    {
        top: "12%",
        left: "1.5%",
        width: 104,
        opacity: 0.035,
        shape: 0,
        flip: false,
        drift: 120,
        driftTime: 41,
        rise: 34,
        riseTime: 17,
        depth: 0.05
    },
    {
        top: "37%",
        left: "6%",
        width: 68,
        opacity: 0.022,
        shape: 2,
        flip: true,
        drift: -84,
        driftTime: 33,
        rise: -26,
        riseTime: 13,
        depth: 0.1
    },
    {
        top: "71%",
        left: "2.5%",
        width: 132,
        opacity: 0.028,
        shape: 1,
        flip: false,
        drift: 96,
        driftTime: 55,
        rise: 24,
        riseTime: 21,
        depth: 0.03
    },
    {
        top: "9%",
        left: "88%",
        width: 88,
        opacity: 0.026,
        shape: 3,
        flip: false,
        drift: -104,
        driftTime: 45,
        rise: 30,
        riseTime: 19,
        depth: 0.06
    },
    {
        top: "45%",
        left: "91%",
        width: 118,
        opacity: 0.033,
        shape: 1,
        flip: true,
        drift: 88,
        driftTime: 39,
        rise: -30,
        riseTime: 14,
        depth: 0.04
    },
    {
        top: "80%",
        left: "86%",
        width: 72,
        opacity: 0.024,
        shape: 0,
        flip: true,
        drift: -92,
        driftTime: 49,
        rise: 26,
        riseTime: 23,
        depth: 0.09
    }
];

export default function Clouds() {
    const { scrollY } = useScroll();

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
        >
            {CLOUDS.map((cloud) => (
                <FloatingCloud key={`${cloud.top}-${cloud.left}`} cloud={cloud} scrollY={scrollY} />
            ))}
        </div>
    );
}

function FloatingCloud({
    cloud,
    scrollY
}: {
    cloud: (typeof CLOUDS)[number];
    scrollY: ReturnType<typeof useScroll>["scrollY"];
}) {
    const reduceMotion = useReducedMotion();
    // Distant clouds move less on scroll.
    const parallax = useTransform(scrollY, (value) => value * -cloud.depth);

    return (
        <motion.div
            className="absolute"
            style={{ top: cloud.top, left: cloud.left, y: reduceMotion ? 0 : parallax }}
        >
            <motion.div
                animate={reduceMotion ? undefined : { x: [0, cloud.drift, 0] }}
                transition={{
                    duration: cloud.driftTime,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut"
                }}
            >
                <motion.div
                    animate={reduceMotion ? undefined : { y: [0, cloud.rise, 0] }}
                    transition={{
                        duration: cloud.riseTime,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut"
                    }}
                >
                    <motion.div
                        drag
                        dragMomentum
                        dragElastic={0.9}
                        dragTransition={{ power: 0.8, timeConstant: 600 }}
                        whileHover={{ scale: 1.05 }}
                        whileDrag={{ scale: 1.1 }}
                        className="pointer-events-auto cursor-grab touch-none active:cursor-grabbing"
                    >
                        <CloudShape
                            width={cloud.width}
                            opacity={cloud.opacity}
                            shape={cloud.shape}
                            flip={cloud.flip}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

export function CloudShape({
    width,
    opacity,
    shape = 0,
    flip = false,
    className
}: {
    width: number;
    opacity: number;
    shape?: number;
    flip?: boolean;
    className?: string;
}) {
    return (
        <svg
            width={width}
            height={width * 0.6}
            viewBox="0 0 100 60"
            fill="none"
            className={`text-foreground ${flip ? "-scale-x-100" : ""} ${className ?? ""}`}
            style={{ opacity }}
        >
            <title>Cloud</title>
            <path
                d={SHAPES[shape % SHAPES.length]}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinejoin="round"
            />
        </svg>
    );
}
