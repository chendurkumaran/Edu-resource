import {
    BriefcaseIcon,
    CpuChipIcon,
    ChartBarIcon,
    CodeBracketIcon,
    ComputerDesktopIcon,
    SparklesIcon,
    HeartIcon,
    GlobeAltIcon,
    UserGroupIcon,
    BeakerIcon,
    CalculatorIcon,
    PencilSquareIcon,
    TagIcon,
} from '@heroicons/react/24/outline';
import type { ForwardRefExoticComponent, SVGProps, RefAttributes } from 'react';

export type HeroIcon = ForwardRefExoticComponent<
    Omit<SVGProps<SVGSVGElement>, 'ref'> & {
        title?: string;
        titleId?: string;
    } & RefAttributes<SVGSVGElement>
>;

export interface Category {
    label: string;
    Icon: HeroIcon;
    custom?: boolean; // true = user-created
}

/** Built-in categories shown in Explore Categories and CreateCourse */
export const BASE_CATEGORIES: Category[] = [
    { label: 'Business', Icon: BriefcaseIcon },
    { label: 'Artificial Intelligence', Icon: CpuChipIcon },
    { label: 'Data Science', Icon: ChartBarIcon },
    { label: 'Computer Science', Icon: CodeBracketIcon },
    { label: 'Information Technology', Icon: ComputerDesktopIcon },
    { label: 'Personal Development', Icon: SparklesIcon },
    { label: 'Healthcare', Icon: HeartIcon },
    { label: 'Language Learning', Icon: GlobeAltIcon },
    { label: 'Social Sciences', Icon: UserGroupIcon },
    { label: 'Arts & Humanities', Icon: PencilSquareIcon },
    { label: 'Physical Science', Icon: BeakerIcon },
    { label: 'Math and Logic', Icon: CalculatorIcon },
];

const STORAGE_KEY = 'edu_custom_categories';

/** Reads user-created category labels from localStorage */
export const getCustomCategoryLabels = (): string[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
};

/** Saves a new custom category label to localStorage */
export const saveCustomCategory = (label: string) => {
    const existing = getCustomCategoryLabels();
    if (!existing.includes(label)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, label]));
    }
};

/**
 * Returns the merged list: base categories + any instructor-created ones.
 * Custom ones use TagIcon as their icon.
 */
export const getAllCategories = (): Category[] => {
    const custom = getCustomCategoryLabels().map(label => ({
        label,
        Icon: TagIcon as HeroIcon,
        custom: true,
    }));
    return [...BASE_CATEGORIES, ...custom];
};
