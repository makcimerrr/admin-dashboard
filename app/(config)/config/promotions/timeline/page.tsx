'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'github-markdown-css/github-markdown.css'; // Importer les styles GitHub



function fetchTimeline(setData: (value: any[]) => void) {
    fetch('/api/timeline_project')
        .then((response) => response.json())
        .then((data) => setData(data))
        .catch((error) =>
            console.error('Erreur lors de la récupération de la timeline:', error)
        );
}

function fetchReadme(projectName: string, setReadme: (value: string) => void) {
    fetch(`https://raw.githubusercontent.com/01-edu/public/master/subjects/${projectName.toLowerCase()}/README.md`)
        .then((response) => response.text())
        .then((data) => setReadme(data))
        .catch((error) =>
            console.error('Erreur lors de la récupération du README:', error)
        );
}

export default function TimelineConfigPage() {
    const [timelineData, setTimelineData] = useState<any[]>([]);
    const [readmeContent, setReadmeContent] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    useEffect(() => {
        fetchTimeline(setTimelineData);
    }, []);

    const handleReadmeOpen = (projectName: string) => {
        fetchReadme(projectName, setReadmeContent);
        setSelectedProject(projectName);
        setIsDialogOpen(true);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Timeline</h1>
            <p className="text-gray-600 mb-4">Bienvenue dans la section de gestion de la timeline. Sélectionnez une option pour modifier les paramètres.</p>
            {timelineData.length > 0 ? (
                <div className="grid gap-4">
                    {timelineData.map((promo, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <CardTitle>{promo.promotionName}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p><strong>Projet Actuel:</strong>
                                    {promo.currentProject.toLowerCase() === 'fin' || promo.currentProject.toLowerCase() === 'spécialité' ? (
                                        <span> {promo.currentProject}</span>
                                    ) : (
                                        <Button variant="link" onClick={() => handleReadmeOpen(promo.currentProject)}>
                                            {promo.currentProject}
                                        </Button>
                                    )}
                                </p>
                                <p><strong>Progression:</strong> {promo.progress}%</p>
                                <p><strong>Échéance:</strong> {promo.agenda[0]}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">Aucune donnée disponible.</p>
            )}

            {/* Modal pour afficher le README avec style GitHub */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto p-4">
                    <DialogHeader>
                        <DialogTitle>README: {selectedProject}</DialogTitle>
                    </DialogHeader>
                    <div className="markdown-body p-4 rounded-md border">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                        >
                            {readmeContent || 'Chargement...'}
                        </ReactMarkdown>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}