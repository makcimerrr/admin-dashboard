'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SelectStudent } from '@/lib/db/schema/students';
import Update from '@/components/update';
import PromoStatusDisplay from '@/components/promo-status-display';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Target, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Import new components
import { StudentsToolbar } from './students/_components/students-toolbar';
import { StudentsTable as StudentsDataTable } from './students/_components/students-table';
import { StudentsPagination } from './students/_components/students-pagination';

interface PromoDates {
  start: string;
  'piscine-js-start': string;
  'piscine-js-end': string;
  'piscine-rust-java-start': string;
  'piscine-rust-java-end': string;
  end: string;
}

interface PromoConfig {
  key: string;
  eventId: number;
  title: string;
  dates: PromoDates;
}

interface StudentsTableContainerProps {
  students: SelectStudent[];
  currentOffset: number | null;
  newOffset: number | null;
  previousOffset: number | null;
  totalStudents: number;
  search: string;
  promo: string;
  eventId: string;
  promoConfig?: PromoConfig[];
}

export function StudentsTable({
  students,
  currentOffset,
  newOffset,
  previousOffset,
  totalStudents,
  search,
  promo,
  eventId,
  promoConfig
}: StudentsTableContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State management
  const [studentsPerPage, setStudentsPerPage] = useState(20);
  const [studentsList, setStudentsList] = useState<SelectStudent[]>(students);
  const [totalStudentsState, setTotalStudentsState] = useState(totalStudents);
  const [currentOffsetState, setCurrentOffsetState] = useState(currentOffset);
  const [newOffsetState, setNewOffsetState] = useState(newOffset);
  const [previousOffsetState, setPreviousOffsetState] = useState(previousOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [isPromoStatusOpen, setIsPromoStatusOpen] = useState(promo !== '');

  // Get current sort config from URL
  const currentSortKey = searchParams.get('filter');
  const currentSortDirection = searchParams.get('direction') as 'asc' | 'desc' | null;

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    const dropoutFilter = searchParams.get('dropout_filter');
    const status = searchParams.get('status');
    const delayLevel = searchParams.get('delay_level');
    const track = searchParams.get('track');
    return !!(
      (dropoutFilter && dropoutFilter !== 'active') ||
      status ||
      delayLevel ||
      track
    );
  }, [searchParams]);

  // Sync state with props
  useEffect(() => {
    setStudentsList(students);
  }, [students]);

  // Initialize from URL params
  useEffect(() => {
    const limitParam = searchParams.get('limit');
    if (limitParam) {
      setStudentsPerPage(parseInt(limitParam, 10));
    }
  }, [searchParams]);

  // Fetch students when filters change
  useEffect(() => {
    const fetchFilteredStudents = async () => {
      setIsLoading(true);
      const query = new URLSearchParams(searchParams.toString());

      try {
        const response = await fetch(`/api/get_students?${query.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch students');
        const data = await response.json();

        setStudentsList(data.students);
        setTotalStudentsState(data.totalStudents);
        setCurrentOffsetState(data.currentOffset);
        setNewOffsetState(data.newOffset);
        setPreviousOffsetState(data.previousOffset);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredStudents();
  }, [searchParams]);

  // Handle update button
  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        q: search,
        offset: String(newOffset),
        promo
      });
      const response = await fetch(`/api/get_students?${query.toString()}`);
      if (!response.ok) throw new Error('Erreur de récupération des étudiants');
      const data = await response.json();
      setStudentsList(data.students);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete('filter');
    query.delete('direction');
    query.delete('status');
    query.delete('delay_level');
    query.delete('track');
    query.delete('track_completed');
    query.delete('dropout_filter');
    query.delete('q');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Promo Status - Collapsible */}
      <Collapsible open={isPromoStatusOpen} onOpenChange={setIsPromoStatusOpen}>
        <Card className="overflow-hidden border-2 hover:border-primary/20 transition-colors">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">
                      {promo ? `Projet Attendu` : 'Projets Attendus'}
                    </h3>
                    {promo && (
                      <Badge variant="outline" className="font-medium">
                        {promo}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {promo
                      ? "Suivi de la progression sur le projet actuel"
                      : "Vue d'ensemble de toutes les promotions"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {isPromoStatusOpen ? 'Réduire' : 'Développer'}
                </span>
                <div className="p-1 rounded-md bg-muted/50 group-hover:bg-muted transition-colors">
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      isPromoStatusOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 border-t">
              <div className="pt-4">
                <PromoStatusDisplay selectedPromo={promo || 'all'} />
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Main content card */}
      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* Toolbar: Search + Filters */}
          <StudentsToolbar search={search} />

          {/* Update button */}
          <div className="flex justify-start">
            <Update
              eventId={promo === '' ? 'all' : eventId}
              onUpdate={handleUpdate}
            />
          </div>

          {/* Students table */}
          <StudentsDataTable
            students={studentsList}
            isLoading={isLoading}
            searchQuery={searchParams.get('q') || undefined}
            hasFilters={hasActiveFilters}
            currentSortKey={currentSortKey}
            currentSortDirection={currentSortDirection}
            promoConfig={promoConfig}
            onClearFilters={clearFilters}
          />

          {/* Pagination */}
          <StudentsPagination
            currentOffset={currentOffsetState ?? 0}
            totalStudents={totalStudentsState}
            studentsPerPage={studentsPerPage}
            previousOffset={previousOffsetState}
            newOffset={newOffsetState}
          />
        </CardContent>
      </Card>
    </div>
  );
}
