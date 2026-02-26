import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { getAllCategories } from '../../utils/categories';

/* ─── Hero Slides ──────────────────────────────────────────── */
const HERO_SLIDES = [
    {
        id: 1,
        eyebrow: 'Welcome to EduResource',
        headline: 'Start, switch, or\nadvance your career',
        sub: 'Grow with courses from top instructors.',
        cta: 'Go to Home →',
        ctaLink: '/home',
        gradient: 'from-[#0056d2] to-[#003f99]',
        accent: '#4d9fff',
        emoji: '🚀',
    },
    {
        id: 2,
        eyebrow: 'EduResource Plus',
        headline: 'Unlock access to all\ncourses with a plan',
        sub: 'Learn as much as you want — all in one place.',
        cta: 'View My Courses →',
        ctaLink: '/my-courses',
        gradient: 'from-[#1a1a2e] to-[#16213e]',
        accent: '#e94560',
        emoji: '📚',
    },
    {
        id: 3,
        eyebrow: 'Stay Organised',
        headline: 'Stay on top of\nyour assignments',
        sub: 'Track, submit, and succeed on every task.',
        cta: 'View Assignments →',
        ctaLink: '/assignments',
        gradient: 'from-[#134e4a] to-[#065f46]',
        accent: '#6ee7b7',
        emoji: '✅',
    },
];

/* ─── Component ────────────────────────────────────────────── */
const HomeBanner = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [categories, setCategories] = useState(getAllCategories());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Refresh categories when localStorage changes (e.g. instructor created one)
    useEffect(() => {
        const onStorage = () => setCategories(getAllCategories());
        window.addEventListener('storage', onStorage);
        // Also poll once per second for same-tab updates
        const poll = setInterval(() => setCategories(getAllCategories()), 1000);
        return () => {
            window.removeEventListener('storage', onStorage);
            clearInterval(poll);
        };
    }, []);

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setCurrentSlide(s => (s + 1) % HERO_SLIDES.length);
        }, 5000);
    };

    const resetTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        startTimer();
    };

    useEffect(() => {
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const goTo = (idx: number) => { setCurrentSlide(idx); resetTimer(); };
    const prev = () => goTo((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    const next = () => goTo((currentSlide + 1) % HERO_SLIDES.length);

    return (
        <div className="space-y-6">
            {/* ── Hero Carousel ───────────────────────────────────── */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl select-none" style={{ minHeight: 220 }}>
                {HERO_SLIDES.map((s, i) => (
                    <div
                        key={s.id}
                        className={`absolute inset-0 bg-gradient-to-br ${s.gradient} transition-opacity duration-700 ${i === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                        {/* Decorative blobs */}
                        <div
                            className="absolute right-0 top-0 h-72 w-72 rounded-full opacity-10 translate-x-16 -translate-y-16"
                            style={{ background: s.accent }}
                        />
                        <div
                            className="absolute right-24 bottom-0 h-48 w-48 rounded-full opacity-10 translate-y-12"
                            style={{ background: s.accent }}
                        />

                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between h-full px-8 py-8 sm:px-12">
                            <div className="max-w-lg">
                                <span
                                    className="inline-block text-xs font-semibold tracking-widest uppercase mb-2 px-3 py-1 rounded-full"
                                    style={{ background: `${s.accent}30`, color: s.accent }}
                                >
                                    {s.eyebrow}
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight whitespace-pre-line mb-3">
                                    {s.headline}
                                </h2>
                                <p className="text-white/70 text-sm mb-5">{s.sub}</p>
                                <Link
                                    to={s.ctaLink}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-transform hover:scale-105 active:scale-95"
                                    style={{ background: s.accent, color: '#fff' }}
                                >
                                    {s.cta}
                                </Link>
                            </div>
                            <div
                                className="hidden sm:flex items-center justify-center text-8xl mt-6 sm:mt-0 sm:ml-8 opacity-90 drop-shadow-lg"
                                aria-hidden
                            >
                                {s.emoji}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Height placeholder */}
                <div className="invisible px-8 py-8 sm:px-12" aria-hidden>
                    <div className="h-6 mb-2" />
                    <div className="text-3xl font-extrabold leading-tight whitespace-pre-line mb-3">{'hello\nworld'}</div>
                    <div className="text-sm mb-5">sub</div>
                    <div className="px-5 py-2.5">cta button</div>
                </div>

                {/* Prev / Next */}
                <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition"
                    aria-label="Previous slide"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition"
                    aria-label="Next slide"
                >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                    {HERO_SLIDES.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={`rounded-full transition-all ${i === currentSlide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                                }`}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* ── Explore Categories ──────────────────────────────── */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Explore categories</h2>

                {/*
          Desktop: flex-wrap (all chips visible)
          Mobile: max-height ≈ 2 rows (~80px) + overflow-y-auto so user can scroll
          Each chip row is ~36px tall + 8px gap → 2 rows ≈ 80px
        */}
                <div
                    className="
            flex flex-wrap gap-2
            sm:max-h-none sm:overflow-visible
            max-h-[84px] overflow-y-auto
            pr-1
          "
                >
                    {categories.map(({ label, Icon }) => (
                        <Link
                            key={label}
                            to={`/courses?category=${encodeURIComponent(label)}`}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex-shrink-0"
                        >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomeBanner;
