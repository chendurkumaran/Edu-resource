import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
    ArrowLeftIcon,
    ClockIcon,
    BookOpenIcon,
    VideoCameraIcon,
    DocumentIcon,
    LinkIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import type { Module } from '../../types';

const ModulePreview = () => {
    const { id: courseId, moduleId } = useParams();
    const navigate = useNavigate();
    const [module, setModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchModule = async () => {
            try {
                const res = await axios.get(`/api/courses/${courseId}`);
                const course = res.data;
                const foundModule = course.modules?.find((m: Module) => m._id === moduleId);

                if (foundModule) {
                    setModule(foundModule);
                } else {
                    setError('Module not found');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load module details');
            } finally {
                setLoading(false);
            }
        };

        if (courseId && moduleId) {
            fetchModule();
        }
    }, [courseId, moduleId]);

    if (loading) return <LoadingSpinner />;
    if (error || !module) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-4">{error || 'Module not found'}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-blue-600 hover:text-blue-800 flex items-center justify-center font-medium"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-4 text-gray-500 hover:text-gray-700 flex items-center transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Back to Course
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{module.title}</h1>
                        <p className="text-lg text-gray-600">{module.description}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                        {module.duration && (
                            <span className="flex items-center">
                                <ClockIcon className="w-4 h-4 mr-1.5" />
                                {module.duration}
                            </span>
                        )}
                        <span className="flex items-center">
                            <BookOpenIcon className="w-4 h-4 mr-1.5" />
                            {module.materials?.length || 0} materials
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Markdown) */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Module Content</h2>
                        </div>
                        <div className="p-6">
                            {module.markdownContent ? (
                                <div className="prose max-w-none prose-blue">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {module.markdownContent}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic text-center py-8">
                                    No written content for this module.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar (Materials) */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Materials</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {module.materials && module.materials.length > 0 ? (
                                module.materials.map((material, idx) => (
                                    <div
                                        key={idx}
                                        className="group p-3 rounded-lg border border-gray-100 hover:border-blue-100 hover:bg-blue-50/50 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-1.5 bg-white rounded-md shadow-sm text-blue-600 group-hover:text-blue-700">
                                                {material.type === 'video' ? <VideoCameraIcon className="w-5 h-5" /> :
                                                    material.type === 'link' ? <LinkIcon className="w-5 h-5" /> :
                                                        <DocumentIcon className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
                                                    {material.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 capitalize mb-2">{material.type}</p>

                                                <a
                                                    href={material.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    <EyeIcon className="w-3 h-3 mr-1" />
                                                    View Material
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No materials attached.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModulePreview;
