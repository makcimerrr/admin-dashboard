'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    AlertTriangle,
    Plus,
    X,
    Loader2,
    CheckCircle2,
    User,
    UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Track } from '@/lib/db/schema/audits';
import type { GroupMember } from '@/lib/services/zone01';

// Schéma de validation
const auditResultSchema = z.object({
    studentLogin: z.string(),
    studentName: z.string().optional(),
    validated: z.boolean(),
    absent: z.boolean(),
    feedback: z.string().optional(),
    warnings: z.array(z.string()),
});

const auditFormSchema = z.object({
    summary: z.string().min(10, 'Le compte rendu doit faire au moins 10 caractères'),
    warnings: z.array(z.string()),
    results: z.array(auditResultSchema),
});

type AuditFormValues = z.infer<typeof auditFormSchema>;

interface AuditFormProps {
    promoId: string;
    track: Track;
    projectName: string;
    groupId: string;
    members: GroupMember[];
}

export function AuditForm({
    promoId,
    track,
    projectName,
    groupId,
    members,
}: AuditFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newWarning, setNewWarning] = useState('');

    const form = useForm<AuditFormValues>({
        resolver: zodResolver(auditFormSchema),
        defaultValues: {
            summary: '',
            warnings: [],
            results: members.map((m) => ({
                studentLogin: m.login,
                studentName: m.firstName && m.lastName
                    ? `${m.firstName} ${m.lastName}`
                    : undefined,
                validated: false,
                absent: false,
                feedback: '',
                warnings: [],
            })),
        },
    });

    const { fields: resultFields } = useFieldArray({
        control: form.control,
        name: 'results',
    });

    const warnings = form.watch('warnings');

    const addGlobalWarning = () => {
        if (newWarning.trim()) {
            form.setValue('warnings', [...warnings, newWarning.trim()]);
            setNewWarning('');
        }
    };

    const removeGlobalWarning = (index: number) => {
        form.setValue(
            'warnings',
            warnings.filter((_, i) => i !== index)
        );
    };

    const addStudentWarning = (resultIndex: number, warning: string) => {
        const currentWarnings = form.getValues(`results.${resultIndex}.warnings`);
        form.setValue(`results.${resultIndex}.warnings`, [...currentWarnings, warning]);
    };

    const removeStudentWarning = (resultIndex: number, warningIndex: number) => {
        const currentWarnings = form.getValues(`results.${resultIndex}.warnings`);
        form.setValue(
            `results.${resultIndex}.warnings`,
            currentWarnings.filter((_, i) => i !== warningIndex)
        );
    };

    const onSubmit = async (data: AuditFormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/code-reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promoId,
                    track,
                    projectName,
                    groupId,
                    ...data,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de la création de l\'audit');
            }

            toast.success('Audit enregistré avec succès');
            router.push(`/code-reviews/${promoId}`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
        } finally {
            setIsSubmitting(false);
        }
    };

    const validatedCount = form.watch('results').filter((r) => r.validated).length;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Compte rendu global */}
                <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Compte rendu global</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Points positifs, axes d'amélioration, observations générales sur le projet..."
                                    className="min-h-32 resize-y"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Décrivez votre évaluation globale du travail du groupe.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Warnings globaux */}
                <div className="space-y-3">
                    <FormLabel>Warnings globaux</FormLabel>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ajouter un warning..."
                            value={newWarning}
                            onChange={(e) => setNewWarning(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addGlobalWarning();
                                }
                            }}
                        />
                        <Button type="button" variant="outline" onClick={addGlobalWarning}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {warnings.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {warnings.map((warning, index) => (
                                <Badge
                                    key={index}
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 pr-1"
                                >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {warning}
                                    <button
                                        type="button"
                                        onClick={() => removeGlobalWarning(index)}
                                        className="ml-1 p-0.5 hover:bg-amber-200 rounded"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <Separator />

                {/* Résultats individuels */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Évaluation individuelle</h3>
                        <Badge variant="outline">
                            {validatedCount}/{members.length} validé(s)
                        </Badge>
                    </div>

                    {resultFields.map((field, index) => (
                        <StudentResultCard
                            key={field.id}
                            index={index}
                            form={form}
                            onAddWarning={(warning) => addStudentWarning(index, warning)}
                            onRemoveWarning={(warningIndex) => removeStudentWarning(index, warningIndex)}
                        />
                    ))}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isSubmitting}
                    >
                        Annuler
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Enregistrer l&apos;audit
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// Composant pour chaque résultat étudiant
function StudentResultCard({
    index,
    form,
    onAddWarning,
    onRemoveWarning,
}: {
    index: number;
    form: ReturnType<typeof useForm<AuditFormValues>>;
    onAddWarning: (warning: string) => void;
    onRemoveWarning: (warningIndex: number) => void;
}) {
    const [newWarning, setNewWarning] = useState('');
    const result = form.watch(`results.${index}`);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {result.studentLogin}
                        {result.studentName && (
                            <span className="text-muted-foreground font-normal">
                                ({result.studentName})
                            </span>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <FormField
                            control={form.control}
                            name={`results.${index}.absent`}
                            render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            // Si absent, désactiver la validation
                                            if (checked) {
                                                form.setValue(`results.${index}.validated`, false);
                                            }
                                        }}
                                    />
                                    <span
                                        className={
                                            field.value ? 'text-orange-600 font-medium' : 'text-muted-foreground'
                                        }
                                    >
                                        {field.value ? (
                                            <span className="flex items-center gap-1">
                                                <UserX className="h-3 w-3" />
                                                Absent
                                            </span>
                                        ) : 'Présent'}
                                    </span>
                                </div>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`results.${index}.validated`}
                            render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={result.absent}
                                    />
                                    <span
                                        className={
                                            result.absent
                                                ? 'text-muted-foreground/50'
                                                : field.value ? 'text-green-600 font-medium' : 'text-muted-foreground'
                                        }
                                    >
                                        {field.value ? 'Validé' : 'Non validé'}
                                    </span>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <FormField
                    control={form.control}
                    name={`results.${index}.feedback`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea
                                    placeholder="Feedback spécifique pour cet étudiant..."
                                    className="min-h-20 resize-y"
                                    {...field}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Warnings individuels */}
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Warning individuel..."
                            value={newWarning}
                            onChange={(e) => setNewWarning(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newWarning.trim()) {
                                        onAddWarning(newWarning.trim());
                                        setNewWarning('');
                                    }
                                }
                            }}
                            className="text-sm"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (newWarning.trim()) {
                                    onAddWarning(newWarning.trim());
                                    setNewWarning('');
                                }
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {result.warnings.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {result.warnings.map((warning, wIndex) => (
                                <Badge
                                    key={wIndex}
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 text-xs pr-1"
                                >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {warning}
                                    <button
                                        type="button"
                                        onClick={() => onRemoveWarning(wIndex)}
                                        className="ml-1 p-0.5 hover:bg-amber-200 rounded"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
